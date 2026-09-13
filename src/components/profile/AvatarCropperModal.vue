<template>
  <div v-if="modelValue" class="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
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
        class="relative w-72 h-72 rounded-3xl overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
        @mousedown="startDrag"
        @touchstart="startDragTouch"
        @wheel.prevent="onWheel"
      >
        <!-- Само фото, которое можно масштабировать и двигать -->
        <img
          ref="imgElement"
          :src="imageSrc"
          alt="Кроп"
          class="absolute max-w-none pointer-events-none transition-transform duration-75"
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }"
        />

        <!-- Круглая маска видоискателя как в ВК (SVG с вырезанным кругом) -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 288">
          <defs>
            <mask id="circle-mask">
              <rect width="288" height="288" fill="white" />
              <circle cx="144" cy="144" r="130" fill="black" />
            </mask>
          </defs>
          <!-- Внешнее затемнение -->
          <rect width="288" height="288" fill="rgba(0, 0, 0, 0.65)" mask="url(#circle-mask)" />
          <!-- Белая окантовка круга -->
          <circle cx="144" cy="144" r="130" fill="none" stroke="rgba(255, 255, 255, 0.85)" stroke-width="1.5" />
          <!-- Угловые метки квадрата -->
          <rect x="14" y="14" width="260" height="260" fill="none" stroke="rgba(255, 255, 255, 0.4)" stroke-dasharray="4 4" stroke-width="1" />
          <rect x="12" y="12" width="6" height="6" fill="white" />
          <rect x="270" y="12" width="6" height="6" fill="white" />
          <rect x="12" y="270" width="6" height="6" fill="white" />
          <rect x="270" y="270" width="6" height="6" fill="white" />
        </svg>
      </div>

      <!-- Ползунок приближения (Zoom Slider) -->
      <div class="w-72 flex items-center gap-3 mt-4 text-surface-onVariant">
        <button
          type="button"
          class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
          title="Отдалить"
          @click="zoom = Math.max(1, +(zoom - 0.2).toFixed(2))"
        >
          <span class="material-symbols-rounded text-lg">zoom_out</span>
        </button>
        <input
          v-model.number="zoom"
          type="range"
          min="1"
          max="3"
          step="0.05"
          aria-label="Масштаб миниатюры"
          class="flex-1 accent-primary h-1.5 bg-surface-high rounded-lg cursor-pointer"
        />
        <button
          type="button"
          class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
          title="Приблизить"
          @click="zoom = Math.min(3, +(zoom + 0.2).toFixed(2))"
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
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
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

const zoom = ref(1);
const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });

watch(
  () => [props.modelValue, props.imageSrc],
  ([isOpen]) => {
    if (isOpen) {
      zoom.value = 1;
      position.x = 0;
      position.y = 0;
    }
  }
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
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoom.value = Math.min(Math.max(1, +(zoom.value + delta).toFixed(2)), 3);
}

async function cropAndSave() {
  if (!cropContainer.value || !imgElement.value) return;
  const containerRect = cropContainer.value.getBoundingClientRect();
  const imgRect = imgElement.value.getBoundingClientRect();

  try {
    const result = await processCanvasCrop(
      props.imageSrc,
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
