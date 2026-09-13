<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div class="w-full max-w-lg rounded-4xl bg-surface-lowest border border-surface-high/60 p-4 sm:p-6 shadow-elevation-4 flex flex-col items-center">
        <!-- Шапка модалки -->
        <div class="w-full flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-primary text-xl">crop_landscape</span>
            <h3 class="text-base font-bold text-surface-on">Кадрирование обложки</h3>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
            @click="$emit('update:modelValue', false)"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- Область кадрирования с прямоугольным видоискателем (16:6) -->
        <div
          ref="cropContainer"
          class="relative w-full max-w-[360px] aspect-[16/6] rounded-2xl overflow-hidden bg-[#1A1C1E] select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center shadow-inner"
          @mousedown="startDrag"
          @touchstart="startDragTouch"
          @wheel.prevent="onWheel"
        >
          <!-- Картинка обложки -->
          <img
            ref="imgElement"
            :src="imageSrc"
            alt="Кадрируемая обложка"
            class="absolute max-w-none pointer-events-none select-none"
            :class="{ 'transition-transform duration-75': !isDragging }"
            :style="{
              width: `${displayedWidth}px`,
              height: `${displayedHeight}px`,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
            }"
            @load="onImageLoad"
          />

          <!-- Белая рамка видоискателя и легкая внешняя тень (overlay) -->
          <div class="absolute inset-0 rounded-2xl border-2 border-white/90 ring-4 ring-black/40 pointer-events-none" />

          <!-- Легкие белые угловые маркеры видоискателя (L-markers) -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 135" preserveAspectRatio="none">
            <path d="M 4 20 L 4 4 L 20 4" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 340 4 L 356 4 L 356 20" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 4 115 L 4 131 L 20 131" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 340 131 L 356 131 L 356 115" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- Ползунок масштабирования зума от 0.2x до 4.0x -->
        <div class="w-full max-w-[360px] flex items-center gap-3 mt-4 text-surface-onVariant">
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Отдалить"
            @click="zoom = Math.max(0.2, +(zoom - 0.1).toFixed(2))"
          >
            <span class="material-symbols-rounded text-lg">zoom_out</span>
          </button>
          <input
            v-model.number="zoom"
            type="range"
            min="0.2"
            max="4.0"
            step="0.05"
            aria-label="Масштаб обложки"
            class="flex-1 accent-primary h-1.5 bg-surface-high rounded-lg cursor-pointer"
          />
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Приблизить"
            @click="zoom = Math.min(4.0, +(zoom + 0.1).toFixed(2))"
          >
            <span class="material-symbols-rounded text-lg">zoom_in</span>
          </button>
        </div>

        <!-- Кнопки действий -->
        <div class="w-full flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-surface-high/40">
          <button
            type="button"
            class="px-5 py-2.5 rounded-full text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors cursor-pointer"
            @click="$emit('update:modelValue', false)"
          >
            Отмена
          </button>
          <button
            type="button"
            class="px-6 py-2.5 rounded-full bg-primary text-primary-on font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            @click="cropAndSave"
          >
            <span class="material-symbols-rounded text-base">check</span>
            <span>Применить обложку</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onUnmounted } from 'vue';

export interface CoverCropResult {
  base64: string;
  blob: Blob;
}

const props = defineProps<{
  modelValue: boolean;
  imageSrc: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'crop-complete', result: CoverCropResult): void;
}>();

const cropContainer = ref<HTMLDivElement | null>(null);
const imgElement = ref<HTMLImageElement | null>(null);

const naturalWidth = ref(0);
const naturalHeight = ref(0);
const baseScale = ref(1);
const zoom = ref(1.0);
const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });

const VIEWFINDER_WIDTH = 360;
const VIEWFINDER_HEIGHT = 135;
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 450;

const containerWidth = ref(VIEWFINDER_WIDTH);
const containerHeight = ref(VIEWFINDER_HEIGHT);

function measureContainer() {
  if (cropContainer.value) {
    const rect = cropContainer.value.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      containerWidth.value = rect.width;
      containerHeight.value = rect.height;
    }
  }
}

function updateImageDimensions(width: number, height: number) {
  if (!width || !height) return;
  naturalWidth.value = width;
  naturalHeight.value = height;
  measureContainer();
  const cw = containerWidth.value || VIEWFINDER_WIDTH;
  const ch = containerHeight.value || VIEWFINDER_HEIGHT;
  // Покрываем видоискатель (16:6)
  const coverScale = Math.max(cw / width, ch / height);
  baseScale.value = coverScale;
}

const displayedWidth = computed(() => {
  if (!naturalWidth.value) return containerWidth.value * zoom.value;
  return Math.round(naturalWidth.value * baseScale.value * zoom.value);
});

const displayedHeight = computed(() => {
  if (!naturalHeight.value) return containerHeight.value * zoom.value;
  return Math.round(naturalHeight.value * baseScale.value * zoom.value);
});

function onImageLoad(e?: Event) {
  const target = (e?.target as HTMLImageElement) || imgElement.value;
  if (!target) return;
  updateImageDimensions(target.naturalWidth, target.naturalHeight);
}

watch(
  () => [props.modelValue, props.imageSrc],
  async ([isOpen]) => {
    if (isOpen && props.imageSrc) {
      zoom.value = 1.0;
      position.x = 0;
      position.y = 0;

      await nextTick();
      measureContainer();

      const img = new Image();
      img.onload = () => {
        updateImageDimensions(img.naturalWidth, img.naturalHeight);
      };
      img.src = props.imageSrc;
      window.addEventListener('resize', measureContainer);
    } else {
      window.removeEventListener('resize', measureContainer);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('resize', measureContainer);
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchmove', onDragTouch);
  window.removeEventListener('touchend', stopDragTouch);
});

function startDrag(e: MouseEvent) {
  isDragging.value = true;
  dragStart.x = e.clientX - position.x;
  dragStart.y = e.clientY - position.y;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  position.x = e.clientX - dragStart.x;
  position.y = e.clientY - dragStart.y;
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

function startDragTouch(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  isDragging.value = true;
  dragStart.x = e.touches[0].clientX - position.x;
  dragStart.y = e.touches[0].clientY - position.y;
  window.addEventListener('touchmove', onDragTouch, { passive: false });
  window.addEventListener('touchend', stopDragTouch);
}

function onDragTouch(e: TouchEvent) {
  if (!isDragging.value || e.touches.length !== 1) return;
  e.preventDefault();
  position.x = e.touches[0].clientX - dragStart.x;
  position.y = e.touches[0].clientY - dragStart.y;
}

function stopDragTouch() {
  isDragging.value = false;
  window.removeEventListener('touchmove', onDragTouch);
  window.removeEventListener('touchend', stopDragTouch);
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  zoom.value = Math.min(Math.max(0.2, +(zoom.value + delta).toFixed(2)), 4.0);
}

async function cropAndSave() {
  if (!cropContainer.value || !imgElement.value) return;

  const containerRect = cropContainer.value.getBoundingClientRect();
  const imgRect = imgElement.value.getBoundingClientRect();

  if (containerRect.width <= 0 || imgRect.width <= 0) return;

  // КРИТИЧЕСКИ ВАЖНО: ЕДИНЫЙ ИЗОТРОПНЫЙ МАСШТАБ.
  // Использование TARGET_WIDTH / containerRect.width гарантирует 0% искажения по X и Y,
  // так как соотношение сторон 16:6 (8:3) строго выдержано контейнером и выходным Canvas.
  const scale = TARGET_WIDTH / containerRect.width;

  const drawX = (imgRect.left - containerRect.left) * scale;
  const drawY = (imgRect.top - containerRect.top) * scale;
  const drawW = imgRect.width * scale;
  const drawH = imgRect.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH; // 1200
  canvas.height = TARGET_HEIGHT; // 450
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1A1C1E';
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgElement.value, drawX, drawY, drawW, drawH);

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const base64 = canvas.toDataURL('image/jpeg', 0.92);
      emit('crop-complete', { base64, blob });
      emit('update:modelValue', false);
    },
    'image/jpeg',
    0.92
  );
}
</script>
