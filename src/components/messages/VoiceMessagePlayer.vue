<template>
  <div class="flex items-center gap-3 py-1 px-1 select-none">
    <!-- Кнопка воспроизведения/паузы с пружинным эффектом и Material Symbols -->
    <button
      class="w-9 h-9 rounded-full bg-primary text-primary-on flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95 transition-all m3-press-effect cursor-pointer"
      @click="togglePlay"
    >
      <span class="material-symbols-rounded text-xl" :class="{ 'ml-0.5': !isPlaying }">
        {{ isPlaying ? 'pause' : 'play_arrow' }}
      </span>
    </button>

    <!-- Пастельная звуковая волна с интерактивной перемоткой -->
    <div
      class="flex-1 flex items-center gap-0.5 h-7 cursor-pointer"
      title="Нажмите для перемотки"
      @click.stop="seek"
    >
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
    url?: string;
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
const realDuration = ref(props.duration);
let audio: HTMLAudioElement | null = null;
let intervalId: number | null = null;

const effectiveDuration = computed(() => {
  return realDuration.value > 0 ? realDuration.value : (props.duration || 5);
});

const waveform = computed(() => {
  return props.wave && props.wave.length > 0 ? props.wave : [0.3, 0.6, 0.8, 0.4, 0.7, 0.5];
});

const activeBarIndex = computed(() => {
  if (!isPlaying.value && currentTime.value === 0) return -1;
  const ratio = currentTime.value / Math.max(effectiveDuration.value, 1);
  return Math.floor(ratio * waveform.value.length);
});

const formattedTime = computed(() => {
  const total = effectiveDuration.value;
  const t = isPlaying.value ? Math.max(0, Math.ceil(total - currentTime.value)) : total;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
});

function initAudio() {
  if (!props.url) return;
  if (!audio) {
    audio = new Audio(props.url);
    audio.addEventListener('timeupdate', () => {
      if (audio) {
        currentTime.value = audio.currentTime;
      }
    });
    audio.addEventListener('loadedmetadata', () => {
      if (audio && !isNaN(audio.duration) && isFinite(audio.duration)) {
        realDuration.value = audio.duration;
      }
    });
    audio.addEventListener('ended', () => {
      isPlaying.value = false;
      currentTime.value = 0;
    });
    audio.addEventListener('error', (e) => {
      console.warn('Audio playback error, falling back to timer simulation:', e);
      pause();
    });
  }
}

function togglePlay() {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

function play() {
  if (props.url) {
    initAudio();
    if (audio) {
      audio.play().then(() => {
        isPlaying.value = true;
      }).catch((err) => {
        console.warn('Audio play error, falling back to timer simulation:', err);
        startTimerSimulation();
      });
      return;
    }
  }
  startTimerSimulation();
}

function startTimerSimulation() {
  isPlaying.value = true;
  if (intervalId) clearInterval(intervalId);
  intervalId = window.setInterval(() => {
    currentTime.value += 0.2;
    if (currentTime.value >= effectiveDuration.value) {
      pause();
      currentTime.value = 0;
    }
  }, 200);
}

function pause() {
  isPlaying.value = false;
  if (audio) {
    audio.pause();
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function seek(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const newTime = ratio * effectiveDuration.value;
  currentTime.value = newTime;
  if (audio && !isNaN(audio.duration) && isFinite(audio.duration)) {
    audio.currentTime = ratio * audio.duration;
  }
}

onUnmounted(() => {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>
