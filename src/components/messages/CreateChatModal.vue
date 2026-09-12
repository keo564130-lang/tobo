<template>
  <M3BottomSheet
    :model-value="modelValue"
    :title="modalTitle"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <!-- Название / Имя -->
      <div>
        <label for="create_chat_title" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
          {{ type === 'direct' ? 'Имя контакта' : (type === 'group' ? 'Название группы' : 'Название канала') }}
        </label>
        <input
          id="create_chat_title"
          name="chat_title"
          aria-label="Название чата"
          v-model="title"
          type="text"
          :placeholder="type === 'direct' ? 'Например: Миша Смирнов' : (type === 'group' ? 'Например: Семья, Коллеги' : 'Например: Новости tobo')"
          class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />
      </div>

      <!-- Описание (для групп и каналов) -->
      <div v-if="type !== 'direct'">
        <label for="create_chat_desc" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
          Описание (необязательно)
        </label>
        <textarea
          id="create_chat_desc"
          name="chat_description"
          aria-label="Описание чата"
          v-model="description"
          rows="2"
          placeholder="Опишите назначение или правила..."
          class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
        />
      </div>

      <!-- Кнопка создания -->
      <div class="pt-2 flex items-center justify-end gap-2">
        <M3Button variant="text" size="md" @click="$emit('update:modelValue', false)">
          Отмена
        </M3Button>
        <M3Button
          variant="filled"
          size="md"
          :disabled="!title.trim()"
          @click="submitCreate"
        >
          Создать
        </M3Button>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ChatType } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  type: ChatType;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const chatStore = useChatStore();
const toastStore = useToastStore();

const title = ref('');
const description = ref('');

const modalTitle = computed(() => {
  switch (props.type) {
    case 'direct':
      return 'Создать личный диалог';
    case 'group':
      return 'Создать группу';
    case 'channel':
      return 'Создать канал';
    default:
      return 'Создать чат';
  }
});

function submitCreate() {
  if (!title.value.trim()) return;

  chatStore.createChat(
    props.type,
    title.value.trim(),
    description.value.trim() || undefined
  );

  title.value = '';
  description.value = '';
  emit('update:modelValue', false);
  toastStore.show('Диалог успешно создан!', 'success');
}
</script>
