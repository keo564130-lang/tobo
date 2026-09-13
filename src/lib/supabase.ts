// ==============================================================================
// УНИФИЦИРОВАННЫЙ СЛОЙ ДАННЫХ (SUPABASE CLIENT & RESILIENT OFFLINE ADAPTER)
// Лицензия: Apache License 2.0
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  Profile, 
  Post, 
  Chat, 
  Message, 
  MessageComment,
  PostComment, 
  BlockedUser, 
  Report, 
  ActiveSession,
  ChatType 
} from '@/types/database';
import { 
  currentUserMock, 
  mishaProfileMock, 
  annaProfileMock, 
  toboOfficialProfileMock, 
  initialPostsMock
} from './mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// ==============================================================================
// ЛОКАЛЬНЫЙ ОФФЛАЙН / ДЕМО ХРАНИТЕЛЬ (LOCAL STORAGE & INDEXED FALLBACK)
// Обеспечивает 100% работоспособность приложения даже без доступа к облаку!
// ==============================================================================

const STORAGE_KEYS = {
  CURRENT_USER: 'tobo_current_user',
  POSTS: 'tobo_posts',
  COMMENTS: 'tobo_comments',
  CHATS: 'tobo_chats',
  MESSAGES: 'tobo_messages',
  BLOCKED: 'tobo_blocked_users',
  SESSIONS: 'tobo_active_sessions',
  MESSAGE_COMMENTS: 'tobo_message_comments'
};

class LocalDataStore {
  private currentUser: Profile;
  private profiles: Map<string, Profile> = new Map();
  private posts: Post[] = [];
  private comments: PostComment[] = [];
  private chats: Chat[] = [];
  private messages: Map<string, Message[]> = new Map();
  private messageComments: Map<string, MessageComment[]> = new Map();
  private blockedUsers: BlockedUser[] = [];
  private activeSessions: ActiveSession[] = [];
  private realtimeListeners: Set<(event: { type: string; payload: unknown }) => void> = new Set();

  constructor() {
    // Проверка и сброс устаревших мок-данных, содержащих ссылки на Unsplash
    const postCache = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (postCache && postCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.POSTS);
    }
    const chatCache = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (chatCache && (chatCache.includes('unsplash.com') || chatCache.includes('chat-direct-misha') || chatCache.includes('chat-group-design') || chatCache.includes('chat-group-flood'))) {
      localStorage.removeItem(STORAGE_KEYS.CHATS);
    }
    const generalChatCache = localStorage.getItem('tobo_chats_cache');
    if (generalChatCache && (generalChatCache.includes('chat-direct-misha') || generalChatCache.includes('chat-group-design') || generalChatCache.includes('chat-group-flood'))) {
      localStorage.removeItem('tobo_chats_cache');
    }
    const msgCache = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (msgCache && (msgCache.includes('chat-direct-misha') || msgCache.includes('chat-group-design') || msgCache.includes('chat-group-flood'))) {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }
    const commentCache = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (commentCache && commentCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    }
    const userCache = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userCache && (userCache.includes('unsplash.com') || userCache.includes('user-me-001') || userCache.includes('Поляков'))) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    const sessionCache = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (sessionCache && (sessionCache.includes('iPad') || sessionCache.includes('iPhone 15') || sessionCache.includes('session-1'))) {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    }

    // 1. Инициализация профилей
    this.profiles.set(currentUserMock.id, { ...currentUserMock });
    this.profiles.set(mishaProfileMock.id, { ...mishaProfileMock });
    this.profiles.set(annaProfileMock.id, { ...annaProfileMock });
    this.profiles.set(toboOfficialProfileMock.id, { ...toboOfficialProfileMock });

    // 2. Инициализация текущего пользователя (чистый гостевой профиль по умолчанию)
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    this.currentUser = savedUser ? JSON.parse(savedUser) : {
      id: '',
      username: '',
      first_name: 'Гость',
      last_name: '',
      avatar_url: '',
      cover_url: '',
      bio: '',
      is_online: false,
      is_developer: false,
      created_at: new Date().toISOString()
    };

    // 3. Инициализация постов
    const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    this.posts = savedPosts ? JSON.parse(savedPosts) : [...initialPostsMock];

    // 4. Инициализация чатов (только реальные чаты, никаких mock-заглушек!)
    const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        this.chats = Array.isArray(parsed)
          ? parsed.filter((c: Chat) => !c.id.startsWith('chat-direct-misha') && !c.id.startsWith('chat-group-design') && !c.id.startsWith('chat-group-flood'))
          : [];
      } catch {
        this.chats = [];
      }
    } else {
      this.chats = [];
    }

    // 5. Инициализация сообщений (только реальные сообщения)
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as Record<string, Message[]>;
        Object.entries(parsed).forEach(([chatId, msgs]) => {
          if (!chatId.startsWith('chat-direct-misha') && !chatId.startsWith('chat-group-design') && !chatId.startsWith('chat-group-flood')) {
            this.messages.set(chatId, msgs);
          }
        });
      } catch {}
    }

    // 6. Инициализация сессий (без фейковых заглушек)
    const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    this.activeSessions = savedSessions ? JSON.parse(savedSessions) : [];

    // 7. Инициализация черного списка
    const savedBlocked = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    this.blockedUsers = savedBlocked ? JSON.parse(savedBlocked) : [];

    // 8. Инициализация комментариев к сообщениям
    const savedComments = localStorage.getItem(STORAGE_KEYS.MESSAGE_COMMENTS);
    if (savedComments) {
      try {
        const parsed = JSON.parse(savedComments) as Record<string, MessageComment[]>;
        Object.entries(parsed).forEach(([msgId, comments]) => {
          this.messageComments.set(msgId, comments);
        });
      } catch {}
    }
  }

  private persist(key: string, data: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Игнорируем переполнение квоты
    }
  }

  // --- Realtime Pub/Sub ---
  subscribe(callback: (event: { type: string; payload: unknown }) => void) {
    this.realtimeListeners.add(callback);
    return () => this.realtimeListeners.delete(callback);
  }

  private notify(type: string, payload: unknown) {
    this.realtimeListeners.forEach(cb => {
      try {
        cb({ type, payload });
      } catch (err) {
        console.error('Realtime listener error:', err);
      }
    });
  }

  // --- User Profiles ---
  getCurrentUser(): Profile {
    return { ...this.currentUser };
  }

  updateCurrentUser(updates: Partial<Profile>): Profile {
    this.currentUser = { ...this.currentUser, ...updates, updated_at: new Date().toISOString() };
    this.profiles.set(this.currentUser.id, this.currentUser);
    this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.notify('profile_updated', this.currentUser);
    return this.getCurrentUser();
  }

  getProfile(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  saveProfile(profile: Profile): void {
    if (profile && profile.id) {
      this.profiles.set(profile.id, { ...profile });
    }
  }

  getProfiles(): Profile[] {
    return Array.from(this.profiles.values());
  }

  // --- Posts & Algorithmic Ranking ---
  /**
   * Вычисляет ранг поста с обязательным Time Decay:
   * Score = (Views * 0.1 + Likes * 2.0 + Comments * 3.0 + Reposts * 4.0) / ((Age_in_Hours + 2) ^ 1.5)
   */
  calculatePostScore(post: Post): number {
    const ageInHours = Math.max((Date.now() - new Date(post.created_at).getTime()) / (3600 * 1000), 0);
    const score = (
      post.views_count * 0.1 + 
      post.likes_count * 2.0 + 
      post.comments_count * 3.0 + 
      post.reposts_count * 4.0
    ) / Math.pow(ageInHours + 2, 1.5);
    return Math.round(score * 100) / 100;
  }

  getRankedFeed(): Post[] {
    return [...this.posts]
      .map(p => ({
        ...p,
        rank_score: this.calculatePostScore(p),
        author: this.profiles.get(p.author_id) || p.author,
        channel: p.channel_id ? (this.chats.find(c => c.id === p.channel_id) || p.channel) : null
      }))
      .sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0));
  }

  getUserPosts(authorId: string): Post[] {
    return this.posts
      .filter(p => p.author_id === authorId)
      .map(p => ({ 
        ...p, 
        author: this.profiles.get(p.author_id) || p.author,
        channel: p.channel_id ? (this.chats.find(c => c.id === p.channel_id) || p.channel) : null
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createPost(
    content: string, 
    mediaUrls: string[], 
    disableComments: boolean, 
    audience: 'all' | 'friends',
    authorType: 'user' | 'channel' = 'user',
    channelId?: string | null,
    channel?: Chat | null
  ): Post {
    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      author_id: this.currentUser.id,
      author: { ...this.currentUser },
      content,
      media_urls: mediaUrls,
      disable_comments: disableComments,
      audience,
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      views_count: 1,
      created_at: new Date().toISOString(),
      is_liked: false,
      is_reposted: false,
      is_bookmarked: false,
      author_type: authorType,
      channel_id: channelId || null,
      channel: channel || (channelId ? this.chats.find(c => c.id === channelId) : null)
    };

    this.posts.unshift(newPost);
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.notify('new_post', newPost);
    return newPost;
  }

  getPost(postId: string): Post | undefined {
    return this.posts.find(p => p.id === postId);
  }

  deletePost(postId: string): boolean {
    const initialLen = this.posts.length;
    this.posts = this.posts.filter(p => p.id !== postId);
    this.comments = this.comments.filter(c => c.post_id !== postId);
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.persist(STORAGE_KEYS.COMMENTS, this.comments);
    this.notify('post_deleted', { postId });
    return this.posts.length < initialLen;
  }

  toggleLikePost(postId: string): { isLiked: boolean; count: number } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');

    post.is_liked = !post.is_liked;
    post.likes_count += post.is_liked ? 1 : -1;
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.notify('post_updated', post);
    return { isLiked: post.is_liked, count: post.likes_count };
  }

  toggleRepost(postId: string): { isReposted: boolean; count: number } {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');

    post.is_reposted = !post.is_reposted;
    post.reposts_count += post.is_reposted ? 1 : -1;
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.notify('post_updated', post);
    return { isReposted: post.is_reposted, count: post.reposts_count };
  }

  toggleBookmark(postId: string): boolean {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return false;

    post.is_bookmarked = !post.is_bookmarked;
    this.persist(STORAGE_KEYS.POSTS, this.posts);

    // КРИТИЧЕСКОЕ ТРЕБОВАНИЕ: При нажатии "В Избранное" пост АВТОМАТИЧЕСКИ
    // отправляется и сохраняется во 2-ю вкладку (Сообщения) в чат "Избранное"!
    if (post.is_bookmarked) {
      const savedChat = this.chats.find(c => c.type === 'saved');
      if (savedChat) {
        this.sendMessage({
          chat_id: savedChat.id,
          content: `🔖 Сохраненный пост от @${post.author?.username || 'пользователя'}:\n\n${post.content.slice(0, 140)}${post.content.length > 140 ? '...' : ''}`,
          forwarded_post_id: post.id
        });
      }
    }

    this.notify('post_updated', post);
    return post.is_bookmarked;
  }

  // --- Comments ---
  getComments(postId: string): PostComment[] {
    return this.comments
      .filter(c => c.post_id === postId)
      .map(c => ({ ...c, author: this.profiles.get(c.author_id) }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  addComment(postId: string, text: string, parentId?: string | null): PostComment {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');
    if (post.disable_comments) throw new Error('Комментарии отключены автором');

    const newComment: PostComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      post_id: postId,
      author_id: this.currentUser.id,
      author: { ...this.currentUser },
      text,
      parent_id: parentId || null,
      created_at: new Date().toISOString()
    };

    this.comments.push(newComment);
    post.comments_count += 1;
    this.persist(STORAGE_KEYS.COMMENTS, this.comments);
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.notify('new_comment', newComment);
    return newComment;
  }

  // --- Chats & Messaging ---
  getChats(): Chat[] {
    return [...this.chats].map(chat => {
      // Обновляем последнее сообщение
      const msgs = this.messages.get(chat.id) || [];
      const last = msgs[msgs.length - 1];
      return {
        ...chat,
        last_message: last || chat.last_message
      };
    }).sort((a, b) => {
      const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
      const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }

  getChatById(chatId: string): Chat | undefined {
    return this.getChats().find(c => c.id === chatId);
  }

  saveChat(chat: Chat): Chat {
    const existingIndex = this.chats.findIndex(c => c.id === chat.id);
    if (existingIndex >= 0) {
      this.chats[existingIndex] = { ...this.chats[existingIndex], ...chat };
    } else {
      this.chats.unshift(chat);
    }
    if (!this.messages.has(chat.id)) {
      this.messages.set(chat.id, []);
    }
    this.persist(STORAGE_KEYS.CHATS, this.chats);
    this.notify('new_chat', chat);
    return chat;
  }

  createChat(type: ChatType, title: string, description?: string, avatarUrl?: string, customId?: string): Chat {
    const newChat: Chat = {
      id: customId || `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      title,
      description,
      avatar_url: avatarUrl,
      created_by: this.currentUser.id,
      created_at: new Date().toISOString(),
      unread_count: 0,
      members_count: type === 'group' ? 1 : undefined,
      subscribers_count: type === 'channel' ? 1 : undefined
    };

    return this.saveChat(newChat);
  }

  updateChat(chatId: string, updates: Partial<Chat>): Chat | undefined {
    const chat = this.chats.find(c => c.id === chatId);
    if (chat) {
      if (updates.settings) {
        chat.settings = { ...(chat.settings || {}), ...updates.settings };
      }
      Object.assign(chat, updates);
      if (updates.settings) {
        chat.settings = { ...(chat.settings || {}), ...updates.settings };
      }
      this.persist(STORAGE_KEYS.CHATS, this.chats);
      this.notify('chat_updated', chat);
    }
    return chat;
  }

  getMessages(chatId: string): Message[] {
    const msgs = this.messages.get(chatId) || [];
    return msgs.map(m => ({
      ...m,
      sender: this.profiles.get(m.sender_id),
      forwarded_post: m.forwarded_post_id ? this.posts.find(p => p.id === m.forwarded_post_id) : null
    }));
  }

  toggleMessageReaction(chatId: string, messageId: string, emoji: string, userId: string): Record<string, { count: number; users: string[] }> {
    const msgs = this.messages.get(chatId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return {};

    if (!msg.reactions) {
      msg.reactions = {};
    }

    const current = msg.reactions[emoji] || { count: 0, users: [] };
    const userIndex = current.users.indexOf(userId);

    if (userIndex > -1) {
      current.users.splice(userIndex, 1);
      current.count = Math.max(0, current.count - 1);
      if (current.count === 0) {
        delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji] = current;
      }
    } else {
      current.users.push(userId);
      current.count += 1;
      msg.reactions[emoji] = current;
    }

    const serializedMessages: Record<string, Message[]> = {};
    this.messages.forEach((mList, id) => {
      serializedMessages[id] = mList;
    });
    this.persist(STORAGE_KEYS.MESSAGES, serializedMessages);
    this.notify('message_reaction_updated', { chatId, messageId, reactions: msg.reactions });
    return msg.reactions;
  }

  getMessageComments(messageId: string): MessageComment[] {
    const list = this.messageComments.get(messageId) || [];
    return list.map(c => ({
      ...c,
      author: this.profiles.get(c.author_id)
    }));
  }

  addMessageComment(messageId: string, chatId: string, authorId: string, text: string): MessageComment {
    const author = this.profiles.get(authorId) || this.currentUser;
    const newComment: MessageComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      message_id: messageId,
      chat_id: chatId,
      author_id: authorId,
      author: { ...author },
      text,
      created_at: new Date().toISOString()
    };

    let list = this.messageComments.get(messageId);
    if (!list) {
      list = [];
      this.messageComments.set(messageId, list);
    }
    list.push(newComment);

    const serializedComments: Record<string, MessageComment[]> = {};
    this.messageComments.forEach((cList, id) => {
      serializedComments[id] = cList;
    });
    this.persist(STORAGE_KEYS.MESSAGE_COMMENTS, serializedComments);

    const msgs = this.messages.get(chatId);
    if (msgs) {
      const msg = msgs.find(m => m.id === messageId);
      if (msg) {
        msg.comments_count = (msg.comments_count || 0) + 1;
        const serializedMessages: Record<string, Message[]> = {};
        this.messages.forEach((mList, id) => {
          serializedMessages[id] = mList;
        });
        this.persist(STORAGE_KEYS.MESSAGES, serializedMessages);
      }
    }

    this.notify('new_message_comment', newComment);
    return newComment;
  }

  sendMessage(params: {
    chat_id: string;
    sender_id?: string;
    content?: string;
    media_urls?: string[];
    voice_url?: string;
    voice_duration?: number;
    voice_wave?: number[];
    forwarded_post_id?: string | null;
    forwarded_post?: Post | null;
    reply_to?: { id: string; sender_name: string; text: string } | null;
  }): Message {
    const chat = this.chats.find(c => c.id === params.chat_id);
    if (!chat) throw new Error('Чат не найден');

    const senderId = params.sender_id || this.currentUser.id;
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      chat_id: params.chat_id,
      sender_id: senderId,
      sender: this.profiles.get(senderId) || { ...this.currentUser },
      content: params.content,
      media_urls: params.media_urls || [],
      voice_url: params.voice_url,
      voice_duration: params.voice_duration,
      voice_wave: params.voice_wave,
      forwarded_post_id: params.forwarded_post_id,
      forwarded_post: params.forwarded_post || (params.forwarded_post_id ? this.posts.find(p => p.id === params.forwarded_post_id) : null),
      reply_to: params.reply_to || null,
      reactions: {},
      comments_count: 0,
      is_read: false,
      created_at: new Date().toISOString()
    };

    let chatMessages = this.messages.get(params.chat_id);
    if (!chatMessages) {
      chatMessages = [];
      this.messages.set(params.chat_id, chatMessages);
    }
    chatMessages.push(newMessage);

    chat.last_message = newMessage;

    // Сохраняем в LocalStorage
    const serializedMessages: Record<string, Message[]> = {};
    this.messages.forEach((msgs, id) => {
      serializedMessages[id] = msgs;
    });
    this.persist(STORAGE_KEYS.MESSAGES, serializedMessages);
    this.persist(STORAGE_KEYS.CHATS, this.chats);

    this.notify('new_message', newMessage);

    // Авто-ответ в демо-режиме для диалога с Мишей
    if (chat.id === 'chat-direct-misha-003' && senderId !== mishaProfileMock.id) {
      setTimeout(() => {
        const reply: Message = {
          id: `msg-misha-reply-${Date.now()}`,
          chat_id: chat.id,
          sender_id: mishaProfileMock.id,
          sender: { ...mishaProfileMock },
          content: 'Отлично! Полностью согласен с этой мыслью. Кстати, очень нравится плавность Material 3 в tobo!',
          media_urls: [],
          is_read: false,
          created_at: new Date().toISOString()
        };
        chatMessages.push(reply);
        chat.last_message = reply;
        chat.unread_count = (chat.unread_count || 0) + 1;
        this.persist(STORAGE_KEYS.MESSAGES, serializedMessages);
        this.persist(STORAGE_KEYS.CHATS, this.chats);
        this.notify('new_message', reply);
      }, 1500);
    }

    return newMessage;
  }

  markMessagesAsRead(chatId: string) {
    const msgs = this.messages.get(chatId);
    if (msgs) {
      msgs.forEach(m => {
        if (m.sender_id !== this.currentUser.id) {
          m.is_read = true;
        }
      });
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chat.unread_count = 0;
        this.persist(STORAGE_KEYS.CHATS, this.chats);
      }
      this.notify('messages_read', { chatId });
    }
  }

  deleteMessage(chatId: string, messageId: string): boolean {
    const msgs = this.messages.get(chatId);
    if (msgs) {
      const initialLen = msgs.length;
      const filtered = msgs.filter(m => m.id !== messageId);
      this.messages.set(chatId, filtered);
      const chat = this.chats.find(c => c.id === chatId);
      if (chat && chat.last_message?.id === messageId) {
        chat.last_message = filtered[filtered.length - 1] || undefined;
      }
      const serializedMessages: Record<string, Message[]> = {};
      this.messages.forEach((mList, id) => {
        serializedMessages[id] = mList;
      });
      this.persist(STORAGE_KEYS.MESSAGES, serializedMessages);
      this.persist(STORAGE_KEYS.CHATS, this.chats);
      this.notify('message_deleted', { chatId, messageId });
      return filtered.length < initialLen;
    }
    return false;
  }

  // --- Blocked Users & Reporting ---
  getBlockedUsers(): BlockedUser[] {
    return [...this.blockedUsers].map(b => ({
      ...b,
      profile: this.profiles.get(b.blocked_id)
    }));
  }

  blockUser(blockedId: string, reason?: string): void {
    if (!this.blockedUsers.some(b => b.blocked_id === blockedId)) {
      this.blockedUsers.push({
        blocker_id: this.currentUser.id,
        blocked_id: blockedId,
        reason,
        created_at: new Date().toISOString()
      });
      this.persist(STORAGE_KEYS.BLOCKED, this.blockedUsers);
      this.notify('user_blocked', { blockedId });
    }
  }

  unblockUser(blockedId: string): void {
    this.blockedUsers = this.blockedUsers.filter(b => b.blocked_id !== blockedId);
    this.persist(STORAGE_KEYS.BLOCKED, this.blockedUsers);
    this.notify('user_unblocked', { blockedId });
  }

  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.some(b => b.blocked_id === userId);
  }

  reportUser(reportedId: string, reason: string, details?: string): Report {
    const report: Report = {
      id: `report-${Date.now()}`,
      reporter_id: this.currentUser.id,
      reported_id: reportedId,
      reason,
      details,
      created_at: new Date().toISOString()
    };
    this.notify('user_reported', report);
    return report;
  }

  // --- Active Sessions ---
  getActiveSessions(): ActiveSession[] {
    return [...this.activeSessions];
  }

  terminateOtherSessions(): void {
    this.activeSessions = this.activeSessions.filter(s => s.is_current);
    this.persist(STORAGE_KEYS.SESSIONS, this.activeSessions);
    this.notify('sessions_updated', this.activeSessions);
  }
}

export const localStore = new LocalDataStore();
