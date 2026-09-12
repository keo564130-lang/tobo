<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-lowest/95 backdrop-blur-md shadow-elevation-3 border border-surface-high/60 text-sm font-medium transition-all"
        >
          <!-- Иконка статуса -->
          <div
            :class="[
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
              toast.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : '',
              toast.type === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : '',
              toast.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : '',
              toast.type === 'info' ? 'bg-primary-container text-primary-on dark:bg-primary-container dark:text-primary-onContainer' : ''
            ]"
          >
            <span v-if="toast.type === 'success'" class="material-symbols-rounded text-base font-bold">check</span>
            <span v-else-if="toast.type === 'error'" class="material-symbols-rounded text-base font-bold">close</span>
            <span v-else-if="toast.type === 'warning'" class="material-symbols-rounded text-base font-bold">priority_high</span>
            <span v-else class="material-symbols-rounded text-base font-bold">info</span>
          </div>

          <span class="text-surface-on flex-1 leading-snug text-xs">
            {{ toast.message }}
          </span>

          <button
            class="text-surface-onVariant/60 hover:text-surface-on p-1 rounded-full transition-colors cursor-pointer"
            @click="toastStore.remove(toast.id)"
          >
            <span class="material-symbols-rounded text-base">close</span>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
