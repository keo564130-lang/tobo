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
        <svg class="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Список подписчиков скрыт администратором в целях конфиденциальности.</span>
      </div>

      <!-- Настройки уведомлений канала -->
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-surface-low border border-surface-high/40">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-surface-onVariant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span class="text-xs font-semibold text-surface-on">Уведомления канала</span>
        </div>
        <input
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
