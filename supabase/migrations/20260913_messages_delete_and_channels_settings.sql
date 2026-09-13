-- ==============================================================================
-- МИГРАЦИЯ: УДАЛЕНИЕ СООБЩЕНИЙ (АДМИНЫ, ВЛАДЕЛЬЦЫ, РАЗРАБОТЧИКИ) И НАСТРОЙКИ ЧАТОВ
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- Дата: 2026-09-13
-- ==============================================================================

-- 1. Колонка settings в public.chats и GIN-индекс
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS settings JSONB 
DEFAULT '{"disable_comments": false, "allow_reactions": true, "can_post_role": "admins", "is_public": true}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chats_settings 
ON public.chats USING gin (settings);

-- 2. Обновление RLS политики DELETE для public.messages
-- Удалять сообщение может отправитель, админ чата, создатель чата или системный разработчик tobo
DROP POLICY IF EXISTS "Удалять сообщение может его отправитель или админ чата" ON public.messages;
DROP POLICY IF EXISTS "Удалять сообщение может отправитель, админ или разработчик" ON public.messages;

CREATE POLICY "Удалять сообщение может отправитель, админ или разработчик" 
    ON public.messages FOR DELETE 
    USING (
        auth.uid() = sender_id OR
        public.is_chat_admin(chat_id, auth.uid()) OR
        (SELECT created_by FROM public.chats WHERE id = messages.chat_id) = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_developer = true)
    );
