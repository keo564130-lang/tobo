-- ==============================================================================
-- МИГРАЦИЯ: ЗАЩИТА ЗАКРЫТЫХ КАНАЛОВ (is_public === false)
-- Сообщения и публикации закрытых каналов доступны только участникам, создателю или разработчикам tobo
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- Специалист: security_agent
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ВСПОМОГАТЕЛЬНАЯ SECURITY DEFINER ФУНКЦИЯ ПРОВЕРКИ СТАТУСА РАЗРАБОТЧИКА
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_developer(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT COALESCE((
        SELECT is_developer 
        FROM public.profiles 
        WHERE id = _user_id
    ), false);
$$;


-- ------------------------------------------------------------------------------
-- 2. ОБНОВЛЕНИЕ RLS ПОЛИТИКИ SELECT ДЛЯ public.chats
-- Закрытые каналы (is_public = false) видны ТОЛЬКО создателю, участникам и разработчикам
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Пользователь видит только те чаты, в которых состоит, или публичные каналы" ON public.chats;

CREATE POLICY "Пользователь видит только те чаты, в которых состоит, или публичные каналы" 
ON public.chats FOR SELECT 
USING (
    (type = 'channel' AND COALESCE((settings->>'is_public')::boolean, true) = true) OR
    created_by = auth.uid() OR
    public.is_chat_member(id, auth.uid()) OR
    public.is_developer(auth.uid())
);


-- ------------------------------------------------------------------------------
-- 3. ОБНОВЛЕНИЕ RLS ПОЛИТИКИ SELECT ДЛЯ public.messages
-- Сообщения закрытых каналов видны ТОЛЬКО создателю, участникам и разработчикам
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Пользователь видит сообщения только в чатах, где он состоит или в публичных каналах" ON public.messages;

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


-- ------------------------------------------------------------------------------
-- 4. ОБНОВЛЕНИЕ RLS ПОЛИТИКИ SELECT ДЛЯ public.posts
-- Публикации от имени закрытых каналов не могут быть прочитаны посторонними пользователями
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Просмотр постов открыт всем авторизованным" ON public.posts;
DROP POLICY IF EXISTS "Просмотр постов открыт всем для обычных постов и публичных каналов, для закрытых каналов - участникам и разработчикам" ON public.posts;

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


-- ------------------------------------------------------------------------------
-- 5. ОБНОВЛЕНИЕ RLS ПОЛИТИКИ SELECT ДЛЯ public.message_comments
-- Комментарии к публикациям канала видны только тем, кто имеет доступ к чату
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read comments" ON public.message_comments;
DROP POLICY IF EXISTS "Allow read comments for accessible chats" ON public.message_comments;

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


-- ------------------------------------------------------------------------------
-- 6. ОБНОВЛЕНИЕ ФУНКЦИИ get_ranked_feed ДЛЯ ФИЛЬТРАЦИИ ЗАКРЫТЫХ КАНАЛОВ
-- ------------------------------------------------------------------------------
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
LANGUAGE sql STABLE SECURITY DEFINER AS $$
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
