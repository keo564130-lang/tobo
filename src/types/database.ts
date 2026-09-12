// ==============================================================================
// МОДЕЛИ И ТИПЫ ДАННЫХ ДЛЯ СОЦИАЛЬНОЙ СЕТИ И МЕССЕНДЖЕРА tobo
// Лицензия: Apache License 2.0
// ==============================================================================

export type ChatType = 'direct' | 'group' | 'channel' | 'saved';
export type MemberRole = 'owner' | 'admin' | 'member';
export type PostAudience = 'all' | 'friends';
export type PastelTheme = 'sky' | 'lavender' | 'mint' | 'peach';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontScale = '90' | '100' | '115';

export interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  is_online: boolean;
  last_seen?: string;
  created_at: string;
  updated_at?: string;
}

export interface Post {
  id: string;
  author_id: string;
  author?: Profile;
  content: string;
  media_urls: string[];
  disable_comments: boolean;
  audience: PostAudience;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  views_count: number;
  created_at: string;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
  rank_score?: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  author?: Profile;
  text: string;
  parent_id?: string | null;
  created_at: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string;
  avatar_url?: string;
  description?: string;
  created_by: string;
  created_at: string;
  last_message?: Message;
  unread_count?: number;
  members_count?: number;
  online_count?: number;
  subscribers_count?: number;
  members?: ChatMember[];
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender?: Profile;
  content?: string;
  media_urls?: string[];
  voice_url?: string;
  voice_duration?: number;
  voice_wave?: number[];
  is_read: boolean;
  forwarded_post_id?: string | null;
  forwarded_post?: Post | null;
  created_at: string;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
  profile?: Profile;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details?: string;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  device: string;
  browser: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

export interface UserSettings {
  privacy: {
    online_visibility: 'everyone' | 'friends' | 'nobody';
    can_message: 'everyone' | 'friends';
    can_add_to_groups: 'everyone' | 'friends';
  };
  notifications: {
    push_enabled: boolean;
    direct_sound: boolean;
    group_sound: boolean;
    channel_sound: boolean;
    vibration: boolean;
  };
  storage: {
    auto_download: 'always' | 'wifi' | 'never';
  };
  security: {
    two_factor_enabled: boolean;
  };
}
