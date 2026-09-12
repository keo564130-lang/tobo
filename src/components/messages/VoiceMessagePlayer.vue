<template>
  <div class="flex items-center gap-3 py-1 px-1 select-none">
    <!-- Кнопка воспроизведения/паузы с пружинным эффектом -->
    <button
      class="w-9 h-9 rounded-full bg-primary text-primary-on flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95 transition-all m3-press-effect"
      @click="togglePlay"
    >
      <svg v-if="!isPlaying" class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
      </svg>
    </button>

    <!-- Пастельная звуковая волна -->
    <div class="flex-1 flex items-center gap-0.5 h-7 cursor-pointer" @click="togglePlay">
      <div
        v-for="(bar, idx) in waveform"
        :key="idx"
        class="w-1 rounded-full transition-all duration-150"
        :class="[
          idx <= activeBarIndex
            ? 'bg-primary'
            : 'bg-primary/30 dark:bg-primary/20'
        ]"
        :style="{
          height: `${Math.max(bar * 24, 4)}px`
        }"
      />
    </div>

    <!-- Длительность -->
    <span class="text-[11px] font-mono font-medium text-surface-onVariant/80 shrink-0">
      {{ formattedTime }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    duration?: number; // в секундах
    wave?: number[];
  }>(),
  {
    duration: 5,
    wave: () => [0.3, 0.5, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7, 0.5, 0.8, 0.4, 0.2, 0.6, 0.9, 0.7, 0.3, 0.5, 0.8, 0.4, 0.2]
  }
);

const isPlaying = ref(false);
const currentTime = ref(0);
let intervalId: number | null = null;

const waveform = computed(() => {
  return props.wave && props.wave.length > 0 ? props.wave : [0.3, 0.6, 0.8, 0.4, 0.7, 0.5];
});

const activeBarIndex = computed(() => {
  if (!isPlaying.value && currentTime.value === 0) return -1;
  const ratio = currentTime.value / Math.max(props.duration, 1);
  return Math.floor(ratio * waveform.value.length);
});

const formattedTime = computed(() => {
  const t = isPlaying.value ? Math.ceil(props.duration - currentTime.value) : props.duration;
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
});

function togglePlay() {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

function play() {
  isPlaying.value = true;
  intervalId = window.setInterval(() => {
    currentTime.value += 0.2;
    if (currentTime.value >= props.duration) {
      pause();
      currentTime.value = 0;
    }
  }, 200);
}

function pause() {
  isPlaying.value = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>
