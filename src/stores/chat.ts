// ==============================================================================
// ХРАНИЛИЩЕ МЕССЕНДЖЕРА С ПОДДЕРЖКОЙ SUPABASE REALTIME И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Chat, Message, ChatType, BlockedUser } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>(localStore.getChats());
  const activeChatId = ref<string | null>(null);
  const activeMessages = ref<Message[]>([]);
  const isPeerTyping = ref(false);
  const blockedUsers = ref<BlockedUser[]>(localStore.getBlockedUsers());

  async function refreshChats() {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*, chat_members(*)');
        if (!error && data && data.length > 0) {
          chats.value = data.map((c: any) => ({
            id: c.id,
            type: c.type as ChatType,
            title: c.title,
            avatar_url: c.avatar_url,
            description: c.description,
            created_by: c.created_by,
            created_at: c.created_at,
            members_count: c.chat_members?.length || 1,
            subscribers_count: c.type === 'channel' ? 1240 : undefined,
            unread_count: 0
          }));
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch chats failed, using localStore:', err);
      }
    }
    chats.value = localStore.getChats();
  }

  async function selectChat(chatId: string | null) {
    activeChatId.value = chatId;
    if (chatId) {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });
          if (!error && data && data.length > 0) {
            activeMessages.value = data;
            return;
          }
        } catch (err) {
          console.warn('Supabase fetch messages failed, using localStore:', err);
        }
      }

      activeMessages.value = localStore.getMessages(chatId);
      localStore.markMessagesAsRead(chatId);
      refreshChats();
    } else {
      activeMessages.value = [];
    }
  }

  const activeChat = computed(() => {
    if (!activeChatId.value) return null;
    return chats.value.find(c => c.id === activeChatId.value) || null;
  });

  async function sendMessage(params: {
    content?: string;
    media_urls?: string[];
    voice_url?: string;
    voice_duration?: number;
    voice_wave?: number[];
    forwarded_post_id?: string | null;
  }) {
    if (!activeChatId.value) return;

    // Оптимистичное сохранение локально
    const newMsg = localStore.sendMessage({
      chat_id: activeChatId.value,
      ...params
    });

    activeMessages.value = localStore.getMessages(activeChatId.value);
    refreshChats();

    // Отправка в реальный Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('messages').insert({
          chat_id: activeChatId.value,
          content: params.content,
          media_urls: params.media_urls || [],
          voice_url: params.voice_url,
          voice_duration: params.voice_duration,
          voice_wave: params.voice_wave,
          forwarded_post_id: params.forwarded_post_id
        });
      } catch (err) {
        console.warn('Supabase message insert failed, saved to local cache:', err);
      }
    }

    // Эмуляция индикатора набора ответа собеседником (в диалоге с Мишей)
    if (activeChatId.value === 'chat-direct-misha-003') {
      setTimeout(() => {
        isPeerTyping.value = true;
      }, 500);
      setTimeout(() => {
        isPeerTyping.value = false;
        if (activeChatId.value === 'chat-direct-misha-003') {
          activeMessages.value = localStore.getMessages(activeChatId.value);
          refreshChats();
        }
      }, 1600);
    }

    return newMsg;
  }

  async function createChat(type: ChatType, title: string, description?: string, avatarUrl?: string) {
    const newChat = localStore.createChat(type, title, description, avatarUrl);
    refreshChats();
    selectChat(newChat.id);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('chats').insert({
          type,
          title,
          description,
          avatar_url: avatarUrl
        });
      } catch (err) {
        console.warn('Supabase createChat failed:', err);
      }
    }

    return newChat;
  }

  function blockUser(userId: string, reason?: string) {
    localStore.blockUser(userId, reason);
    blockedUsers.value = localStore.getBlockedUsers();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('blocked_users').insert({ blocked_id: userId, reason }).then();
    }
  }

  function unblockUser(userId: string) {
    localStore.unblockUser(userId);
    blockedUsers.value = localStore.getBlockedUsers();

    if (isSupabaseConfigured() && supabase) {
      supabase.from('blocked_users').delete().eq('blocked_id', userId).then();
    }
  }

  function isUserBlocked(userId: string): boolean {
    return localStore.isUserBlocked(userId);
  }

  function reportUser(userId: string, reason: string, details?: string) {
    if (isSupabaseConfigured() && supabase) {
      supabase.from('reports').insert({ reported_id: userId, reason, details }).then();
    }
    return localStore.reportUser(userId, reason, details);
  }

  // Realtime WebSocket подписка Supabase Realtime
  if (isSupabaseConfigured() && supabase) {
    try {
      supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: any) => {
            if (activeChatId.value && payload.new.chat_id === activeChatId.value) {
              activeMessages.value.push(payload.new);
            }
            refreshChats();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription failed:', err);
    }
  }

  // Локальная подписка
  localStore.subscribe((event) => {
    if (event.type === 'new_message' || event.type === 'new_chat' || event.type === 'messages_read') {
      refreshChats();
      if (activeChatId.value) {
        activeMessages.value = localStore.getMessages(activeChatId.value);
      }
    }
  });

  return {
    chats,
    activeChatId,
    activeChat,
    activeMessages,
    isPeerTyping,
    blockedUsers,
    refreshChats,
    selectChat,
    sendMessage,
    createChat,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser
  };
});
