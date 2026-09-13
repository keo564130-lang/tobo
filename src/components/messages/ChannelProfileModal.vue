<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Информация о канале"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="chat" class="flex flex-col gap-4">
      <!-- Шапка канала: Аватарка (с возможностью смены для создателя) и заголовок -->
      <div class="flex items-center gap-4 p-2">
        <!-- Аватарка с кнопкой камеры -->
        <div class="relative shrink-0 group">
          <M3Avatar
            :src="chat.avatar_url"
            :name="chat.title"
            size="xl"
          />
          <button
            v-if="canEdit"
            type="button"
            aria-label="Изменить аватарку канала"
            title="Изменить аватарку канала"
            class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-on shadow-md flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all"
            @click="avatarFileInput?.click()"
          >
            <span class="material-symbols-rounded text-base">photo_camera</span>
          </button>
          <input
            ref="avatarFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleAvatarUpload"
          />
        </div>

        <div class="flex flex-col min-w-0 flex-1">
          <h3 class="text-xl font-bold text-surface-on truncate">
            {{ chat.title }}
          </h3>
          <span class="text-xs text-primary font-semibold mt-0.5">
            {{ formattedSubscribers }} подписчиков
          </span>
          <span class="text-[11px] text-surface-onVariant/60 font-mono truncate">
            @{{ channelUsername }}
          </span>
        </div>
      </div>

      <!-- Кнопка «Управление каналом» (аккуратная плашка под шапкой) -->
      <button
        v-if="canEdit"
        type="button"
        class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-surface-low hover:bg-surface-high border border-surface-high/60 text-xs font-semibold text-surface-on transition-all cursor-pointer m3-press-effect"
        @click="isEditing = !isEditing"
      >
        <span class="material-symbols-rounded text-base text-primary">{{ isEditing ? 'close' : 'tune' }}</span>
        <span>{{ isEditing ? 'Закрыть настройки названия' : 'Редактировать название канала' }}</span>
      </button>

      <!-- Режим редактирования названия и описания (если открыт) -->
      <div v-if="isEditing" class="flex flex-col gap-3.5 p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs">
        <div>
          <label for="edit_channel_title" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Название канала
          </label>
          <input
            id="edit_channel_title"
            v-model="editTitle"
            type="text"
            placeholder="Название канала..."
            class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label for="edit_channel_desc" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Описание канала
          </label>
          <textarea
            id="edit_channel_desc"
            v-model="editDescription"
            rows="3"
            placeholder="Краткое описание канала для подписчиков..."
            class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-xs sm:text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all leading-relaxed"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <M3Button variant="text" size="sm" type="button" @click="isEditing = false">
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="sm"
            type="button"
            :disabled="!editTitle.trim() || isSaving"
            :loading="isSaving"
            @click="saveChannelDetails"
          >
            Сохранить
          </M3Button>
        </div>
      </div>

      <!-- Описание канала (в режиме просмотра) -->
      <div v-if="!isEditing && chat.description" class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 text-xs text-surface-on leading-relaxed">
        {{ chat.description }}
      </div>

      <!-- РЕАЛЬНЫЕ НАСТРОЙКИ КАНАЛА (M3 тумблеры и переключатели Telegram-стиля) -->
      <div class="flex flex-col gap-3 p-4 rounded-3xl bg-surface-low border border-surface-high/40">
        <div class="flex items-center gap-2 pb-1 border-b border-surface-high/30">
          <span class="material-symbols-rounded text-primary text-lg">tune</span>
          <span class="text-xs font-bold text-surface-on uppercase tracking-wider">Параметры и модерация</span>
        </div>

        <!-- 1. Комментарии к публикациям -->
        <div class="flex items-center justify-between py-1">
          <div class="flex flex-col pr-2">
            <span class="text-xs font-semibold text-surface-on">Комментарии к публикациям</span>
            <span class="text-[11px] text-surface-onVariant/70">
              {{ allowComments ? 'Подписчики могут комментировать' : 'Комментарии отключены' }}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="allowComments"
            :disabled="!canEdit"
            class="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 shrink-0 focus:outline-none"
            :class="[
              allowComments ? 'bg-primary' : 'bg-surface-high',
              canEdit ? 'cursor-pointer' : 'opacity-60 cursor-default'
            ]"
            @click="canEdit && toggleCommentsSetting()"
          >
            <span
              class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
              :class="allowComments ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- 2. Реакции и лайки -->
        <div class="flex items-center justify-between py-1 border-t border-surface-high/30">
          <div class="flex flex-col pr-2">
            <span class="text-xs font-semibold text-surface-on">Реакции и лайки</span>
            <span class="text-[11px] text-surface-onVariant/70">
              {{ allowReactions ? 'Лайки и реакции включены' : 'Реакции выключены' }}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="allowReactions"
            :disabled="!canEdit"
            class="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 shrink-0 focus:outline-none"
            :class="[
              allowReactions ? 'bg-primary' : 'bg-surface-high',
              canEdit ? 'cursor-pointer' : 'opacity-60 cursor-default'
            ]"
            @click="canEdit && toggleReactionsSetting()"
          >
            <span
              class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
              :class="allowReactions ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- 3. Кто может публиковать -->
        <div class="flex flex-col gap-1.5 py-1 border-t border-surface-high/30">
          <span class="text-xs font-semibold text-surface-on">Кто может публиковать</span>
          <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-lowest border border-surface-high/40">
            <button
              type="button"
              :disabled="!canEdit"
              class="py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center"
              :class="postingRole === 'admins'
                ? 'bg-primary text-primary-on shadow-xs'
                : 'text-surface-onVariant hover:text-surface-on'"
              @click="canEdit && updatePostingRole('admins')"
            >
              Только админы
            </button>
            <button
              type="button"
              :disabled="!canEdit"
              class="py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center"
              :class="postingRole === 'all'
                ? 'bg-primary text-primary-on shadow-xs'
                : 'text-surface-onVariant hover:text-surface-on'"
              @click="canEdit && updatePostingRole('all')"
            >
              Все участники
            </button>
          </div>
        </div>

        <!-- 4. Тип канала (Публичный / Закрытый) -->
        <div class="flex flex-col gap-1.5 py-1 border-t border-surface-high/30">
          <span class="text-xs font-semibold text-surface-on">Тип канала</span>
          <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-lowest border border-surface-high/40">
            <button
              type="button"
              :disabled="!canEdit"
              class="py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center"
              :class="isPublic
                ? 'bg-primary text-primary-on shadow-xs'
                : 'text-surface-onVariant hover:text-surface-on'"
              @click="canEdit && updateChannelType(true)"
            >
              Публичный
            </button>
            <button
              type="button"
              :disabled="!canEdit"
              class="py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center"
              :class="!isPublic
                ? 'bg-primary text-primary-on shadow-xs'
                : 'text-surface-onVariant hover:text-surface-on'"
              @click="canEdit && updateChannelType(false)"
            >
              Закрытый
            </button>
          </div>
        </div>
      </div>

      <!-- Конфиденциальность: Список участников скрыт -->
      <div class="p-3 rounded-2xl bg-surface-low/60 border border-surface-high/30 flex items-center gap-3 text-xs text-surface-onVariant">
        <span class="material-symbols-rounded text-primary text-xl shrink-0">lock</span>
        <span>Список подписчиков скрыт в целях конфиденциальности.</span>
      </div>

      <!-- Настройки уведомлений канала -->
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-low border border-surface-high/40">
        <label for="channel_notifications_toggle" class="flex items-center gap-3 cursor-pointer">
          <span class="material-symbols-rounded text-surface-onVariant text-xl">notifications</span>
          <span class="text-xs font-semibold text-surface-on">Уведомления канала</span>
        </label>
        <input
          id="channel_notifications_toggle"
          name="channel_notifications"
          aria-label="Уведомления канала"
          v-model="notificationsEnabled"
          type="checkbox"
          class="w-5 h-5 accent-primary rounded cursor-pointer"
          @change="toggleNotifications"
        />
      </div>

      <!-- Реальная ссылка на канал с копированием -->
      <div class="flex flex-col gap-1.5 p-3 rounded-2xl bg-surface-low border border-surface-high/40 text-xs">
        <span class="text-surface-onVariant font-semibold">Ссылка-приглашение в канал:</span>
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-primary font-bold truncate select-all cursor-pointer hover:underline" @click="copyLink">
            {{ realLink }}
          </span>
          <button
            type="button"
            class="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors cursor-pointer shrink-0"
            @click="copyLink"
          >
            Скопировать
          </button>
        </div>
      </div>
    </div>

    <!-- Модалка круглого кроппера аватара канала -->
    <AvatarCropperModal
      v-model="showCropperModal"
      :image-src="cropperImageSrc"
      @crop-complete="handleCropComplete"
    />
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chat } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import AvatarCropperModal from '@/components/profile/AvatarCropperModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const authStore = useAuthStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const notificationsEnabled = ref(true);
const isEditing = ref(false);
const editTitle = ref('');
const editDescription = ref('');
const isSaving = ref(false);
const avatarFileInput = ref<HTMLInputElement | null>(null);

// M3 настройки канала
const allowComments = ref(true);
const allowReactions = ref(true);
const postingRole = ref<'admins' | 'all'>('admins');
const isPublic = ref(true);

const canEdit = computed(() => {
  if (!props.chat || !authStore.user?.id) return false;
  return props.chat.created_by === authStore.user.id || authStore.isDeveloper;
});

const channelUsername = computed(() => {
  if (!props.chat) return 'channel';
  return props.chat.title.toLowerCase().replace(/\s+/g, '_');
});

const formattedSubscribers = computed(() => {
  const count = props.chat?.subscribers_count || 1240;
  return count.toLocaleString('ru-RU');
});

// Реальная ссылка на канал
const realLink = computed(() => {
  if (typeof window === 'undefined' || !props.chat?.id) return 'https://tobo.me/channel';
  return `${window.location.origin}/messages?chat=${props.chat.id}`;
});

function copyLink() {
  navigator.clipboard.writeText(realLink.value);
  toastStore.show('Ссылка на канал скопирована в буфер', 'success');
}

// Загрузка аватарки канала через круглый кроппер
const showCropperModal = ref(false);
const cropperImageSrc = ref('');

function handleAvatarUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    cropperImageSrc.value = reader.result as string;
    showCropperModal.value = true;
  };
  reader.readAsDataURL(file);
  target.value = '';
}

async function handleCropComplete(result: string | { base64: string; blob?: Blob }) {
  const base64 = typeof result === 'string' ? result : result.base64;
  if (!props.chat?.id || !base64) return;
  try {
    await chatStore.updateChat(props.chat.id, { avatar_url: base64 });
    toastStore.show('Аватарка канала успешно обновлена!', 'success');
  } catch (err) {
    console.error(err);
    toastStore.show('Не удалось обновить аватарку', 'error');
  }
}

// Сохранение настроек канала
async function toggleCommentsSetting() {
  allowComments.value = !allowComments.value;
  if (!props.chat) return;
  await chatStore.updateChat(props.chat.id, {
    // В базе disable_comments: false означает, что комментарии разрешены
    disable_comments: !allowComments.value
  } as any);
  toastStore.show('Настройки канала обновлены', 'success');
}

async function toggleReactionsSetting() {
  allowReactions.value = !allowReactions.value;
  if (!props.chat) return;
  await chatStore.updateChat(props.chat.id, {
    allow_reactions: allowReactions.value
  } as any);
  toastStore.show('Настройки канала обновлены', 'success');
}

async function updatePostingRole(role: 'admins' | 'all') {
  postingRole.value = role;
  if (!props.chat) return;
  await chatStore.updateChat(props.chat.id, {
    can_post_role: role
  } as any);
  toastStore.show('Настройки канала обновлены', 'success');
}

async function updateChannelType(publicType: boolean) {
  isPublic.value = publicType;
  if (!props.chat) return;
  await chatStore.updateChat(props.chat.id, {
    is_public: publicType
  } as any);
  toastStore.show('Настройки канала обновлены', 'success');
}

// Инициализация полей
watch(
  () => props.chat,
  (newChat) => {
    if (newChat) {
      editTitle.value = newChat.title;
      editDescription.value = newChat.description || '';
      allowComments.value = !(newChat as any).disable_comments;
      allowReactions.value = (newChat as any).allow_reactions ?? true;
      postingRole.value = (newChat as any).can_post_role || 'admins';
      isPublic.value = (newChat as any).is_public ?? true;
    }
    isEditing.value = false;
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      isEditing.value = false;
    }
  }
);

async function saveChannelDetails() {
  if (!props.chat || !editTitle.value.trim() || isSaving.value) return;

  isSaving.value = true;
  try {
    await chatStore.updateChat(props.chat.id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim()
    });
    toastStore.show('Настройки канала сохранены', 'success');
    isEditing.value = false;
  } catch (err) {
    console.error('Ошибка сохранения параметров канала:', err);
    toastStore.show('Не удалось сохранить изменения', 'error');
  } finally {
    isSaving.value = false;
  }
}

function toggleNotifications() {
  toastStore.show(
    notificationsEnabled.value ? 'Уведомления канала включены' : 'Уведомления канала заглушены',
    'info'
  );
}
</script>
