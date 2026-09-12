<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-200 outline-none select-none m3-press-effect',
      variantClasses,
      sizeClasses,
      disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    ]"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'fab';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    variant: 'filled',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false
  }
);

defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'filled':
      return 'bg-primary text-primary-on hover:opacity-90 active:opacity-95 shadow-sm';
    case 'tonal':
      return 'bg-primary-container text-primary-onContainer hover:opacity-90 active:opacity-95';
    case 'outlined':
      return 'bg-transparent border border-outline-variant text-surface-on hover:bg-surface-high/50';
    case 'text':
      return 'bg-transparent text-primary hover:bg-primary-container/40';
    case 'fab':
      return 'bg-primary text-primary-on shadow-elevation-2 hover:shadow-elevation-3 hover:scale-105 active:scale-95';
    default:
      return 'bg-primary text-primary-on';
  }
});

const sizeClasses = computed(() => {
  if (props.variant === 'fab') {
    return 'w-14 h-14 rounded-3xl p-0';
  }
  switch (props.size) {
    case 'sm':
      return 'text-xs px-3.5 py-1.5 rounded-full gap-1.5';
    case 'md':
      return 'text-sm px-5 py-2.5 rounded-full gap-2';
    case 'lg':
      return 'text-base px-6 py-3 rounded-full gap-2.5 font-semibold';
    case 'icon':
      return 'w-10 h-10 p-0 rounded-full flex items-center justify-center';
    default:
      return 'text-sm px-5 py-2.5 rounded-full gap-2';
  }
});
</script>
