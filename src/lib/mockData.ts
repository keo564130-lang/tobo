// ==============================================================================
// СТАРТОВЫЕ ПРОИЗВОДСТВЕННЫЕ ДАННЫЕ ДЛЯ tobo (SEED & OFFLINE ENGINE)
// Лицензия: Apache License 2.0
// ==============================================================================

import type { Profile, Post, Chat, Message, ActiveSession } from '@/types/database';

// Надежные пастельные фолбэк-изображения (SVG Data URI)
export const alexAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_alex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239EB7E5"/><stop offset="100%" stop-color="%236A8DC9"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_alex)"/><circle cx="150" cy="115" r="50" fill="%23FFFFFF" fill-opacity="0.9"/><path d="M70,250 C70,195 105,175 150,175 C195,175 230,195 230,250 Z" fill="%23FFFFFF" fill-opacity="0.9"/></svg>`;

export const alexCoverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="cov_alex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239EB7E5"/><stop offset="50%" stop-color="%23D6C7E5"/><stop offset="100%" stop-color="%23BCE7D0"/></linearGradient></defs><rect width="1200" height="400" fill="url(%23cov_alex)"/><circle cx="200" cy="300" r="180" fill="%23FFFFFF" fill-opacity="0.25"/><circle cx="950" cy="120" r="220" fill="%23FFFFFF" fill-opacity="0.2"/><path d="M0,350 Q300,200 600,280 T1200,220 L1200,400 L0,400 Z" fill="%23FFFFFF" fill-opacity="0.2"/></svg>`;

export const mishaAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_misha" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23D6C7E5"/><stop offset="100%" stop-color="%239F8CB8"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_misha)"/><circle cx="150" cy="115" r="50" fill="%23FFFFFF" fill-opacity="0.9"/><path d="M70,250 C70,195 105,175 150,175 C195,175 230,195 230,250 Z" fill="%23FFFFFF" fill-opacity="0.9"/></svg>`;

export const mishaCoverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="cov_misha" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23D6C7E5"/><stop offset="50%" stop-color="%23FAD2B8"/><stop offset="100%" stop-color="%239EB7E5"/></linearGradient></defs><rect width="1200" height="400" fill="url(%23cov_misha)"/><path d="M100,200 C300,100 500,300 700,180 C900,60 1100,220 1200,150 L1200,400 L0,400 Z" fill="%23FFFFFF" fill-opacity="0.25"/><circle cx="600" cy="150" r="100" fill="%23FFFFFF" fill-opacity="0.2"/></svg>`;

export const annaAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_anna" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23BCE7D0"/><stop offset="100%" stop-color="%2376BFA0"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_anna)"/><circle cx="150" cy="115" r="50" fill="%23FFFFFF" fill-opacity="0.9"/><path d="M70,250 C70,195 105,175 150,175 C195,175 230,195 230,250 Z" fill="%23FFFFFF" fill-opacity="0.9"/></svg>`;

export const annaCoverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="cov_anna" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23BCE7D0"/><stop offset="50%" stop-color="%239EB7E5"/><stop offset="100%" stop-color="%23FAD2B8"/></linearGradient></defs><rect width="1200" height="400" fill="url(%23cov_anna)"/><circle cx="300" cy="150" r="140" fill="%23FFFFFF" fill-opacity="0.2"/><circle cx="850" cy="280" r="190" fill="%23FFFFFF" fill-opacity="0.25"/></svg>`;

export const peachCoverSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="cov_peach" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FAD2B8"/><stop offset="50%" stop-color="%23F7B297"/><stop offset="100%" stop-color="%23D6C7E5"/></linearGradient></defs><rect width="1200" height="400" fill="url(%23cov_peach)"/><circle cx="250" cy="180" r="160" fill="%23FFFFFF" fill-opacity="0.2"/><path d="M0,300 Q350,150 700,260 T1200,200 L1200,400 L0,400 Z" fill="%23FFFFFF" fill-opacity="0.25"/></svg>`;

export const toboOfficialAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_tobo" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239EB7E5"/><stop offset="50%" stop-color="%23D6C7E5"/><stop offset="100%" stop-color="%23BCE7D0"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_tobo)"/><text x="150" y="175" font-family="sans-serif" font-size="88" font-weight="900" fill="%231B315B" text-anchor="middle">tb</text></svg>`;

export const devChannelAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_dev" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239EB7E5"/><stop offset="100%" stop-color="%236A8DC9"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_dev)"/><polygon points="120,80 80,150 120,220" fill="none" stroke="%23FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><polygon points="180,80 220,150 180,220" fill="none" stroke="%23FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><line x1="160" y1="90" x2="140" y2="210" stroke="%23FFFFFF" stroke-width="16" stroke-linecap="round"/></svg>`;

export const familyAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_fam" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FAD2B8"/><stop offset="100%" stop-color="%23E09F7B"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_fam)"/><circle cx="115" cy="130" r="35" fill="%23FFFFFF" fill-opacity="0.9"/><circle cx="185" cy="130" r="35" fill="%23FFFFFF" fill-opacity="0.9"/><path d="M60,250 C60,205 90,190 115,190 C135,190 145,200 150,210 C155,200 165,190 185,190 C210,190 240,205 240,250 Z" fill="%23FFFFFF" fill-opacity="0.9"/></svg>`;

export const friendsAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><linearGradient id="av_fr" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23BCE7D0"/><stop offset="100%" stop-color="%239EB7E5"/></linearGradient></defs><rect width="300" height="300" rx="150" fill="url(%23av_fr)"/><circle cx="150" cy="115" r="45" fill="%23FFFFFF" fill-opacity="0.9"/><circle cx="95" cy="135" r="32" fill="%23FFFFFF" fill-opacity="0.7"/><circle cx="205" cy="135" r="32" fill="%23FFFFFF" fill-opacity="0.7"/><path d="M90,250 C90,205 115,185 150,185 C185,185 210,205 210,250 Z" fill="%23FFFFFF" fill-opacity="0.9"/></svg>`;

export const pastelMedia1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%239EB7E5"/><stop offset="50%" stop-color="%23D6C7E5"/><stop offset="100%" stop-color="%23BCE7D0"/></linearGradient></defs><rect width="800" height="450" rx="36" fill="url(%23g1)"/><circle cx="240" cy="225" r="110" fill="%23FFFFFF" fill-opacity="0.35"/><circle cx="560" cy="225" r="90" fill="%23FFFFFF" fill-opacity="0.25"/><text x="400" y="235" font-family="sans-serif" font-size="34" font-weight="bold" fill="%231B315B" text-anchor="middle">Material 3 Expressive</text><text x="400" y="275" font-family="sans-serif" font-size="18" fill="%231B315B" fill-opacity="0.8" text-anchor="middle">tobo design system</text></svg>`;

export const pastelMedia2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FAD2B8"/><stop offset="100%" stop-color="%23D6C7E5"/></linearGradient></defs><rect width="800" height="450" rx="36" fill="url(%23g2)"/><path d="M150,300 C300,180 500,320 650,200" stroke="%23FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.6"/><circle cx="400" cy="200" r="70" fill="%23FFFFFF" fill-opacity="0.4"/><text x="400" y="210" font-family="sans-serif" font-size="32" font-weight="bold" fill="%233A284E" text-anchor="middle">Vue 3 + Spring Dynamics</text></svg>`;

export const pastelMedia3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23BCE7D0"/><stop offset="100%" stop-color="%239EB7E5"/></linearGradient></defs><rect width="800" height="450" rx="36" fill="url(%23g3)"/><circle cx="400" cy="225" r="95" fill="%23FFFFFF" fill-opacity="0.4"/><text x="400" y="235" font-family="sans-serif" font-size="30" font-weight="bold" fill="%2316432B" text-anchor="middle">Pastel Harmony</text></svg>`;

export const pastelMedia4 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FAD2B8"/><stop offset="50%" stop-color="%23BCE7D0"/><stop offset="100%" stop-color="%239EB7E5"/></linearGradient></defs><rect width="800" height="450" rx="36" fill="url(%23g4)"/><circle cx="400" cy="225" r="120" fill="%23FFFFFF" fill-opacity="0.3"/><text x="400" y="235" font-family="sans-serif" font-size="32" font-weight="bold" fill="%231B315B" text-anchor="middle">Material 3 Architecture</text></svg>`;

export const currentUserMock: Profile = {
  id: 'user-me-001',
  username: 'alex_tobo',
  first_name: 'Алексей',
  last_name: 'Поляков',
  avatar_url: alexAvatarSvg,
  cover_url: alexCoverSvg,
  bio: 'Дизайнер интерфейсов & энтузиаст Material 3 Expressive. Строю будущее в tobo 🚀',
  is_online: true,
  is_developer: true,
  created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
};

export const mishaProfileMock: Profile = {
  id: 'user-misha-002',
  username: 'misha_dev',
  first_name: 'Миша',
  last_name: 'Смирнов',
  avatar_url: mishaAvatarSvg,
  cover_url: mishaCoverSvg,
  bio: 'Frontend & System Engineer. Люблю минимализм, чистый код и пастельные тона ☕',
  is_online: true,
  is_developer: true,
  last_seen: new Date().toISOString(),
  created_at: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString()
};

export const annaProfileMock: Profile = {
  id: 'user-anna-003',
  username: 'anna_art',
  first_name: 'Анна',
  last_name: 'Кузнецова',
  avatar_url: annaAvatarSvg,
  cover_url: annaCoverSvg,
  bio: 'UX Исследователь и фотограф. Изучаю психологию восприятия цвета.',
  is_online: false,
  is_developer: false,
  last_seen: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
};

export const toboOfficialProfileMock: Profile = {
  id: 'user-official-000',
  username: 'tobo_team',
  first_name: 'Команда',
  last_name: 'tobo',
  avatar_url: toboOfficialAvatarSvg,
  bio: 'Официальный аккаунт разработчиков социальной сети tobo',
  is_online: true,
  is_developer: true,
  created_at: '2026-01-01T00:00:00.000Z'
};

export const initialPostsMock: Post[] = [
  {
    id: 'post-101',
    author_id: toboOfficialProfileMock.id,
    author: toboOfficialProfileMock,
    content: '🎉 Добро пожаловать в tobo — новую социальную сеть и мессенджер в стандарте Material 3 Expressive!\n\nМы полностью переосмыслили пользовательский опыт: пастельные гармонии, плавающие островки, адаптивные тональные контейнеры и кристально чистый звук голосовых сообщений. Делитесь мыслями, общайтесь и сохраняйте лучшее в Избранное!',
    media_urls: [
      pastelMedia1,
      pastelMedia4
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
      pastelMedia2
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
      pastelMedia3
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
    avatar_url: devChannelAvatarSvg,
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
    avatar_url: familyAvatarSvg,
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
    avatar_url: friendsAvatarSvg,
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

export const activeSessionsMock: ActiveSession[] = [];
