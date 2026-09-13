// ==============================================================================
// ХРАНИЛИЩЕ МЕССЕНДЖЕРА С ПОДДЕРЖКОЙ SUPABASE REALTIME И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Chat, Message, ChatType, BlockedUser, Post } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>(isSupabaseConfigured() ? [] : localStore.getChats());
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
        if (!error && data) {
          chats.value = data.map((c: any) => ({
            id: c.id,
            type: c.type as ChatType,
            title: c.title,
            avatar_url: c.avatar_url,
            description: c.description,
            created_by: c.created_by,
            created_at: c.created_at,
            members_count: c.chat_members?.length || 1,
            subscribers_count: c.type === 'channel' ? (c.chat_members?.length || 1) : undefined,
            unread_count: 0
          }));
          return;
        } else {
          // При ошибке или отсутствии чатов при активном Supabase — строго пустой массив!
          chats.value = [];
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch chats failed:', err);
        chats.value = [];
        return;
      }
    }
    if (!isSupabaseConfigured()) {
      chats.value = localStore.getChats();
    }
  }

  async function selectChat(chatId: string | null) {
    activeChatId.value = chatId;
    if (chatId) {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*, sender:profiles(*)')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });
          if (!error && data) {
            activeMessages.value = data;
            return;
          }
          activeMessages.value = [];
          return;
        } catch (err) {
          console.warn('Supabase fetch messages failed:', err);
          activeMessages.value = [];
          return;
        }
      }
      if (!isSupabaseConfigured()) {
        activeMessages.value = localStore.getMessages(chatId);
        localStore.markMessagesAsRead(chatId);
        refreshChats();
      }
    } else {
      activeMessages.value = [];
    }
  }

  const activeChat = computed(() => {
    if (!activeChatId.value) return null;
    return chats.value.find(c => c.id === activeChatId.value) || null;
  });

  async function sendMessage(params: {
    chat_id?: string;
    content?: string;
    media_urls?: string[];
    voice_url?: string;
    voice_duration?: number;
    voice_wave?: number[];
    forwarded_post_id?: string | null;
    forwarded_post?: Post | null;
  }) {
    const targetChatId = params.chat_id || activeChatId.value;
    if (!targetChatId) return;

    // Supabase режим
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabase.from('messages').insert({
          chat_id: targetChatId,
          sender_id: authUser.id,
          content: params.content,
          media_urls: params.media_urls || [],
          voice_url: params.voice_url,
          voice_duration: params.voice_duration,
          voice_wave: params.voice_wave,
          forwarded_post_id: params.forwarded_post_id || params.forwarded_post?.id || null
        }).select('*, sender:profiles(*)').single();

        if (!error && data) {
          const formattedMsg: Message = {
            ...data,
            forwarded_post: params.forwarded_post || null
          };
          if (targetChatId === activeChatId.value) {
            activeMessages.value.push(formattedMsg);
          }
          await refreshChats();
          return formattedMsg;
        }
      } catch (err) {
        console.warn('Supabase message insert failed:', err);
      }
      return;
    }

    // Офлайн-режим
    const newMsg = localStore.sendMessage({
      chat_id: targetChatId,
      ...params,
      forwarded_post_id: params.forwarded_post_id || params.forwarded_post?.id || null,
      forwarded_post: params.forwarded_post || null
    });

    if (targetChatId === activeChatId.value) {
      activeMessages.value = localStore.getMessages(targetChatId);
    }
    refreshChats();

    // Эмуляция индикатора набора ответа собеседником (в диалоге с Мишей только в офлайн режиме)
    if (targetChatId === 'chat-direct-misha-003') {
      setTimeout(() => {
        isPeerTyping.value = true;
      }, 500);
      setTimeout(() => {
        isPeerTyping.value = false;
        if (targetChatId === 'chat-direct-misha-003') {
          activeMessages.value = localStore.getMessages(targetChatId);
          refreshChats();
        }
      }, 1600);
    }

    return newMsg;
  }

  async function createChat(type: ChatType, title: string, description?: string, avatarUrl?: string) {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return null;

        const { data: chatData, error: chatError } = await supabase.from('chats').insert({
          type,
          title,
          description,
          avatar_url: avatarUrl,
          created_by: authUser.id
        }).select().single();

        if (!chatError && chatData) {
          await supabase.from('chat_members').insert({
            chat_id: chatData.id,
            user_id: authUser.id,
            role: 'owner'
          });

          await refreshChats();
          await selectChat(chatData.id);
          return chatData;
        }
      } catch (err) {
        console.warn('Supabase createChat failed:', err);
      }
      return null;
    }

    // Офлайн-режим
    const newChat = localStore.createChat(type, title, description, avatarUrl);
    refreshChats();
    selectChat(newChat.id);
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

  async function deleteMessage(chatId: string, messageId: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('messages').delete().eq('id', messageId);
        if (error) {
          console.warn('Supabase deleteMessage error:', error);
          return false;
        }
      } catch (err) {
        console.warn('Supabase deleteMessage error:', err);
        return false;
      }
    } else {
      localStore.deleteMessage(chatId, messageId);
    }
    activeMessages.value = activeMessages.value.filter(m => m.id !== messageId);
    await refreshChats();
    return true;
  }

  // Локальная подписка только в офлайн режиме
  localStore.subscribe((event) => {
    if (!isSupabaseConfigured()) {
      if (event.type === 'new_message' || event.type === 'new_chat' || event.type === 'messages_read' || event.type === 'message_deleted') {
        refreshChats();
        if (activeChatId.value) {
          activeMessages.value = localStore.getMessages(activeChatId.value);
        }
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
    deleteMessage,
    createChat,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser
  };
});
