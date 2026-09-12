<template>
  <nav class="fixed bottom-4 left-0 right-0 z-40 px-5 max-w-md mx-auto pointer-events-none">
    <div class="pointer-events-auto relative flex items-center justify-around p-1.5 rounded-full bg-surface-lowest/90 backdrop-blur-xl shadow-floating-dock border border-surface-high/60 transition-all duration-300">
      
      <!-- Вкладка 1: Лента -->
      <router-link
        to="/feed"
        class="relative z-10 flex-1 flex flex-col items-center py-2 px-3 rounded-full transition-all duration-300 m3-press-effect"
        :class="currentTab === 'feed' ? 'text-primary-onContainer font-bold' : 'text-surface-onVariant/70 hover:text-surface-on'"
      >
        <div class="relative flex items-center justify-center">
          <svg class="w-6 h-6 transition-transform duration-300" :class="{ 'scale-110': currentTab === 'feed' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <span class="text-[11px] mt-0.5 tracking-tight font-medium">Лента</span>
      </router-link>

      <!-- Вкладка 2: Сообщения -->
      <router-link
        to="/messages"
        class="relative z-10 flex-1 flex flex-col items-center py-2 px-3 rounded-full transition-all duration-300 m3-press-effect"
        :class="currentTab === 'messages' ? 'text-primary-onContainer font-bold' : 'text-surface-onVariant/70 hover:text-surface-on'"
      >
        <div class="relative flex items-center justify-center">
          <svg class="w-6 h-6 transition-transform duration-300" :class="{ 'scale-110': currentTab === 'messages' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <!-- Бейдж непрочитанных сообщений -->
          <span
            v-if="unreadCount > 0"
            class="absolute -top-1 -right-2 px-1.5 py-0.2 min-w-4 text-[10px] font-bold rounded-full bg-primary text-primary-on flex items-center justify-center shadow-xs"
          >
            {{ unreadCount }}
          </span>
        </div>
        <span class="text-[11px] mt-0.5 tracking-tight font-medium">Сообщения</span>
      </router-link>

      <!-- Вкладка 3: Профиль и другое -->
      <router-link
        to="/profile"
        class="relative z-10 flex-1 flex flex-col items-center py-2 px-3 rounded-full transition-all duration-300 m3-press-effect"
        :class="currentTab === 'profile' ? 'text-primary-onContainer font-bold' : 'text-surface-onVariant/70 hover:text-surface-on'"
      >
        <div class="relative flex items-center justify-center">
          <svg class="w-6 h-6 transition-transform duration-300" :class="{ 'scale-110': currentTab === 'profile' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span class="text-[11px] mt-0.5 tracking-tight font-medium">Профиль</span>
      </router-link>

      <!-- Expressive Morphing Pill Indicator (плавающий фон активной вкладки) -->
      <div
        class="absolute top-1.5 bottom-1.5 rounded-full bg-primary-container/80 transition-all duration-300 spring-transition -z-0"
        :style="indicatorStyle"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useChatStore } from '@/stores/chat';

const route = useRoute();
const chatStore = useChatStore();

const currentTab = computed(() => {
  if (route.path.startsWith('/messages')) return 'messages';
  if (route.path.startsWith('/profile') || route.path.startsWith('/settings')) return 'profile';
  return 'feed';
});

const unreadCount = computed(() => {
  return chatStore.chats.reduce((sum, c) => sum + (c.unread_count || 0), 0);
});

const indicatorStyle = computed(() => {
  const widthPercent = 32.2;
  let leftPercent = 0.8;
  if (currentTab.value === 'messages') {
    leftPercent = 33.9;
  } else if (currentTab.value === 'profile') {
    leftPercent = 67.0;
  }
  return {
    width: `${widthPercent}%`,
    left: `${leftPercent}%`
  };
});
</script>
