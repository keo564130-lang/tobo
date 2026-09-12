// ==============================================================================
// СТАРТОВЫЕ ПРОИЗВОДСТВЕННЫЕ ДАННЫЕ ДЛЯ tobo (SEED & OFFLINE ENGINE)
// Лицензия: Apache License 2.0
// ==============================================================================

import type { Profile, Post, Chat, Message, ActiveSession } from '@/types/database';

export const currentUserMock: Profile = {
  id: 'user-me-001',
  username: 'alex_tobo',
  first_name: 'Алексей',
  last_name: 'Поляков',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  cover_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
  bio: 'Дизайнер интерфейсов & энтузиаст Material 3 Expressive. Строю будущее в tobo 🚀',
  is_online: true,
  created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
};

export const mishaProfileMock: Profile = {
  id: 'user-misha-002',
  username: 'misha_dev',
  first_name: 'Миша',
  last_name: 'Смирнов',
  avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  bio: 'Frontend & System Engineer. Люблю минимализм, чистый код и пастельные тона ☕',
  is_online: true,
  last_seen: new Date().toISOString(),
  created_at: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString()
};

export const annaProfileMock: Profile = {
  id: 'user-anna-003',
  username: 'anna_art',
  first_name: 'Анна',
  last_name: 'Кузнецова',
  avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  bio: 'UX Исследователь и фотограф. Изучаю психологию восприятия цвета.',
  is_online: false,
  last_seen: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
};

export const toboOfficialProfileMock: Profile = {
  id: 'user-official-000',
  username: 'tobo_team',
  first_name: 'Команда',
  last_name: 'tobo',
  avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
  bio: 'Официальный аккаунт разработчиков социальной сети tobo',
  is_online: true,
  created_at: '2026-01-01T00:00:00.000Z'
};

export const initialPostsMock: Post[] = [
  {
    id: 'post-101',
    author_id: toboOfficialProfileMock.id,
    author: toboOfficialProfileMock,
    content: '🎉 Добро пожаловать в tobo — новую социальную сеть и мессенджер в стандарте Material 3 Expressive!\n\nМы полностью переосмыслили пользовательский опыт: пастельные гармонии, плавающие островки, адаптивные тональные контейнеры и кристально чистый звук голосовых сообщений. Делитесь мыслями, общайтесь и сохраняйте лучшее в Избранное!',
    media_urls: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80'
    ],
    disable_comments: false,
    audience: 'all',
    likes_count: 342,
    comments_count: 58,
    reposts_count: 24,
    views_count: 4890,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    is_liked: false,
    is_reposted: false,
    is_bookmarked: false
  },
  {
    id: 'post-102',
    author_id: mishaProfileMock.id,
    author: mishaProfileMock,
    content: 'Плавающий нижний островок в tobo ощущается невероятно тактильно! Пружинные анимации M3 Expressive создают то самое ощущение физического контакта с интерфейсом. Команда провела колоссальную работу по оптимизации рендеринга.',
    media_urls: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&auto=format&fit=crop&q=80'
    ],
    disable_comments: false,
    audience: 'all',
    likes_count: 189,
    comments_count: 22,
    reposts_count: 12,
    views_count: 2150,
    created_at: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
    is_liked: true,
    is_reposted: false,
    is_bookmarked: true
  },
  {
    id: 'post-103',
    author_id: annaProfileMock.id,
    author: annaProfileMock,
    content: 'Пастельная палитра (Pastel Sky, Lavender, Mint, Peach) в сочетании с молочно-пудровой светлой темой и графитовой тёмной — это просто спасение для глаз при длительной работе вечером. Никаких токсичных контрастов, только гармония 🌸',
    media_urls: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80'
    ],
    disable_comments: false,
    audience: 'all',
    likes_count: 94,
    comments_count: 8,
    reposts_count: 5,
    views_count: 1320,
    created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    is_liked: false,
    is_reposted: false,
    is_bookmarked: false
  }
];

export const initialChatsMock: Chat[] = [
  {
    id: 'chat-saved-001',
    type: 'saved',
    title: 'Избранное',
    description: 'Ваше персональное облачное хранилище заметок, медиа и сохраненных постов',
    created_by: currentUserMock.id,
    created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
    unread_count: 0,
    last_message: {
      id: 'msg-s-01',
      chat_id: 'chat-saved-001',
      sender_id: currentUserMock.id,
      content: '📌 Заметка: проверить интеграцию Web Audio API в голосовых сообщениях',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  },
  {
    id: 'chat-dev-channel-002',
    type: 'channel',
    title: 'Канал Разработки',
    description: 'Официальный системный канал tobo с новостями, анонсами и апдейтами платформы.',
    avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
    created_by: toboOfficialProfileMock.id,
    created_at: '2026-01-01T00:00:00.000Z',
    subscribers_count: 15420,
    unread_count: 1,
    last_message: {
      id: 'msg-dev-01',
      chat_id: 'chat-dev-channel-002',
      sender_id: toboOfficialProfileMock.id,
      content: '✨ Релиз tobo v1.0: запущен алгоритмический скоринг ленты с затуханием во времени (Time Decay) и PWA кэширование!',
      media_urls: [],
      is_read: false,
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
    }
  },
  {
    id: 'chat-direct-misha-003',
    type: 'direct',
    title: 'Миша',
    avatar_url: mishaProfileMock.avatar_url,
    created_by: currentUserMock.id,
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    unread_count: 1,
    last_message: {
      id: 'msg-m-02',
      chat_id: 'chat-direct-misha-003',
      sender_id: mishaProfileMock.id,
      content: 'Привет! Посмотрел спецификацию Material 3 Expressive, всё выглядит шикарно. Отправил тебе аудиозапись!',
      media_urls: [],
      voice_url: 'demo-voice-url',
      voice_duration: 12,
      voice_wave: [0.2, 0.4, 0.6, 0.8, 0.5, 0.9, 0.7, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.5, 0.3, 0.6, 0.4, 0.2, 0.1],
      is_read: false,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'chat-group-family-004',
    type: 'group',
    title: 'Семья',
    description: 'Уютный семейный чат для планов, фотографий и новостей 🏡',
    avatar_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&auto=format&fit=crop&q=80',
    created_by: currentUserMock.id,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    members_count: 5,
    online_count: 3,
    unread_count: 0,
    last_message: {
      id: 'msg-f-01',
      chat_id: 'chat-group-family-004',
      sender_id: annaProfileMock.id,
      content: 'Кто завтра свободен на семейный обед? 🍰',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    }
  },
  {
    id: 'chat-channel-friends-005',
    type: 'channel',
    title: 'Друзья',
    description: 'Канал для близких: интересные статьи, музыка и полезные находки.',
    avatar_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&auto=format&fit=crop&q=80',
    created_by: currentUserMock.id,
    created_at: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    subscribers_count: 1240,
    unread_count: 0,
    last_message: {
      id: 'msg-fr-01',
      chat_id: 'chat-channel-friends-005',
      sender_id: currentUserMock.id,
      content: 'Опубликовал новую подборку пастельных архитектурных решений для интерфейсов!',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    }
  }
];

export const initialMessagesMock: Record<string, Message[]> = {
  'chat-saved-001': [
    {
      id: 'msg-s-00',
      chat_id: 'chat-saved-001',
      sender_id: currentUserMock.id,
      content: 'Добро пожаловать в Избранное! Сюда автоматически сохраняются посты из Ленты при нажатии "В Избранное", а также ваши персональные заметки.',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 80 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'msg-s-01',
      chat_id: 'chat-saved-001',
      sender_id: currentUserMock.id,
      content: '📌 Заметка: проверить интеграцию Web Audio API в голосовых сообщениях',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  ],
  'chat-dev-channel-002': [
    {
      id: 'msg-dev-00',
      chat_id: 'chat-dev-channel-002',
      sender_id: toboOfficialProfileMock.id,
      content: '🚀 Добро пожаловать на официальный Канал Разработки tobo! Здесь публикуются все новости ядра системы.',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    },
    {
      id: 'msg-dev-01',
      chat_id: 'chat-dev-channel-002',
      sender_id: toboOfficialProfileMock.id,
      content: '✨ Релиз tobo v1.0: запущен алгоритмический скоринг ленты с затуханием во времени (Time Decay) и PWA кэширование!',
      media_urls: [],
      is_read: false,
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
    }
  ],
  'chat-direct-misha-003': [
    {
      id: 'msg-m-01',
      chat_id: 'chat-direct-misha-003',
      sender_id: currentUserMock.id,
      content: 'Привет, Миша! Как тебе плавающие островки в новом макете tobo?',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-m-02',
      chat_id: 'chat-direct-misha-003',
      sender_id: mishaProfileMock.id,
      content: 'Привет! Посмотрел спецификацию Material 3 Expressive, всё выглядит шикарно. Отправил тебе аудиозапись!',
      media_urls: [],
      voice_url: 'demo-voice-url',
      voice_duration: 12,
      voice_wave: [0.2, 0.4, 0.6, 0.8, 0.5, 0.9, 0.7, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.9, 0.6, 0.4, 0.8, 0.5, 0.3, 0.6, 0.4, 0.2, 0.1],
      is_read: false,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ],
  'chat-group-family-004': [
    {
      id: 'msg-f-00',
      chat_id: 'chat-group-family-004',
      sender_id: currentUserMock.id,
      content: 'Создал наш семейный чат в tobo! Тут очень удобно обмениваться фото без потери качества.',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
    },
    {
      id: 'msg-f-01',
      chat_id: 'chat-group-family-004',
      sender_id: annaProfileMock.id,
      content: 'Кто завтра свободен на семейный обед? 🍰',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    }
  ],
  'chat-channel-friends-005': [
    {
      id: 'msg-fr-01',
      chat_id: 'chat-channel-friends-005',
      sender_id: currentUserMock.id,
      content: 'Опубликовал новую подборку пастельных архитектурных решений для интерфейсов!',
      media_urls: [],
      is_read: true,
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    }
  ]
};

export const activeSessionsMock: ActiveSession[] = [
  {
    id: 'session-1',
    user_id: currentUserMock.id,
    device: 'Windows PC / Рабочая станция',
    browser: 'Chrome 128 (Desktop)',
    ip_address: '178.62.204.14 (Москва)',
    last_active: 'В сети сейчас',
    is_current: true
  },
  {
    id: 'session-2',
    user_id: currentUserMock.id,
    device: 'iPhone 15 Pro (PWA Standalone)',
    browser: 'Safari Mobile 17.5',
    ip_address: '94.25.180.22 (Москва)',
    last_active: '24 минуты назад',
    is_current: false
  },
  {
    id: 'session-3',
    user_id: currentUserMock.id,
    device: 'iPad Pro 11"',
    browser: 'Safari Mobile 17.4',
    ip_address: '94.25.180.22 (Москва)',
    last_active: '3 дня назад',
    is_current: false
  }
];
