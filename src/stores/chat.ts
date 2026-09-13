// ==============================================================================
// ХРАНИЛИЩЕ МЕССЕНДЖЕРА С ПОДДЕРЖКОЙ SUPABASE REALTIME И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Chat, Message, ChatType, BlockedUser, Post, Profile } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from './auth';

function loadCachedChats(): Chat[] {
  try {
    const raw = localStorage.getItem('tobo_chats_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load tobo_chats_cache:', e);
  }
  return isSupabaseConfigured() ? [] : localStore.getChats();
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore();
  const chats = ref<Chat[]>(loadCachedChats());
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
                }
              }
            } catch (mErr) {
              console.warn('Supabase fetch recent messages for chats failed:', mErr);
            }
          }

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
            members: c.chat_members,
            last_message: lastMsgMap.get(c.id) || undefined,
            unread_count: 0
          }));

          try {
            localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
          } catch {}
          return;
        } else {
          // Если чатов нет и кэш пустой — сбрасываем
          if (!chats.value.length) {
            chats.value = [];
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch chats failed:', err);
        return;
      }
    }

    if (!isSupabaseConfigured()) {
      chats.value = localStore.getChats();
      try {
        localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
      } catch {}
    }
  }

  async function selectChat(chatId: string | null) {
    activeChatId.value = chatId;
    if (!chatId) {
      activeMessages.value = [];
      return;
    }

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

        if (!error && data) {
          activeMessages.value = data;
          try {
            localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(data));
          } catch {}

          if (data.length > 0) {
            const last = data[data.length - 1];
            const ch = chats.value.find(c => c.id === chatId);
            if (ch) {
              ch.last_message = last;
              try {
                localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
              } catch {}
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch messages failed:', err);
      }
      return;
    }

    // 3) Офлайн режим
    if (!isSupabaseConfigured()) {
      const offlineMsgs = localStore.getMessages(chatId);
      activeMessages.value = offlineMsgs;
      try {
        localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(offlineMsgs));
      } catch {}
      localStore.markMessagesAsRead(chatId);
      refreshChats();
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
        let authUserId = authStore.user?.id;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          authUserId = authUser.id;
        }
        if (!authUserId) return;

        const { data, error } = await supabase.from('messages').insert({
          chat_id: targetChatId,
          sender_id: authUserId,
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
      const offlineMsgs = localStore.getMessages(targetChatId);
      activeMessages.value = offlineMsgs;
      try {
        localStorage.setItem('tobo_chat_msgs_' + targetChatId, JSON.stringify(offlineMsgs));
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
        if (!authUserId) return null;

        const { data: chatData, error: chatError } = await supabase.from('chats').insert({
          type,
          title,
          description,
          avatar_url: avatarUrl,
          created_by: authUserId
        }).select().single();

        if (!chatError && chatData) {
          await supabase.from('chat_members').insert({
            chat_id: chatData.id,
            user_id: authUserId,
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

  async function createDirectChat(targetUser: Partial<Profile>): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;
      } catch {}
    }

    const title = `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.username || 'Диалог';

    // Ищем существующий прямой диалог с этим пользователем в кэше
    const existing = chats.value.find(c => 
      c.type === 'direct' && 
      ((targetUser.id && c.members?.some(m => m.user_id === targetUser.id)) || 
       c.title === title)
    );

    if (existing) {
      await selectChat(existing.id);
      return existing;
    }

    const avatarUrl = targetUser.avatar_url;

    if (isSupabaseConfigured() && supabase && currentUserId) {
      try {
        // 1) Вставляем запись в chats
        const { data: chatData, error: chatError } = await supabase.from('chats').insert({
          type: 'direct',
          title,
          avatar_url: avatarUrl,
          created_by: currentUserId
        }).select().single();

        if (!chatError && chatData) {
          // 2) Вставляем создателя в chat_members с role: 'owner'
          const { error: ownerErr } = await supabase.from('chat_members').insert({
            chat_id: chatData.id,
            user_id: currentUserId,
            role: 'owner'
          });
          if (ownerErr) {
            console.warn('Supabase insert owner notice:', ownerErr);
          }

          // 3) Вторым запросом вставляем второго участника с role: 'member'
          const targetId = targetUser.id;
          if (targetId && targetId !== currentUserId) {
            const { error: memberErr } = await supabase.from('chat_members').insert({
              chat_id: chatData.id,
              user_id: targetId,
              role: 'member'
            });
            if (memberErr) {
              console.warn('Supabase insert member notice:', memberErr);
            }
          }

          const createdChat: Chat = {
            id: chatData.id,
            type: 'direct',
            title,
            avatar_url: avatarUrl,
            description: chatData.description,
            created_by: currentUserId,
            created_at: chatData.created_at || new Date().toISOString(),
            members_count: targetId ? 2 : 1,
            members: [
              { chat_id: chatData.id, user_id: currentUserId, role: 'owner', joined_at: new Date().toISOString() },
              ...(targetId ? [{ chat_id: chatData.id, user_id: targetId, role: 'member' as const, joined_at: new Date().toISOString() }] : [])
            ],
            unread_count: 0
          };

          // 4) Немедленно добавляем в chats.value и кэш localStorage
          const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
          if (existingIdx === -1) {
            chats.value.unshift(createdChat);
          } else {
            chats.value[existingIdx] = createdChat;
          }

          try {
            localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
          } catch {}

          await selectChat(chatData.id);
          refreshChats();
          return createdChat;
        }
      } catch (err) {
        console.warn('Supabase createDirectChat failed, fallback to localStore:', err);
      }
    }

    // Fallback: localStore
    const newChat = localStore.createChat('direct', title, undefined, avatarUrl);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    refreshChats();
    return newChat;
  }

  async function createGroupChat(title: string, memberIds: string[] = [], description?: string): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;

        if (currentUserId) {
          const { data: chatData, error: chatError } = await supabase.from('chats').insert({
            type: 'group',
            title,
            description,
            created_by: currentUserId
          }).select().single();

          if (!chatError && chatData) {
            // Создатель всегда получает role: 'owner'
            await supabase.from('chat_members').insert({
              chat_id: chatData.id,
              user_id: currentUserId,
              role: 'owner'
            });

            // Остальные участники
            const otherIds = memberIds.filter(id => id && id !== currentUserId);
            if (otherIds.length > 0) {
              const memberRows = otherIds.map(uid => ({
                chat_id: chatData.id,
                user_id: uid,
                role: 'member'
              }));
              await supabase.from('chat_members').insert(memberRows);
            }

            const createdChat: Chat = {
              id: chatData.id,
              type: 'group',
              title,
              description,
              created_by: currentUserId,
              created_at: chatData.created_at || new Date().toISOString(),
              members_count: 1 + otherIds.length,
              unread_count: 0
            };

            const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
            if (existingIdx === -1) {
              chats.value.unshift(createdChat);
            } else {
              chats.value[existingIdx] = createdChat;
            }

            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}

            await selectChat(chatData.id);
            refreshChats();
            return createdChat;
          }
        }
      } catch (err) {
        console.warn('Supabase createGroupChat failed, fallback to localStore:', err);
      }
    }

    const newChat = localStore.createChat('group', title, description);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    refreshChats();
    return newChat;
  }

  async function createChannel(title: string, description?: string): Promise<Chat | null> {
    let currentUserId = authStore.user?.id;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) currentUserId = user.id;

        if (currentUserId) {
          const { data: chatData, error: chatError } = await supabase.from('chats').insert({
            type: 'channel',
            title,
            description,
            created_by: currentUserId
          }).select().single();

          if (!chatError && chatData) {
            // Создатель всегда получает role: 'owner'
            await supabase.from('chat_members').insert({
              chat_id: chatData.id,
              user_id: currentUserId,
              role: 'owner'
            });

            const createdChat: Chat = {
              id: chatData.id,
              type: 'channel',
              title,
              description,
              created_by: currentUserId,
              created_at: chatData.created_at || new Date().toISOString(),
              members_count: 1,
              subscribers_count: 1,
              unread_count: 0
            };

            const existingIdx = chats.value.findIndex(c => c.id === createdChat.id);
            if (existingIdx === -1) {
              chats.value.unshift(createdChat);
            } else {
              chats.value[existingIdx] = createdChat;
            }

            try {
              localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
            } catch {}

            await selectChat(chatData.id);
            refreshChats();
            return createdChat;
          }
        }
      } catch (err) {
        console.warn('Supabase createChannel failed, fallback to localStore:', err);
      }
    }

    const newChat = localStore.createChat('channel', title, description);
    const existingIdx = chats.value.findIndex(c => c.id === newChat.id);
    if (existingIdx === -1) {
      chats.value.unshift(newChat);
    }
    try {
      localStorage.setItem('tobo_chats_cache', JSON.stringify(chats.value));
    } catch {}
    await selectChat(newChat.id);
    refreshChats();
    return newChat;
  }

  async function updateChat(
    chatId: string, 
    updates: { title?: string; description?: string; avatar_url?: string; settings?: any }
  ): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('chats').update(updates).eq('id', chatId);
        if (error) {
          console.warn('Supabase updateChat error:', error);
        }
      } catch (err) {
        console.warn('Supabase updateChat failed:', err);
      }
    }

    const target = chats.value.find(c => c.id === chatId);
    if (target) {
      Object.assign(target, updates);
    }

    try {
      localStore.updateChat(chatId, updates);
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
    try {
      localStorage.setItem('tobo_chat_msgs_' + chatId, JSON.stringify(activeMessages.value));
    } catch {}
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
    createDirectChat,
    createGroupChat,
    createChannel,
    updateChat,
    searchUsers,
    blockUser,
    unblockUser,
    isUserBlocked,
    reportUser
  };
});
