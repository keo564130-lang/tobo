-- ==============================================================================
-- МИГРАЦИЯ: ПОЛНАЯ АКТУАЛИЗАЦИЯ И РЕМОНТ ДИАЛОГОВ, RLS, ФУНКЦИЙ И НАСТРОЕК ЧАТОВ
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- Файл: supabase/migrations/20260913_direct_chats_and_settings_repair.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. КОЛОНКА settings В ТАБЛИЦЕ public.chats И GIN-ИНДЕКС
-- ------------------------------------------------------------------------------
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS settings JSONB 
DEFAULT '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb;

-- Заполняем дефолтными настройками существующие записи, где settings NULL
UPDATE public.chats 
SET settings = '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb 
WHERE settings IS NULL;

-- Создаем GIN-индекс для мгновенного поиска по ключам JSONB
CREATE INDEX IF NOT EXISTS idx_chats_settings 
ON public.chats USING gin (settings);


-- ------------------------------------------------------------------------------
-- 2. ВСПОМОГАТЕЛЬНЫЕ SECURITY DEFINER ФУНКЦИИ ДЛЯ ИСКЛЮЧЕНИЯ РЕКУРСИИ В RLS
-- ------------------------------------------------------------------------------

-- Проверка разработчика tobo
CREATE OR REPLACE FUNCTION public.is_developer(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND is_developer = true
    );
$$;

-- Проверка создателя чата в обход RLS
CREATE OR REPLACE FUNCTION public.is_chat_creator(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = _chat_id AND created_by = _user_id
    );
$$;

-- Проверка членства в чате в обход RLS
CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = _chat_id AND user_id = _user_id
    );
$$;

-- Проверка администратора чата (создатель чата ВСЕГДА признается админом)
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


-- ------------------------------------------------------------------------------
-- 3. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ public.chats
-- ------------------------------------------------------------------------------
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- SELECT: создатель видит чат СРАЗУ же (даже до вставки в chat_members),
-- либо участник состоит в чате, либо канал публичный, либо разработчик
DROP POLICY IF EXISTS "Пользователь видит только те чаты, в которых состоит, или публичные каналы" ON public.chats;
DROP POLICY IF EXISTS "Chats visibility policy" ON public.chats;

CREATE POLICY "Chats visibility policy" 
ON public.chats FOR SELECT 
USING (
    created_by = auth.uid() OR
    public.is_chat_member(id, auth.uid()) OR
    (type = 'channel' AND COALESCE((settings->>'is_public')::boolean, true) = true) OR
    public.is_developer(auth.uid())
);

-- INSERT: любой авторизованный пользователь может создать чат, где он является created_by
DROP POLICY IF EXISTS "Создавать чат может любой авторизованный пользователь" ON public.chats;
DROP POLICY IF EXISTS "Chats insert policy" ON public.chats;

CREATE POLICY "Chats insert policy" 
ON public.chats FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- UPDATE: создатель, админ или разработчик
DROP POLICY IF EXISTS "Обновлять чат могут владельцы и администраторы" ON public.chats;
DROP POLICY IF EXISTS "Chats update policy" ON public.chats;

CREATE POLICY "Chats update policy" 
ON public.chats FOR UPDATE 
USING (
    created_by = auth.uid() OR
    public.is_chat_admin(id, auth.uid()) OR
    public.is_developer(auth.uid())
);

-- DELETE: создатель чата или разработчик
DROP POLICY IF EXISTS "Chats delete policy" ON public.chats;

CREATE POLICY "Chats delete policy" 
ON public.chats FOR DELETE 
USING (
    created_by = auth.uid() OR
    public.is_developer(auth.uid())
);


-- ------------------------------------------------------------------------------
-- 4. ОБНОВЛЕНИЕ RLS ПОЛИТИК ДЛЯ public.chat_members
-- ------------------------------------------------------------------------------
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- SELECT: сам пользователь, создатель чата, члены чата, админы или разработчик
DROP POLICY IF EXISTS "Участники чатов видны членам чата (для каналов - только админам)" ON public.chat_members;
DROP POLICY IF EXISTS "Chat members select policy" ON public.chat_members;

CREATE POLICY "Chat members select policy" 
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

-- INSERT: создатель чата, админ чата, сам пользователь (для сохраненных/приглашений) или разработчик
-- Это гарантирует, что создатель диалога/группы БЕСПРЕПЯТСТВЕННО добавляет собеседника!
DROP POLICY IF EXISTS "Добавлять участников могут админы или пользователи в личный диалог" ON public.chat_members;
DROP POLICY IF EXISTS "Разрешить добавление участников в чат" ON public.chat_members;
DROP POLICY IF EXISTS "Chat members insert policy" ON public.chat_members;

CREATE POLICY "Chat members insert policy" 
ON public.chat_members FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid()) OR
    public.is_developer(auth.uid())
);

-- UPDATE: создатель, админ или разработчик
DROP POLICY IF EXISTS "Обновлять участников могут создатели и админы" ON public.chat_members;
DROP POLICY IF EXISTS "Chat members update policy" ON public.chat_members;

CREATE POLICY "Chat members update policy" 
ON public.chat_members FOR UPDATE 
USING (
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid()) OR
    public.is_developer(auth.uid())
);

-- DELETE: сам участник (выход из чата), создатель чата, админ или разработчик
DROP POLICY IF EXISTS "Админы могут удалять участников или участник может покинуть чат сам" ON public.chat_members;
DROP POLICY IF EXISTS "Chat members delete policy" ON public.chat_members;

CREATE POLICY "Chat members delete policy" 
ON public.chat_members FOR DELETE 
USING (
    auth.uid() = user_id OR
    public.is_chat_creator(chat_id, auth.uid()) OR
    public.is_chat_admin(chat_id, auth.uid()) OR
    public.is_developer(auth.uid())
);


-- ------------------------------------------------------------------------------
-- 5. ПРОВЕРКА И ВКЛЮЧЕНИЕ REALTIME ДЛЯ chats, chat_members, messages
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;
