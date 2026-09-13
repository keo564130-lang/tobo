// ==============================================================================
// ХРАНИЛИЩЕ МЕССЕНДЖЕРА С ПОДДЕРЖКОЙ SUPABASE REALTIME И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Chat, Message, ChatType, BlockedUser, Post, Profile, MessageComment } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from './auth';

export function isMockChatId(id: string): boolean {
  if (!id) return false;
  return (
    id.startsWith('chat-direct-misha') ||
    id.startsWith('chat-group-design') ||
    id.startsWith('chat-group-flood')
  );
}

export function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadCachedChats(): Chat[] {
  try {
    const raw = localStorage.getItem('tobo_chats_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c: Chat) => !isMockChatId(c.id));
      }
    }
  } catch (e) {
    console.warn('Failed to load tobo_chats_cache:', e);
  }
  return localStore.getChats().filter(c => !isMockChatId(c.id));
}

export function canAccessChat(chat: Chat, currentUserId?: string, isDeveloper?: boolean): boolean {
  if (!chat) return false;
  // Личные диалоги, семейные группы и сохраненные заметки имеют свои стандартные правила
  if (chat.type !== 'channel') {
    if (isDeveloper) return true;
    if (chat.type === 'saved') return chat.created_by === currentUserId;
    if (chat.created_by === currentUserId) return true;
    if (chat.members && currentUserId) {
      return chat.members.some(m => m.user_id === currentUserId);
    }
    return true;
  }

  // КАНАЛ: проверяем настройку приватности is_public
  const isPublic = chat.settings?.is_public ?? true;
  if (isPublic) return true;

  // Если канал ЗАКРЫТЫЙ (is_public === false):
  // Доступ имеют только создатель канала, участники/подписчики или разработчики tobo
  if (!currentUserId) return false;
  if (isDeveloper) return true;
  if (chat.created_by === currentUserId) return true;
  if (chat.members && chat.members.some(m => m.user_id === currentUserId)) return true;

  return false;
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore();

  function checkChatAccess(chat: Chat): boolean {
    return canAccessChat(chat, authStore.user?.id, authStore.isDeveloper);
  }

  const chats = ref<Chat[]>(loadCachedChats().filter(c => canAccessChat(c, authStore.user?.id, authStore.isDeveloper)));
  const activeChatId = ref<string | null>(null);
  const activeMessages = ref<Message[]>([]);
  const isPeerTyping = ref(false);
  const blockedUsers = ref<BlockedUser[]>(localStore.getBlockedUsers());
  const channelCommentsMap = ref<Record<string, MessageComment[]>>({});

  async function refreshChats() {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*, chat_members(*)');

        if (!error && data) {
          const chatIds = data.map((c: any) => c.id);
          const lastMsgMap = new Map<string, Message>();

          if (chatIds.length > 0) {
            try {
              const { data: recentMsgs } = await supabase
                .from('messages')
                .select('*, sender:profiles(*)')
                .in('chat_id', chatIds)
                .order('created_at', { ascending: false });

              if (recentMsgs) {
                for (const m of recentMsgs) {
                  if (!lastMsgMap.has(m.chat_id)) {
                    lastMsgMap.set(m.chat_id, m);
                  }
                  if (m.sender) {
                    localStore.saveProfile(m.sender);
                  }
                }
              }
            } catch (mErr) {
              console.warn('Supabase fetch recent messages for chats failed:', mErr);
            }
          }

          const remoteChats: Chat[] = data.map((c: any) => ({
            id: c.id,
            type: c.type as ChatType,
            title: c.title,
            avatar_url: c.avatar_url,
            description: c.description,
            settings: c.settings,
            created_by: c.created_by,
            created_at: c.created_at,
            members_count: c.chat_members?.length || 1,
            subscribers_count: c.type === 'channel' ? (c.chat_members?.length || 1) : undefined,
            members: c.chat_members,
            last_message: lastMsgMap.get(c.id) || undefined,
            unread_count: 0
          })).filter(checkChatAccess).filter((c: Chat) => !isMockChatId(c.id));

          // Предзагружаем профили участников для корректного отображения имен собеседников
          const userIdsToFetch = new Set<string>();
          for (const c of data) {
            if (c.chat_members) {
              for (const m of c.chat_members) {
                if (m.user_id && m.user_id !== authStore.user?.id && !localStore.getProfile(m.user_id)) {
                  userIdsToFetch.add(m.user_id);
                }
              }
            }
            if (c.created_by && c.created_by !== authStore.user?.id && !localStore.getProfile(c.created_by)) {
              userIdsToFetch.add(c.created_by);
            }
          }
          if (userIdsToFetch.size > 0) {
            try {
              const { data: profs } = await supabase
                .from('profiles')
                .select('*')
                .in('id', Array.from(userIdsToFetch));
              if (profs) {
                profs.forEach((p: Profile) => localStore.saveProfile(p));
              }
            } catch (pErr) {
              console.warn('Supabase prefetch profiles failed:', pErr);
            }
          }

          const remoteIds = new Set(remoteChats.map(c => c.id));
          // Сохраняем все локальные/кэшированные чаты, которых пока нет в удаленной выборке
          const localOnly = chats.value.filter(c => !remoteIds.has(c.id) && !isMockChatId(c.id));
          const localStoreChats = localStore.getChats().filter(checkChatAccess).filter(c => !isMockChatId(c.id));
          for (const lc of localStoreChats) {
            if (!remoteIds.has(lc.id) && !localOnly.some(c => c.id === lc.id)) {
              localOnly.push(lc);
            }
          }

          chats.value = [...remoteChats, ...localOnly].filter(c => !isMockChatId(c.id));

          try {
            localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
          } catch {}

          if (authStore.user?.id && !chatsListChannel.value) {
            subscribeToChatsList();
          }
          return;
        } else {
          // Если чатов нет и кэш пустой — проверяем локальное хранилище
          if (!chats.value.length) {
            chats.value = localStore.getChats().filter(checkChatAccess).filter(c => !isMockChatId(c.id));
          }
          if (authStore.user?.id && !chatsListChannel.value) {
            subscribeToChatsList();
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch chats failed:', err);
        return;
      }
    }

    if (!isSupabaseConfigured()) {
      chats.value = localStore.getChats().filter(checkChatAccess).filter(c => !isMockChatId(c.id));
      try {
        localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
      } catch {}
    }
  }

  const activeChatChannel = shallowRef<any>(null);
  const chatsListChannel = shallowRef<any>(null);

  function unsubscribeFromChatsList() {
    if (chatsListChannel.value && supabase) {
      try {
        supabase.removeChannel(chatsListChannel.value);
      } catch (e) {
        console.warn('removeChannel chatsListChannel error:', e);
      }
      chatsListChannel.value = null;
    }
  }

  function subscribeToChatsList() {
    if (!isSupabaseConfigured() || !supabase) return;
    const authUserId = authStore.user?.id;
    if (!authUserId) return;

    if (chatsListChannel.value) return;

    const channel = supabase.channel(`user_chats_${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${authUserId}`
        },
        async () => {
          console.log('[Realtime] Added to chat, refreshing chats list...');
          await refreshChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${authUserId}`
        },
        async () => {
          console.log('[Realtime] Removed from chat, refreshing chats list...');
          await refreshChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        async () => {
          await refreshChats();
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to user_chats_${authUserId}`);
        }
      });

    chatsListChannel.value = channel;
  }

  function unsubscribeFromActiveChat() {
    if (activeChatChannel.value && supabase) {
      try {
        supabase.removeChannel(activeChatChannel.value);
      } catch (e) {
        console.warn('removeChannel error:', e);
      }
      activeChatChannel.value = null;
    }
  }

  function subscribeToActiveChat(chatId: string) {
    if (!chatId || !isSupabaseConfigured() || !supabase) return;

    unsubscribeFromActiveChat();

    const channel = supabase.channel(`chat_messages_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg || !newMsg.id) return;

          if (!activeMessages.value.some(m => m.id === newMsg.id)) {
            let sender = localStore.getProfile(newMsg.sender_id);
            if (!sender && supabase) {
              try {
                const { data: pData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', newMsg.sender_id)
                  .single();
                if (pData) {
                  sender = pData;
                  localStore.saveProfile(pData);
                }
              } catch (e) {}
            }

            const formattedMsg: Message = {
              ...newMsg,
              sender: sender || undefined,
              reactions: newMsg.reactions || {},
              comments_count: newMsg.comments_count || 0
            };

            activeMessages.value.push(formattedMsg);

            try {
              localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
            } catch {}

            const targetChat = chats.value.find(c => c.id === chatId);
            if (targetChat) {
              targetChat.last_message = formattedMsg;
              try {
                localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
              } catch {}
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            activeMessages.value = activeMessages.value.filter(m => m.id !== deletedId);
            try {
              localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
            } catch {}
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          const idx = activeMessages.value.findIndex(m => m.id === updated.id);
          if (idx !== -1) {
            activeMessages.value[idx] = {
              ...activeMessages.value[idx],
              ...updated,
              sender: activeMessages.value[idx].sender || localStore.getProfile(updated.sender_id)
            };
            try {
              localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
            } catch {}
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to chat_messages_${chatId}`);
        }
      });

    activeChatChannel.value = channel;
  }

  async function pollNewMessages(chatId: string) {
    if (!chatId || !isSupabaseConfigured() || !supabase) return;
    try {
      let query = supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (activeMessages.value.length > 0) {
        const lastMsg = activeMessages.value[activeMessages.value.length - 1];
        if (lastMsg?.created_at) {
          query = query.gt('created_at', lastMsg.created_at);
        }
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let hasNew = false;
        for (const m of data) {
          if (!activeMessages.value.some(existing => existing.id === m.id)) {
            const formatted: Message = {
              ...m,
              reactions: m.reactions || {},
              comments_count: m.comments_count || 0
            };
            activeMessages.value.push(formatted);
            if (m.sender) {
              localStore.saveProfile(m.sender);
            }
            hasNew = true;
          }
        }
        if (hasNew) {
          try {
            localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
          } catch {}
          const targetChat = chats.value.find(c => c.id === chatId);
          if (targetChat && activeMessages.value.length > 0) {
            targetChat.last_message = activeMessages.value[activeMessages.value.length - 1];
            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('pollNewMessages error:', e);
    }
  }

  async function selectChat(chatId: string | null) {
    if (!chatId) {
      unsubscribeFromActiveChat();
      activeChatId.value = null;
      activeMessages.value = [];
      return;
    }

    // Проверка прав доступа: для закрытых каналов доступ разрешен только участникам, создателю или разработчикам
    let currentChat = chats.value.find(c => c.id === chatId);
    if (!currentChat) {
      currentChat = localStore.getChatById(chatId);
    }
    if (!currentChat) {
      try {
        const raw = localStorage.getItem('tobo_chats_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            currentChat = parsed.find((c: Chat) => c.id === chatId);
          }
        }
      } catch {}
    }
    if (currentChat && !checkChatAccess(currentChat)) {
      unsubscribeFromActiveChat();
      activeMessages.value = [];
      activeChatId.value = null;
      console.warn(`[Security] Access denied: channel #${chatId} is private.`);
      return;
    }

    activeChatId.value = chatId;
    subscribeToActiveChat(chatId);

    // 1) СРАЗУ же загружаем кэшированные сообщения для 0-секундного ожидания
    try {
      const cached = localStorage.getItem('tobo_chat_msgs_' + chatId);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          activeMessages.value = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached chat messages:', e);
    }

    // 2) В фоновом режиме запрашиваем свежие данные из Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          activeMessages.value = data;
          try {
            localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(data));
          } catch {}

          const last = data[data.length - 1];
          const ch = chats.value.find(c => c.id === chatId);
          if (ch) {
            ch.last_message = last;
            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch messages failed:', err);
      }
    }

    // 3) Офлайн / локальные сообщения
    const offlineMsgs = localStore.getMessages(chatId);
    if (offlineMsgs.length > 0 || activeMessages.value.length === 0) {
      activeMessages.value = offlineMsgs;
      try {
        localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(offlineMsgs));
      } catch {}
    }
    localStore.markMessagesAsRead(chatId);
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
    reply_to?: { id: string; sender_name: string; text: string } | null;
  }) {
    const targetChatId = params.chat_id || activeChatId.value;
    if (!targetChatId) return;

    if (!authStore.isAuthenticated) {
      authStore.openAuthModal('signin');
      return;
    }

    // Supabase режим
    if (isSupabaseConfigured() && supabase) {
      try {
        let authUserId = authStore.user?.id;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          authUserId = authUser.id;
        }
        if (authUserId) {
          const { data, error } = await supabase.from('messages').insert({
            chat_id: targetChatId,
            sender_id: authUserId,
            content: params.content,
            media_urls: params.media_urls || [],
            voice_url: params.voice_url,
            voice_duration: params.voice_duration,
            voice_wave: params.voice_wave,
            forwarded_post_id: params.forwarded_post_id || params.forwarded_post?.id || null,
            reply_to: params.reply_to || null
          }).select('*, sender:profiles(*)').single();

          if (!error && data) {
            const formattedMsg: Message = {
              ...data,
              forwarded_post: params.forwarded_post || null,
              reply_to: params.reply_to || data.reply_to || null,
              reactions: data.reactions || {},
              comments_count: data.comments_count || 0
            };

            if (targetChatId === activeChatId.value) {
              // Предотвращение дублирования
              if (!activeMessages.value.some(m => m.id === formattedMsg.id)) {
                activeMessages.value.push(formattedMsg);
              }
              try {
                localStorage.setItem('tobo_chat_msgs_' + targetChatId, JSON.stringify(activeMessages.value));
              } catch {}
            }

            const targetChat = chats.value.find(c => c.id === targetChatId);
            if (targetChat) {
              targetChat.last_message = formattedMsg;
              try {
                localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
              } catch {}
            }

            refreshChats();
            return formattedMsg;
          }
        }
      } catch (err) {
        console.warn('Supabase message insert failed, fallback to localStore:', err);
      }
    }

    // Офлайн-режим / Локальный fallback
    const newMsg = localStore.sendMessage({
      chat_id: targetChatId,
      ...params,
      forwarded_post_id: params.forwarded_post_id || params.forwarded_post?.id || null,
      forwarded_post: params.forwarded_post || null,
      reply_to: params.reply_to || null
    });

    if (targetChatId === activeChatId.value) {
      const offlineMsgs = localStore.getMessages(targetChatId);
      activeMessages.value = offlineMsgs;
      try {
        localStorage.setItem('tobo_chat_msgs_' + targetChatId, JSON.stringify(offlineMsgs));
      } catch {}
    }

    const targetChat = chats.value.find(c => c.id === targetChatId);
    if (targetChat) {
      targetChat.last_message = newMsg;
      try {
        localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
      } catch {}
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
        let authUserId = authStore.user?.id;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          authUserId = authUser.id;
        }
        if (authUserId) {
          const newChatId = generateUUID();
          const { error: chatError } = await supabase.from('chats').insert({
            id: newChatId,
            type,
            title,
            description,
            avatar_url: avatarUrl,
            created_by: authUserId
          });

          if (!chatError) {
            await supabase.from('chat_members').insert({
              chat_id: newChatId,
              user_id: authUserId,
              role: 'owner'
            });

            const createdChat: Chat = {
              id: newChatId,
              type,
              title,
              description,
              avatar_url: avatarUrl,
              created_by: authUserId,
              created_at: new Date().toISOString(),
              members_count: 1,
              members: [
                { chat_id: newChatId, user_id: authUserId, role: 'owner', joined_at: new Date().toISOString() }
              ],
              unread_count: 0
            };

            localStore.saveChat(createdChat);

            const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
            if (existingIdx === -1) {
              chats.value.unshift(createdChat);
            } else {
              chats.value[existingIdx] = createdChat;
            }

            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}

            await selectChat(newChatId);
            await refreshChats();
            return createdChat;
          } else {
            console.error('Supabase createChat error:', chatError);
          }
        }
      } catch (err) {
        console.warn('Supabase createChat failed, fallback to localStore:', err);
      }
    }

    // Офлайн-режим
    const newChat = localStore.createChat(type, title, description, avatarUrl);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    } else {
      chats.value[existingIdx] = newChat;
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    await refreshChats();
    return newChat;
  }

  async function createDirectChat(targetUser: Partial<Profile>): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;
      } catch {}
    }

    let targetId = targetUser.id;
    let resolvedUser: Partial<Profile> = { ...targetUser };

    // Если targetId отсутствует или начинается с 'custom-', пробуем найти реального пользователя в profiles
    if (isSupabaseConfigured() && supabase && (!targetId || targetId.startsWith('custom-') || !isValidUUID(targetId))) {
      const qUsername = targetUser.username?.replace(/^@/, '').trim();
      const qName = targetUser.first_name?.trim();

      try {
        let foundProfile: Profile | null = null;
        if (qUsername) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', qUsername)
            .neq('id', currentUserId || '')
            .limit(1);
          if (data && data.length > 0) foundProfile = data[0];
        }
        if (!foundProfile && qName) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('first_name', qName)
            .neq('id', currentUserId || '')
            .limit(1);
          if (data && data.length > 0) foundProfile = data[0];
        }
        if (foundProfile) {
          targetId = foundProfile.id;
          resolvedUser = foundProfile;
          localStore.saveProfile(foundProfile);
        } else {
          console.warn('[Chat] Target user not found in Supabase profiles');
          return null;
        }
      } catch (err) {
        console.warn('Error resolving target user in Supabase:', err);
        return null;
      }
    }

    const title = `${resolvedUser.first_name || ''} ${resolvedUser.last_name || ''}`.trim() || resolvedUser.username || 'Диалог';
    const avatarUrl = resolvedUser.avatar_url;

    // В режиме Supabase: сначала проверяем, есть ли уже общий direct-чат между currentUserId и targetId
    if (isSupabaseConfigured() && supabase && currentUserId && targetId && isValidUUID(targetId)) {
      try {
        const [myRes, targetRes] = await Promise.all([
          supabase.from('chat_members').select('chat_id').eq('user_id', currentUserId),
          supabase.from('chat_members').select('chat_id').eq('user_id', targetId)
        ]);

        if (myRes.data && targetRes.data) {
          const myChatIds = new Set(myRes.data.map(m => m.chat_id));
          const commonIds = targetRes.data.map(m => m.chat_id).filter(id => myChatIds.has(id));

          if (commonIds.length > 0) {
            const { data: existingChats } = await supabase
              .from('chats')
              .select('*, chat_members(*)')
              .in('id', commonIds)
              .eq('type', 'direct')
              .limit(1);

            if (existingChats && existingChats.length > 0) {
              const foundChat = existingChats[0] as any;
              await refreshChats();
              await selectChat(foundChat.id);
              return chats.value.find(c => c.id === foundChat.id) || foundChat;
            }
          }
        }

        // Если диалога еще нет — создаем новый без .select() во избежание RLS 42501
        const newChatId = generateUUID();
        const { error: chatError } = await supabase.from('chats').insert({
          id: newChatId,
          type: 'direct',
          title,
          avatar_url: avatarUrl,
          created_by: currentUserId
        });

        if (chatError) {
          console.error('Supabase createDirectChat chats insert error:', chatError);
          return null;
        }

        // Последовательная вставка участников: сначала создатель (owner), затем собеседник (member)
        const { error: ownerErr } = await supabase.from('chat_members').insert({
          chat_id: newChatId,
          user_id: currentUserId,
          role: 'owner'
        });
        if (ownerErr) {
          console.warn('Supabase insert owner error:', ownerErr);
        }

        const { error: memberErr } = await supabase.from('chat_members').insert({
          chat_id: newChatId,
          user_id: targetId,
          role: 'member'
        });
        if (memberErr) {
          console.warn('Supabase insert member error:', memberErr);
        }

        const createdChat: Chat = {
          id: newChatId,
          type: 'direct',
          title,
          avatar_url: avatarUrl,
          created_by: currentUserId,
          created_at: new Date().toISOString(),
          members_count: 2,
          members: [
            { chat_id: newChatId, user_id: currentUserId, role: 'owner', joined_at: new Date().toISOString() },
            { chat_id: newChatId, user_id: targetId, role: 'member', joined_at: new Date().toISOString() }
          ],
          unread_count: 0
        };

        localStore.saveChat(createdChat);
        chats.value.unshift(createdChat);
        try {
          localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
        } catch {}

        await selectChat(newChatId);
        await refreshChats();

        const found = chats.value.find(c => c.id === newChatId);
        return found || createdChat;
      } catch (err) {
        console.error('Supabase createDirectChat error:', err);
      }
    }

    // Офлайн режим (только если Supabase не сконфигурирован)
    if (!isSupabaseConfigured()) {
      const newChat = localStore.createChat('direct', title, undefined, avatarUrl);
      chats.value.unshift(newChat);
      try {
        localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
      } catch {}
      await selectChat(newChat.id);
      await refreshChats();
      return newChat;
    }

    return null;
  }

  async function createGroupChat(title: string, memberIds: string[] = [], description?: string, avatarUrl?: string): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;

        if (currentUserId) {
          const newChatId = generateUUID();
          const { error: chatError } = await supabase.from('chats').insert({
            id: newChatId,
            type: 'group',
            title,
            description,
            avatar_url: avatarUrl,
            created_by: currentUserId
          });

          if (!chatError) {
            // Создатель всегда получает role: 'owner'
            await supabase.from('chat_members').insert({
              chat_id: newChatId,
              user_id: currentUserId,
              role: 'owner'
            });

            // Остальные участники - последовательно
            const otherIds = memberIds.filter(id => id && id !== currentUserId);
            for (const uid of otherIds) {
              try {
                await supabase.from('chat_members').insert({
                  chat_id: newChatId,
                  user_id: uid,
                  role: 'member'
                });
              } catch (e) {
                console.warn('Error inserting group member:', uid, e);
              }
            }

            const createdChat: Chat = {
              id: newChatId,
              type: 'group',
              title,
              description,
              avatar_url: avatarUrl,
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              members_count: 1 + otherIds.length,
              members: [
                { chat_id: newChatId, user_id: currentUserId, role: 'owner', joined_at: new Date().toISOString() },
                ...otherIds.map(uid => ({
                  chat_id: newChatId,
                  user_id: uid,
                  role: 'member' as const,
                  joined_at: new Date().toISOString()
                }))
              ],
              unread_count: 0
            };

            // Сохраняем в localStore для оффлайн- и онлайн-доступа
            localStore.saveChat(createdChat);

            const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
            if (existingIdx === -1) {
              chats.value.unshift(createdChat);
            } else {
              chats.value[existingIdx] = createdChat;
            }

            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}

            await selectChat(newChatId);
            await refreshChats();
            return createdChat;
          } else {
            console.error('Supabase createGroupChat error:', chatError);
          }
        }
      } catch (err) {
        console.warn('Supabase createGroupChat failed, fallback to localStore:', err);
      }
    }

    const newChat = localStore.createChat('group', title, description, avatarUrl);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    } else {
      chats.value[existingIdx] = newChat;
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    await refreshChats();
    return newChat;
  }

  async function createChannel(title: string, description?: string, avatarUrl?: string): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;

        if (currentUserId) {
          const newChatId = generateUUID();
          const { error: chatError } = await supabase.from('chats').insert({
            id: newChatId,
            type: 'channel',
            title,
            description,
            avatar_url: avatarUrl,
            created_by: currentUserId
          });

          if (!chatError) {
            // Создатель всегда получает role: 'owner'
            await supabase.from('chat_members').insert({
              chat_id: newChatId,
              user_id: currentUserId,
              role: 'owner'
            });

            const createdChat: Chat = {
              id: newChatId,
              type: 'channel',
              title,
              description,
              avatar_url: avatarUrl,
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              members_count: 1,
              subscribers_count: 1,
              members: [
                { chat_id: newChatId, user_id: currentUserId, role: 'owner', joined_at: new Date().toISOString() }
              ],
              unread_count: 0
            };

            localStore.saveChat(createdChat);

            const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
            if (existingIdx === -1) {
              chats.value.unshift(createdChat);
            } else {
              chats.value[existingIdx] = createdChat;
            }

            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}

            await selectChat(newChatId);
            await refreshChats();
            return createdChat;
          } else {
            console.error('Supabase createChannel error:', chatError);
          }
        }
      } catch (err) {
        console.warn('Supabase createChannel failed, fallback to localStore:', err);
      }
    }

    const newChat = localStore.createChat('channel', title, description, avatarUrl);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    } else {
      chats.value[existingIdx] = newChat;
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    await refreshChats();
    return newChat;
  }

  async function updateChat(
    chatId: string, 
    updates: { title?: string; description?: string; avatar_url?: string; settings?: any }
  ): Promise<boolean> {
    const target = chats.value.find(c => c.id === chatId);
    const mergedSettings = updates.settings !== undefined 
      ? { ...(target?.settings || {}), ...updates.settings }
      : target?.settings;

    const fullUpdates: Record<string, any> = {
      ...updates,
      ...(updates.settings !== undefined ? { settings: mergedSettings } : {})
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('chats').update(fullUpdates).eq('id', chatId);
        if (error) {
          console.warn('Supabase updateChat error, retrying without settings:', error);
          if (fullUpdates.settings) {
            const { settings, ...withoutSettings } = fullUpdates;
            if (Object.keys(withoutSettings).length > 0) {
              await supabase.from('chats').update(withoutSettings).eq('id', chatId);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase updateChat failed:', err);
      }
    }

    if (target) {
      Object.assign(target, fullUpdates);
    }

    try {
      localStore.updateChat(chatId, fullUpdates);
    } catch {}

    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch (e) {
      console.warn('Failed to update tobo_chats_cache:', e);
    }

    return true;
  }

  async function searchUsers(query: string): Promise<Profile[]> {
    const currentUserId = authStore.user?.id || '';
    const q = query.replace(/^@/, '').trim().toLowerCase();

    // 1. При активном Supabase: СТРОГО поиск по реальной таблице profiles! НИКАКИХ заглушек!
    if (isSupabaseConfigured() && supabase) {
      if (!q) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', currentUserId)
            .limit(20);
          if (!error && data) {
            return (data as Profile[]).filter(p => p.id !== currentUserId);
          }
        } catch (err) {
          console.warn('Supabase fetch profiles error:', err);
        }
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .limit(20);

        if (!error && data) {
          return (data as Profile[]).filter(p => p.id !== currentUserId);
        }
      } catch (err) {
        console.warn('Supabase searchUsers failed:', err);
      }
      return [];
    }

    // 2. Только в изолированном офлайн-режиме
    let localProfiles: Profile[] = [];
    try {
      localProfiles = localStore.getProfiles();
    } catch {
      localProfiles = [];
    }

    if (q) {
      localProfiles = localProfiles.filter(p => 
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.first_name && p.first_name.toLowerCase().includes(q)) ||
        (p.last_name && p.last_name.toLowerCase().includes(q))
      );
    }

    return localProfiles.filter(p => p.id !== currentUserId);
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

  // Realtime WebSocket подписка Supabase Realtime с дедупликацией
  if (isSupabaseConfigured() && supabase) {
    try {
      supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: any) => {
            const incoming = payload.new;
            if (activeChatId.value && incoming.chat_id === activeChatId.value) {
              const existingIdx = activeMessages.value.findIndex(m => m.id === incoming.id);
              if (existingIdx === -1) {
                activeMessages.value.push(incoming);
              } else {
                activeMessages.value[existingIdx] = { ...activeMessages.value[existingIdx], ...incoming };
              }
              try {
                localStorage.setItem('tobo_chat_msgs_' + activeChatId.value, JSON.stringify(activeMessages.value));
              } catch {}
            }

            const targetChat = chats.value.find(c => c.id === incoming.chat_id);
            if (targetChat) {
              targetChat.last_message = incoming;
              try {
                localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
              } catch {}
            }

            refreshChats();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload: any) => {
            const incoming = payload.new;
            if (activeChatId.value && incoming.chat_id === activeChatId.value) {
              const existingIdx = activeMessages.value.findIndex(m => m.id === incoming.id);
              if (existingIdx !== -1) {
                activeMessages.value[existingIdx] = { ...activeMessages.value[existingIdx], ...incoming };
                try {
                  localStorage.setItem('tobo_chat_msgs_' + activeChatId.value, JSON.stringify(activeMessages.value));
                } catch {}
              }
            }
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
          console.warn('Supabase deleteMessage error, falling back to localStore:', error);
          localStore.deleteMessage(chatId, messageId);
        }
      } catch (err) {
        console.warn('Supabase deleteMessage error, falling back to localStore:', err);
        localStore.deleteMessage(chatId, messageId);
      }
    } else {
      localStore.deleteMessage(chatId, messageId);
    }
    activeMessages.value = activeMessages.value.filter(m => m.id !== messageId);

    try {
      localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
    } catch {}

    const targetChat = chats.value.find(c => c.id === chatId);
    if (targetChat && targetChat.last_message?.id === messageId) {
      targetChat.last_message = activeMessages.value.length > 0
        ? activeMessages.value[activeMessages.value.length - 1]
        : undefined;
      try {
        localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
      } catch {}
    }

    await refreshChats();
    return true;
  }

  async function toggleReaction(
    chatId: string, 
    messageId: string, 
    emoji: string
  ): Promise<Record<string, { count: number; users: string[] }>> {
    const userId = authStore.user?.id || 'user-me-001';

    let msg = activeMessages.value.find(m => m.id === messageId);
    if (!msg) {
      const localMsgs = localStore.getMessages(chatId);
      msg = localMsgs.find(m => m.id === messageId);
    }
    if (!msg) return {};

    const reactions: Record<string, { count: number; users: string[] }> = msg.reactions || {};
    msg.reactions = reactions;

    // 1. Проверяем, стояла ли уже у пользователя именно эта реакция emoji
    const hadThisEmoji = Boolean(reactions[emoji]?.users.includes(userId));

    // 2. Удаляем userId ИЗ ВСЕХ реакций данного сообщения (строго 1 реакция на пользователя)
    Object.keys(reactions).forEach(key => {
      const reaction = reactions[key];
      if (reaction && reaction.users.includes(userId)) {
        reaction.users = reaction.users.filter((u: string) => u !== userId);
        reaction.count = reaction.users.length;
        if (reaction.count <= 0) {
          delete reactions[key];
        }
      }
    });

    // 3. Если реакция не стояла — добавляем ее
    if (!hadThisEmoji) {
      if (!reactions[emoji]) {
        reactions[emoji] = { count: 0, users: [] };
      }
      reactions[emoji].users.push(userId);
      reactions[emoji].count = reactions[emoji].users.length;
    }

    const updatedReactions = { ...reactions };

    localStore.toggleMessageReaction(chatId, messageId, emoji, userId);

    try {
      localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
    } catch {}

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', messageId);
      } catch (e) {
        console.warn('Supabase update reactions failed:', e);
      }
    }

    return updatedReactions;
  }

  async function loadChannelComments(messageId: string): Promise<MessageComment[]> {
    if (!isSupabaseConfigured() || !supabase) {
      const comments = localStore.getMessageComments(messageId);
      channelCommentsMap.value[messageId] = comments;
      return comments;
    }
    try {
      const { data, error } = await supabase
        .from('message_comments')
        .select('*, author:profiles(*)')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        channelCommentsMap.value[messageId] = data;
        return data;
      }
    } catch (e) {
      console.warn('loadChannelComments error:', e);
    }
    const cached = localStore.getMessageComments(messageId);
    channelCommentsMap.value[messageId] = cached;
    return cached;
  }

  const getChannelMessageComments = loadChannelComments;

  async function addChannelMessageComment(
    chatId: string, 
    messageId: string, 
    text: string
  ): Promise<MessageComment | null> {
    if (!text.trim()) return null;
    const authorId = authStore.user?.id || 'user-me-001';

    if (!isSupabaseConfigured() || !supabase) {
      const comment = localStore.addMessageComment(messageId, chatId, authorId, text.trim());
      if (!channelCommentsMap.value[messageId]) {
        channelCommentsMap.value[messageId] = [];
      }
      channelCommentsMap.value[messageId].push(comment);
      const msg = activeMessages.value.find(m => m.id === messageId);
      if (msg) {
        msg.comments_count = (msg.comments_count || 0) + 1;
      }
      return comment;
    }

    try {
      const { data, error } = await supabase
        .from('message_comments')
        .insert({
          message_id: messageId,
          chat_id: chatId,
          author_id: authorId,
          text: text.trim()
        })
        .select('*, author:profiles(*)')
        .single();

      if (!error && data) {
        if (!channelCommentsMap.value[messageId]) {
          channelCommentsMap.value[messageId] = [];
        }
        channelCommentsMap.value[messageId].push(data);
        const msg = activeMessages.value.find(m => m.id === messageId);
        if (msg) {
          msg.comments_count = (msg.comments_count || 0) + 1;
          await supabase.from('messages').update({ comments_count: msg.comments_count }).eq('id', messageId);
        }
        return data;
      }
    } catch (err) {
      console.warn('addChannelMessageComment error:', err);
    }

    // Fallback if supabase insert failed
    const fallbackComment = localStore.addMessageComment(messageId, chatId, authorId, text.trim());
    if (!channelCommentsMap.value[messageId]) {
      channelCommentsMap.value[messageId] = [];
    }
    channelCommentsMap.value[messageId].push(fallbackComment);
    const msg = activeMessages.value.find(m => m.id === messageId);
    if (msg) {
      msg.comments_count = (msg.comments_count || 0) + 1;
    }
    return fallbackComment;
  }

  // Локальная подписка только в офлайн режиме
  localStore.subscribe((event) => {
    if (!isSupabaseConfigured()) {
      if (
        event.type === 'new_message' || 
        event.type === 'new_chat' || 
        event.type === 'messages_read' || 
        event.type === 'message_deleted' || 
        event.type === 'message_reaction_updated' ||
        event.type === 'new_message_comment'
      ) {
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
    channelCommentsMap,
    activeChatChannel,
    subscribeToActiveChat,
    unsubscribeFromActiveChat,
    chatsListChannel,
    subscribeToChatsList,
    unsubscribeFromChatsList,
    pollNewMessages,
    refreshChats,
    selectChat,
    sendMessage,
    deleteMessage,
    toggleReaction,
    loadChannelComments,
    getChannelMessageComments,
    addChannelMessageComment,
    createChat,
    createDirectChat,
    createGroupChat,
    createChannel,
    updateChat,
    searchUsers,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser,
    canAccessChat: checkChatAccess
  };
});
