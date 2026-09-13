-- ==============================================================================
-- МИГРАЦИЯ: РЕАКЦИИ, ЦИТИРОВАНИЕ/ОТВЕТЫ, ВЕТКИ КОММЕНТАРИЕВ К СООБЩЕНИЯМ КАНАЛОВ
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. КОЛОНКИ reactions, reply_to, comments_count В public.messages
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to JSONB DEFAULT NULL;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Заполняем дефолтные значения для существующих записей
UPDATE public.messages 
SET reactions = '{}'::jsonb 
WHERE reactions IS NULL;

UPDATE public.messages 
SET comments_count = 0 
WHERE comments_count IS NULL;

-- Индекс для быстрого чтения и поиска по реакциям
CREATE INDEX IF NOT EXISTS idx_messages_reactions 
ON public.messages USING gin (reactions);


-- ------------------------------------------------------------------------------
-- 2. ТАБЛИЦА КОММЕНТАРИЕВ К СООБЩЕНИЯМ КАНАЛОВ (message_comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Индексы для ускорения выборок веток комментариев
CREATE INDEX IF NOT EXISTS idx_message_comments_msg_id 
ON public.message_comments(message_id);

CREATE INDEX IF NOT EXISTS idx_message_comments_chat_id 
ON public.message_comments(chat_id);

CREATE INDEX IF NOT EXISTS idx_message_comments_author 
ON public.message_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_message_comments_created_at 
ON public.message_comments(created_at ASC);


-- ------------------------------------------------------------------------------
-- 3. АВТОМАТИЧЕСКИЙ СЧЕТЧИК comments_count В public.messages
-- ------------------------------------------------------------------------------
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
-- 4. НАСТРОЙКА RLS ДЛЯ public.message_comments
-- ------------------------------------------------------------------------------
ALTER TABLE public.message_comments ENABLE ROW LEVEL SECURITY;

-- 1) Чтение комментариев открыто всем авторизованным пользователям
DROP POLICY IF EXISTS "Allow read comments" ON public.message_comments;
CREATE POLICY "Allow read comments" 
ON public.message_comments FOR SELECT 
TO authenticated 
USING (true);

-- 2) Добавление комментариев авторизованным пользователем от своего имени
DROP POLICY IF EXISTS "Allow insert comments" ON public.message_comments;
CREATE POLICY "Allow insert comments" 
ON public.message_comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = author_id);

-- 3) Удаление комментариев: автор комментария или создатель/администратор чата
DROP POLICY IF EXISTS "Allow delete own comments" ON public.message_comments;
CREATE POLICY "Allow delete own comments" 
ON public.message_comments FOR DELETE 
TO authenticated 
USING (
    auth.uid() = author_id OR 
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid())
);


-- ------------------------------------------------------------------------------
-- 5. ОБНОВЛЕНИЕ RLS UPDATE ДЛЯ public.messages (УСТАНОВКА РЕАКЦИЙ)
-- ------------------------------------------------------------------------------
-- Разрешает автору редактировать сообщение, а также участникам чата и каналов ставить реакции
DROP POLICY IF EXISTS "Редактировать сообщение может только его отправитель" ON public.messages;
DROP POLICY IF EXISTS "Редактировать сообщение или ставить реакции" ON public.messages;

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


-- ------------------------------------------------------------------------------
-- 6. ВКЛЮЧЕНИЕ REALTIME ДЛЯ message_comments
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'message_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_comments;
    END IF;
END $$;
