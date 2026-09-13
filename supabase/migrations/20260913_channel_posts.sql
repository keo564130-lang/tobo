-- ==============================================================================
-- МИГРАЦИЯ: ПУБЛИКАЦИЯ ПОСТОВ ОТ ИМЕНИ КАНАЛА (author_type, channel_id)
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. КОЛОНКИ author_type И channel_id В public.posts
-- ------------------------------------------------------------------------------
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'user' CHECK (author_type IN ('user', 'channel'));

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.chats(id) ON DELETE CASCADE DEFAULT NULL;

-- Заполняем дефолтное значение для существующих постов
UPDATE public.posts 
SET author_type = 'user' 
WHERE author_type IS NULL;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON public.posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_type ON public.posts(author_type);


-- ------------------------------------------------------------------------------
-- 2. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ public.posts
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Создавать посты могут только их авторы" ON public.posts;
DROP POLICY IF EXISTS "Создавать посты могут авторы или администраторы каналов" ON public.posts;

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

DROP POLICY IF EXISTS "Редактировать посты могут только их авторы" ON public.posts;
DROP POLICY IF EXISTS "Редактировать посты могут авторы или администраторы каналов" ON public.posts;

CREATE POLICY "Редактировать посты могут авторы или администраторы каналов" 
ON public.posts FOR UPDATE 
USING (
    auth.uid() = author_id OR
    (channel_id IS NOT NULL AND (
        public.is_chat_creator(channel_id, auth.uid()) OR
        public.is_chat_admin(channel_id, auth.uid())
    ))
);

DROP POLICY IF EXISTS "Удалять посты могут только их авторы" ON public.posts;
DROP POLICY IF EXISTS "Удалять посты могут авторы или администраторы каналов" ON public.posts;

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
-- 3. ОБНОВЛЕНИЕ ФУНКЦИИ get_ranked_feed
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
    ORDER BY rank_score DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
$$;
