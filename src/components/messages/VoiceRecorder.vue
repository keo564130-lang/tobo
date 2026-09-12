<template>
  <div class="flex items-center gap-3 w-full bg-surface-low px-4 py-2 rounded-full border border-primary/30 animate-pulse-subtle">
    <!-- Индикатор записи -->
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
      <span class="text-xs font-mono font-bold text-rose-500">
        {{ formattedDuration }}
      </span>
    </div>

    <!-- Живой визуализатор уровня микрофона -->
    <div class="flex-1 flex items-center justify-center gap-1 h-6 overflow-hidden">
      <div
        v-for="idx in 18"
        :key="idx"
        class="w-1 rounded-full bg-primary transition-all duration-100"
        :style="{
          height: `${Math.max(liveLevel * 20 * (Math.sin(idx) * 0.5 + 0.5), 4)}px`
        }"
      />
    </div>

    <!-- Кнопка отмены -->
    <button
      class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant/60 hover:text-rose-500 hover:bg-surface-high transition-colors"
      title="Отменить запись"
      @click="cancelRecording"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>

    <!-- Кнопка отправки голосового -->
    <button
      class="w-9 h-9 rounded-full bg-primary text-primary-on flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all m3-press-effect"
      title="Отправить голосовое сообщение"
      @click="stopAndSend"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { VoiceRecorder, type VoiceRecordingResult } from '@/lib/audioRecorder';

const emit = defineEmits<{
  (e: 'send', result: VoiceRecordingResult): void;
  (e: 'cancel'): void;
}>();

const recorder = new VoiceRecorder();
const liveLevel = ref(0.2);
const secondsRecorded = ref(0);
let timerId: number | null = null;

const formattedDuration = computed(() => {
  const m = Math.floor(secondsRecorded.value / 60);
  const s = secondsRecorded.value % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
});

onMounted(async () => {
  try {
    await recorder.start((level) => {
      liveLevel.value = level;
    });
    timerId = window.setInterval(() => {
      secondsRecorded.value++;
    }, 1000);
  } catch (err) {
    console.error('Ошибка доступа к микрофону:', err);
    emit('cancel');
  }
});

async function stopAndSend() {
  if (timerId) clearInterval(timerId);
  try {
    const result = await recorder.stop();
    emit('send', result);
  } catch {
    emit('cancel');
  }
}

function cancelRecording() {
  if (timerId) clearInterval(timerId);
  recorder.cancel();
  emit('cancel');
}

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
  recorder.cancel();
});
</script>
