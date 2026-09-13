<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Обсуждение публикации"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Цитата комментируемой публикации канала -->
    <div v-if="message" class="p-3 rounded-2xl bg-surface-low border-l-4 border-primary flex flex-col gap-1 shadow-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-rounded text-primary text-sm">campaign</span>
          <span class="text-xs font-bold text-primary">{{ chat?.title || 'Канал' }}</span>
        </div>
        <span class="text-[10px] text-surface-onVariant/60 font-mono">{{ formatTime(message.created_at) }}</span>
      </div>
      <p class="text-xs text-surface-on line-clamp-3 select-text leading-relaxed mt-0.5">
        {{ message.content || 'Публикация с медиа-вложением' }}
      </p>
    </div>

    <!-- Список комментариев -->
    <div class="flex flex-col gap-3 min-h-[180px] pb-2 mt-3">
      <div v-if="comments.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 text-surface-onVariant/60 text-sm">
        <span class="material-symbols-rounded text-3xl mb-2 text-primary opacity-40">forum</span>
        <span>Здесь пока нет комментариев. Начните обсуждение первым!</span>
      </div>
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex items-start gap-3 p-3 rounded-2xl bg-surface-low border border-surface-high/30 transition-colors"
      >
        <M3Avatar
          :src="comment.author?.avatar_url"
          :name="comment.author?.first_name || 'Пользователь'"
          size="sm"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-surface-on truncate">
              {{ comment.author?.first_name }} {{ comment.author?.last_name || '' }}
            </span>
            <span class="text-[10px] text-surface-onVariant/60 font-mono shrink-0">
              {{ formatTime(comment.created_at) }}
            </span>
          </div>
          <p class="text-xs text-surface-on mt-1 leading-relaxed select-text break-words">
            {{ comment.text }}
          </p>
        </div>
      </div>
    </div>

    <!-- Зафиксированный футер: поле ввода комментария -->
    <template #footer>
      <div class="flex items-center gap-2">
        <input
          id="channel_comment_input"
          name="channel_comment"
          v-model="commentText"
          type="text"
          placeholder="Написать комментарий к записи..."
          aria-label="Написать комментарий"
          class="flex-1 px-4 py-2.5 rounded-full bg-surface border border-outline-variant/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          @keydown.enter="submitComment"
        />
        <M3Button variant="filled" size="sm" :disabled="!commentText.trim() || isSubmitting" @click="submitComment">
          <span v-if="isSubmitting" class="w-4 h-4 border-2 border-primary-on border-t-transparent rounded-full animate-spin" />
          <span v-else class="material-symbols-rounded text-base">send</span>
        </M3Button>
      </div>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chat, Message } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
  message: Message | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const chatStore = useChatStore();
const toastStore = useToastStore();

const commentText = ref('');
const isSubmitting = ref(false);

const comments = computed(() => {
  if (!props.message) return [];
  return chatStore.channelCommentsMap[props.message.id] || [];
});

watch(
  () => [props.modelValue, props.message],
  async ([isOpen, currentMsg]) => {
    if (isOpen && currentMsg) {
      const msg = currentMsg as Message;
      await chatStore.loadChannelComments(msg.id);
    }
  },
  { immediate: true }
);

function formatTime(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

async function submitComment() {
  if (!props.chat || !props.message || !commentText.value.trim() || isSubmitting.value) return;

  const text = commentText.value.trim();
  isSubmitting.value = true;
  try {
    await chatStore.addChannelMessageComment(props.chat.id, props.message.id, text);
    commentText.value = '';
    toastStore.show('Комментарий опубликован', 'success');
  } catch (err) {
    console.error('Ошибка отправки комментария к публикации канала:', err);
    toastStore.show('Не удалось отправить комментарий', 'error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
