<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-80 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none"
        @click.self="close"
      >
        <!-- Кнопка закрытия лайтбокса -->
        <button
          type="button"
          aria-label="Закрыть просмотр"
          class="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-surface-lowest/20 hover:bg-surface-lowest/40 text-white flex items-center justify-center cursor-pointer transition-all duration-200 z-90 m3-press-effect"
          @click="close"
        >
          <span class="material-symbols-rounded text-2xl">close</span>
        </button>

        <!-- Контейнер полноразмерного изображения -->
        <div class="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center pointer-events-none">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            alt="Полноразмерное изображение"
            class="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-3xl shadow-elevation-5 pointer-events-auto transition-transform duration-200"
            @click.stop
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  imageUrl: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

function close() {
  emit('update:modelValue', false);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 220ms cubic-bezier(0.2, 0, 0, 1);
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
</style>
