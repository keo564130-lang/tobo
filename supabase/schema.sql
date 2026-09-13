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
    is_developer BOOLEAN DEFAULT false NOT NULL,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_is_developer 
ON public.profiles(is_developer) 
WHERE is_developer = true;

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
    author_type TEXT DEFAULT 'user' CHECK (author_type IN ('user', 'channel')),
    channel_id UUID REFERENCES public.chats(id) ON DELETE CASCADE DEFAULT NULL,
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
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON public.posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_type ON public.posts(author_type);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Просмотр постов открыт всем для обычных постов и публичных каналов, для закрытых каналов - участникам и разработчикам" 
    ON public.posts FOR SELECT 
    USING (
        channel_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = posts.channel_id AND (
                c.type != 'channel' OR
                COALESCE((c.settings->>'is_public')::boolean, true) = true OR
                c.created_by = auth.uid() OR
                public.is_chat_member(c.id, auth.uid()) OR
                public.is_developer(auth.uid())
            )
        )
    );

CREATE POLICY "Создавать посты могут авторы или администраторы каналов" 
    ON public.posts FOR INSERT 
    WITH CHECK (
        auth.uid() = author_id AND (
            author_type = 'user' OR
            channel_id IS NULL OR
            public.is_chat_creator(channel_id, auth.uid()) OR
            public.is_chat_admin(channel_id, auth.uid())
        )
    );

CREATE POLICY "Редактировать посты могут авторы или администраторы каналов" 
    ON public.posts FOR UPDATE 
    USING (
        auth.uid() = author_id OR
        (channel_id IS NOT NULL AND (
            public.is_chat_creator(channel_id, auth.uid()) OR
            public.is_chat_admin(channel_id, auth.uid())
        ))
    );

CREATE POLICY "Удалять посты могут авторы или администраторы каналов" 
    ON public.posts FOR DELETE 
    USING (
        auth.uid() = author_id OR
        (channel_id IS NOT NULL AND (
            public.is_chat_creator(channel_id, auth.uid()) OR
            public.is_chat_admin(channel_id, auth.uid())
        ))
    );

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
    settings JSONB DEFAULT '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_settings ON public.chats USING gin (settings);

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
CREATE OR REPLACE FUNCTION public.is_chat_creator(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = _chat_id AND created_by = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = _chat_id AND user_id = _user_id
    );
$$;

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
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = _user_id AND is_developer = true
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_developer(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND is_developer = true
    );
$$;

CREATE POLICY "Пользователь видит только те чаты, в которых состоит, или публичные каналы" 
    ON public.chats FOR SELECT 
    USING (
        created_by = auth.uid() OR
        public.is_chat_member(id, auth.uid()) OR
        (type = 'channel' AND COALESCE((settings->>'is_public')::boolean, true) = true) OR
        public.is_developer(auth.uid())
    );

CREATE POLICY "Создавать чат может любой авторизованный пользователь" 
    ON public.chats FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Обновлять чат могут владельцы и администраторы" 
    ON public.chats FOR UPDATE 
    USING (
        created_by = auth.uid() OR
        public.is_chat_admin(id, auth.uid()) OR
        public.is_developer(auth.uid())
    );

CREATE POLICY "Удалять чат могут создатели и разработчики" 
    ON public.chats FOR DELETE 
    USING (
        created_by = auth.uid() OR
        public.is_developer(auth.uid())
    );

CREATE POLICY "Участники чатов видны членам чата (для каналов - только админам)" 
    ON public.chat_members FOR SELECT 
    USING (
        user_id = auth.uid() OR
        public.is_chat_creator(chat_id, auth.uid()) OR
        public.is_developer(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = chat_members.chat_id AND (
                (c.type != 'channel' AND public.is_chat_member(c.id, auth.uid())) OR
                (c.type = 'channel' AND public.is_chat_admin(c.id, auth.uid()))
            )
        )
    );

CREATE POLICY "Разрешить добавление участников в чат" 
    ON public.chat_members FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id OR
        public.is_chat_creator(chat_id, auth.uid()) OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        public.is_developer(auth.uid())
    );

CREATE POLICY "Обновлять участников могут создатели и админы" 
    ON public.chat_members FOR UPDATE 
    USING (
        public.is_chat_creator(chat_id, auth.uid()) OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        public.is_developer(auth.uid())
    );

CREATE POLICY "Админы могут удалять участников или участник может покинуть чат сам" 
    ON public.chat_members FOR DELETE 
    USING (
        auth.uid() = user_id OR
        public.is_chat_creator(chat_id, auth.uid()) OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        public.is_developer(auth.uid())
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
    reactions JSONB DEFAULT '{}'::jsonb,
    reply_to JSONB DEFAULT NULL,
    comments_count INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT false NOT NULL,
    forwarded_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON public.messages USING gin (reactions);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователь видит сообщения только в чатах, где он состоит или в публичных каналах" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = messages.chat_id AND (
                (c.type = 'channel' AND COALESCE((c.settings->>'is_public')::boolean, true) = true) OR
                c.created_by = auth.uid() OR
                public.is_chat_member(c.id, auth.uid()) OR
                public.is_developer(auth.uid())
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

CREATE POLICY "Редактировать сообщение или ставить реакции" 
    ON public.messages FOR UPDATE 
    USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = messages.chat_id AND (
                c.type = 'channel' OR
                public.is_chat_member(c.id, auth.uid()) OR
                public.is_chat_creator(c.id, auth.uid())
            )
        )
    );

CREATE POLICY "Удалять сообщение может отправитель, админ или разработчик" 
    ON public.messages FOR DELETE 
    USING (
        auth.uid() = sender_id OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        (SELECT created_by FROM public.chats WHERE id = messages.chat_id) = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_developer = true)
    );

-- ------------------------------------------------------------------------------
-- 7. КОММЕНТАРИИ К СООБЩЕНИЯМ КАНАЛОВ (message_comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_comments_msg_id ON public.message_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_comments_chat_id ON public.message_comments(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_comments_author ON public.message_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_message_comments_created_at ON public.message_comments(created_at ASC);

ALTER TABLE public.message_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read comments for accessible chats" 
    ON public.message_comments FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.chats c 
            WHERE c.id = message_comments.chat_id AND (
                (c.type = 'channel' AND COALESCE((c.settings->>'is_public')::boolean, true) = true) OR
                c.created_by = auth.uid() OR
                public.is_chat_member(c.id, auth.uid()) OR
                public.is_developer(auth.uid())
            )
        )
    );

CREATE POLICY "Allow insert comments" 
    ON public.message_comments FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow delete own comments" 
    ON public.message_comments FOR DELETE 
    TO authenticated 
    USING (
        auth.uid() = author_id OR 
        public.is_chat_creator(chat_id, auth.uid()) OR
        public.is_chat_admin(chat_id, auth.uid())
    );

CREATE OR REPLACE FUNCTION public.handle_message_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.messages
        SET comments_count = COALESCE(comments_count, 0) + 1
        WHERE id = NEW.message_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.messages
        SET comments_count = GREATEST(COALESCE(comments_count, 1) - 1, 0)
        WHERE id = OLD.message_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_message_comment_count ON public.message_comments;
CREATE TRIGGER trg_message_comment_count
    AFTER INSERT OR DELETE ON public.message_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_message_comment_count();

-- ------------------------------------------------------------------------------
-- 8. БЛОКИРОВКИ, ЖАЛОБЫ И СЕССИИ (blocked_users, reports, active_sessions)
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
DROP FUNCTION IF EXISTS public.get_ranked_feed(INT, INT);

CREATE OR REPLACE FUNCTION public.get_ranked_feed(
    page_offset INT DEFAULT 0,
    page_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_type TEXT,
    channel_id UUID,
    channel_title TEXT,
    channel_avatar_url TEXT,
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
        COALESCE(p.author_type, 'user') AS author_type,
        p.channel_id,
        ch.title AS channel_title,
        ch.avatar_url AS channel_avatar_url,
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
    LEFT JOIN public.chats ch ON ch.id = p.channel_id
    WHERE (
        p.channel_id IS NULL OR
        ch.id IS NULL OR
        ch.type != 'channel' OR
        COALESCE((ch.settings->>'is_public')::boolean, true) = true OR
        ch.created_by = auth.uid() OR
        public.is_chat_member(ch.id, auth.uid()) OR
        public.is_developer(auth.uid())
    )
    ORDER BY rank_score DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
$$;

-- ------------------------------------------------------------------------------
-- 9. ТРИГГЕРЫ: АВТОМАТИЧЕСКИЙ BOOTSTRAP ПОЛЬЗОВАТЕЛЯ
-- ------------------------------------------------------------------------------
-- При регистрации пользователя:
-- 1. Создается профиль (с сохранением статуса is_developer)
-- 2. Автоматически создается персональный чат "Избранное" (type: 'saved')
-- 3. Пользователь автоматически присоединяется к системному каналу "Канал Разработки"
--    (разработчикам выдается роль owner, обычным пользователям - member)
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_comments;

-- ------------------------------------------------------------------------------
-- 11. ХРАНИЛИЩЕ SUPABASE STORAGE (avatars, covers, media)
-- ------------------------------------------------------------------------------
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
DROP POLICY IF EXISTS "Public Access for avatars and media" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for avatars, covers and media" ON storage.objects;

CREATE POLICY "Public Access for avatars, covers and media" 
ON storage.objects FOR SELECT 
USING (bucket_id IN ('avatars', 'covers', 'media'));

DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars and covers" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars and covers" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id IN ('avatars', 'covers') 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can upload to media" ON storage.objects;

CREATE POLICY "Authenticated users can upload to media" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'media' 
    AND auth.role() = 'authenticated'
);

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
