<template>
  <div
    :class="[
      'rounded-3xl transition-all duration-300 overflow-hidden',
      variantClasses,
      interactive ? 'cursor-pointer hover:shadow-elevation-2 active:scale-[0.99] m3-press-effect' : '',
      paddingClasses
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'surface' | 'high' | 'highest' | 'outlined';
    interactive?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }>(),
  {
    variant: 'surface',
    interactive: false,
    padding: 'md'
  }
);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'surface':
      return 'bg-surface-low border border-surface-high/30 shadow-xs';
    case 'high':
      return 'bg-surface-high shadow-elevation-1';
    case 'highest':
      return 'bg-surface-highest shadow-elevation-2';
    case 'outlined':
      return 'bg-surface-lowest border border-outline-variant/60';
    default:
      return 'bg-surface-low shadow-xs';
  }
});

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none':
      return 'p-0';
    case 'sm':
      return 'p-3.5';
    case 'md':
      return 'p-5';
    case 'lg':
      return 'p-6';
    default:
      return 'p-5';
  }
});
</script>
