<template>
  <article class="p-5 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs hover:shadow-elevation-1 transition-all duration-300">
    <!-- Шапка поста: Автор, юзернейм, время -->
    <div class="flex items-center justify-between mb-3.5">
      <div
        class="flex items-center gap-3 cursor-pointer group"
        @click="goToAuthor"
      >
        <M3Avatar
          :src="isChannelPost ? channelAvatar : post.author?.avatar_url"
          :name="isChannelPost ? channelTitle : (post.author?.first_name || 'Пользователь')"
          size="md"
        />
        <div class="flex flex-col leading-tight">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-surface-on text-sm group-hover:underline">
              {{ isChannelPost ? channelTitle : `${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim() || 'Пользователь' }}
            </span>
            <!-- Бейдж канала -->
            <span
              v-if="isChannelPost"
              class="material-symbols-rounded text-primary text-base select-none shrink-0"
              title="Канал"
            >
              campaign
            </span>
            <!-- Бейдж верификации команды tobo -->
            <span
              v-else-if="post.author?.username === 'tobo_team'"
              class="material-symbols-rounded text-primary text-base select-none shrink-0"
              title="Официальный аккаунт"
            >
              verified
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-surface-onVariant/60">
            <span v-if="isChannelPost">@{{ channelUsername }}</span>
            <span v-else>@{{ post.author?.username || 'user' }}</span>
            <span>•</span>
            <span>{{ formattedDate }}</span>
          </div>
        </div>
      </div>

      <!-- Правая часть: Меню действий с публикацией -->
      <div class="relative shrink-0">
        <button
          type="button"
          aria-label="Меню публикации"
          class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant/70 hover:text-surface-on hover:bg-surface-high/60 transition-colors cursor-pointer"
          @click.stop="showMenu = !showMenu"
        >
          <span class="material-symbols-rounded text-[20px]">more_vert</span>
        </button>

        <!-- Оверлей для закрытия меню при клике вне -->
        <div
          v-if="showMenu"
          class="fixed inset-0 z-20"
          @click.stop="showMenu = false"
        />

        <!-- Выпадающее меню трех точек -->
        <div
          v-if="showMenu"
          class="absolute right-0 top-9 w-52 rounded-3xl bg-surface-lowest shadow-elevation-3 border border-surface-high/60 p-1.5 z-30 flex flex-col gap-1 text-xs font-medium text-surface-on"
        >
          <!-- Если автор или разработчик: Удалить запись -->
          <button
            v-if="canDelete"
            type="button"
            class="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
            @click.stop="showMenu = false; showDeleteConfirm = true"
          >
            <span class="material-symbols-rounded text-lg">delete</span>
            <span>Удалить запись</span>
          </button>

          <!-- Если НЕ автор: Скрыть запись и Пожаловаться -->
          <template v-if="!isAuthor">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl hover:bg-surface-high/60 transition-colors text-left cursor-pointer"
              @click.stop="handleHidePost"
            >
              <span class="material-symbols-rounded text-lg text-surface-onVariant">visibility_off</span>
              <span>Скрыть запись</span>
            </button>
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl hover:bg-surface-high/60 transition-colors text-left cursor-pointer"
              @click.stop="handleOpenReport"
            >
              <span class="material-symbols-rounded text-lg text-rose-500">flag</span>
              <span>Пожаловаться</span>
            </button>
          </template>

          <!-- Разделитель -->
          <div class="h-px bg-surface-high my-1" />

          <!-- Футер меню: Рейтинг -->
          <div class="px-2.5 py-1.5 flex items-center justify-between text-[11px] text-surface-onVariant/70 font-mono">
            <span class="flex items-center gap-1.5">
              <span class="material-symbols-rounded text-xs text-primary">trending_up</span>
              Рейтинг:
            </span>
            <span class="font-bold text-surface-on">{{ formattedRankScore }}</span>
          </div>
        </div>
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
            class="material-symbols-rounded text-[19px] transition-transform spring-transition"
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
          <span class="material-symbols-rounded text-[19px]">chat</span>
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
          <span class="material-symbols-rounded text-[19px]">sync</span>
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
            class="material-symbols-rounded text-[19px] transition-transform spring-transition"
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

    <!-- Модальное окно жалобы на публикацию -->
    <ReportPostModal
      v-model="showReportModal"
      :post="post"
    />

    <!-- Подтверждение удаления записи -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-modal bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showDeleteConfirm = false"
      >
        <div class="w-full max-w-sm rounded-3xl bg-surface-lowest border border-surface-high/60 p-5 shadow-elevation-3 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-rounded text-xl">delete_forever</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-surface-on">Удалить запись?</h3>
              <p class="text-xs text-surface-onVariant/80 mt-0.5">Это действие необратимо.</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 rounded-full text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors cursor-pointer"
              @click="showDeleteConfirm = false"
            >
              Отмена
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-xs cursor-pointer"
              @click="handleDeletePost"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Post } from '@/types/database';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import ImageLightboxModal from '@/components/ui/ImageLightboxModal.vue';
import ReportPostModal from '@/components/feed/ReportPostModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  post: Post;
}>();

defineEmits<{
  (e: 'open-comments', post: Post): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const feedStore = useFeedStore();
const toastStore = useToastStore();

const showMenu = ref(false);
const showReportModal = ref(false);
const showDeleteConfirm = ref(false);

const isChannelPost = computed(() => props.post.author_type === 'channel' || Boolean(props.post.channel));
const channelTitle = computed(() => props.post.channel?.title || 'Канал');
const channelAvatar = computed(() => props.post.channel?.avatar_url);
const channelUsername = computed(() => (props.post.channel?.title || 'channel').toLowerCase().replace(/\s+/g, '_'));

function goToAuthor() {
  if (isChannelPost.value && props.post.channel_id) {
    router.push(`/messages?chat=${props.post.channel_id}`);
  } else if (props.post.author_id) {
    router.push(`/profile/${props.post.author_id}`);
  }
}

const isAuthor = computed(() => {
  if (isChannelPost.value && props.post.channel) {
    return props.post.channel.created_by === authStore.user?.id;
  }
  return Boolean(authStore.user?.id && props.post.author_id === authStore.user.id);
});

const canDelete = computed(() => {
  return Boolean(
    authStore.user?.id && (
      props.post.author_id === authStore.user.id ||
      (isChannelPost.value && props.post.channel?.created_by === authStore.user.id) ||
      authStore.isDeveloper
    )
  );
});

const formattedRankScore = computed(() => {
  return Number(props.post.rank_score ?? 0).toFixed(2);
});

function handleHidePost() {
  showMenu.value = false;
  feedStore.hidePost(props.post.id);
  toastStore.show('Запись скрыта из вашей ленты', 'info');
}

function handleOpenReport() {
  showMenu.value = false;
  showReportModal.value = true;
}

async function handleDeletePost() {
  showDeleteConfirm.value = false;
  await feedStore.deletePost(props.post.id);
  toastStore.show('Запись удалена', 'info');
}

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
