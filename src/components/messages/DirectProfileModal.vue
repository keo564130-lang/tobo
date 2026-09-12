<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Профиль собеседника"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="profile" class="flex flex-col items-center text-center gap-4">
      <!-- Полноразмерный аватар -->
      <div class="relative mt-2">
        <M3Avatar
          :src="profile.avatar_url"
          :name="profile.first_name"
          size="2xl"
          :is-online="profile.is_online"
          show-online
        />
      </div>

      <!-- Имя и юзернейм -->
      <div class="flex flex-col items-center">
        <h3 class="text-xl font-bold text-surface-on">
          {{ profile.first_name }} {{ profile.last_name || '' }}
        </h3>
        <span class="text-xs text-primary font-mono mt-0.5">
          @{{ profile.username }}
        </span>
        <span
          class="text-xs mt-1 font-medium"
          :class="profile.is_online ? 'text-emerald-500' : 'text-surface-onVariant/60'"
        >
          {{ profile.is_online ? 'В сети' : 'Был(а) недавно' }}
        </span>
      </div>

      <!-- Биография / Описание (Bio) -->
      <div v-if="profile.bio" class="w-full p-4 rounded-2xl bg-surface-low border border-surface-high/40 text-sm text-surface-on leading-relaxed text-left select-text">
        <span class="text-[11px] font-semibold uppercase text-surface-onVariant/60 block mb-1">О себе</span>
        {{ profile.bio }}
      </div>

      <!-- Блок 'Общие группы' с данным контактом -->
      <div class="w-full text-left">
        <span class="text-xs font-bold uppercase tracking-wider text-surface-onVariant/70 px-1 mb-2 block">
          Общие группы
        </span>
        <div class="flex flex-col gap-2">
          <div
            v-for="group in mutualGroups"
            :key="group.id"
            class="flex items-center gap-3 p-3 rounded-2xl bg-surface-low border border-surface-high/30 hover:bg-surface-high/40 transition-colors cursor-pointer"
          >
            <M3Avatar
              :src="group.avatar_url"
              :name="group.title"
              size="sm"
            />
            <div class="flex flex-col">
              <span class="text-xs font-bold text-surface-on">{{ group.title }}</span>
              <span class="text-[10px] text-surface-onVariant/60">{{ group.members_count || 5 }} участников</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Кнопки действий: Заблокировать и Заблокировать + Пожаловаться -->
      <div class="w-full flex flex-col gap-2 pt-2 border-t border-surface-high/50">
        <M3Button
          v-if="!isBlocked"
          variant="outlined"
          size="md"
          class="w-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/20"
          @click="handleBlock"
        >
          <span class="material-symbols-rounded text-lg">block</span>
          <span>Заблокировать</span>
        </M3Button>

        <M3Button
          v-else
          variant="tonal"
          size="md"
          class="w-full"
          @click="handleUnblock"
        >
          Разблокировать пользователя
        </M3Button>

        <M3Button
          v-if="!isBlocked"
          variant="text"
          size="sm"
          class="w-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          @click="showReportModal = true"
        >
          Заблокировать и пожаловаться
        </M3Button>
      </div>

      <!-- Модальный диалог выбора причины жалобы -->
      <div v-if="showReportModal" class="w-full p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-left flex flex-col gap-3">
        <span class="text-xs font-bold text-rose-700 dark:text-rose-300">Выберите причину жалобы:</span>
        <div class="flex flex-col gap-1.5">
          <label
            v-for="reason in reportReasons"
            :key="reason"
            class="flex items-center gap-2 p-2 rounded-xl hover:bg-surface-high cursor-pointer text-xs text-surface-on"
          >
            <input
              v-model="selectedReason"
              type="radio"
              :value="reason"
              class="accent-primary"
            />
            <span>{{ reason }}</span>
          </label>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <M3Button variant="text" size="sm" @click="showReportModal = false">
            Отмена
          </M3Button>
          <M3Button variant="filled" size="sm" class="bg-rose-600 text-white" @click="submitReport">
            Отправить жалобу
          </M3Button>
        </div>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Profile, Chat } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  profile: Profile | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const chatStore = useChatStore();
const toastStore = useToastStore();

const showReportModal = ref(false);
const selectedReason = ref('Спам и нежелательные рассылки');

const reportReasons = [
  'Спам и нежелательные рассылки',
  'Оскорбления и агрессивное поведение',
  'Мошенничество или фишинг',
  'Неприемлемый контент'
];

const isBlocked = computed(() => {
  if (!props.profile) return false;
  return chatStore.isUserBlocked(props.profile.id);
});

// Общие группы пользователя и собеседника
const mutualGroups = computed<Partial<Chat>[]>(() => {
  return [
    {
      id: 'chat-group-family-004',
      title: 'Семья',
      avatar_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&auto=format&fit=crop&q=80',
      members_count: 5
    }
  ];
});

function handleBlock() {
  if (!props.profile) return;
  chatStore.blockUser(props.profile.id, 'Блокировка из карточки профиля');
  toastStore.show(`Пользователь ${props.profile.first_name} заблокирован`, 'info');
}

function handleUnblock() {
  if (!props.profile) return;
  chatStore.unblockUser(props.profile.id);
  toastStore.show(`Пользователь ${props.profile.first_name} разблокирован`, 'success');
}

function submitReport() {
  if (!props.profile) return;
  chatStore.reportUser(props.profile.id, selectedReason.value, 'Жалоба через профиль');
  chatStore.blockUser(props.profile.id, `Жалоба: ${selectedReason.value}`);
  showReportModal.value = false;
  emit('update:modelValue', false);
  toastStore.show('Жалоба отправлена модераторам, пользователь заблокирован', 'success');
}
</script>
