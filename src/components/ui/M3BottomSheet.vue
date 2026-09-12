<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex flex-col justify-end"
    >
      <!-- 1. Отдельное фоновое затемнение с плавной анимацией прозрачности fade -->
      <Transition name="fade" appear>
        <div
          v-if="modelValue"
          class="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          @click="close"
        />
      </Transition>

      <!-- 2. Выдвижная панель со смещением translateY(100%) и пружинной физикой -->
      <Transition name="sheet" appear>
        <div
          v-if="modelValue"
          class="relative w-full max-w-2xl mx-auto bg-surface-lowest text-surface-on rounded-t-4xl shadow-elevation-4 border-t border-surface-high flex flex-col max-h-[90vh] z-10 overflow-hidden"
        >
          <!-- Ручка для свайпа (Drag Handle) -->
          <div class="w-full flex items-center justify-center pt-3 pb-1 cursor-grab" @click="close">
            <div class="w-12 h-1.5 rounded-full bg-outline-variant/60" />
          </div>

          <!-- Шапка шторки -->
          <div v-if="title || $slots.header" class="px-6 py-3 flex items-center justify-between border-b border-surface-high/40">
            <slot name="header">
              <h3 class="text-lg font-bold text-surface-on tracking-tight">
                {{ title }}
              </h3>
            </slot>
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-high transition-colors text-surface-onVariant cursor-pointer"
              @click="close"
            >
              <span class="material-symbols-rounded text-xl">close</span>
            </button>
          </div>

          <!-- Контент -->
          <div class="px-6 py-4 overflow-y-auto flex-1 overscroll-contain">
            <slot />
          </div>

          <!-- Нижняя панель действий -->
          <div v-if="$slots.footer" class="px-6 py-3 border-t border-surface-high/40 bg-surface-low">
            <slot name="footer" />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

function close() {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<style scoped>
/* Анимация плавного затемнения фона */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 280ms ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* Анимация выезда шторки снизу */
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}

.sheet-enter-to,
.sheet-leave-from {
  transform: translateY(0);
}
</style>
