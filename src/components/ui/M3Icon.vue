<template>
  <span
    :class="[
      'material-symbols-rounded select-none leading-none inline-flex items-center justify-center shrink-0',
      filled ? 'filled' : '',
      sizeClasses
    ]"
    :style="fontSize ? { fontSize } : undefined"
  >
    {{ name }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    filled?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    fontSize?: string;
  }>(),
  {
    filled: false,
    size: 'md'
  }
);

const sizeClasses = computed(() => {
  if (props.fontSize) return '';
  switch (props.size) {
    case 'xs':
      return 'text-[16px] w-4 h-4';
    case 'sm':
      return 'text-[20px] w-5 h-5';
    case 'md':
      return 'text-[24px] w-6 h-6';
    case 'lg':
      return 'text-[28px] w-7 h-7';
    case 'xl':
      return 'text-[32px] w-8 h-8';
    default:
      return 'text-[24px] w-6 h-6';
  }
});
</script>
