<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-md rounded-4xl bg-surface-lowest border border-surface-high/60 p-6 shadow-elevation-4 flex flex-col gap-4 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar transition-all"
      >
        <!-- Шапка: иконка flag text-rose-500, заголовок, кнопка закрытия -->
        <div class="flex items-center justify-between pb-2 border-b border-surface-high/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-rounded text-2xl">flag</span>
            </div>
            <div>
              <h3 class="text-base font-bold text-surface-on leading-tight">
                Пожаловаться на запись
              </h3>
              <p v-if="post?.author" class="text-xs text-surface-onVariant/70 mt-0.5">
                Автор: {{ post.author.first_name }} {{ post.author.last_name || '' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Закрыть окно"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:text-surface-on hover:bg-surface-high cursor-pointer transition-colors"
            @click="closeModal"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- Выбор причины (M3 карточки) -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-semibold text-surface-on">Укажите причину жалобы:</span>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="reason in REPORT_REASONS"
              :key="reason"
              role="radio"
              :aria-checked="selectedReason === reason"
              tabindex="0"
              class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer select-none m3-press-effect"
              :class="selectedReason === reason
                ? 'border-rose-500/60 bg-rose-500/10 text-surface-on font-semibold shadow-xs'
                : 'border-surface-high/60 bg-surface-low hover:bg-surface-high/50 text-surface-onVariant'"
              @click="selectedReason = reason"
              @keydown.enter.prevent="selectedReason = reason"
              @keydown.space.prevent="selectedReason = reason"
            >
              <div class="flex items-center gap-2.5">
                <span
                  class="material-symbols-rounded text-lg"
                  :class="selectedReason === reason ? 'text-rose-500' : 'text-surface-onVariant/60'"
                >
                  {{ getReasonIcon(reason) }}
                </span>
                <span class="text-xs sm:text-sm">{{ reason }}</span>
              </div>
              <span
                class="material-symbols-rounded text-lg"
                :class="selectedReason === reason ? 'text-rose-500' : 'text-surface-onVariant/40'"
              >
                {{ selectedReason === reason ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Текстовое поле подробного описания -->
        <div class="flex flex-col gap-1.5">
          <label for="report-description" class="text-xs font-semibold text-surface-on">
            Подробное описание <span class="text-surface-onVariant/60 font-normal">(необязательно)</span>
          </label>
          <textarea
            id="report-description"
            v-model="descriptionText"
            rows="3"
            placeholder="Опишите, что именно нарушает правила..."
            class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-xs sm:text-sm text-surface-on placeholder:text-surface-onVariant/50 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none transition-all"
          />
        </div>

        <!-- Прикрепление скриншотов / фото -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-surface-on">
              Скриншоты <span class="text-surface-onVariant/60 font-normal">({{ screenshots.length }}/3)</span>
            </span>
            <span v-if="screenshots.length >= 3" class="text-[11px] text-surface-onVariant/60">
              Максимум 3 файла
            </span>
          </div>

          <!-- Превью прикрепленных миниатюр -->
          <div v-if="screenshotPreviews.length > 0" class="grid grid-cols-3 gap-2">
            <div
              v-for="(preview, idx) in screenshotPreviews"
              :key="idx"
              class="relative h-20 rounded-2xl overflow-hidden bg-surface-low border border-surface-high/60 group shadow-xs"
            >
              <img
                :src="preview"
                alt="Скриншот нарушения"
                class="w-full h-full object-cover"
              />
              <button
                type="button"
                aria-label="Удалить скриншот"
                class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                @click="removeScreenshot(idx)"
              >
                <span class="material-symbols-rounded text-xs">close</span>
              </button>
            </div>
          </div>

          <!-- Кнопка прикрепления файла -->
          <div v-if="screenshots.length < 3">
            <label
              for="report-file-upload"
              class="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-low hover:bg-surface-high/60 border border-surface-high/60 text-xs font-medium text-surface-on cursor-pointer transition-colors m3-press-effect"
            >
              <span class="material-symbols-rounded text-base text-rose-500">add_photo_alternate</span>
              <span>Прикрепить скриншот</span>
              <input
                id="report-file-upload"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileUpload"
              />
            </label>
          </div>
        </div>

        <!-- Кнопки внизу -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-high/40">
          <M3Button
            variant="text"
            size="md"
            type="button"
            @click="closeModal"
          >
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="md"
            type="button"
            :disabled="!selectedReason || isSubmitting"
            :loading="isSubmitting"
            class="bg-rose-500! hover:bg-rose-600! text-white!"
            @click="handleSubmitReport"
          >
            Отправить жалобу
          </M3Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import type { Post } from '@/types/database';
import M3Button from '@/components/ui/M3Button.vue';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  post: Post | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const feedStore = useFeedStore();
const toastStore = useToastStore();

const REPORT_REASONS = [
  'Спам или реклама',
  'Оскорбления или буллинг',
  'Неприемлемый или опасный контент',
  'Мошенничество или обман',
  'Другое'
] as const;

const selectedReason = ref<string>('');
const descriptionText = ref<string>('');
const screenshots = ref<File[]>([]);
const screenshotPreviews = ref<string[]>([]);
const isSubmitting = ref(false);

function getReasonIcon(reason: string): string {
  switch (reason) {
    case 'Спам или реклама':
      return 'campaign';
    case 'Оскорбления или буллинг':
      return 'person_cancel';
    case 'Неприемлемый или опасный контент':
      return 'warning';
    case 'Мошенничество или обман':
      return 'shield_lock';
    case 'Другое':
    default:
      return 'help_outline';
  }
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const remainingSlots = 3 - screenshots.value.length;
  if (remainingSlots <= 0) return;

  const filesToAdd = Array.from(target.files).slice(0, remainingSlots);
  for (const file of filesToAdd) {
    if (!file.type.startsWith('image/')) continue;
    screenshots.value.push(file);
    screenshotPreviews.value.push(URL.createObjectURL(file));
  }

  target.value = '';
}

function removeScreenshot(idx: number) {
  const [removedUrl] = screenshotPreviews.value.splice(idx, 1);
  if (removedUrl) {
    URL.revokeObjectURL(removedUrl);
  }
  screenshots.value.splice(idx, 1);
}

function cleanupPreviews() {
  screenshotPreviews.value.forEach(url => URL.revokeObjectURL(url));
  screenshotPreviews.value = [];
}

function resetForm() {
  cleanupPreviews();
  selectedReason.value = '';
  descriptionText.value = '';
  screenshots.value = [];
  isSubmitting.value = false;
}

function closeModal() {
  emit('update:modelValue', false);
  resetForm();
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      resetForm();
    }
  }
);

onUnmounted(() => {
  cleanupPreviews();
});

async function handleSubmitReport() {
  if (!props.post || !selectedReason.value || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    await feedStore.submitReport(
      props.post.id,
      selectedReason.value,
      descriptionText.value.trim(),
      screenshots.value
    );
    toastStore.show('Жалоба принята. Модераторы проверят публикацию', 'success');
    closeModal();
  } catch (err) {
    console.error('Ошибка отправки жалобы:', err);
    toastStore.show('Не удалось отправить жалобу. Попробуйте позже', 'error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
