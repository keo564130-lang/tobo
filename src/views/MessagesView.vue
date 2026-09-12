<template>
  <div class="min-h-screen pb-28 pt-20 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок сообщений -->
    <FloatingTopBar>
      <template #leading>
        <div class="flex items-center gap-2">
          <span class="font-sans font-black tracking-tight text-2xl leading-none text-primary select-none -translate-y-[1px]">tobo</span>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer leading-normal">
            Чаты
          </span>
        </div>
      </template>

      <template #center>
        <!-- Быстрый поиск в шапке на десктопе -->
        <div class="relative w-full max-w-xs hidden sm:block">
          <input
            id="desktop_chat_search"
            name="search"
            v-model="searchQuery"
            type="text"
            placeholder="Поиск диалогов..."
            aria-label="Поиск диалогов"
            class="w-full pl-8 pr-3 py-1.5 rounded-full bg-surface-low border border-surface-high/60 text-xs text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span class="material-symbols-rounded text-sm absolute left-2.5 top-2 text-surface-onVariant/60">
            search
          </span>
        </div>
      </template>

      <template #trailing>
        <!-- Кнопка поиска на мобильных -->
        <button
          type="button"
          class="sm:hidden w-9 h-9 rounded-full flex items-center justify-center transition-colors m3-press-effect cursor-pointer focus:outline-none"
          :class="showMobileSearch ? 'bg-primary-container text-primary-onContainer' : 'text-surface-onVariant hover:bg-surface-high/60'"
          @click="toggleMobileSearch($event)"
        >
          <span class="material-symbols-rounded text-xl">search</span>
        </button>

        <!-- Меню "+" (Создать диалог, группу, канал) -->
        <div class="relative">
          <M3Button
            variant="filled"
            size="sm"
            @click="showCreateMenu = !showCreateMenu"
          >
            <span class="material-symbols-rounded text-lg">add</span>
          </M3Button>

          <!-- Выпадающее меню типов диалога -->
          <div
            v-if="showCreateMenu"
            class="absolute right-0 top-11 w-56 rounded-3xl bg-surface-lowest shadow-elevation-3 border border-surface-high p-1.5 z-50 flex flex-col gap-1 text-xs font-medium text-surface-on"
          >
            <button
              class="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="openCreate('direct')"
            >
              <span class="material-symbols-rounded text-lg text-primary">person</span>
              <span>Создать личный диалог</span>
            </button>
            <button
              class="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="openCreate('group')"
            >
              <span class="material-symbols-rounded text-lg text-secondary">group</span>
              <span>Создать группу</span>
            </button>
            <button
              class="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="openCreate('channel')"
            >
              <span class="material-symbols-rounded text-lg text-tertiary">campaign</span>
              <span>Создать канал</span>
            </button>
          </div>
        </div>
      </template>
    </FloatingTopBar>

    <!-- Поле поиска на мобильных при раскрытии -->
    <div v-if="showMobileSearch" class="mb-3 sm:hidden">
      <input
        id="mobile_chat_search"
        name="search"
        v-model="searchQuery"
        type="text"
        placeholder="Поиск сообщений и контактов..."
        aria-label="Поиск сообщений и контактов"
        class="w-full px-4 py-2.5 rounded-2xl bg-surface-lowest border border-surface-high text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
      />
    </div>

    <!-- Фильтры категорий диалогов (M3 Expressive Filter Chips) -->
    <div class="flex items-center gap-2 overflow-x-auto py-1 mb-4 no-scrollbar">
      <button
        v-for="filter in filterOptions"
        :key="filter.key"
        class="px-4 py-1.5 rounded-full text-xs font-medium transition-all m3-press-effect shrink-0 select-none cursor-pointer"
        :class="[
          activeFilter === filter.key
            ? 'bg-primary text-primary-on font-semibold shadow-xs'
            : 'bg-surface-lowest text-surface-onVariant border border-surface-high/60 hover:bg-surface-high/50'
        ]"
        @click="activeFilter = filter.key"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Список диалогов -->
    <div class="flex flex-col gap-2">
      <div
        v-for="chat in filteredChats"
        :key="chat.id"
        class="flex items-center gap-3.5 p-3.5 rounded-3xl bg-surface-lowest border border-surface-high/60 hover:border-primary/40 shadow-xs hover:shadow-elevation-1 transition-all duration-200 cursor-pointer m3-press-effect"
        @click="openChat(chat.id)"
      >
        <!-- Аватар чата -->
        <div class="relative">
          <M3Avatar
            :src="chat.avatar_url"
            :name="chat.title"
            size="lg"
            :is-online="chat.type === 'direct'"
            :show-online="chat.type === 'direct'"
          />
        </div>

        <!-- Информация о чате -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span v-if="chat.type === 'channel'" class="material-symbols-rounded text-primary text-sm shrink-0" title="Канал">campaign</span>
              <span v-else-if="chat.type === 'group'" class="material-symbols-rounded text-secondary text-sm shrink-0" title="Группа">group</span>
              <span v-else-if="chat.type === 'saved'" class="material-symbols-rounded text-secondary text-sm shrink-0" title="Избранное">bookmark</span>
              <span class="font-bold text-surface-on text-sm truncate">
                {{ chat.title }}
              </span>
              <!-- Метка официального канала -->
              <span
                v-if="chat.title === 'Канал Разработки'"
                class="material-symbols-rounded text-primary text-base select-none shrink-0"
                title="Официальный канал"
              >
                verified
              </span>
            </div>
            <!-- Время последнего сообщения -->
            <span class="text-[11px] text-surface-onVariant/60 font-mono shrink-0 ml-2">
              {{ formatChatTime(chat.last_message?.created_at || chat.created_at) }}
            </span>
          </div>

          <!-- Превью последнего сообщения -->
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-surface-onVariant/80 truncate leading-relaxed">
              <span v-if="chat.last_message?.voice_wave || chat.last_message?.voice_url" class="text-primary font-medium flex items-center gap-1">
                <span class="material-symbols-rounded text-xs">mic</span>
                <span>Голосовое сообщение ({{ chat.last_message.voice_duration || 5 }} с)</span>
              </span>
              <span v-else-if="chat.last_message?.forwarded_post_id" class="text-secondary font-medium flex items-center gap-1.5">
                <span class="material-symbols-rounded text-[11px] text-surface-onVariant/70">feed</span>
                <span>Сохранённый пост из Ленты</span>
              </span>
              <span v-else>
                {{ chat.last_message?.content || 'Нет сообщений' }}
              </span>
            </p>

            <!-- Счетчик непрочитанных -->
            <span
              v-if="chat.unread_count && chat.unread_count > 0"
              class="px-2 py-0.5 rounded-full bg-primary text-primary-on font-bold text-[10px] shrink-0 shadow-xs font-mono"
            >
              {{ chat.unread_count }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно создания диалога -->
    <CreateChatModal
      v-model="showCreateModal"
      :type="createChatType"
    />

    <!-- Полноэкранный экран диалога (ChatRoom) -->
    <ChatRoom
      v-if="chatStore.activeChatId"
      :chat-id="chatStore.activeChatId"
    />

    <!-- Нижний плавающий островок навигации -->
    <FloatingBottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ChatType } from '@/types/database';
import FloatingTopBar from '@/components/ui/FloatingTopBar.vue';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import M3Button from '@/components/ui/M3Button.vue';
import ChatRoom from '@/components/messages/ChatRoom.vue';
import CreateChatModal from '@/components/messages/CreateChatModal.vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

const searchQuery = ref('');
const showMobileSearch = ref(false);
const showCreateMenu = ref(false);
const showCreateModal = ref(false);
const createChatType = ref<ChatType>('direct');

const activeFilter = ref<'all' | 'direct' | 'group' | 'channel'>('all');

const filterOptions = [
  { key: 'all' as const, label: 'Все' },
  { key: 'direct' as const, label: 'Чаты' },
  { key: 'group' as const, label: 'Группы' },
  { key: 'channel' as const, label: 'Каналы' }
];

const filteredChats = computed(() => {
  return chatStore.chats.filter(chat => {
    // Фильтр по категории
    if (activeFilter.value !== 'all') {
      if (activeFilter.value === 'direct' && chat.type !== 'direct' && chat.type !== 'saved') return false;
      if (activeFilter.value === 'group' && chat.type !== 'group') return false;
      if (activeFilter.value === 'channel' && chat.type !== 'channel') return false;
    }

    // Фильтр по поисковой строке
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchTitle = chat.title.toLowerCase().includes(q);
      const matchLastMsg = chat.last_message?.content?.toLowerCase().includes(q);
      return matchTitle || matchLastMsg;
    }

    return true;
  });
});

function toggleMobileSearch(event?: MouseEvent) {
  showMobileSearch.value = !showMobileSearch.value;
  (event?.currentTarget as HTMLElement)?.blur();
}

function openChat(chatId: string) {
  chatStore.selectChat(chatId);
}

function openCreate(type: ChatType) {
  createChatType.value = type;
  showCreateMenu.value = false;
  showCreateModal.value = true;
}

function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
</script>
