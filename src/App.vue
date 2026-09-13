<template>
  <div class="min-h-screen bg-surface text-surface-on antialiased selection:bg-primary-container selection:text-primary-on">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Глобальные уведомления -->
    <ToastContainer />

    <!-- Мастер онбординга и настройки профиля -->
    <OnboardingModal
      v-model="authStore.showOnboarding"
      :initial-step="authStore.onboardingStep"
    />

    <!-- Модальное окно входа и регистрации -->
    <AuthModal
      v-model="authStore.showAuthModal"
      :initial-mode="authStore.authModalMode"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import OnboardingModal from '@/components/auth/OnboardingModal.vue';
import AuthModal from '@/components/auth/AuthModal.vue';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';

const themeStore = useThemeStore();
const authStore = useAuthStore();

onMounted(async () => {
  themeStore.applyTheme();
  await authStore.initAuth();

  // Автоматическая проверка обновлений PWA Service Worker и очистка устаревшего кэша
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      
      // Немедленный запрос обновлений на сервере
      await reg.update();

      // Если новый сервис-воркер уже ждет активации — активируем его без задержек
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[PWA] Доступно обновление приложения. Новая версия загружена в кэш.');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch (swErr) {
      console.warn('[PWA] Service Worker update check failed:', swErr);
    }

    // Проверка обновлений при возврате пользователя на вкладку приложения
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {});
      }
    });
  }
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
