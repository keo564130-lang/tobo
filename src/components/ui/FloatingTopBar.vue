<template>
  <header class="fixed top-3 left-0 right-0 z-40 px-4 max-w-2xl mx-auto pointer-events-none">
    <div class="pointer-events-auto flex items-center justify-between px-4 py-2.5 rounded-3xl bg-surface-lowest/90 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 transition-all duration-300">
      <!-- Левая часть: Логотип или контекстная кнопка назад/заголовок -->
      <div class="flex items-center gap-3">
        <slot name="leading">
          <div class="flex items-center gap-2">
            <span class="font-extrabold tracking-tight text-xl text-primary font-mono select-none">tobo</span>
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary" />
          </div>
        </slot>
      </div>

      <!-- Центральная часть: слот для кастомного контента/поиска -->
      <div class="flex-1 px-3 flex items-center justify-center">
        <slot name="center" />
      </div>

      <!-- Правая часть: Уведомления, действия, кнопка создания -->
      <div class="flex items-center gap-2">
        <slot name="trailing" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// Floating Top Bar Island according to Material 3 Expressive spec
</script>
