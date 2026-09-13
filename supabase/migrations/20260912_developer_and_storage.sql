-- ==============================================================================
-- МИГРАЦИЯ: ДОБАВЛЕНИЕ СТАТУСА РАЗРАБОТЧИКА И ХРАНИЛИЩА SUPABASE STORAGE
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- ==============================================================================

-- 1. ДОБАВЛЕНИЕ КОЛОНКИ is_developer В ТАБЛИЦУ PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_developer BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_developer 
ON public.profiles(is_developer) 
WHERE is_developer = true;

-- 2. ОБНОВЛЕНИЕ ТРИГГЕРА handle_new_user ДЛЯ ПЕРВИЧНОЙ ИНИЦИАЛИЗАЦИИ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    saved_chat_id UUID;
    dev_channel_id UUID;
    is_dev BOOLEAN;
BEGIN
    is_dev := COALESCE((NEW.raw_user_meta_data->>'is_developer')::boolean, false);

    -- 1. Создаем профиль пользователя
    INSERT INTO public.profiles (
        id, 
        username, 
        first_name, 
        last_name, 
        avatar_url, 
        cover_url,
        bio,
        is_developer
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Участник'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'cover_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'bio', 'Новый пользователь tobo'),
        is_dev
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar_url = EXCLUDED.avatar_url,
        cover_url = EXCLUDED.cover_url,
        bio = EXCLUDED.bio,
        is_developer = EXCLUDED.is_developer,
        updated_at = now();

    -- 2. Создаем персональный чат "Избранное"
    INSERT INTO public.chats (type, title, description, created_by)
    VALUES ('saved', 'Избранное', 'Ваше персональное облачное хранилище заметок и постов', NEW.id)
    RETURNING id INTO saved_chat_id;

    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (saved_chat_id, NEW.id, 'owner')
    ON CONFLICT DO NOTHING;

    -- 3. Присоединение к официальному каналу "Канал Разработки"
    SELECT id INTO dev_channel_id FROM public.chats WHERE title = 'Канал Разработки' AND type = 'channel' LIMIT 1;
    IF dev_channel_id IS NULL THEN
        INSERT INTO public.chats (type, title, description, created_by)
        VALUES ('channel', 'Канал Разработки', 'Официальный системный канал tobo с новостями, апдейтами и чейнджлогом', NEW.id)
        RETURNING id INTO dev_channel_id;

        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, 'owner')
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, CASE WHEN is_dev THEN 'owner' ELSE 'member' END)
        ON CONFLICT (chat_id, user_id) DO UPDATE SET
            role = CASE WHEN is_dev THEN 'owner' ELSE chat_members.role END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ОБНОВЛЕНИЕ ХРАНИМОЙ ФУНКЦИИ get_ranked_feed ДЛЯ ВЫДАЧИ author_is_developer
DROP FUNCTION IF EXISTS public.get_ranked_feed(INT, INT);

CREATE OR REPLACE FUNCTION public.get_ranked_feed(
    page_offset INT DEFAULT 0,
    page_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    content TEXT,
    media_urls JSONB,
    disable_comments BOOLEAN,
    audience TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    reposts_count BIGINT,
    views_count BIGINT,
    created_at TIMESTAMPTZ,
    rank_score DOUBLE PRECISION,
    author_username TEXT,
    author_first_name TEXT,
    author_last_name TEXT,
    author_avatar_url TEXT,
    author_is_developer BOOLEAN
) 
LANGUAGE sql STABLE AS $$
    SELECT 
        p.id,
        p.author_id,
        p.content,
        p.media_urls,
        p.disable_comments,
        p.audience,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.views_count,
        p.created_at,
        (
            (p.views_count * 0.1 + p.likes_count * 2.0 + p.comments_count * 3.0 + p.reposts_count * 4.0)
            / 
            POWER(GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 0) + 2.0, 1.5)
        )::DOUBLE PRECISION AS rank_score,
        prof.username AS author_username,
        prof.first_name AS author_first_name,
        prof.last_name AS author_last_name,
        prof.avatar_url AS author_avatar_url,
        prof.is_developer AS author_is_developer
    FROM public.posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    ORDER BY rank_score DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
$$;

-- 4. НАСТРОЙКА БАКЕТОВ SUPABASE STORAGE (avatars, media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('media', 'media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. RLS-ПОЛИТИКИ ДЛЯ STORAGE OBJECTS
-- Чтение бакетов avatars и media открыто для всех
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for avatars and media'
    ) THEN
        CREATE POLICY "Public Access for avatars and media" 
        ON storage.objects FOR SELECT 
        USING (bucket_id IN ('avatars', 'media'));
    END IF;
END $$;

-- Загрузка объектов: только авторизованные пользователи в свои папки
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to avatars'
    ) THEN
        CREATE POLICY "Authenticated users can upload to avatars" 
        ON storage.objects FOR INSERT 
        WITH CHECK (
            bucket_id = 'avatars' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to media'
    ) THEN
        CREATE POLICY "Authenticated users can upload to media" 
        ON storage.objects FOR INSERT 
        WITH CHECK (
            bucket_id = 'media' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;

-- Обновление и удаление объектов: только владелец
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update own storage objects'
    ) THEN
        CREATE POLICY "Users can update own storage objects" 
        ON storage.objects FOR UPDATE 
        USING (auth.uid() = owner);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete own storage objects'
    ) THEN
        CREATE POLICY "Users can delete own storage objects" 
        ON storage.objects FOR DELETE 
        USING (auth.uid() = owner);
    END IF;
END $$;
