<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Информация о канале"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="chat" class="flex flex-col gap-5">
      <!-- Режим редактирования правил и параметров канала -->
      <div v-if="isEditing" class="flex flex-col gap-4 p-4 rounded-3xl bg-surface-lowest border border-surface-high/60 shadow-xs">
        <div class="flex items-center gap-2 pb-2 border-b border-surface-high/40 text-sm font-bold text-surface-on">
          <span class="material-symbols-rounded text-primary text-lg">edit</span>
          <span>Редактирование канала</span>
        </div>

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
            Правила и описание канала
          </label>
          <textarea
            id="edit_channel_desc"
            v-model="editDescription"
            rows="4"
            placeholder="Укажите правила публикаций, правила для комментариев и общее описание канала..."
            class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-xs sm:text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all leading-relaxed"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-surface-high/40">
          <M3Button
            variant="text"
            size="sm"
            type="button"
            @click="isEditing = false"
          >
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="sm"
            type="button"
            :disabled="!editTitle.trim() || isSaving"
            :loading="isSaving"
            @click="saveChannelRules"
          >
            Сохранить
          </M3Button>
        </div>
      </div>

      <!-- Режим просмотра профиля канала -->
      <template v-else>
        <!-- Шапка канала -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <M3Avatar
              :src="chat.avatar_url"
              :name="chat.title"
              size="xl"
            />
            <div class="flex flex-col">
              <h3 class="text-xl font-bold text-surface-on">
                {{ chat.title }}
              </h3>
              <!-- Счетчик подписчиков -->
              <span class="text-xs text-primary font-semibold mt-0.5">
                {{ formattedSubscribers }} подписчиков
              </span>
              <span class="text-[11px] text-surface-onVariant/60 font-mono">
                @{{ channelUsername }}
              </span>
            </div>
          </div>

          <!-- Кнопка редактирования для создателя или разработчика -->
          <M3Button
            v-if="canEdit"
            variant="tonal"
            size="sm"
            class="shrink-0"
            @click="startEditing"
          >
            <span class="material-symbols-rounded text-base mr-1">edit</span>
            <span>Редактировать</span>
          </M3Button>
        </div>

        <!-- Блок «Правила и описание канала» -->
        <div class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-semibold text-surface-on">
              <span class="material-symbols-rounded text-primary text-base">gavel</span>
              <span>Правила и описание канала</span>
            </div>
          </div>
          <p class="text-xs text-surface-on leading-relaxed whitespace-pre-wrap">
            {{ chat.description || 'Правила канала пока не заданы' }}
          </p>
        </div>

        <!-- Конфиденциальность: Список участников скрыт -->
        <div class="p-3 rounded-2xl bg-surface-low/60 border border-surface-high/30 flex items-center gap-3 text-xs text-surface-onVariant">
          <span class="material-symbols-rounded text-primary text-xl shrink-0">lock</span>
          <span>Список подписчиков скрыт администратором в целях конфиденциальности.</span>
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

        <!-- Ссылка на канал -->
        <div class="flex items-center justify-between p-3 rounded-2xl bg-surface-low border border-surface-high/40 text-xs">
          <span class="text-surface-onVariant">Ссылка:</span>
          <span class="font-mono text-primary font-bold cursor-pointer hover:underline" @click="copyLink">
            https://tobo.me/{{ channelUsername }}
          </span>
        </div>
      </template>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chat } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
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

function startEditing() {
  if (!props.chat) return;
  editTitle.value = props.chat.title;
  editDescription.value = props.chat.description || '';
  isEditing.value = true;
}

watch(
  () => props.chat,
  (newChat) => {
    if (newChat) {
      editTitle.value = newChat.title;
      editDescription.value = newChat.description || '';
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

async function saveChannelRules() {
  if (!props.chat || !editTitle.value.trim() || isSaving.value) return;

  isSaving.value = true;
  try {
    await chatStore.updateChat(props.chat.id, {
      title: editTitle.value.trim(),
      description: editDescription.value.trim()
    });
    toastStore.show('Правила и настройки канала сохранены', 'success');
    isEditing.value = false;
  } catch (err) {
    console.error('Ошибка сохранения правил канала:', err);
    toastStore.show('Не удалось сохранить правила канала', 'error');
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

function copyLink() {
  navigator.clipboard.writeText(`https://tobo.me/${channelUsername.value}`);
  toastStore.show('Ссылка на канал скопирована в буфер', 'success');
}
</script>
