<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Информация о канале"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="chat" class="flex flex-col gap-5">
      <!-- Шапка канала -->
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

      <!-- Описание канала -->
      <div v-if="chat.description" class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 text-xs text-surface-on leading-relaxed">
        {{ chat.description }}
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
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Chat } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const toastStore = useToastStore();
const notificationsEnabled = ref(true);

const channelUsername = computed(() => {
  if (!props.chat) return 'channel';
  return props.chat.title.toLowerCase().replace(/\s+/g, '_');
});

const formattedSubscribers = computed(() => {
  const count = props.chat?.subscribers_count || 1240;
  return count.toLocaleString('ru-RU');
});

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
