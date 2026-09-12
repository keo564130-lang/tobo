<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Новая публикация"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <!-- Автор поста -->
      <div class="flex items-center gap-3">
        <M3Avatar
          :src="authStore.user.avatar_url"
          :name="authStore.user.first_name"
          size="md"
        />
        <div class="flex flex-col">
          <span class="text-sm font-bold text-surface-on">
            {{ authStore.user.first_name }} {{ authStore.user.last_name || '' }}
          </span>
          <!-- Селектор аудитории -->
          <div class="flex items-center gap-2 mt-0.5">
            <button
              class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer"
              :class="audience === 'all' ? 'bg-primary-container text-primary-on font-semibold' : 'bg-surface-low text-surface-onVariant'"
              @click="audience = 'all'"
            >
              <span class="material-symbols-rounded text-xs">public</span>
              <span>Для всех</span>
            </button>
            <button
              class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer"
              :class="audience === 'friends' ? 'bg-primary-container text-primary-on font-semibold' : 'bg-surface-low text-surface-onVariant'"
              @click="audience = 'friends'"
            >
              <span class="material-symbols-rounded text-xs">group</span>
              <span>Только друзья</span>
            </button>
          </div>
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
          <label for="disable_comments" class="text-xs font-semibold text-surface-on cursor-pointer">Отключить комментарии</label>
          <span class="text-[11px] text-surface-onVariant/70">Другие пользователи не смогут комментировать эту запись</span>
        </div>
        <input
          id="disable_comments"
          name="disable_comments"
          aria-label="Отключить комментарии"
          v-model="disableComments"
          type="checkbox"
          class="w-5 h-5 accent-primary rounded cursor-pointer"
        />
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
          :disabled="!content.trim() && mediaUrls.length === 0"
          :loading="isCompressing"
          @click="submitPost"
        >
          Опубликовать
        </M3Button>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PostAudience } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
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
const toastStore = useToastStore();

const content = ref('');
const mediaUrls = ref<string[]>([]);
const disableComments = ref(false);
const audience = ref<PostAudience>('all');
const isCompressing = ref(false);

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

  await feedStore.createPost(
    content.value.trim(),
    [...mediaUrls.value],
    disableComments.value,
    audience.value
  );

  content.value = '';
  mediaUrls.value = [];
  disableComments.value = false;
  audience.value = 'all';

  emit('update:modelValue', false);
  toastStore.show('Запись успешно опубликована в ленте!', 'success');
}
</script>
