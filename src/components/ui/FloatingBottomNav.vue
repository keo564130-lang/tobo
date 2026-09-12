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
          <M3Icon
            name="dynamic_feed"
            :filled="currentTab === 'feed'"
            class="transition-transform duration-300"
            :class="{ 'scale-110': currentTab === 'feed' }"
          />
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
          <M3Icon
            name="chat"
            :filled="currentTab === 'messages'"
            class="transition-transform duration-300"
            :class="{ 'scale-110': currentTab === 'messages' }"
          />
          <!-- Бейдж непрочитанных сообщений -->
          <span
            v-if="unreadCount > 0"
            class="absolute -top-1 -right-2 px-1.5 py-0.2 min-w-4 text-[10px] font-bold rounded-full bg-primary text-primary-on flex items-center justify-center shadow-xs font-mono"
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
          <M3Icon
            name="account_circle"
            :filled="currentTab === 'profile'"
            class="transition-transform duration-300"
            :class="{ 'scale-110': currentTab === 'profile' }"
          />
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
import M3Icon from '@/components/ui/M3Icon.vue';

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
