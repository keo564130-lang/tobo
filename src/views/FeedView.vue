<template>
  <div class="min-h-screen pb-28 pt-20 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок (Floating Top Bar Island) -->
    <FloatingTopBar>
      <template #leading>
        <div class="flex items-center gap-2 cursor-pointer" @click="scrollToTop">
          <span class="font-sans font-black tracking-tight text-2xl leading-none text-primary select-none -translate-y-[1px]">tobo</span>
          <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse-subtle" />
        </div>
      </template>

      <template #center>
        <span class="text-xs font-semibold text-surface-onVariant/80 uppercase tracking-widest hidden sm:inline">
          Рекомендации
        </span>
      </template>

      <template #trailing>
        <!-- Кнопка обновления ленты -->
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect cursor-pointer"
          title="Обновить ленту"
          @click="handleRefresh"
        >
          <span class="material-symbols-rounded text-xl" :class="{ 'animate-spin': isRefreshing }">
            refresh
          </span>
        </button>

        <!-- Expressive Кнопка создания поста (+) -->
        <M3Button
          variant="filled"
          size="sm"
          class="shadow-sm"
          @click="showCreateModal = true"
        >
          <span class="material-symbols-rounded text-lg">add</span>
          <span class="hidden sm:inline">Создать</span>
        </M3Button>
      </template>
    </FloatingTopBar>

    <!-- Список постов ленты -->
    <div class="flex flex-col gap-4">
      <!-- Пустое состояние если постов ещё нет -->
      <div
        v-if="feedStore.posts.length === 0 && !feedStore.isLoading"
        class="p-8 sm:p-10 rounded-4xl bg-surface-lowest border border-surface-high/60 text-center flex flex-col items-center gap-3.5 shadow-xs my-4"
      >
        <div class="w-16 h-16 rounded-3xl bg-primary-container text-primary-onContainer flex items-center justify-center shadow-xs">
          <span class="material-symbols-rounded text-3xl">dynamic_feed</span>
        </div>
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-bold text-surface-on">В ленте пока нет записей</h3>
          <p class="text-xs text-surface-onVariant/80 max-w-xs leading-relaxed">
            Будьте первым, кто опубликует запись!
          </p>
        </div>
        <M3Button variant="filled" size="sm" class="mt-1" @click="showCreateModal = true">
          <span class="material-symbols-rounded text-base">add</span>
          <span>Создать запись</span>
        </M3Button>
      </div>

      <!-- Карточки постов -->
      <PostCard
        v-for="post in feedStore.posts"
        :key="post.id"
        :post="post"
        @open-comments="openComments"
      />
    </div>

    <!-- Модальное окно создания поста -->
    <CreatePostModal v-model="showCreateModal" />

    <!-- Модальная шторка комментариев -->
    <CommentsSheet
      v-model="showCommentsSheet"
      :post="activeCommentPost"
    />

    <!-- Нижний плавающий островок навигации -->
    <FloatingBottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Post } from '@/types/database';
import FloatingTopBar from '@/components/ui/FloatingTopBar.vue';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav.vue';
import M3Button from '@/components/ui/M3Button.vue';
import PostCard from '@/components/feed/PostCard.vue';
import CreatePostModal from '@/components/feed/CreatePostModal.vue';
import CommentsSheet from '@/components/feed/CommentsSheet.vue';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const feedStore = useFeedStore();
const toastStore = useToastStore();

const showCreateModal = ref(false);
const showCommentsSheet = ref(false);
const activeCommentPost = ref<Post | null>(null);
const isRefreshing = ref(false);

onMounted(async () => {
  await feedStore.refreshFeed();
});

function openComments(post: Post) {
  activeCommentPost.value = post;
  showCommentsSheet.value = true;
}

async function handleRefresh() {
  isRefreshing.value = true;
  await feedStore.refreshFeed();
  setTimeout(() => {
    isRefreshing.value = false;
    toastStore.show('Лента обновлена актуальными рекомендациями', 'info');
  }, 300);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>
