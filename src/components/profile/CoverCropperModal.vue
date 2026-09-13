<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div class="w-full max-w-lg rounded-4xl bg-surface-lowest border border-surface-high/60 p-6 shadow-elevation-4 flex flex-col items-center">
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

        <!-- Область кадрирования с прямоугольным видоискателем (8:3) -->
        <div
          ref="cropContainer"
          class="relative w-full max-w-[392px] h-[167px] rounded-3xl overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center shadow-inner"
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

          <!-- Прямоугольная SVG маска видоискателя (360x135, rx=16) -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 392 167">
            <defs>
              <mask id="cover-viewfinder-mask">
                <rect width="392" height="167" fill="white" />
                <rect x="16" y="16" width="360" height="135" rx="16" ry="16" fill="black" />
              </mask>
            </defs>
            <!-- Затемнение 65% снаружи рамки -->
            <rect width="392" height="167" fill="rgba(0, 0, 0, 0.65)" mask="url(#cover-viewfinder-mask)" />
            <!-- Ультратонкий направляющий пунктир -->
            <rect x="16" y="16" width="360" height="135" rx="16" ry="16" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" stroke-dasharray="4 4" />
            <!-- Белая окантовка видоискателя 2px -->
            <rect x="16" y="16" width="360" height="135" rx="16" ry="16" fill="none" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2" />
            <!-- Аккуратные угловые L-маркеры -->
            <path d="M 16 36 L 16 16 L 36 16" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 356 16 L 376 16 L 376 36" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 16 131 L 16 151 L 36 151" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 356 151 L 376 151 L 376 131" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- Ползунок масштабирования зума от 0.2x до 4.0x -->
        <div class="w-full max-w-[392px] flex items-center gap-3 mt-4 text-surface-onVariant">
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
import { ref, reactive, computed, watch } from 'vue';

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

function updateImageDimensions(width: number, height: number) {
  if (!width || !height) return;
  naturalWidth.value = width;
  naturalHeight.value = height;
  // Покрываем видоискатель 360x135
  const coverScale = Math.max(VIEWFINDER_WIDTH / width, VIEWFINDER_HEIGHT / height);
  baseScale.value = coverScale;
}

const displayedWidth = computed(() => {
  if (!naturalWidth.value) return VIEWFINDER_WIDTH * zoom.value;
  return Math.round(naturalWidth.value * baseScale.value * zoom.value);
});

const displayedHeight = computed(() => {
  if (!naturalHeight.value) return VIEWFINDER_HEIGHT * zoom.value;
  return Math.round(naturalHeight.value * baseScale.value * zoom.value);
});

function onImageLoad(e?: Event) {
  const target = (e?.target as HTMLImageElement) || imgElement.value;
  if (!target) return;
  updateImageDimensions(target.naturalWidth, target.naturalHeight);
}

watch(
  () => [props.modelValue, props.imageSrc],
  ([isOpen]) => {
    if (isOpen && props.imageSrc) {
      zoom.value = 1.0;
      position.x = 0;
      position.y = 0;

      const img = new Image();
      img.onload = () => {
        updateImageDimensions(img.naturalWidth, img.naturalHeight);
      };
      img.src = props.imageSrc;
    }
  },
  { immediate: true }
);

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
  window.addEventListener('touchmove', onDragTouch);
  window.addEventListener('touchend', stopDragTouch);
}

function onDragTouch(e: TouchEvent) {
  if (!isDragging.value || e.touches.length !== 1) return;
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

  // Видоискатель 360x135 с отступом 16px (пропорция 16:6)
  const viewfinderLeft = containerRect.left + 16;
  const viewfinderTop = containerRect.top + 16;

  // Позиция видоискателя относительно отображаемого изображения
  const cropXInDisplayed = viewfinderLeft - imgRect.left;
  const cropYInDisplayed = viewfinderTop - imgRect.top;

  // Масштаб отображаемого к натуральному размеру исходника
  const natW = imgElement.value.naturalWidth || naturalWidth.value || imgRect.width;
  const natH = imgElement.value.naturalHeight || naturalHeight.value || imgRect.height;
  const scaleRatioX = natW / imgRect.width;
  const scaleRatioY = natH / imgRect.height;

  const sourceX = cropXInDisplayed * scaleRatioX;
  const sourceY = cropYInDisplayed * scaleRatioY;
  const sourceW = VIEWFINDER_WIDTH * scaleRatioX;
  const sourceH = VIEWFINDER_HEIGHT * scaleRatioY;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    imgElement.value,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    0,
    0,
    TARGET_WIDTH,
    TARGET_HEIGHT
  );

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
