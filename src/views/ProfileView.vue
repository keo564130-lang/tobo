<template>
  <div class="min-h-screen pb-28 pt-18 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок профиля (Floating Top Bar Island) -->
    <FloatingTopBar>
      <template #leading>
        <div class="flex items-center gap-2">
          <span class="font-extrabold tracking-tight text-2xl text-primary font-mono select-none">tobo</span>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer">
            Профиль
          </span>
        </div>
      </template>

      <template #trailing>
        <!-- Переключатель тестового аккаунта ("Алексей" <-> "Миша") -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-low text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors m3-press-effect cursor-pointer"
          title="Сменить активного пользователя для проверки диалогов"
          @click="toggleDemoUser"
        >
          <span class="material-symbols-rounded text-sm text-primary">swap_horiz</span>
          <span class="text-primary font-mono font-bold">{{ authStore.user.first_name }}</span>
        </button>

        <!-- Кнопка перехода в Настройки -->
        <router-link
          to="/settings"
          class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect"
          title="Настройки приложения"
        >
          <span class="material-symbols-rounded text-2xl">settings</span>
        </router-link>
      </template>
    </FloatingTopBar>

    <!-- Шапка профиля: Cover + Overlapping Avatar -->
    <div class="relative rounded-3xl overflow-hidden bg-surface-lowest border border-surface-high/60 shadow-xs mb-4">
      <!-- Баннер-обложка (Cover) в пастельных тонах -->
      <div class="h-36 sm:h-44 w-full bg-gradient-to-r from-primary-container via-secondary-container to-tertiary-container relative overflow-hidden">
        <img
          v-if="authStore.user.cover_url"
          :src="authStore.user.cover_url"
          class="w-full h-full object-cover opacity-80"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <!-- Выступающий круглый аватар (Overlap) с идеальной круглой рамкой ring-4 -->
      <div class="px-5 pb-5">
        <div class="flex items-end justify-between -mt-12 mb-3">
          <div class="relative">
            <M3Avatar
              :src="authStore.user.avatar_url"
              :name="authStore.user.first_name"
              size="2xl"
              class="ring-4 ring-surface-lowest shadow-elevation-2 rounded-full"
            />
          </div>

          <!-- Кнопка "Редактировать профиль" -->
          <M3Button
            variant="tonal"
            size="sm"
            @click="showEditModal = true"
          >
            <span class="material-symbols-rounded text-base">edit</span>
            <span>Редактировать</span>
          </M3Button>
        </div>

        <!-- Имя, юзернейм и био -->
        <div class="flex flex-col">
          <h2 class="text-xl font-bold text-surface-on leading-tight">
            {{ authStore.user.first_name }} {{ authStore.user.last_name || '' }}
          </h2>
          <span class="text-xs text-primary font-mono mt-0.5">
            @{{ authStore.user.username }}
          </span>
          <p v-if="authStore.user.bio" class="text-xs text-surface-on mt-2.5 leading-relaxed max-w-xl select-text">
            {{ authStore.user.bio }}
          </p>
        </div>
      </div>
    </div>

    <!-- BENTO GRID ("Квадратики" / Экспрессивный хаб сервисов с Material Symbols) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
      <!-- Плитка 1: Настройки -->
      <router-link
        to="/settings"
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 m3-press-effect"
      >
        <div class="w-8 h-8 rounded-2xl bg-primary-container text-primary-on flex items-center justify-center">
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
        <div class="w-8 h-8 rounded-2xl bg-secondary-container text-secondary-on flex items-center justify-center">
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
        <div class="w-8 h-8 rounded-2xl bg-tertiary-container text-tertiary-on flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">photo_library</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Мои медиа</span>
          <span class="text-[10px] text-surface-onVariant/60">Фото и видео</span>
        </div>
      </div>

      <!-- Плитка 4: Друзья и подписки -->
      <div
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 cursor-pointer m3-press-effect"
        @click="toastStore.show('Контакты: Миша Смирнов, Анна Кузнецова, tobo team', 'info')"
      >
        <div class="w-8 h-8 rounded-2xl bg-tobo-peach-container text-tobo-peach-text flex items-center justify-center">
          <span class="material-symbols-rounded text-lg">group</span>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Друзья</span>
          <span class="text-[10px] text-surface-onVariant/60">3 контакта</span>
        </div>
      </div>
    </div>

    <!-- Личная стена пользователя: Мои записи и репосты -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-bold text-surface-on uppercase tracking-wider">
          Личная стена ({{ userPosts.length }})
        </h3>
      </div>

      <div v-if="userPosts.length === 0" class="p-8 rounded-3xl bg-surface-lowest text-center text-xs text-surface-onVariant/60">
        У вас пока нет публикаций на стене. Создайте первую запись в Ленте!
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Post } from '@/types/database';
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

const router = useRouter();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const showEditModal = ref(false);
const showCommentsSheet = ref(false);
const activeCommentPost = ref<Post | null>(null);

const userPosts = computed(() => {
  return feedStore.posts.filter(p => p.author_id === authStore.user.id || p.is_reposted);
});

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

function toggleDemoUser() {
  if (authStore.user.username === 'alex_tobo') {
    authStore.switchAccount('misha');
    toastStore.show('Переключено на аккаунт: Миша Смирнов (@misha_dev)', 'info');
  } else {
    authStore.switchAccount('me');
    toastStore.show('Переключено на аккаунт: Алексей Поляков (@alex_tobo)', 'info');
  }
}
</script>
