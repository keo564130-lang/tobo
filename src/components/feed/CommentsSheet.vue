<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Комментарии"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Только скроллируемый список -->
    <div class="flex flex-col gap-3 min-h-[160px] pb-2">
      <div v-if="comments.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 text-surface-onVariant/60 text-sm">
        <span class="material-symbols-rounded text-3xl mb-2 text-primary opacity-40">forum</span>
        <span>Здесь пока нет комментариев. Напишите первым!</span>
      </div>
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex items-start gap-3 p-3 rounded-2xl bg-surface-low border border-surface-high/30"
      >
        <div class="cursor-pointer shrink-0" @click.stop="goToProfile(comment.author_id)">
          <M3Avatar :src="comment.author?.avatar_url" :name="comment.author?.first_name || 'Пользователь'" size="sm" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span
              class="text-xs font-bold text-surface-on hover:underline cursor-pointer"
              @click.stop="goToProfile(comment.author_id)"
            >
              {{ comment.author?.first_name }} {{ comment.author?.last_name || '' }}
            </span>
            <span class="text-[10px] text-surface-onVariant/60 font-mono">{{ formatTime(comment.created_at) }}</span>
          </div>
          <p class="text-xs text-surface-on mt-1 leading-relaxed select-text">{{ comment.text }}</p>
        </div>
      </div>
    </div>
    <!-- Зафиксированный футер: жестко привязан к низу шторки -->
    <template #footer>
      <div class="flex items-center gap-2">
        <input
          id="comment_input"
          name="comment"
          v-model="commentText"
          type="text"
          maxlength="1000"
          placeholder="Написать ответ..."
          aria-label="Написать комментарий"
          class="flex-1 px-4 py-2 rounded-full bg-surface border border-outline-variant/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          @keydown.enter="submitComment"
        />
        <M3Button variant="filled" size="sm" :disabled="!commentText.trim()" @click="submitComment">
          <span class="material-symbols-rounded text-base">send</span>
        </M3Button>
      </div>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Post } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useFeedStore } from '@/stores/feed';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  post: Post | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const router = useRouter();
const feedStore = useFeedStore();
const toastStore = useToastStore();

const commentText = ref('');

function goToProfile(authorId?: string) {
  if (authorId) {
    emit('update:modelValue', false);
    router.push('/profile/' + authorId);
  }
}

const comments = computed(() => (props.post ? feedStore.commentsMap[props.post.id] || [] : []));

watch(
  () => [props.modelValue, props.post],
  ([isOpen, currentPost]) => {
    if (isOpen && currentPost) {
      feedStore.getComments((currentPost as Post).id);
    }
  },
  { immediate: true }
);

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

async function submitComment() {
  if (!props.post || !commentText.value.trim()) return;

  const postId = props.post.id;
  const text = commentText.value.trim().slice(0, 1000);
  commentText.value = '';

  await feedStore.addComment(postId, text);
  toastStore.show('Комментарий добавлен', 'success');
}
</script>
