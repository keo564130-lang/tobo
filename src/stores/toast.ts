// ==============================================================================
// СИСТЕМА УВЕДОМЛЕНИЙ (TOASTS) В СТИЛЕ MATERIAL 3 EXPRESSIVE
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);

  function show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const item: ToastItem = { id, message, type, duration };
    toasts.value.push(item);

    setTimeout(() => {
      remove(id);
    }, duration);
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    show,
    remove
  };
});
