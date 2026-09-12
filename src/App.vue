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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import OnboardingModal from '@/components/auth/OnboardingModal.vue';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';

const themeStore = useThemeStore();
const authStore = useAuthStore();

onMounted(() => {
  themeStore.applyTheme();
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
