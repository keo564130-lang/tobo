<template>
  <div class="min-h-screen pb-28 pt-18 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок профиля -->
    <FloatingTopBar>
      <template #leading>
        <span class="font-bold text-surface-on text-base">Профиль</span>
      </template>

      <template #trailing>
        <!-- Переключатель демонстрационных аккаунтов (для проверки симметрии) -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-low text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors m3-press-effect"
          title="Сменить активного пользователя для проверки диалогов"
          @click="toggleDemoUser"
        >
          <span>👤 Аккаунт:</span>
          <span class="text-primary font-mono font-bold">{{ authStore.user.first_name }}</span>
        </button>

        <!-- Кнопка перехода в Настройки -->
        <router-link
          to="/settings"
          class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect"
          title="Настройки приложения"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
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

      <!-- Выступающий круглый аватар (Overlap) -->
      <div class="px-5 pb-5">
        <div class="flex items-end justify-between -mt-12 mb-3">
          <div class="relative">
            <M3Avatar
              :src="authStore.user.avatar_url"
              :name="authStore.user.first_name"
              size="2xl"
              class="ring-4 ring-surface-lowest shadow-elevation-2"
            />
          </div>

          <!-- Кнопка "Редактировать профиль" -->
          <M3Button
            variant="tonal"
            size="sm"
            @click="showEditModal = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
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

    <!-- BENTO GRID ("Квадратики" / Экспрессивный хаб сервисов) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
      <!-- Плитка 1: Настройки -->
      <router-link
        to="/settings"
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 m3-press-effect"
      >
        <div class="w-8 h-8 rounded-2xl bg-primary-container text-primary-on flex items-center justify-center">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
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
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
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
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Мои медиа</span>
          <span class="text-[10px] text-surface-onVariant/60">Фото и видео</span>
        </div>
      </div>

      <!-- Плитка 4: Друзья и подписки -->
      <div
        class="p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all flex flex-col justify-between h-28 cursor-pointer m3-press-effect"
        @click="toastStore.show('Список друзей: Миша, Анна, Елена', 'info')"
      >
        <div class="w-8 h-8 rounded-2xl bg-tobo-peach-container text-tobo-peach-text flex items-center justify-center">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <span class="text-xs font-bold text-surface-on block">Друзья</span>
          <span class="text-[10px] text-surface-onVariant/60">4 контакта</span>
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
