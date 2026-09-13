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
              class="material-symbols-rounded text-primary text-base select-none shrink-0"
              title="Официальный аккаунт"
            >
              verified
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-surface-onVariant/60">
            <span>@{{ post.author?.username || 'user' }}</span>
            <span>•</span>
            <span>{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Скоринг ранжирования ленты с затуханием во времени (Time Decay) -->
      <div
        v-if="post.rank_score !== undefined"
        class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-low text-xs text-surface-onVariant/80 font-mono font-medium"
        title="Алгоритмический рейтинг с Time Decay"
      >
        <span class="material-symbols-rounded text-primary text-sm">trending_up</span>
        <span>{{ post.rank_score }}</span>
      </div>
    </div>

    <!-- Текст поста -->
    <div class="text-surface-on text-sm leading-relaxed mb-3.5 whitespace-pre-wrap select-text">
      {{ post.content }}
    </div>

    <!-- Медиа галерея (сетка с надежным фолбэком для битых картинок) -->
    <div
      v-if="validMediaUrls.length > 0"
      :class="[
        'mb-4 rounded-2xl overflow-hidden gap-1.5 grid',
        validMediaUrls.length === 1 ? 'grid-cols-1 max-h-96' : '',
        validMediaUrls.length === 2 ? 'grid-cols-2 max-h-72' : '',
        validMediaUrls.length >= 3 ? 'grid-cols-2 max-h-80' : ''
      ]"
    >
      <div
        v-for="(url, idx) in validMediaUrls.slice(0, 4)"
        :key="idx"
        class="relative w-full h-full bg-surface-low overflow-hidden cursor-pointer group"
        @click="openMedia(url)"
      >
        <img
          :src="url"
          :alt="'Медиа ' + (idx + 1)"
          width="800"
          height="450"
          class="w-full h-full object-cover aspect-video group-hover:scale-103 transition-transform duration-300"
          loading="lazy"
          @error="handleImageError(idx)"
        />
        <div
          v-if="idx === 3 && validMediaUrls.length > 4"
          class="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold backdrop-blur-xs font-mono"
        >
          +{{ validMediaUrls.length - 4 }}
        </div>
      </div>
    </div>

    <!-- Панель интеракций (Likes, Comments, Repost, Bookmark) с Material Symbols Rounded -->
    <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between text-surface-onVariant/80 text-xs -mx-1.5">
      <!-- Левая группа -->
      <div class="flex items-center gap-1">
        <!-- Кнопка Лайка с пружинной M3 анимацией -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          :class="post.is_liked ? 'text-rose-500 font-bold' : 'hover:text-rose-500'"
          @click="handleLike"
        >
          <span
            class="material-symbols-rounded text-lg transition-transform spring-transition"
            :class="post.is_liked ? 'filled scale-120 text-rose-500' : ''"
          >
            favorite
          </span>
          <span class="font-mono text-xs">{{ post.likes_count }}</span>
        </button>

        <!-- Кнопка Комментариев (M3 Bottom Sheet) -->
        <button
          v-if="!post.disable_comments"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-primary-container/40 hover:text-primary-onContainer cursor-pointer"
          @click="$emit('open-comments', post)"
        >
          <span class="material-symbols-rounded text-lg">chat</span>
          <span class="font-mono text-xs">{{ post.comments_count }}</span>
        </button>
        <span v-else class="text-[11px] text-surface-onVariant/50 italic px-2">
          комментарии закрыты
        </span>

        <!-- Кнопка Репоста -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-tertiary-container/50 hover:text-tertiary-onContainer cursor-pointer"
          :class="post.is_reposted ? 'text-emerald-600 font-bold dark:text-emerald-400' : ''"
          @click="handleRepost"
        >
          <span class="material-symbols-rounded text-lg">sync</span>
          <span class="font-mono text-xs">{{ post.reposts_count }}</span>
        </button>
      </div>

      <!-- Правая группа (симметричные отступы от правого края карточки) -->
      <div class="flex items-center gap-1 shrink-0">
        <!-- Избранное пастельно-желтым -->
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all m3-press-effect hover:bg-amber-100/40 dark:hover:bg-amber-950/30 cursor-pointer"
          :class="post.is_bookmarked ? 'text-amber-500 dark:text-amber-300 font-bold' : 'text-surface-onVariant/80'"
          title="Сохранить в Избранное"
          @click="handleBookmark"
        >
          <span
            class="material-symbols-rounded text-lg transition-transform spring-transition"
            :class="post.is_bookmarked ? 'filled scale-110 text-amber-500 dark:text-amber-300' : ''"
          >
            bookmark
          </span>
          <span class="hidden sm:inline text-xs">{{ post.is_bookmarked ? 'В избранном' : 'В избранное' }}</span>
        </button>
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 text-surface-onVariant/60 font-mono text-xs select-none">
          <span class="material-symbols-rounded text-base">visibility</span>
          <span>{{ post.views_count }}</span>
        </div>
      </div>
    </div>

    <!-- Полноэкранный просмотр медиа прямо на сайте (LightBox) -->
    <ImageLightboxModal
      v-model="showLightbox"
      :image-url="lightboxUrl"
    />
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Post } from '@/types/database';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import ImageLightboxModal from '@/components/ui/ImageLightboxModal.vue';
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

const brokenImagesIndices = ref<Set<number>>(new Set());

const validMediaUrls = computed(() => {
  if (!props.post.media_urls) return [];
  return props.post.media_urls.filter((_, idx) => !brokenImagesIndices.value.has(idx));
});

function handleImageError(idx: number) {
  brokenImagesIndices.value.add(idx);
}

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

async function handleLike() {
  const res = await feedStore.toggleLike(props.post.id);
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

const showLightbox = ref(false);
const lightboxUrl = ref('');

function openMedia(url: string) {
  lightboxUrl.value = url;
  showLightbox.value = true;
}
</script>
