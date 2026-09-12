// ==============================================================================
// ХРАНИЛИЩЕ МЕССЕНДЖЕРА И REALTIME ДИАЛОГОВ (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Chat, Message, ChatType, BlockedUser } from '@/types/database';
import { localStore } from '@/lib/supabase';

export const useChatStore = defineStore('chat', () => {
  const chats = ref<Chat[]>(localStore.getChats());
  const activeChatId = ref<string | null>(null);
  const activeMessages = ref<Message[]>([]);
  const isPeerTyping = ref(false);
  const blockedUsers = ref<BlockedUser[]>(localStore.getBlockedUsers());

  function refreshChats() {
    chats.value = localStore.getChats();
  }

  function selectChat(chatId: string | null) {
    activeChatId.value = chatId;
    if (chatId) {
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

  function sendMessage(params: {
    content?: string;
    media_urls?: string[];
    voice_url?: string;
    voice_duration?: number;
    voice_wave?: number[];
    forwarded_post_id?: string | null;
  }) {
    if (!activeChatId.value) return;

    const newMsg = localStore.sendMessage({
      chat_id: activeChatId.value,
      ...params
    });

    activeMessages.value = localStore.getMessages(activeChatId.value);
    refreshChats();

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

  function createChat(type: ChatType, title: string, description?: string, avatarUrl?: string) {
    const newChat = localStore.createChat(type, title, description, avatarUrl);
    refreshChats();
    selectChat(newChat.id);
    return newChat;
  }

  function blockUser(userId: string, reason?: string) {
    localStore.blockUser(userId, reason);
    blockedUsers.value = localStore.getBlockedUsers();
  }

  function unblockUser(userId: string) {
    localStore.unblockUser(userId);
    blockedUsers.value = localStore.getBlockedUsers();
  }

  function isUserBlocked(userId: string): boolean {
    return localStore.isUserBlocked(userId);
  }

  function reportUser(userId: string, reason: string, details?: string) {
    return localStore.reportUser(userId, reason, details);
  }

  // Realtime события
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
