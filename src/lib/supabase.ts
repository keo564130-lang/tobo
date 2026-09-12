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
  initialPostsMock, 
  initialChatsMock, 
  initialMessagesMock,
  activeSessionsMock 
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
  SESSIONS: 'tobo_active_sessions'
};

class LocalDataStore {
  private currentUser: Profile;
  private profiles: Map<string, Profile> = new Map();
  private posts: Post[] = [];
  private comments: PostComment[] = [];
  private chats: Chat[] = [];
  private messages: Map<string, Message[]> = new Map();
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
    if (chatCache && chatCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.CHATS);
    }
    const commentCache = localStorage.getItem(STORAGE_KEYS.COMMENTS);
    if (commentCache && commentCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    }
    const userCache = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userCache && userCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    const messageCache = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (messageCache && messageCache.includes('unsplash.com')) {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }

    // 1. Инициализация профилей
    this.profiles.set(currentUserMock.id, { ...currentUserMock });
    this.profiles.set(mishaProfileMock.id, { ...mishaProfileMock });
    this.profiles.set(annaProfileMock.id, { ...annaProfileMock });
    this.profiles.set(toboOfficialProfileMock.id, { ...toboOfficialProfileMock });

    // 2. Инициализация текущего пользователя
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    this.currentUser = savedUser ? JSON.parse(savedUser) : { ...currentUserMock };

    // 3. Инициализация постов
    const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    this.posts = savedPosts ? JSON.parse(savedPosts) : [...initialPostsMock];

    // 4. Инициализация чатов
    const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
    this.chats = savedChats ? JSON.parse(savedChats) : [...initialChatsMock];

    // 5. Инициализация сообщений
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages) as Record<string, Message[]>;
      Object.entries(parsed).forEach(([chatId, msgs]) => {
        this.messages.set(chatId, msgs);
      });
    } else {
      Object.entries(initialMessagesMock).forEach(([chatId, msgs]) => {
        this.messages.set(chatId, [...msgs]);
      });
    }

    // 6. Инициализация сессий
    const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    this.activeSessions = savedSessions ? JSON.parse(savedSessions) : [...activeSessionsMock];

    // 7. Инициализация черного списка
    const savedBlocked = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    this.blockedUsers = savedBlocked ? JSON.parse(savedBlocked) : [];
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
        author: this.profiles.get(p.author_id) || p.author
      }))
      .sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0));
  }

  getUserPosts(authorId: string): Post[] {
    return this.posts
      .filter(p => p.author_id === authorId)
      .map(p => ({ ...p, author: this.profiles.get(p.author_id) || p.author }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createPost(content: string, mediaUrls: string[], disableComments: boolean, audience: 'all' | 'friends'): Post {
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
      is_bookmarked: false
    };

    this.posts.unshift(newPost);
    this.persist(STORAGE_KEYS.POSTS, this.posts);
    this.notify('new_post', newPost);
    return newPost;
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

  createChat(type: ChatType, title: string, description?: string, avatarUrl?: string): Chat {
    const newChat: Chat = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

    this.chats.unshift(newChat);
    this.messages.set(newChat.id, []);
    this.persist(STORAGE_KEYS.CHATS, this.chats);
    this.notify('new_chat', newChat);
    return newChat;
  }

  getMessages(chatId: string): Message[] {
    const msgs = this.messages.get(chatId) || [];
    return msgs.map(m => ({
      ...m,
      sender: this.profiles.get(m.sender_id),
      forwarded_post: m.forwarded_post_id ? this.posts.find(p => p.id === m.forwarded_post_id) : null
    }));
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
