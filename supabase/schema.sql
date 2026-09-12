-- ==============================================================================
-- СХЕМА БАЗЫ ДАННЫХ И ПОЛИТИКИ RLS ДЛЯ СОЦИАЛЬНОЙ СЕТИ И МЕССЕНДЖЕРА "tobo"
-- Лицензия: Apache License 2.0
-- ==============================================================================

-- Включение необходимых расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ТАБЛИЦА ПРОФИЛЕЙ (profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    avatar_url TEXT,
    cover_url TEXT,
    bio TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Публичный просмотр профилей" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Пользователи могут изменять только свой профиль" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. ТАБЛИЦА ПОСТОВ (posts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::jsonb NOT NULL,
    disable_comments BOOLEAN DEFAULT false NOT NULL,
    audience TEXT DEFAULT 'all' CHECK (audience IN ('all', 'friends')),
    likes_count BIGINT DEFAULT 0 NOT NULL,
    comments_count BIGINT DEFAULT 0 NOT NULL,
    reposts_count BIGINT DEFAULT 0 NOT NULL,
    views_count BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Просмотр постов открыт всем авторизованным" 
    ON public.posts FOR SELECT 
    USING (true);

CREATE POLICY "Создавать посты могут только их авторы" 
    ON public.posts FOR INSERT 
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Редактировать посты могут только их авторы" 
    ON public.posts FOR UPDATE 
    USING (auth.uid() = author_id);

CREATE POLICY "Удалять посты могут только их авторы" 
    ON public.posts FOR DELETE 
    USING (auth.uid() = author_id);

-- ------------------------------------------------------------------------------
-- 3. ЛАЙКИ И РЕПОСТЫ ПОСТОВ (post_likes, post_reposts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_likes (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Просмотр лайков открыт всем" 
    ON public.post_likes FOR SELECT 
    USING (true);

CREATE POLICY "Пользователь может ставить лайк от своего имени" 
    ON public.post_likes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователь может снимать свой лайк" 
    ON public.post_likes FOR DELETE 
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.post_reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Просмотр репостов открыт всем" 
    ON public.post_reposts FOR SELECT 
    USING (true);

CREATE POLICY "Пользователь может создавать репост от своего имени" 
    ON public.post_reposts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователь может удалять свой репост" 
    ON public.post_reposts FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. КОММЕНТАРИИ (comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Просмотр комментариев открыт всем" 
    ON public.comments FOR SELECT 
    USING (true);

CREATE POLICY "Добавлять комментарии может любой авторизованный пользователь" 
    ON public.comments FOR INSERT 
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Редактировать комментарий может только автор" 
    ON public.comments FOR UPDATE 
    USING (auth.uid() = author_id);

CREATE POLICY "Удалять комментарий может автор комментария или автор поста" 
    ON public.comments FOR DELETE 
    USING (
        auth.uid() = author_id OR 
        EXISTS (
            SELECT 1 FROM public.posts 
            WHERE posts.id = comments.post_id AND posts.author_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 5. ДИАЛОГИ И ЧАТЫ (chats, chat_members)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'channel', 'saved')),
    title TEXT,
    avatar_url TEXT,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_members (
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_members(user_id);

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Вспомогательные функции с SECURITY DEFINER для исключения бесконечной рекурсии в RLS
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = _chat_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = _chat_id AND user_id = _user_id AND role IN ('owner', 'admin')
    );
$$;

CREATE POLICY "Пользователь видит только те чаты, в которых состоит, или публичные каналы" 
    ON public.chats FOR SELECT 
    USING (
        type = 'channel' OR
        public.is_chat_member(id, auth.uid())
    );

CREATE POLICY "Создавать чат может любой авторизованный пользователь" 
    ON public.chats FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Обновлять чат могут владельцы и администраторы" 
    ON public.chats FOR UPDATE 
    USING (public.is_chat_admin(id, auth.uid()));

CREATE POLICY "Участники чатов видны членам чата (для каналов - только админам)" 
    ON public.chat_members FOR SELECT 
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = chat_members.chat_id AND (
                (c.type != 'channel' AND public.is_chat_member(c.id, auth.uid())) OR
                (c.type = 'channel' AND public.is_chat_admin(c.id, auth.uid()))
            )
        )
    );

CREATE POLICY "Добавлять участников могут админы или пользователи в личный диалог" 
    ON public.chat_members FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = chat_members.chat_id AND c.created_by = auth.uid()
        )
    );

CREATE POLICY "Админы могут удалять участников или участник может покинуть чат сам" 
    ON public.chat_members FOR DELETE 
    USING (
        auth.uid() = user_id OR
        public.is_chat_admin(chat_id, auth.uid())
    );

-- ------------------------------------------------------------------------------
-- 6. СООБЩЕНИЯ (messages)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb NOT NULL,
    voice_url TEXT,
    voice_duration INTEGER,
    voice_wave JSONB,
    is_read BOOLEAN DEFAULT false NOT NULL,
    forwarded_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, created_at ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователь видит сообщения только в чатах, где он состоит или в публичных каналах" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = messages.chat_id AND (
                c.type = 'channel' OR
                public.is_chat_member(c.id, auth.uid())
            )
        )
    );

CREATE POLICY "Отправлять сообщения могут участники чатов (в каналах - только владелец и редакторы)" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = messages.chat_id AND (
                (c.type != 'channel' AND public.is_chat_member(c.id, auth.uid())) OR
                (c.type = 'channel' AND public.is_chat_admin(c.id, auth.uid()))
            )
        )
    );

CREATE POLICY "Редактировать сообщение может только его отправитель" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() = sender_id);

CREATE POLICY "Удалять сообщение может его отправитель или админ чата" 
    ON public.messages FOR DELETE 
    USING (
        auth.uid() = sender_id OR
        public.is_chat_admin(chat_id, auth.uid())
    );

-- ------------------------------------------------------------------------------
-- 7. БЛОКИРОВКИ, ЖАЛОБЫ И СЕССИИ (blocked_users, reports, active_sessions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователь видит свой черный список" 
    ON public.blocked_users FOR SELECT 
    USING (auth.uid() = blocker_id);

CREATE POLICY "Пользователь может блокировать от своего имени" 
    ON public.blocked_users FOR INSERT 
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Пользователь может разблокировать от своего имени" 
    ON public.blocked_users FOR DELETE 
    USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователь может отправлять жалобу" 
    ON public.reports FOR INSERT 
    WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device TEXT NOT NULL,
    browser TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    last_active TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_current BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователь видит только свои активные сессии" 
    ON public.active_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Пользователь может завершать свои сессии" 
    ON public.active_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. АЛГОРИТМИЧЕСКИЙ РАНЖИРОВАННЫЙ СКОРИНГ ЛЕНТЫ (Time Decay)
-- ------------------------------------------------------------------------------
-- Формула ранжирования:
-- Score = (Views * 0.1 + Likes * 2.0 + Comments * 3.0 + Reposts * 4.0) / ((Age_in_Hours + 2) ^ 1.5)
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
    author_avatar_url TEXT
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
        prof.avatar_url AS author_avatar_url
    FROM public.posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    ORDER BY rank_score DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
$$;

-- ------------------------------------------------------------------------------
-- 9. ТРИГГЕРЫ: АВТОМАТИЧЕСКИЙ BOOTSTRAP ПОЛЬЗОВАТЕЛЯ
-- ------------------------------------------------------------------------------
-- При регистрации пользователя:
-- 1. Создается профиль
-- 2. Автоматически создается персональный чат "Избранное" (type: 'saved')
-- 3. Пользователь автоматически присоединяется к системному каналу "Канал Разработки"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    saved_chat_id UUID;
    dev_channel_id UUID;
BEGIN
    -- 1. Создаем профиль
    INSERT INTO public.profiles (
        id, 
        username, 
        first_name, 
        last_name, 
        avatar_url, 
        bio
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Участник'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'Новый пользователь tobo'
    );

    -- 2. Создаем чат "Избранное"
    INSERT INTO public.chats (type, title, description, created_by)
    VALUES ('saved', 'Избранное', 'Ваше персональное облачное хранилище заметок и постов', NEW.id)
    RETURNING id INTO saved_chat_id;

    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (saved_chat_id, NEW.id, 'owner');

    -- 3. Находим или создаем официальный канал "Канал Разработки"
    SELECT id INTO dev_channel_id FROM public.chats WHERE title = 'Канал Разработки' AND type = 'channel' LIMIT 1;
    IF dev_channel_id IS NULL THEN
        INSERT INTO public.chats (type, title, description, created_by)
        VALUES ('channel', 'Канал Разработки', 'Официальный системный канал tobo с новостями, апдейтами и чейнджлогом', NEW.id)
        RETURNING id INTO dev_channel_id;

        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, 'owner');
    ELSE
        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, 'member')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Привязка к auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 10. ВКЛЮЧЕНИЕ REALTIME REPLICATION
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
