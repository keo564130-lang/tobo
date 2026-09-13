<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Новая публикация"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <!-- Автор поста с возможностью публикации от канала -->
      <div class="flex flex-col gap-2 p-2.5 rounded-2xl bg-surface-low border border-surface-high/40">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <M3Avatar
              :src="currentAuthorAvatar"
              :name="currentAuthorName"
              size="md"
            />
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-sm font-bold text-surface-on truncate max-w-[180px]">
                  {{ currentAuthorName }}
                </span>
                <span v-if="postAuthorType === 'channel'" class="material-symbols-rounded text-primary text-sm shrink-0" title="Канал">
                  campaign
                </span>
              </div>
              <span class="text-[11px] text-surface-onVariant truncate">
                {{ postAuthorType === 'channel' ? 'Публикация от имени канала' : 'Личный профиль' }}
              </span>
            </div>
          </div>

          <!-- Селектор аудитории (только для личных постов) -->
          <div v-if="postAuthorType === 'user'" class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer"
              :class="audience === 'all' ? 'bg-primary-container text-primary-on font-semibold' : 'bg-surface-lowest text-surface-onVariant hover:text-surface-on'"
              @click="audience = 'all'"
            >
              <span class="material-symbols-rounded text-xs">public</span>
              <span>Для всех</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer"
              :class="audience === 'friends' ? 'bg-primary-container text-primary-on font-semibold' : 'bg-surface-lowest text-surface-onVariant hover:text-surface-on'"
              @click="audience = 'friends'"
            >
              <span class="material-symbols-rounded text-xs">group</span>
              <span>Друзья</span>
            </button>
          </div>
        </div>

        <!-- Переключатель автора (Личный профиль vs Канал) если у пользователя есть доступные каналы -->
        <div v-if="userChannels.length > 0" class="flex items-center gap-1.5 pt-1.5 border-t border-surface-high/30 overflow-x-auto">
          <span class="text-[11px] font-semibold text-surface-onVariant shrink-0 mr-1">Автор:</span>
          <button
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            :class="postAuthorType === 'user' ? 'bg-primary text-primary-on shadow-xs' : 'bg-surface-lowest text-surface-onVariant hover:text-surface-on'"
            @click="postAuthorType = 'user'; selectedChannelId = ''"
          >
            <span class="material-symbols-rounded text-xs">person</span>
            <span>Я ({{ authStore.user.first_name }})</span>
          </button>

          <button
            v-for="ch in userChannels"
            :key="ch.id"
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
            :class="postAuthorType === 'channel' && selectedChannelId === ch.id ? 'bg-primary text-primary-on shadow-xs' : 'bg-surface-lowest text-surface-onVariant hover:text-surface-on'"
            @click="selectChannelAuthor(ch)"
          >
            <span class="material-symbols-rounded text-xs">campaign</span>
            <span class="truncate max-w-[140px]">{{ ch.title }}</span>
          </button>
        </div>
      </div>

      <!-- Текстовый редактор -->
      <div class="relative">
        <textarea
          id="post_content"
          name="content"
          aria-label="Текст публикации"
          v-model="content"
          rows="4"
          maxlength="5000"
          placeholder="Чем хотите поделиться? Напишите мысль, идею или вопрос..."
          class="w-full p-4 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on placeholder:text-surface-onVariant/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
        />
      </div>

      <!-- Предпросмотр прикрепленных фото -->
      <div v-if="mediaUrls.length > 0" class="grid grid-cols-3 gap-2">
        <div
          v-for="(url, idx) in mediaUrls"
          :key="idx"
          class="relative h-24 rounded-2xl overflow-hidden bg-surface-low border border-surface-high group"
        >
          <img :src="url" class="w-full h-full object-cover" />
          <button
            class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
            @click="removeMedia(idx)"
          >
            <span class="material-symbols-rounded text-xs">close</span>
          </button>
        </div>
      </div>

      <!-- Индикатор сжатия WebP -->
      <div v-if="isCompressing" class="flex items-center gap-2 text-xs text-primary animate-pulse font-medium">
        <span class="material-symbols-rounded text-sm animate-spin">sync</span>
        <span>Клиентская компрессия изображения в WebP...</span>
      </div>

      <!-- Настройки поста (тумблер "Отключить комментарии") -->
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-low border border-surface-high/40">
        <div class="flex flex-col">
          <span class="text-xs font-semibold text-surface-on">Отключить комментарии</span>
          <span class="text-[11px] text-surface-onVariant/70">Другие пользователи не смогут комментировать эту запись</span>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="disableComments"
          aria-label="Отключить комментарии"
          class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
          :class="disableComments ? 'bg-primary' : 'bg-surface-high'"
          @click="disableComments = !disableComments"
        >
          <span
            class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
            :class="disableComments ? 'translate-x-6' : 'translate-x-0'"
          />
        </button>
      </div>

      <!-- Кнопка добавления фото и отправка -->
      <div class="flex items-center justify-between pt-2 border-t border-surface-high/40">
        <label for="post_file_upload" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-low hover:bg-surface-high text-xs font-medium text-surface-on cursor-pointer transition-colors m3-press-effect">
          <span class="material-symbols-rounded text-lg text-primary">add_photo_alternate</span>
          <span>Добавить фото</span>
          <input
            id="post_file_upload"
            name="media_files"
            aria-label="Загрузить фотографии"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleFileUpload"
          />
        </label>

        <M3Button
          variant="filled"
          size="md"
          :disabled="isSubmitting || (!content.trim() && mediaUrls.length === 0)"
          :loading="isSubmitting || isCompressing"
          @click="submitPost"
        >
          <span v-if="isSubmitting" class="w-4 h-4 border-2 border-primary-on border-t-transparent rounded-full animate-spin mr-1.5" />
          <span>{{ isSubmitting ? 'Публикация...' : 'Опубликовать' }}</span>
        </M3Button>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { PostAudience, Chat } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';
import { compressImageToWebP } from '@/lib/imageCompressor';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const authStore = useAuthStore();
const feedStore = useFeedStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const content = ref('');
const mediaUrls = ref<string[]>([]);
const disableComments = ref(false);
const audience = ref<PostAudience>('all');
const isCompressing = ref(false);
const isSubmitting = ref(false);

// Выбор авторства: личный профиль или канал
const userChannels = computed(() => {
  return chatStore.chats.filter(
    c => c.type === 'channel' && (c.created_by === authStore.user?.id || authStore.isDeveloper)
  );
});

const postAuthorType = ref<'user' | 'channel'>('user');
const selectedChannelId = ref<string>('');
const selectedChannel = computed(() => {
  return userChannels.value.find(c => c.id === selectedChannelId.value) || null;
});

const currentAuthorName = computed(() => {
  if (postAuthorType.value === 'channel' && selectedChannel.value) {
    return selectedChannel.value.title;
  }
  return `${authStore.user.first_name} ${authStore.user.last_name || ''}`.trim();
});

const currentAuthorAvatar = computed(() => {
  if (postAuthorType.value === 'channel' && selectedChannel.value) {
    return selectedChannel.value.avatar_url;
  }
  return authStore.user.avatar_url;
});

function selectChannelAuthor(ch: Chat) {
  postAuthorType.value = 'channel';
  selectedChannelId.value = ch.id;
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  isCompressing.value = true;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { dataUrl } = await compressImageToWebP(file, { maxWidth: 1400, quality: 0.82 });
      mediaUrls.value.push(dataUrl);
    }
    toastStore.show(`Загружено фото: ${files.length} (сжато в WebP)`, 'info');
  } catch (err) {
    toastStore.show('Ошибка сжатия изображения', 'error');
  } finally {
    isCompressing.value = false;
    target.value = '';
  }
}

function removeMedia(idx: number) {
  mediaUrls.value.splice(idx, 1);
}

async function submitPost() {
  if (!content.value.trim() && mediaUrls.value.length === 0) return;
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const cleanContent = content.value.trim().slice(0, 5000);
    await feedStore.createPost(
      cleanContent,
      [...mediaUrls.value],
      disableComments.value,
      audience.value,
      postAuthorType.value,
      postAuthorType.value === 'channel' ? selectedChannelId.value : null,
      postAuthorType.value === 'channel' ? selectedChannel.value : null
    );

    content.value = '';
    mediaUrls.value = [];
    disableComments.value = false;
    audience.value = 'all';
    postAuthorType.value = 'user';
    selectedChannelId.value = '';

    emit('update:modelValue', false);
    toastStore.show('Запись успешно опубликована в ленте!', 'success');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
