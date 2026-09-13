<template>
  <div class="min-h-screen pb-28 pt-20 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок профиля (Floating Top Bar Island) -->
    <FloatingTopBar>
      <template #leading>
        <!-- Если смотрим чужой профиль: кнопка Назад и имя -->
        <div v-if="isOtherUser" class="flex items-center gap-2">
          <button
            type="button"
            class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-high transition-colors m3-press-effect cursor-pointer shrink-0"
            title="Назад"
            @click="router.back()"
          >
            <span class="material-symbols-rounded text-xl text-surface-on">arrow_back</span>
          </button>
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-sm text-surface-on truncate max-w-[140px] sm:max-w-[220px]">
              {{ displayProfile?.first_name || 'Профиль' }}
            </span>
            <span class="text-[10px] text-surface-onVariant/60 font-mono leading-none">
              @{{ displayProfile?.username || 'user' }}
            </span>
          </div>
        </div>
        <!-- Если свой профиль: логотип tobo и бейдж Профиль -->
        <div v-else class="flex items-center gap-2">
          <span class="font-sans font-black tracking-tight text-2xl leading-none text-primary select-none -translate-y-[1px]">tobo</span>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer leading-normal">
            Профиль
          </span>
        </div>
      </template>

      <template #trailing>
        <template v-if="isOtherUser">
          <M3Button
            v-if="authStore.isAuthenticated"
            variant="filled"
            size="sm"
            @click="handleDirectMessage"
          >
            <span class="material-symbols-rounded text-base">chat</span>
            <span class="hidden sm:inline">Написать</span>
          </M3Button>
        </template>
        <template v-else>
          <!-- Кнопка Входа / Регистрации если не авторизован -->
          <M3Button
            v-if="!authStore.isAuthenticated"
            variant="filled"
            size="sm"
            @click="authStore.openAuthModal('signin')"
          >
            <span class="material-symbols-rounded text-base">login</span>
            <span>Войти</span>
          </M3Button>

          <!-- Кнопка выхода если авторизован -->
          <button
            v-else
            type="button"
            class="w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors m3-press-effect shrink-0 cursor-pointer"
            title="Выйти из аккаунта"
            @click="handleSignOut"
          >
            <span class="material-symbols-rounded text-[20px]">logout</span>
          </button>

          <!-- Кнопка перехода в Настройки -->
          <router-link
            to="/settings"
            class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect shrink-0"
            title="Настройки приложения"
          >
            <span class="material-symbols-rounded text-[20px]">settings</span>
          </router-link>
        </template>
      </template>
    </FloatingTopBar>

    <!-- Шапка профиля: Cover + Overlapping Avatar -->
    <div class="relative rounded-3xl overflow-hidden bg-surface-lowest border border-surface-high/60 shadow-xs mb-4">
      <!-- Баннер-обложка (Cover) в пастельных тонах со строгим соотношением 16:7 -->
      <div class="aspect-[16/7] w-full bg-gradient-to-r from-primary-container via-secondary-container to-tertiary-container relative overflow-hidden">
        <img
          v-if="displayProfile?.cover_url"
          :src="displayProfile.cover_url"
          class="w-full h-full object-cover object-center opacity-90"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <!-- Выступающий круглый аватар (Overlap) с идеальной круглой рамкой ring-4 -->
      <div class="px-5 pb-5">
        <div class="flex items-end justify-between -mt-12 mb-3">
          <div class="relative">
            <M3Avatar
              :src="displayProfile?.avatar_url"
              :name="displayProfile?.first_name || 'Пользователь'"
              size="2xl"
              class="ring-4 ring-surface-lowest shadow-elevation-2 rounded-full"
            />
          </div>

          <!-- Кнопка действия: ровно одна аккуратная кнопка, выровненная по низу, строго на карточке -->
          <div class="pb-1 shrink-0">
            <!-- Чужой профиль: Написать сообщение -->
            <M3Button
              v-if="isOtherUser"
              variant="filled"
              size="sm"
              @click="handleDirectMessage"
            >
              <span class="material-symbols-rounded text-base">chat</span>
              <span>Написать сообщение</span>
            </M3Button>

            <!-- Свой профиль: Редактировать (если авторизован) или Регистрация -->
            <template v-else>
              <M3Button
                v-if="authStore.isAuthenticated"
                variant="tonal"
                size="sm"
                @click="showEditModal = true"
              >
                <span class="material-symbols-rounded text-base">edit</span>
                <span>Редактировать</span>
              </M3Button>
              <M3Button
                v-else
                variant="filled"
                size="sm"
                @click="authStore.openAuthModal('signup')"
              >
                <span class="material-symbols-rounded text-base">person_add</span>
                <span>Регистрация</span>
              </M3Button>
            </template>
          </div>
        </div>

        <!-- Имя, юзернейм и био -->
        <div class="flex flex-col">
          <template v-if="displayProfile">
            <div class="flex items-center gap-2 flex-nowrap min-w-0">
              <h2 class="text-xl font-bold text-surface-on leading-tight truncate">
                {{ displayProfile.first_name }} {{ displayProfile.last_name || '' }}
              </h2>
              <!-- Бейдж «Разработчик tobo» -->
              <div
                v-if="isDeveloper"
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-300 font-bold text-[11px] tracking-wide shadow-xs shrink-0 select-none"
              >
                <span class="material-symbols-rounded text-xs text-emerald-600 dark:text-emerald-400">verified</span>
                <span>Разработчик tobo</span>
              </div>
            </div>
            <span class="text-xs text-primary font-mono mt-0.5">
              @{{ displayProfile.username || 'user' }}
            </span>
            <p v-if="displayProfile.bio" class="text-xs text-surface-on mt-2.5 leading-relaxed max-w-xl select-text">
              {{ displayProfile.bio }}
            </p>
          </template>
          <template v-else>
            <h2 class="text-xl font-bold text-surface-on leading-tight">
              Гостевой режим
            </h2>
            <p class="text-xs text-surface-onVariant/80 mt-1 max-w-md">
              Войдите или зарегистрируйтесь, чтобы создать профиль, общаться в каналах и делиться записями.
            </p>
          </template>
        </div>
      </div>
    </div>

    <!-- BENTO GRID ("Квадратики" / Экспрессивный хаб сервисов - только для своего профиля) -->
    <div v-if="!isOtherUser" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
      <!-- Плитка 1: Настройки -->
      <router-link
        to="/settings"
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 m3-press-effect"
      >
        <div class="w-8 h-8 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/20 text-sky-600 dark:text-sky-300 shadow-xs flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">tune</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Настройки</span>
          <span class="text-[10px] text-surface-onVariant/60">Тема, 2FA, сессии</span>
        </div>
      </router-link>

      <!-- Плитка 2: Закладки и Избранное -->
      <div
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 cursor-pointer m3-press-effect"
        @click="goToSavedChat"
      >
        <div class="w-8 h-8 rounded-2xl bg-purple-500/10 dark:bg-purple-400/15 border border-purple-500/20 text-purple-600 dark:text-purple-300 shadow-xs flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">bookmark</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Избранное</span>
          <span class="text-[10px] text-surface-onVariant/60">Сохранённые посты</span>
        </div>
      </div>

      <!-- Плитка 3: Мои медиа -->
      <div
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 cursor-pointer m3-press-effect"
        @click="toastStore.show('Галерея медиафайлов синхронизирована', 'info')"
      >
        <div class="w-8 h-8 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 shadow-xs flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">photo_library</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Мои медиа</span>
          <span class="text-[10px] text-surface-onVariant/60">Фото и видео</span>
        </div>
      </div>

      <!-- Плитка 4: Друзья и контакты -->
      <router-link
        to="/messages"
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 m3-press-effect"
      >
        <div class="w-8 h-8 rounded-2xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 text-amber-600 dark:text-amber-300 shadow-xs flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">group</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Контакты</span>
          <span class="text-[10px] text-surface-onVariant/60">Чаты и каналы</span>
        </div>
      </router-link>
    </div>

    <!-- Личная стена пользователя: Мои записи и репосты -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-bold text-surface-on uppercase tracking-wider">
          Личная стена ({{ userPosts.length }})
        </h3>
      </div>

      <div v-if="userPosts.length === 0" class="p-8 rounded-3xl bg-surface-lowest text-center text-xs text-surface-onVariant/60">
        {{ isOtherUser ? 'У пользователя пока нет публикаций на стене.' : 'У вас пока нет публикаций на стене. Создайте первую запись в Ленте!' }}
      </div>

      <div v-else class="flex flex-col gap-3">
        <PostCard
          v-for="post in userPosts"
          :key="post.id"
          :post="post"
          @open-comments="openComments"
        />
      </div>
    </div>

    <!-- Модальные окна -->
    <EditProfileModal v-model="showEditModal" />

    <CommentsSheet
      v-model="showCommentsSheet"
      :post="activeCommentPost"
    />

    <!-- Нижний плавающий островок навигации -->
    <FloatingBottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Post, Profile } from '@/types/database';
import FloatingTopBar from '@/components/ui/FloatingTopBar.vue';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import PostCard from '@/components/feed/PostCard.vue';
import CommentsSheet from '@/components/feed/CommentsSheet.vue';
import EditProfileModal from '@/components/profile/EditProfileModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const showEditModal = ref(false);
const showCommentsSheet = ref(false);
const activeCommentPost = ref<Post | null>(null);

const targetUserId = computed(() => route.params.id as string | undefined);
const isOtherUser = computed(() => Boolean(targetUserId.value && targetUserId.value !== authStore.user?.id));

const otherProfile = ref<Profile | null>(null);
const isLoadingProfile = ref(false);

async function loadTargetProfile(userId: string) {
  isLoadingProfile.value = true;
  // 1. Поиск в локальном хранилище профилей
  const cached = localStore.getProfile(userId);
  if (cached) {
    otherProfile.value = cached;
  }
  // 2. Поиск в Supabase если настроен
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        otherProfile.value = data as Profile;
      }
    } catch (e) {
      console.warn('Supabase fetch profile error:', e);
    }
  }
  // 3. Поиск автора среди постов ленты
  if (!otherProfile.value) {
    const postWithAuthor = feedStore.posts.find(p => p.author_id === userId);
    if (postWithAuthor?.author) {
      otherProfile.value = postWithAuthor.author;
    }
  }
  isLoadingProfile.value = false;
}

watch(
  () => targetUserId.value,
  (newId) => {
    if (newId && newId !== authStore.user?.id) {
      loadTargetProfile(newId);
    } else {
      otherProfile.value = null;
    }
  },
  { immediate: true }
);

const displayProfile = computed(() => {
  if (isOtherUser.value) {
    return otherProfile.value;
  }
  return authStore.user;
});

const isDeveloper = computed(() => {
  if (isOtherUser.value) {
    return otherProfile.value?.username === 'tobo_team';
  }
  return authStore.isDeveloper;
});

const userPosts = computed(() => {
  const curId = displayProfile.value?.id || targetUserId.value;
  if (!curId) return [];
  if (isOtherUser.value) {
    return feedStore.posts.filter(p => p.author_id === curId);
  }
  return feedStore.posts.filter(p => p.author_id === authStore.user?.id || p.is_reposted);
});

async function handleDirectMessage() {
  if (!displayProfile.value) return;
  const chat = await chatStore.createDirectChat(displayProfile.value);
  if (chat) {
    chatStore.selectChat(chat.id);
  }
  router.push('/messages');
}

function openComments(post: Post) {
  activeCommentPost.value = post;
  showCommentsSheet.value = true;
}

function goToSavedChat() {
  const savedChat = chatStore.chats.find(c => c.type === 'saved');
  if (savedChat) {
    chatStore.selectChat(savedChat.id);
    router.push('/messages');
  }
}

async function handleSignOut() {
  await authStore.signOut();
  toastStore.show('Вы успешно вышли из аккаунта', 'info');
}
</script>
