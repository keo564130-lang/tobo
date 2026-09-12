<template>
  <article class="p-5 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all duration-300">
    <!-- Шапка поста: Автор, юзернейм, время -->
    <div class="flex items-center justify-between mb-3.5">
      <div class="flex items-center gap-3 cursor-pointer">
        <M3Avatar
          :src="post.author?.avatar_url"
          :name="post.author?.first_name || 'Пользователь'"
          size="md"
        />
        <div class="flex flex-col leading-tight">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-surface-on text-sm">
              {{ post.author?.first_name }} {{ post.author?.last_name || '' }}
            </span>
            <!-- Бейдж верификации команды tobo -->
            <span
              v-if="post.author?.username === 'tobo_team'"
              class="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold"
            >
              official
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-surface-onVariant/60">
            <span>@{{ post.author?.username || 'user' }}</span>
            <span>•</span>
            <span>{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Скоринг ранжирования ленты с затуханием во времени -->
      <div
        v-if="post.rank_score !== undefined"
        class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-low text-xs text-surface-onVariant/80 font-mono font-medium"
        title="Алгоритмический рейтинг с Time Decay"
      >
        <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span>{{ post.rank_score }}</span>
      </div>
    </div>

    <!-- Текст поста -->
    <div class="text-surface-on text-sm leading-relaxed mb-3.5 whitespace-pre-wrap select-text">
      {{ post.content }}
    </div>

    <!-- Медиа галерея (сетка) -->
    <div
      v-if="post.media_urls && post.media_urls.length > 0"
      :class="[
        'mb-4 rounded-2xl overflow-hidden gap-1.5 grid',
        post.media_urls.length === 1 ? 'grid-cols-1 max-h-96' : '',
        post.media_urls.length === 2 ? 'grid-cols-2 max-h-72' : '',
        post.media_urls.length >= 3 ? 'grid-cols-2 max-h-80' : ''
      ]"
    >
      <div
        v-for="(url, idx) in post.media_urls.slice(0, 4)"
        :key="idx"
        class="relative w-full h-full bg-surface-low overflow-hidden cursor-pointer group"
        @click="openMedia(url)"
      >
        <img
          :src="url"
          :alt="'Медиа ' + (idx + 1)"
          class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          loading="lazy"
        />
        <div
          v-if="idx === 3 && post.media_urls.length > 4"
          class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold backdrop-blur-xs"
        >
          +{{ post.media_urls.length - 4 }}
        </div>
      </div>
    </div>

    <!-- Панель интеракций (Likes, Comments, Repost, Bookmark) -->
    <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between text-surface-onVariant/80 text-xs">
      <div class="flex items-center gap-1 sm:gap-2">
        <!-- Кнопка Лайка с пружинной M3 анимацией -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-rose-50 dark:hover:bg-rose-950/30"
          :class="post.is_liked ? 'text-rose-500 font-bold' : 'hover:text-rose-500'"
          @click="handleLike"
        >
          <svg
            class="w-4.5 h-4.5 transition-transform spring-transition"
            :class="{ 'scale-125 text-rose-500 fill-rose-500': post.is_liked }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{{ post.likes_count }}</span>
        </button>

        <!-- Кнопка Комментариев (M3 Bottom Sheet) -->
        <button
          v-if="!post.disable_comments"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-primary-container/40 hover:text-primary-onContainer"
          @click="$emit('open-comments', post)"
        >
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{{ post.comments_count }}</span>
        </button>
        <span v-else class="text-[11px] text-surface-onVariant/50 italic px-2">
          комментарии закрыты
        </span>

        <!-- Кнопка Репоста -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-tertiary-container/50 hover:text-tertiary-onContainer"
          :class="post.is_reposted ? 'text-emerald-600 font-bold dark:text-emerald-400' : ''"
          @click="handleRepost"
        >
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ post.reposts_count }}</span>
        </button>
      </div>

      <div class="flex items-center gap-1">
        <!-- Кнопка В Избранное (Автоматически отправляет в чат "Избранное" во 2-ю вкладку) -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-secondary-container/50 hover:text-secondary-onContainer"
          :class="post.is_bookmarked ? 'text-purple-600 dark:text-purple-400 font-bold' : ''"
          title="Сохранить в Избранное (в чат во вкладке Сообщения)"
          @click="handleBookmark"
        >
          <svg
            class="w-4.5 h-4.5 transition-transform spring-transition"
            :class="{ 'scale-115 text-purple-600 fill-purple-600 dark:text-purple-400 dark:fill-purple-400': post.is_bookmarked }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span class="hidden sm:inline">{{ post.is_bookmarked ? 'В избранном' : 'В избранное' }}</span>
        </button>

        <!-- Просмотры -->
        <div class="flex items-center gap-1 px-2 text-surface-onVariant/50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{{ post.views_count }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Post } from '@/types/database';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  post: Post;
}>();

defineEmits<{
  (e: 'open-comments', post: Post): void;
}>();

const feedStore = useFeedStore();
const toastStore = useToastStore();

const formattedDate = computed(() => {
  const date = new Date(props.post.created_at);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (3600 * 1000));

  if (diffHours < 1) {
    const diffMinutes = Math.max(Math.floor((now.getTime() - date.getTime()) / (60 * 1000)), 1);
    return `${diffMinutes} мин. назад`;
  }
  if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
});

function handleLike() {
  const res = feedStore.toggleLike(props.post.id);
  if (res.isLiked) {
    toastStore.show('Вам понравился этот пост', 'info', 1500);
  }
}

function handleRepost() {
  const res = feedStore.toggleRepost(props.post.id);
  if (res.isReposted) {
    toastStore.show('Пост опубликован на вашей стене и отправлен друзьям', 'success');
  } else {
    toastStore.show('Репост удален со стены', 'info');
  }
}

function handleBookmark() {
  const isSaved = feedStore.toggleBookmark(props.post.id);
  if (isSaved) {
    toastStore.show('Пост сохранен в ваш персональный чат "Избранное"!', 'success');
  } else {
    toastStore.show('Пост удален из Избранного', 'info');
  }
}

function openMedia(url: string) {
  window.open(url, '_blank');
}
</script>
