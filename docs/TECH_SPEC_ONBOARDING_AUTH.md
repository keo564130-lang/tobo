# ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ (TECH SPEC): СИСТЕМА АВТОРИЗАЦИИ, ОНБОРДИНГА, КРОППЕРА АВАТАРОК И ПРАВ РАЗРАБОТЧИКА TOBO

**Версия документа**: 1.0.0-PROD  
**Стандарт интерфейса**: Google Material 3 Expressive (M3)  
**Инфраструктура**: Supabase (PostgreSQL 15, Auth, Storage, Realtime), Vue 3 (Composition API, `<script setup lang="ts">`), Pinia, Tailwind CSS  
**Автор**: Агент ТЗ (Lead Spec & Prompt Architect, 2-й ранг)  
**Адресат**: Главный Агент (Supreme Lead) для утверждения и передачи исполнителям 1-й ступени  

---

## 1. МАТРИЦА СТЫКОВКИ ИНТЕРФЕЙСОВ (CONTRACT-FIRST MATRIX)

Настоящий раздел фиксирует единый контракт взаимодействия исполнителей согласно **Правилу 1 (Строгое разделение зон ответственности)** и **Правилу 2 (Контрактный подход)**. Любое отклонение от зафиксированных типов данных и интерфейсов запрещено.

```
+-----------------------------------------------------------------------------------+
|                              АРХИТЕКТУРНАЯ СХЕМА СВЯЗЕЙ                           |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Серверный Агент ]                                                              |
|       │                                                                           |
|       ▼                                                                           |
|  PostgreSQL 15 + RLS + Storage Buckets ('avatars', 'media')                       |
|       │                                                                           |
|       ├──────────────────────────────────────────┐                                |
|       ▼                                          ▼                                |
|  [ Агент по коду ]                      [ Агент по коду ]                         |
|  src/stores/auth.ts                     src/lib/cropperEngine.ts                  |
|  src/lib/validation.ts                  src/stores/feed.ts & chat.ts              |
|       │                                          │                                |
|       ├──────────────────────────────────────────┘                                |
|       ▼                                                                           |
|  [ Агент по дизайну ]                                                             |
|  src/components/profile/AvatarCropperModal.vue (M3 + VK Референс)                 |
|  src/components/auth/AuthModal.vue (M3 Segmented Auth)                            |
|  src/components/auth/OnboardingModal.vue (2-Step Profile Wizard)                  |
|  src/views/ProfileView.vue (Бейдж «Разработчик tobo»)                             |
|  src/components/messages/ChatRoom.vue (Права вещания в Канал Разработки)          |
|       │                                                                           |
|       ▼                                                                           |
|  [ Младший тестер ]                                                               |
|  E2E Click Flows (Chrome 390x844), Zero Console Errors, Network Audit             |
+-----------------------------------------------------------------------------------+
```

### 1.1. Реестр контрактов и файлов

| Исполнитель | Файл назначения | Назначение контракта |
| :--- | :--- | :--- |
| ⚙️ Серверный Агент | `supabase/migrations/20260912_developer_and_storage.sql` | Схема БД, RLS, Storage-бакеты, RPC `get_ranked_feed`, триггеры |
| 💻 Агент по коду | `src/types/database.ts` | Базовые типы сущностей (`Profile.is_developer`) |
| 💻 Агент по коду | `src/lib/validation.ts` | Функции валидации email, пароля, @username, имен |
| 💻 Агент по коду | `src/lib/cropperEngine.ts` | Математический модуль расчета координат и кадрирования Canvas |
| 💻 Агент по коду | `src/stores/auth.ts` | Стор Pinia: сессия Supabase Auth, реактивный `isDeveloper`, SDK |
| 💻 Агент по коду | `src/stores/feed.ts` | Интеграция реальных запросов ленты через Supabase RPC |
| 💻 Агент по коду | `src/stores/chat.ts` | Интеграция сообщений, прав участников в каналах |
| 🎨 Агент по дизайну | `src/components/profile/AvatarCropperModal.vue` | Модальное окно кадрирования аватарки по референсу ВК |
| 🎨 Агент по дизайну | `src/components/auth/AuthModal.vue` | M3 Expressive модальное окно Входа / Регистрации |
| 🎨 Агент по дизайну | `src/components/auth/OnboardingModal.vue` | M3 Expressive двухэтапный мастер настройки профиля |
| 🎨 Агент по дизайну | `src/views/ProfileView.vue` | Отображение бейджа «Разработчик tobo» |
| 🎨 Агент по дизайну | `src/components/messages/ChatRoom.vue` | Блокировка/разблокировка поля ввода в официальном канале |
| 🔍 Младший тестер | Чек-лист сквозного тестирования | Click Flows, эмуляция Chrome 390x844 |

---

## 2. СПЕЦИФИКАЦИЯ ДЛЯ ⚙️ СЕРВЕРНОГО АГЕНТА (backend_agent)

### 2.1. Зона ответственности
Исключительно SQL-миграции, структуры PostgreSQL, хранимые функции, RLS-политики и хранилище Supabase Storage. Никаких правок во frontend-коде (`.vue`, `.ts`, CSS).

### 2.2. Задачи Серверного Агента
1. Добавить колонку `is_developer` в `public.profiles`.
2. Создать и настроить публичные бакеты `avatars` и `media` в схеме `storage`.
3. Сформировать RLS-политики для бакетов `avatars` и `media`.
4. Обновить триггер `handle_new_user()`.
5. Обновить функцию скоринга `get_ranked_feed()`, чтобы она возвращала `author_is_developer`.
6. Подготовить SQL-скрипт выдачи пользователю статуса «Разработчик tobo» и владельца в канале «Канал Разработки».

### 2.3. Исполняемый SQL-скрипт миграции
Создать файл: `supabase/migrations/20260912_developer_and_storage.sql`

```sql
-- ==============================================================================
-- МИГРАЦИЯ: ДОБАВЛЕНИЕ СТАТУСА РАЗРАБОТЧИКА И ХРАНИЛИЩА SUPABASE STORAGE
-- Проект: tobo (https://ftqmksipbkbcnivhxgzu.supabase.co)
-- ==============================================================================

-- 1. ДОБАВЛЕНИЕ КОЛОНКИ is_developer В ТАБЛИЦУ PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_developer BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_developer 
ON public.profiles(is_developer) 
WHERE is_developer = true;

-- 2. ОБНОВЛЕНИЕ ТРИГГЕРА handle_new_user ДЛЯ ПЕРВИЧНОЙ ИНИЦИАЛИЗАЦИИ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    saved_chat_id UUID;
    dev_channel_id UUID;
    is_dev BOOLEAN;
BEGIN
    is_dev := COALESCE((NEW.raw_user_meta_data->>'is_developer')::boolean, false);

    -- 1. Создаем профиль пользователя
    INSERT INTO public.profiles (
        id, 
        username, 
        first_name, 
        last_name, 
        avatar_url, 
        cover_url,
        bio,
        is_developer
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Участник'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'cover_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'bio', 'Новый пользователь tobo'),
        is_dev
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar_url = EXCLUDED.avatar_url,
        cover_url = EXCLUDED.cover_url,
        bio = EXCLUDED.bio,
        is_developer = EXCLUDED.is_developer,
        updated_at = now();

    -- 2. Создаем персональный чат "Избранное"
    INSERT INTO public.chats (type, title, description, created_by)
    VALUES ('saved', 'Избранное', 'Ваше персональное облачное хранилище заметок и постов', NEW.id)
    RETURNING id INTO saved_chat_id;

    INSERT INTO public.chat_members (chat_id, user_id, role)
    VALUES (saved_chat_id, NEW.id, 'owner')
    ON CONFLICT DO NOTHING;

    -- 3. Присоединение к официальному каналу "Канал Разработки"
    SELECT id INTO dev_channel_id FROM public.chats WHERE title = 'Канал Разработки' AND type = 'channel' LIMIT 1;
    IF dev_channel_id IS NULL THEN
        INSERT INTO public.chats (type, title, description, created_by)
        VALUES ('channel', 'Канал Разработки', 'Официальный системный канал tobo с новостями, апдейтами и чейнджлогом', NEW.id)
        RETURNING id INTO dev_channel_id;

        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, 'owner')
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, NEW.id, CASE WHEN is_dev THEN 'owner' ELSE 'member' END)
        ON CONFLICT (chat_id, user_id) DO UPDATE SET
            role = CASE WHEN is_dev THEN 'owner' ELSE chat_members.role END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ОБНОВЛЕНИЕ ХРАНИМОЙ ФУНКЦИИ get_ranked_feed ДЛЯ ВЫДАЧИ author_is_developer
DROP FUNCTION IF EXISTS public.get_ranked_feed(INT, INT);

CREATE OR REPLACE FUNCTION public.get_ranked_feed(
    page_offset INT DEFAULT 0,
    page_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    content TEXT,
    media_urls JSONB,
    disable_comments BOOLEAN,
    audience TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    reposts_count BIGINT,
    views_count BIGINT,
    created_at TIMESTAMPTZ,
    rank_score DOUBLE PRECISION,
    author_username TEXT,
    author_first_name TEXT,
    author_last_name TEXT,
    author_avatar_url TEXT,
    author_is_developer BOOLEAN
) 
LANGUAGE sql STABLE AS $$
    SELECT 
        p.id,
        p.author_id,
        p.content,
        p.media_urls,
        p.disable_comments,
        p.audience,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.views_count,
        p.created_at,
        (
            (p.views_count * 0.1 + p.likes_count * 2.0 + p.comments_count * 3.0 + p.reposts_count * 4.0)
            / 
            POWER(GREATEST(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0, 0) + 2.0, 1.5)
        )::DOUBLE PRECISION AS rank_score,
        prof.username AS author_username,
        prof.first_name AS author_first_name,
        prof.last_name AS author_last_name,
        prof.avatar_url AS author_avatar_url,
        prof.is_developer AS author_is_developer
    FROM public.posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    ORDER BY rank_score DESC, p.created_at DESC
    LIMIT page_limit OFFSET page_offset;
$$;

-- 4. НАСТРОЙКА БАКЕТОВ SUPABASE STORAGE (avatars, media)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('media', 'media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. RLS-ПОЛИТИКИ ДЛЯ STORAGE OBJECTS
-- Чтение бакетов avatars и media открыто для всех
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for avatars and media'
    ) THEN
        CREATE POLICY "Public Access for avatars and media" 
        ON storage.objects FOR SELECT 
        USING (bucket_id IN ('avatars', 'media'));
    END IF;
END $$;

-- Загрузка объектов: только авторизованные пользователи в свои папки
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to avatars'
    ) THEN
        CREATE POLICY "Authenticated users can upload to avatars" 
        ON storage.objects FOR INSERT 
        WITH CHECK (
            bucket_id = 'avatars' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to media'
    ) THEN
        CREATE POLICY "Authenticated users can upload to media" 
        ON storage.objects FOR INSERT 
        WITH CHECK (
            bucket_id = 'media' 
            AND auth.role() = 'authenticated'
            AND (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;

-- Обновление и удаление объектов: только владелец
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update own storage objects'
    ) THEN
        CREATE POLICY "Users can update own storage objects" 
        ON storage.objects FOR UPDATE 
        USING (auth.uid() = owner);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete own storage objects'
    ) THEN
        CREATE POLICY "Users can delete own storage objects" 
        ON storage.objects FOR DELETE 
        USING (auth.uid() = owner);
    END IF;
END $$;
```

### 2.4. Скрипт выдачи пользователю статуса «Разработчик tobo»
Файл или выполняемый сниппет для назначения прав:
```sql
-- ПАРАМЕТРИЗОВАННЫЙ СКРИПТ: Выдача статуса разработчика и роли owner в Канале Разработки
-- Замените target_email на целевой адрес пользователя
DO $$
DECLARE
    target_user_id UUID;
    dev_channel_id UUID;
    target_email TEXT := 'alex@tobo.me'; -- Укажите email нужного пользователя
BEGIN
    -- Находим ID пользователя по email в auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Пользователь с email % не найден', target_email;
        RETURN;
    END IF;

    -- 1. Выдаем статус разработчика в profiles
    UPDATE public.profiles 
    SET is_developer = true, updated_at = now() 
    WHERE id = target_user_id;

    -- 2. Находим Канал Разработки
    SELECT id INTO dev_channel_id 
    FROM public.chats 
    WHERE title = 'Канал Разработки' AND type = 'channel' 
    LIMIT 1;

    -- 3. Назначаем права владельца (owner) в канале
    IF dev_channel_id IS NOT NULL THEN
        INSERT INTO public.chat_members (chat_id, user_id, role)
        VALUES (dev_channel_id, target_user_id, 'owner')
        ON CONFLICT (chat_id, user_id) 
        DO UPDATE SET role = 'owner';

        -- Также обновляем created_by чата при необходимости
        UPDATE public.chats 
        SET created_by = target_user_id 
        WHERE id = dev_channel_id;

        RAISE NOTICE 'Пользователю % успешно присвоен статус Разработчик tobo и права owner в Канале Разработки', target_email;
    ELSE
        RAISE WARNING 'Канал Разработки не найден!';
    END IF;
END $$;
```

---

## 3. СПЕЦИФИКАЦИЯ ДЛЯ 💻 АГЕНТА ПО КОДУ (coder_agent)

### 3.1. Зона ответственности
Исключительно строгая типизация TypeScript, валидация данных, математика расчетов на Canvas, хранилища Pinia и интеграция с методами Supabase JS SDK.
**Категорически запрещено**: внедрять HTML-разметку компонентов, Tailwind-классы, стили и CSS-анимации.

### 3.2. Обновление моделей типов (`src/types/database.ts`)

В интерфейс `Profile` добавить обязательное поле `is_developer`:
```typescript
export interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  is_online: boolean;
  is_developer: boolean; // <-- НОВОЕ ПОЛЕ
  last_seen?: string;
  created_at: string;
  updated_at?: string;
}
```

В интерфейс `Post` убедиться в наличии флага разработчика в объекте автора:
```typescript
export interface RankedPostAuthor extends Profile {
  is_developer: boolean;
}
```

### 3.3. Модуль строгой валидации форм (`src/lib/validation.ts`)
Создать файл `src/lib/validation.ts` со следующими чистыми сигнатурами:

```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Валидация Email согласно RFC 5322
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Адрес электронной почты обязателен' };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Введите корректный адрес электронной почты' };
  }
  return { isValid: true };
}

/**
 * Валидация пароля (минимум 6 символов, отсутствие пробелов)
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Пароль обязателен для заполнения' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Пароль должен содержать минимум 6 символов' };
  }
  if (/\s/.test(password)) {
    return { isValid: false, error: 'Пароль не должен содержать пробелы' };
  }
  return { isValid: true };
}

/**
 * Валидация уникального ника @username (латиница, цифры, _, длина 3-24)
 */
export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Юзернейм обязателен для заполнения' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Юзернейм не может быть короче 3 символов' };
  }
  if (trimmed.length > 24) {
    return { isValid: false, error: 'Юзернейм не может превышать 24 символа' };
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, error: 'Разрешены только буквы латиницы, цифры и символ _' };
  }
  return { isValid: true };
}

/**
 * Валидация обязательного имени
 */
export function validateFirstName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Имя обязательно для заполнения' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Имя должно содержать минимум 2 символа' };
  }
  return { isValid: true };
}
```

### 3.4. Математический модуль алгоритма кадрирования Canvas (`src/lib/cropperEngine.ts`)
Создать файл `src/lib/cropperEngine.ts`.
Модуль содержит строгую аналитическую геометрию преобразования экранных координат жестов драга и зума в координаты целевого растра 400x400:

```typescript
export interface CropperDimensions {
  containerWidth: number;   // 288 px
  containerHeight: number;  // 288 px
  viewfinderPadding: number; // 14 px от края до круга
  viewfinderDiameter: number; // 260 px
  targetSize: number;       // 400 px
}

export interface ImageLayout {
  naturalWidth: number;
  naturalHeight: number;
  displayedWidth: number;
  displayedHeight: number;
}

export interface CropState {
  offsetX: number;
  offsetY: number;
  zoom: number; // 1.0 ... 3.0
}

export interface CropResult {
  base64: string;
  blob: Blob;
}

export const DEFAULT_CROPPER_DIMENSIONS: CropperDimensions = {
  containerWidth: 288,
  containerHeight: 288,
  viewfinderPadding: 14,
  viewfinderDiameter: 260,
  targetSize: 400
};

/**
 * Рассчитывает координаты и выполняет обрезку на Canvas 400x400 с экспортом в Base64 JPEG.
 */
export async function processCanvasCrop(
  imageSource: string | HTMLImageElement,
  state: CropState,
  containerRect: { width: number; height: number; left: number; top: number },
  imageRect: { width: number; height: number; left: number; top: number },
  dimensions: CropperDimensions = DEFAULT_CROPPER_DIMENSIONS
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const handleImageLoaded = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.targetSize;
        canvas.height = dimensions.targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context init failed'));
          return;
        }

        // 1. Координаты видоискателя на экране
        const scaleFactorX = containerRect.width / dimensions.containerWidth;
        const scaleFactorY = containerRect.height / dimensions.containerHeight;
        
        const cropScreenLeft = containerRect.left + dimensions.viewfinderPadding * scaleFactorX;
        const cropScreenTop = containerRect.top + dimensions.viewfinderPadding * scaleFactorY;
        const cropScreenDiameter = dimensions.viewfinderDiameter * scaleFactorX;

        // 2. Коэффициент пересчета экрана в выходные 400x400 пикселей
        const screenToTargetRatio = dimensions.targetSize / cropScreenDiameter;

        // 3. Расчет позиции отрисовки изображения относительно верхнего левого угла холста
        const drawX = (imageRect.left - cropScreenLeft) * screenToTargetRatio;
        const drawY = (imageRect.top - cropScreenTop) * screenToTargetRatio;
        const drawW = imageRect.width * screenToTargetRatio;
        const drawH = imageRect.height * screenToTargetRatio;

        // 4. Заливка фонового нейтрального слоя (для исключения прозрачности в JPEG)
        ctx.fillStyle = '#1A1C1E';
        ctx.fillRect(0, 0, dimensions.targetSize, dimensions.targetSize);

        // 5. Включение качественной бикубической интерполяции
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 6. Отрисовка трансформированного кадра
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // 7. Экспорт в Base64 и Blob
        const base64 = canvas.toDataURL('image/jpeg', 0.92);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert Canvas to Blob'));
              return;
            }
            resolve({ base64, blob });
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => handleImageLoaded(img);
      img.onerror = (e) => reject(new Error('Image failed to load in cropperEngine'));
      img.src = imageSource;
    } else {
      handleImageLoaded(imageSource);
    }
  });
}
```

### 3.5. Модернизация хранилища авторизации (`src/stores/auth.ts`)
Полная типизированная реализация с методами `initAuth`, `signUp`, `signIn`, `signOut`, `uploadAvatar`, `uploadCover`, реактивным геттером `isDeveloper` и подпиской `onAuthStateChange`:

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { supabase, isSupabaseConfigured, localStore } from '@/lib/supabase';
import { currentUserMock } from '@/lib/mockData';

export const useAuthStore = defineStore('auth', () => {
  // Состояния
  const session = ref<Session | null>(null);
  const authUser = ref<User | null>(null);
  const user = ref<Profile>(localStore.getCurrentUser());
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const authError = ref<string | null>(null);

  // Модальные окна
  const showAuthModal = ref(false);
  const authModalMode = ref<'signin' | 'signup'>('signin');
  const showOnboarding = ref(false);
  const onboardingStep = ref<'register' | 'profile'>('profile');

  // Геттеры
  const isAuthenticated = computed(() => Boolean(session.value?.user || (user.value && user.value.id !== '')));
  const isDeveloper = computed(() => Boolean(user.value?.is_developer));

  // 1. ИНИЦИАЛИЗАЦИЯ СЕССИИ И СЛУШАТЕЛЬ SUPABASE AUTH
  async function initAuth(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        session.value = existingSession;
        authUser.value = existingSession?.user || null;

        if (existingSession?.user) {
          await loadUserProfile(existingSession.user.id);
        }

        // Слушатель событий смены состояния авторизации
        supabase.auth.onAuthStateChange(async (event, currentSession) => {
          session.value = currentSession;
          authUser.value = currentSession?.user || null;

          if (event === 'SIGNED_IN' && currentSession?.user) {
            await loadUserProfile(currentSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            user.value = { ...currentUserMock, id: '', is_developer: false };
            localStore.updateCurrentUser(user.value);
          }
        });
      }
    } catch (err: any) {
      console.warn('initAuth warning:', err);
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  // Загрузка профиля из public.profiles
  async function loadUserProfile(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        user.value = {
          ...data,
          is_developer: Boolean(data.is_developer)
        };
        localStore.updateCurrentUser(user.value);
      }
    } catch (err) {
      console.warn('loadUserProfile error:', err);
    }
  }

  // 2. РЕГИСТРАЦИЯ
  async function signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true;
    authError.value = null;

    try {
      if (isSupabaseConfigured() && supabase) {
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: baseUsername,
              first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)
            }
          }
        });

        if (error) {
          authError.value = error.message;
          return { success: false, error: error.message };
        }

        if (data.user) {
          session.value = data.session;
          authUser.value = data.user;
          await loadUserProfile(data.user.id);
          return { success: true };
        }
      } else {
        // Офлайн-режим
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        const updated = localStore.updateCurrentUser({
          username: baseUsername,
          first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1),
          is_developer: false
        });
        user.value = updated;
        return { success: true };
      }
    } catch (err: any) {
      authError.value = err.message || 'Ошибка регистрации';
      return { success: false, error: authError.value || undefined };
    } finally {
      isLoading.value = false;
    }
    return { success: true };
  }

  // 3. ВХОД
  async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true;
    authError.value = null;

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          authError.value = error.message;
          return { success: false, error: error.message };
        }

        session.value = data.session;
        authUser.value = data.user;
        await loadUserProfile(data.user.id);
        return { success: true };
      } else {
        return { success: true };
      }
    } catch (err: any) {
      authError.value = err.message || 'Ошибка входа';
      return { success: false, error: authError.value || undefined };
    } finally {
      isLoading.value = false;
    }
  }

  // 4. ВЫХОД
  async function signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    session.value = null;
    authUser.value = null;
    user.value = { ...currentUserMock, id: '', is_developer: false };
    localStore.updateCurrentUser(user.value);
  }

  // 5. ЗАГРУЗКА АВАТАРА В SUPABASE STORAGE
  async function uploadAvatar(blob: Blob): Promise<string> {
    if (!isSupabaseConfigured() || !supabase || !user.value.id) {
      return URL.createObjectURL(blob);
    }
    const path = `${user.value.id}/avatar_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  // 6. ЗАГРУЗКА ОБЛОЖКИ В SUPABASE STORAGE
  async function uploadCover(file: File | Blob): Promise<string> {
    if (!isSupabaseConfigured() || !supabase || !user.value.id) {
      return URL.createObjectURL(file);
    }
    const path = `${user.value.id}/cover_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('media').upload(path, file, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  }

  // 7. ПРОВЕРКА УНИКАЛЬНОСТИ @USERNAME
  async function checkUsernameUnique(username: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .neq('id', user.value.id || '00000000-0000-0000-0000-000000000000')
        .limit(1);
      return !error && (!data || data.length === 0);
    } catch {
      return true;
    }
  }

  // 8. ЗАВЕРШЕНИЕ ОНБОРДИНГА И ОБНОВЛЕНИЕ ПРОФИЛЯ
  async function completeOnboarding(profileData: Partial<Profile>): Promise<void> {
    const updated = localStore.updateCurrentUser(profileData);
    user.value = updated;
    localStorage.setItem('tobo_onboarding_completed', 'true');

    if (isSupabaseConfigured() && supabase && user.value.id) {
      await supabase.from('profiles').update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        username: profileData.username,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        cover_url: profileData.cover_url,
        updated_at: new Date().toISOString()
      }).eq('id', user.value.id);
    }
  }

  function openAuthModal(mode: 'signin' | 'signup' = 'signin') {
    authModalMode.value = mode;
    showAuthModal.value = true;
  }

  function openOnboarding(step: 'register' | 'profile' = 'profile') {
    onboardingStep.value = step;
    showOnboarding.value = true;
  }

  return {
    session,
    authUser,
    user,
    isLoading,
    isInitialized,
    authError,
    showAuthModal,
    authModalMode,
    showOnboarding,
    onboardingStep,
    isAuthenticated,
    isDeveloper,
    initAuth,
    signUp,
    signIn,
    signOut,
    uploadAvatar,
    uploadCover,
    checkUsernameUnique,
    completeOnboarding,
    openAuthModal,
    openOnboarding
  };
});
```

### 3.6. Интеграция реальных запросов к Supabase в `src/stores/feed.ts`
В `refreshFeed()` при чтении из `get_ranked_feed` маппить флаг разработчика автора:
```typescript
author: {
  id: row.author_id,
  username: row.author_username,
  first_name: row.author_first_name,
  last_name: row.author_last_name,
  avatar_url: row.author_avatar_url,
  is_developer: Boolean(row.author_is_developer),
  is_online: false,
  created_at: row.created_at
}
```

---

## 4. СПЕЦИФИКАЦИЯ ДЛЯ 🎨 АГЕНТА ПО ДИЗАЙНУ (designer_agent)

### 4.1. Зона ответственности
Исключительно верстка компонентов Vue 3, визуальная эстетика Material 3 Expressive, Tailwind-классы, SVG-маски видоискателя, пружинные анимации, сенсорные состояния `active:scale-[0.98]`.
**Категорически запрещено**: писать прямые обращения к БД, сетевые вызовы `fetch/supabase`, бизнес-логику валидаций. Вся логика должна импортироваться из `stores` и `lib`.

### 4.2. Компонент `src/components/profile/AvatarCropperModal.vue` (По референсу ВКонтакте)

#### Контракт стыковки (Props / Emits):
```typescript
interface Props {
  modelValue: boolean;
  imageSrc: string;
}

interface Emits {
  (e: 'update:modelValue', val: boolean): void;
  (e: 'crop-complete', result: { base64: string; blob: Blob }): void;
}
```

#### Визуальная спецификация видоискателя ВК:
1. **Подложка**: Полноэкранный фиксированный оверлей `bg-black/80 backdrop-blur-md z-70`.
2. **Контейнер кадрирования**: 288x288 px (`w-72 h-72`), абсолютно черный фон, скругление карточки `rounded-3xl`.
3. **SVG-маска видоискателя**:
   - Размер: `viewBox="0 0 288 288"`.
   - Центр круга: `cx="144" cy="144"`, радиус `r="130"` (диаметр 260 px).
   - Внешнее затемнение: `fill="rgba(0, 0, 0, 0.65)"` с маской вырезанного круга.
   - Окантовка круга: тонкая белая линия `stroke="rgba(255, 255, 255, 0.85)" stroke-width="1.5"`.
   - Квадратная разметка видоискателя: пунктирный контур `x="14" y="14" width="260" height="260" stroke="rgba(255,255,255,0.4)" stroke-dasharray="4 4" stroke-width="1"`.
   - 4 угловых маркера квадрата: 4 белых квадрата 6x6 px на координатах:
     `(12, 12)`, `(270, 12)`, `(12, 270)`, `(270, 270)`.
4. **Зум-слайдер (Zoom Slider)**:
   - Диапазон: `min="1.0"`, `max="3.0"`, `step="0.05"`.
   - Кнопка слева: иконка `zoom_out` (Material Symbols).
   - Кнопка справа: иконка `zoom_in`.
   - Дорожка слайдера: `accent-primary h-1.5 bg-surface-high rounded-lg`.
5. **Интерактивность**:
   - Перемещение фото мышью (`mousedown`, `mousemove`, `mouseup`).
   - Перемещение пальцем (`touchstart`, `touchmove`, `touchend` с `touch-none`).
   - Масштабирование колесом мыши (`@wheel.prevent`).
6. **Кнопки управления**:
   - «Отмена»: M3 Text Button `rounded-full text-surface-on hover:bg-surface-high`.
   - «Сохранить»: M3 Filled Pill Button `rounded-full bg-primary text-primary-on font-bold px-6 py-2.5 shadow-sm hover:opacity-95 active:scale-95`.

### 4.3. Компонент `src/components/auth/AuthModal.vue` (M3 Expressive)

#### Контракт стыковки (Props / Emits):
```typescript
interface Props {
  modelValue: boolean;
  initialMode?: 'signin' | 'signup';
}

interface Emits {
  (e: 'update:modelValue', val: boolean): void;
  (e: 'auth-success'): void;
}
```

#### Визуальная спецификация:
1. **Центрированное модальное окно**: `w-full max-w-md rounded-4xl bg-surface-lowest border border-surface-high/60 p-6 shadow-elevation-4`.
2. **Сегментированный переключатель (M3 Segmented Button)**:
   - Два сегмента: `[ Вход ]` и `[ Регистрация ]`.
   - Активный сегмент подсвечен тональным контейнером `bg-primary-container text-primary-onContainer font-bold`.
3. **Поля формы**:
   - Email: иконка `mail`, рамка `border-surface-high`, при фокусе `focus:ring-2 focus:ring-primary`.
   - Пароль: иконка `lock`, кнопка с глазом (`visibility` / `visibility_off`).
   - Сообщения об ошибках под полями в оттенке `text-rose-500 text-[11px]`.
4. **Кнопка подтверждения**:
   - Полноширинная пилюля `bg-primary text-primary-on py-3 rounded-full font-bold shadow-sm active:scale-[0.99]`.
   - Текст: «Войти в tobo» / «Создать аккаунт».

### 4.4. Компонент `src/components/auth/OnboardingModal.vue` (Двухэтапный мастер)

#### Визуальная спецификация:
1. **Секция выбора обложки (Cover)**:
   - Высота баннера `h-32 rounded-3xl overflow-hidden`.
   - Кнопка «Выбрать обложку» в правом нижнем углу с полупрозрачным фоном `bg-black/60 backdrop-blur-xs`.
   - Горизонтальный скролл-ряд из 4-х пастельных пресетов обложек (`alexCoverSvg`, `mishaCoverSvg`, `annaCoverSvg`, `peachCoverSvg`). Активный пресет выделяется `border-primary ring-2 ring-primary/40 scale-105`.
2. **Центральный аватар с вызовом кроппера**:
   - Смещение нахлестом `-mt-8`.
   - Круглый аватар `w-20 h-20 rounded-full ring-4 ring-surface-lowest shadow-elevation-2`.
   - Плавающая кнопка с иконкой `photo_camera` открывает выбор файла, после чего всплывает `AvatarCropperModal`.
   - Быстрые аватар-пресеты внизу (Лазурный, Лавандовый, Мятный, tobo).
3. **Поля данных**:
   - Имя и Фамилия (2 колонки на sm экранах).
   - Юзернейм с зафиксированным префиксом `@` и авто-очисткой недопустимых символов.
   - Поле «О себе (Bio)».
4. **Кнопки**:
   - «Пропустить» и «Завершить и перейти в tobo!» со стрелкой `arrow_forward`.

### 4.5. Визуализация в `src/views/ProfileView.vue` и `src/components/messages/ChatRoom.vue`

#### Бейдж в `ProfileView.vue`:
Рядом с именем пользователя в шапке профиля:
```html
<div class="flex items-center gap-2">
  <h2 class="text-xl font-bold text-surface-on leading-tight">
    {{ authStore.user.first_name }} {{ authStore.user.last_name || '' }}
  </h2>
  <!-- Бейдж «Разработчик tobo» -->
  <div 
    v-if="authStore.isDeveloper" 
    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary-container to-secondary-container text-primary-onContainer font-bold text-[10px] tracking-wide shadow-xs select-none"
  >
    <span class="material-symbols-rounded text-xs text-primary">verified</span>
    <span>Разработчик tobo</span>
  </div>
</div>
```

#### Поле ввода в `ChatRoom.vue`:
Отображение поля ввода для каналов строго регламентировано:
```html
<!-- Условие показа плашки чтения: чат является каналом И пользователь НЕ является создателем И НЕ имеет статус разработчика -->
<div
  v-if="chat?.type === 'channel' && chat?.created_by !== authStore.user.id && !authStore.isDeveloper"
  class="pointer-events-auto rounded-3xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 px-4 py-3 flex items-center justify-between"
>
  <div class="flex items-center gap-2">
    <span class="material-symbols-rounded text-base text-surface-onVariant">campaign</span>
    <span class="text-xs text-surface-onVariant font-medium">Канал только для чтения</span>
  </div>
  <button
    class="text-xs font-bold text-primary flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
    @click="toggleMute"
  >
    <span class="material-symbols-rounded text-base">{{ isMuted ? 'notifications_off' : 'notifications' }}</span>
    <span>{{ isMuted ? 'Включить звук' : 'Без звука' }}</span>
  </button>
</div>

<!-- Стандартная панель ввода (разблокирована для direct, group, saved, создателя канала и пользователей с isDeveloper === true) -->
<div
  v-else
  class="pointer-events-auto rounded-3xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 p-1.5 flex items-center gap-2"
>
  <!-- Поле ввода сообщения и кнопки отправки -->
</div>
```

---

## 5. СПЕЦИФИКАЦИЯ ДЛЯ 🔍 МЛАДШЕГО ТЕСТЕРА (tester_agent)

### 5.1. Зона ответственности
Сквозное тестирование интерфейса, валидация сценариев пользователя (Click Flows) в Google Chrome с разрешением **390x844** (iPhone 12/13/14 Pro), аудит консоли DevTools F12 (Zero Errors) и сетевых запросов Network.

### 5.2. Чек-лист сценариев сквозного тестирования (Click Flows)

#### TC-01: Сценарий быстрой регистрации и валидации
1. Открыть приложение `http://localhost:5173/` (или продакшен URL).
2. Нажать на кнопку профиля / кнопку регистрации в Floating Top Bar.
3. Попробовать отправить пустую форму -> должна появиться ошибка: «Адрес электронной почты обязателен».
4. Ввести некорректный email (`invalid-email`) -> ошибка: «Введите корректный адрес электронной почты».
5. Ввести пароль короче 6 символов (`123`) -> ошибка: «Пароль должен содержать минимум 6 символов».
6. Ввести валидный email и пароль (`alex.test@tobo.me`, `Secret123!`) и нажать «Продолжить».
7. Проверить автоматический переход на Шаг 2 (Мастер настройки профиля).

#### TC-02: Сценарий кадрирования аватарки по референсу ВК
1. На шаге настройки профиля нажать на значок камеры на аватаре.
2. Загрузить тестовое изображение (JPEG/PNG).
3. Убедиться, что открылось модальное окно `AvatarCropperModal`:
   - Присутствует круглое окно видоискателя 260 px с белой окантовкой и угловыми маркерами.
   - Снаружи круга область затемнена на 65%.
4. Переместить изображение мышью/тачем (Drag) -> картинка должна плавно следовать за курсором.
5. Изменить зум ползунком от 1.0 до 2.5 -> картинка должна плавно масштабироваться.
6. Нажать кнопку «Сохранить»:
   - Модалка кроппера закрывается.
   - В мастере профиля аватар обновляется на кадрированный квадрат 400x400.
   - Всплывает Toast-уведомление об успешном кадрировании.

#### TC-03: Сценарий настройки профиля и проверки уникальности @username
1. Выбрать одну из 4 пастельных обложек (например, «Мятная гармония»).
2. Заполнить Имя: «Алексей», Фамилия: «Тестовый».
3. Ввести юзернейм `@alex_test`.
4. Нажать «Завершить и перейти в tobo!».
5. Убедиться в редиректе на `/feed`, данные профиля отображаются в шапке.

#### TC-04: Сценарий проверки статуса «Разработчик tobo»
1. Открыть вкладку «Профиль» (`/profile`).
2. При `is_developer === false`:
   - Бейдж «Разработчик tobo» отсутствует.
3. В консоли/БД присвоить `is_developer = true`:
   - Рядом с именем появляется градиентный бейдж со значком галочки и текстом «Разработчик tobo».

#### TC-05: Сценарий проверки прав вещания в «Канал Разработки»
1. Открыть вкладку «Сообщения» (`/messages`).
2. Найти и открыть чат «Канал Разработки».
3. **Тест под обычным пользователем (`is_developer === false`)**:
   - Внизу экрана отображается плашка: «Канал только для чтения».
   - Поле ввода и кнопка микрофона/отправки отсутствуют.
4. **Тест под разработчиком (`is_developer === true`)**:
   - Плашка чтения скрыта.
   - Поле ввода текста сообщения и кнопка отправки активны.
   - Ввести текст «Тестовый релиз tobo v1.0» и отправить.
   - Сообщение мгновенно появляется в ленте канала с временем и статусом отправки.

#### TC-06: Аудит консоли DevTools F12
1. Открыть Chrome DevTools вкладку Console.
2. Проверить отсутствие ошибок `Uncaught (in promise)`, `TypeError`, `400 Bad Request`, `403 Forbidden`.
3. Убедиться в корректности отображения всех иконок шрифта `Material Symbols Rounded`.

---

## 6. ЗАКЛЮЧЕНИЕ И ПОРЯДОК ИСПОЛНЕНИЯ

1. **Серверный Агент**: Применяет миграцию `supabase/migrations/20260912_developer_and_storage.sql` и настраивает бакеты `avatars` и `media`.
2. **Агент по коду**: Разрабатывает чистую математику в `cropperEngine.ts`, валидацию в `validation.ts` и обновляет Pinia-сторы `auth.ts`, `feed.ts`, `chat.ts`.
3. **Агент по дизайну**: Реализует компоненты `AvatarCropperModal.vue`, `AuthModal.vue`, `OnboardingModal.vue`, бейдж в `ProfileView.vue` и условие разблокировки в `ChatRoom.vue`.
4. **Младший тестер**: Проводит верификацию по чек-листу на эмуляторе Google Chrome (390x844).
