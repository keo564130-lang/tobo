<template>
  <div class="relative inline-flex items-center justify-center shrink-0">
    <img
      v-if="src && !hasError"
      :src="src"
      :alt="alt || 'Аватар'"
      :class="[
        sizeClasses,
        'rounded-full object-cover shadow-sm ring-2 ring-surface transition-transform duration-300'
      ]"
      @error="hasError = true"
    />
    <div
      v-else
      :class="[
        sizeClasses,
        'rounded-full bg-primary-container text-primary-on font-semibold flex items-center justify-center ring-2 ring-surface shadow-sm'
      ]"
    >
      {{ initials }}
    </div>

    <!-- Индикатор онлайн-статуса -->
    <span
      v-if="showOnline && isOnline"
      :class="[
        badgeSizeClasses,
        'absolute bottom-0 right-0 rounded-full bg-emerald-400 ring-2 ring-surface shadow-xs animate-pulse-subtle'
      ]"
      title="В сети"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    isOnline?: boolean;
    showOnline?: boolean;
  }>(),
  {
    size: 'md',
    showOnline: false,
    isOnline: false
  }
);

const hasError = ref(false);

const initials = computed(() => {
  if (!props.name) return 'tb';
  const parts = props.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-8 h-8 text-xs';
    case 'md':
      return 'w-10 h-10 text-sm';
    case 'lg':
      return 'w-13 h-13 text-base';
    case 'xl':
      return 'w-18 h-18 text-xl';
    case '2xl':
      return 'w-24 h-24 text-2xl font-bold';
    default:
      return 'w-10 h-10 text-sm';
  }
});

const badgeSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-2.5 h-2.5';
    case 'md':
      return 'w-3 h-3';
    case 'lg':
      return 'w-3.5 h-3.5';
    case 'xl':
    case '2xl':
      return 'w-4.5 h-4.5';
    default:
      return 'w-3 h-3';
  }
});
</script>
