-- ==============================================================================
-- МИГРАЦИЯ: НАСТРОЙКИ КАНАЛОВ (settings JSONB), УЛУЧШЕНИЕ RLS ДЛЯ УЧАСТНИКОВ ЧАТОВ
-- И ХРАНИЛИЩЕ STORAGE BUCKETS (avatars, covers, media)
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. КОЛОНКА settings В ТАБЛИЦЕ public.chats И GIN-ИНДЕКС
-- ------------------------------------------------------------------------------
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS settings JSONB 
DEFAULT '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb;

-- Заполняем дефолтными настройками существующие чаты, где settings IS NULL
UPDATE public.chats 
SET settings = '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb 
WHERE settings IS NULL;

-- GIN-индекс для быстрого поиска и фильтрации по JSONB-ключам настроек
CREATE INDEX IF NOT EXISTS idx_chats_settings 
ON public.chats USING gin (settings);


-- ------------------------------------------------------------------------------
-- 2. ВСПОМОГАТЕЛЬНЫЕ SECURITY DEFINER ФУНКЦИИ ДЛЯ ЧАТОВ И ИСКЛЮЧЕНИЯ РЕКУРСИИ
-- ------------------------------------------------------------------------------

-- Функция проверки создателя чата в обход RLS целевой таблицы
CREATE OR REPLACE FUNCTION public.is_chat_creator(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = _chat_id AND created_by = _user_id
    );
$$;

-- Обновленная функция проверки администратора чата (создатель чата ВСЕГДА признается админом)
CREATE OR REPLACE FUNCTION public.is_chat_admin(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = _chat_id AND created_by = _user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_id = _chat_id AND user_id = _user_id AND role IN ('owner', 'admin')
        )
    );
$$;

-- Функция проверки членства в чате (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = _chat_id AND user_id = _user_id
    );
$$;


-- ------------------------------------------------------------------------------
-- 3. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ public.chats
-- ------------------------------------------------------------------------------
-- Создатель чата должен сразу видеть созданный чат еще до добавления записей в chat_members
DROP POLICY IF EXISTS "Пользователь видит только те чаты, в которых состоит, или публичные каналы" ON public.chats;

CREATE POLICY "Пользователь видит только те чаты, в которых состоит, или публичные каналы" 
ON public.chats FOR SELECT 
USING (
    type = 'channel' OR
    created_by = auth.uid() OR
    public.is_chat_member(id, auth.uid())
);


-- ------------------------------------------------------------------------------
-- 4. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ public.chat_members
-- ------------------------------------------------------------------------------
-- Создатель чата или администратор могут беспрепятственно добавлять участников в диалоги и группы
DROP POLICY IF EXISTS "Добавлять участников могут админы или пользователи в личный диалог" ON public.chat_members;
DROP POLICY IF EXISTS "Разрешить добавление участников в чат" ON public.chat_members;

CREATE POLICY "Разрешить добавление участников в чат" 
ON public.chat_members FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid())
);

-- Просмотр участников: создатель чата, сам участник или члены чата
DROP POLICY IF EXISTS "Участники чатов видны членам чата (для каналов - только админам)" ON public.chat_members;

CREATE POLICY "Участники чатов видны членам чата (для каналов - только админам)" 
ON public.chat_members FOR SELECT 
USING (
    user_id = auth.uid() OR
    public.is_chat_creator(chat_id, auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = chat_members.chat_id AND (
            (c.type != 'channel' AND public.is_chat_member(c.id, auth.uid())) OR
            (c.type = 'channel' AND public.is_chat_admin(c.id, auth.uid()))
        )
    )
);

-- Обновление участников (роли и т.д.): создатель или админ
DROP POLICY IF EXISTS "Обновлять участников могут создатели и админы" ON public.chat_members;

CREATE POLICY "Обновлять участников могут создатели и админы"
ON public.chat_members FOR UPDATE
USING (
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid())
);

-- Удаление участников: сам участник (выход из чата) или создатель/админ чата (исключение)
DROP POLICY IF EXISTS "Админы могут удалять участников или участник может покинуть чат сам" ON public.chat_members;

CREATE POLICY "Админы могут удалять участников или участник может покинуть чат сам" 
ON public.chat_members FOR DELETE 
USING (
    auth.uid() = user_id OR
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid())
);


-- ------------------------------------------------------------------------------
-- 5. ХРАНИЛИЩЕ SUPABASE STORAGE (avatars, covers, media)
-- ------------------------------------------------------------------------------
-- Регистрируем бакеты avatars, covers, media с правильными ограничениями
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('covers', 'covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('media', 'media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS-политики на storage.objects
-- 1. Публичный доступ на чтение аватаров, обложек и медиа
DROP POLICY IF EXISTS "Public Access for avatars and media" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for avatars, covers and media" ON storage.objects;

CREATE POLICY "Public Access for avatars, covers and media" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('avatars', 'covers', 'media'));

-- 2. Авторизованные пользователи могут загружать аватары и обложки (профили, каналы, чаты)
DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars and covers" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars and covers" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id IN ('avatars', 'covers') 
    AND auth.role() = 'authenticated'
);

-- 3. Авторизованные пользователи могут загружать файлы в media
DROP POLICY IF EXISTS "Authenticated users can upload to media" ON storage.objects;

CREATE POLICY "Authenticated users can upload to media" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'media' 
    AND auth.role() = 'authenticated'
);

-- 4. Обновление и удаление файлов пользователем
DROP POLICY IF EXISTS "Users can update own storage objects" ON storage.objects;

CREATE POLICY "Users can update own storage objects" 
ON storage.objects FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND (
        auth.uid() = owner OR 
        (storage.foldername(name))[1] = auth.uid()::text OR
        owner IS NULL
    )
);

DROP POLICY IF EXISTS "Users can delete own storage objects" ON storage.objects;

CREATE POLICY "Users can delete own storage objects" 
ON storage.objects FOR DELETE 
USING (
    auth.role() = 'authenticated' AND (
        auth.uid() = owner OR 
        (storage.foldername(name))[1] = auth.uid()::text
    )
);
