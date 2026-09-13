<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-4xl bg-surface-lowest border border-surface-high/60 p-6 shadow-elevation-4 flex flex-col items-center">
        <!-- Шапка -->
        <div class="w-full flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-surface-on">Выбор миниатюры</h3>
          <button
            type="button"
            aria-label="Закрыть"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
            @click="$emit('update:modelValue', false)"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- Область кадрирования с круглой маской -->
        <div
          ref="cropContainer"
          class="relative w-72 h-72 rounded-3xl overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center shadow-inner"
          @mousedown="startDrag"
          @touchstart="startDragTouch"
          @wheel.prevent="onWheel"
        >
          <!-- Само фото с вычисленными размерами coverScale и свободным зумом -->
          <img
            ref="imgElement"
            :src="imageSrc"
            alt="Кроп"
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

          <!-- Круглая маска видоискателя как в ВК / Telegram (SVG с вырезанным кругом) -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 288">
            <defs>
              <mask id="avatar-circle-mask">
                <rect width="288" height="288" fill="white" />
                <circle cx="144" cy="144" r="130" fill="black" />
              </mask>
            </defs>
            <!-- Внешнее затемнение 65% -->
            <rect width="288" height="288" fill="rgba(0, 0, 0, 0.65)" mask="url(#avatar-circle-mask)" />
            <!-- Ультратонкий направляющий пунктир квадрата видоискателя 260x260 -->
            <rect x="14" y="14" width="260" height="260" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" stroke-dasharray="4 4" />
            <!-- Ровная белая окантовка круга 260px -->
            <circle cx="144" cy="144" r="130" fill="none" stroke="rgba(255, 255, 255, 0.9)" stroke-width="2" />
            <!-- Симметричные аккуратные угловые скобки (L-markers) по углам видоискателя -->
            <path d="M 14 34 L 14 14 L 34 14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 254 14 L 274 14 L 274 34" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 14 254 L 14 274 L 34 274" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 254 274 L 274 274 L 274 254" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- Ползунок приближения (Zoom Slider) -->
        <div class="w-72 flex items-center gap-3 mt-4 text-surface-onVariant">
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Отдалить"
            @click="zoom = Math.max(0.1, +(zoom - 0.1).toFixed(2))"
          >
            <span class="material-symbols-rounded text-lg">zoom_out</span>
          </button>
          <input
            v-model.number="zoom"
            type="range"
            min="0.1"
            max="3"
            step="0.02"
            aria-label="Масштаб миниатюры"
            class="flex-1 accent-primary h-1.5 bg-surface-high rounded-lg cursor-pointer"
          />
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Приблизить"
            @click="zoom = Math.min(3, +(zoom + 0.1).toFixed(2))"
          >
            <span class="material-symbols-rounded text-lg">zoom_in</span>
          </button>
        </div>

        <!-- Кнопки управления внизу -->
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
            class="px-6 py-2.5 rounded-full bg-primary text-primary-on font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            @click="cropAndSave"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { processCanvasCrop, type CropResult } from '@/lib/cropperEngine';

const props = defineProps<{
  modelValue: boolean;
  imageSrc: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'crop-complete', result: CropResult): void;
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

function updateImageDimensions(width: number, height: number) {
  if (!width || !height) return;
  naturalWidth.value = width;
  naturalHeight.value = height;
  // Базовый масштаб: вписываем изображение в 260px (fitScale)
  const fitScale = Math.min(260 / width, 260 / height);
  baseScale.value = fitScale;
  // При открытии устанавливаем zoom так, чтобы фото сразу покрывало видоискатель
  const initialZoom = Math.max(1.0, Math.max(260 / width, 260 / height) / fitScale);
  zoom.value = Number(initialZoom.toFixed(2));
}

const displayedWidth = computed(() => {
  if (!naturalWidth.value) return 260 * zoom.value;
  return Math.round(naturalWidth.value * baseScale.value * zoom.value);
});

const displayedHeight = computed(() => {
  if (!naturalHeight.value) return 260 * zoom.value;
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
  zoom.value = Math.min(Math.max(0.1, +(zoom.value + delta).toFixed(2)), 3.0);
}

async function cropAndSave() {
  if (!cropContainer.value || !imgElement.value) return;
  const containerRect = cropContainer.value.getBoundingClientRect();
  const imgRect = imgElement.value.getBoundingClientRect();

  try {
    const result = await processCanvasCrop(
      imgElement.value || props.imageSrc,
      { offsetX: position.x, offsetY: position.y, zoom: zoom.value },
      containerRect,
      imgRect
    );
    emit('crop-complete', result);
    emit('update:modelValue', false);
  } catch (err) {
    console.error('cropAndSave error:', err);
  }
}
</script>
