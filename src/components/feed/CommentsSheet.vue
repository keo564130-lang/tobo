<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Комментарии"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4 min-h-[300px]">
      <!-- Список комментариев -->
      <div v-if="comments.length === 0" class="flex-1 flex flex-col items-center justify-center py-12 text-surface-onVariant/60 text-sm">
        <svg class="w-10 h-10 mb-2 opacity-40 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Здесь пока нет комментариев. Напишите первым!</span>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="flex items-start gap-3 p-3 rounded-2xl bg-surface-low border border-surface-high/30"
        >
          <M3Avatar
            :src="comment.author?.avatar_url"
            :name="comment.author?.first_name || 'Пользователь'"
            size="sm"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-surface-on">
                {{ comment.author?.first_name }} {{ comment.author?.last_name || '' }}
              </span>
              <span class="text-[10px] text-surface-onVariant/60 font-mono">
                {{ formatTime(comment.created_at) }}
              </span>
            </div>
            <p class="text-xs text-surface-on mt-1 leading-relaxed select-text">
              {{ comment.text }}
            </p>
          </div>
        </div>
      </div>

      <!-- Поле добавления комментария -->
      <div class="pt-3 border-t border-surface-high/50 flex items-center gap-2">
        <input
          v-model="commentText"
          type="text"
          placeholder="Написать ответ..."
          class="flex-1 px-4 py-2.5 rounded-full bg-surface-low border border-outline-variant/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          @keydown.enter="submitComment"
        />
        <M3Button
          variant="filled"
          size="sm"
          :disabled="!commentText.trim()"
          @click="submitComment"
        >
          Отправить
        </M3Button>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Post, PostComment } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  post: Post | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const feedStore = useFeedStore();
const toastStore = useToastStore();

const comments = ref<PostComment[]>([]);
const commentText = ref('');

watch(
  () => props.post,
  (newPost) => {
    if (newPost) {
      comments.value = feedStore.getComments(newPost.id);
    }
  },
  { immediate: true }
);

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function submitComment() {
  if (!props.post || !commentText.value.trim()) return;

  feedStore.addComment(props.post.id, commentText.value.trim());
  comments.value = feedStore.getComments(props.post.id);
  commentText.value = '';
  toastStore.show('Комментарий добавлен', 'success');
}
</script>
