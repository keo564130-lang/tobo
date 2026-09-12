<template>
  <div class="fixed inset-0 z-50 bg-surface flex flex-col">
    <!-- Верхний плавающий островок чата (Floating Top Bar Island) -->
    <header class="fixed top-3 left-0 right-0 z-40 px-4 max-w-2xl mx-auto pointer-events-none">
      <div class="pointer-events-auto flex items-center justify-between px-3 py-2 rounded-3xl bg-surface-lowest/90 backdrop-blur-xl shadow-floating-bar border border-surface-high/50">
        <!-- Кнопка Назад и Интерактивная зона заголовка (клик открывает карточку сущности) -->
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors shrink-0 cursor-pointer m3-press-effect"
            @click="goBack"
          >
            <span class="material-symbols-rounded text-2xl">arrow_back</span>
          </button>

          <!-- КЛИК ПО АВАТАРУ / ИМЕНИ ОТКРЫВАЕТ КАРТОЧКУ СУЩНОСТИ -->
          <div
            class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-85 transition-opacity py-1 px-1 rounded-2xl"
            @click="openChatProfile"
          >
            <M3Avatar
              :src="chatAvatar"
              :name="chatTitle"
              size="sm"
              :is-online="isPeerOnline"
              :show-online="chat?.type === 'direct'"
            />
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-bold text-surface-on truncate leading-tight">
                {{ chatTitle }}
              </span>
              <span class="text-[11px] text-surface-onVariant/70 truncate leading-tight font-medium">
                {{ chatSubtitle }}
              </span>
            </div>
          </div>
        </div>

        <!-- Правая часть: Меню "3 точки" (M3 Dropdown) -->
        <div class="relative flex items-center shrink-0">
          <button
            class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect cursor-pointer"
            @click="showDropdown = !showDropdown"
          >
            <span class="material-symbols-rounded text-2xl">more_vert</span>
          </button>

          <!-- Выпадающее меню 3 точки -->
          <div
            v-if="showDropdown"
            class="absolute right-0 top-11 w-52 rounded-2xl bg-surface-lowest shadow-elevation-3 border border-surface-high p-1.5 z-50 flex flex-col gap-0.5 text-xs font-medium text-surface-on"
          >
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="openChatProfile(); showDropdown = false"
            >
              <span class="material-symbols-rounded text-lg text-surface-onVariant">info</span>
              <span>Информация</span>
            </button>
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="toggleMute(); showDropdown = false"
            >
              <span class="material-symbols-rounded text-lg text-surface-onVariant">
                {{ isMuted ? 'notifications' : 'notifications_off' }}
              </span>
              <span>{{ isMuted ? 'Включить звук' : 'Отключить звук' }}</span>
            </button>
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="toastStore.show('Поиск по переписке активен', 'info'); showDropdown = false"
            >
              <span class="material-symbols-rounded text-lg text-surface-onVariant">search</span>
              <span>Поиск в чате</span>
            </button>
            <div class="h-px bg-surface-high my-1" />
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="clearChat(); showDropdown = false"
            >
              <span class="material-symbols-rounded text-lg text-rose-500">delete_sweep</span>
              <span>Очистить историю</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Список сообщений с валидным отступом с учетом iOS Safe Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto pt-[calc(env(safe-area-inset-top)+5.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] px-4 max-w-2xl mx-auto w-full flex flex-col gap-3 overscroll-contain"
    >
      <!-- Приветствие для чата Избранное -->
      <div
        v-if="chat?.type === 'saved' && chatStore.activeMessages.length === 0"
        class="p-6 rounded-3xl bg-surface-low border border-primary/20 text-center flex flex-col items-center my-auto"
      >
        <div class="w-14 h-14 rounded-full bg-primary-container text-primary-on flex items-center justify-center mb-3">
          <span class="material-symbols-rounded text-3xl">bookmark</span>
        </div>
        <h4 class="font-bold text-surface-on text-base mb-1">Ваше Избранное</h4>
        <p class="text-xs text-surface-onVariant/80 max-w-xs leading-relaxed">
          Сохраняйте сюда любые посты из ленты нажатием кнопки "В Избранное", а также пишите собственные заметки.
        </p>
      </div>

      <!-- Сообщения -->
      <div
        v-for="msg in chatStore.activeMessages"
        :key="msg.id"
        class="flex flex-col"
        :class="msg.sender_id === authStore.user.id ? 'items-end' : 'items-start'"
      >
        <div
          class="max-w-[85%] sm:max-w-[72%] rounded-3xl p-3.5 transition-all shadow-xs"
          :class="[
            msg.sender_id === authStore.user.id
              ? 'bg-primary-container text-primary-onContainer rounded-br-xs'
              : 'bg-surface-lowest text-surface-on rounded-bl-xs border border-surface-high/60'
          ]"
        >
          <!-- Имя отправителя в группе/канале -->
          <div
            v-if="msg.sender_id !== authStore.user.id && (chat?.type === 'group' || chat?.type === 'channel')"
            class="text-[11px] font-bold text-primary mb-1"
          >
            {{ msg.sender?.first_name || 'Участник' }}
          </div>

          <!-- Голосовое сообщение с волной -->
          <VoiceMessagePlayer
            v-if="msg.voice_wave || msg.voice_url"
            :duration="msg.voice_duration || 5"
            :wave="msg.voice_wave"
          />

          <!-- Сохраненный пост из Ленты с интерактивной карточкой-превью! -->
          <div
            v-if="msg.forwarded_post"
            class="mt-1 mb-2 p-3 rounded-2xl bg-surface-low/80 border border-surface-high/60 cursor-pointer hover:opacity-90"
            @click="goToPost(msg.forwarded_post.id)"
          >
            <div class="flex items-center gap-1.5 mb-1.5">
              <span class="material-symbols-rounded text-xs text-primary">bookmark</span>
              <span class="text-[10px] font-bold text-primary uppercase tracking-wider">
                Сохранённая запись
              </span>
              <span class="text-[10px] text-surface-onVariant/60">• @{{ msg.forwarded_post.author?.username }}</span>
            </div>
            <p class="text-xs text-surface-on line-clamp-2 leading-relaxed">
              {{ msg.forwarded_post.content }}
            </p>
          </div>

          <!-- Текст сообщения -->
          <div v-if="msg.content" class="text-sm whitespace-pre-wrap leading-relaxed select-text">
            {{ msg.content }}
          </div>

          <!-- Время и статусы доставки (одна / две галочки) -->
          <div class="flex items-center justify-end gap-1 mt-1 text-[10px] text-surface-onVariant/70 font-mono">
            <span>{{ formatTime(msg.created_at) }}</span>
            <template v-if="msg.sender_id === authStore.user.id">
              <!-- Две галочки: Прочитано -->
              <span v-if="msg.is_read" class="material-symbols-rounded text-xs text-primary font-bold">
                done_all
              </span>
              <!-- Одна галочка: Отправлено -->
              <span v-else class="material-symbols-rounded text-xs text-surface-onVariant/50">
                check
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Индикатор набора текста ("Миша печатает...") -->
      <div v-if="chatStore.isPeerTyping" class="flex items-center gap-2 px-2 py-1 text-xs text-primary font-medium animate-pulse">
        <span class="w-2 h-2 rounded-full bg-primary" />
        <span>{{ chatTitle }} печатает...</span>
      </div>
    </div>

    <!-- Нижняя панель ввода с учетом iOS Safe Area -->
    <footer class="fixed bottom-3 left-0 right-0 z-40 px-4 max-w-2xl mx-auto pointer-events-none">
      <div class="pointer-events-auto rounded-3xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 p-1.5 flex items-center gap-2">
        
        <!-- Режим записи голосового сообщения -->
        <VoiceRecorder
          v-if="isRecordingVoice"
          @send="handleVoiceSend"
          @cancel="isRecordingVoice = false"
        />

        <!-- Стандартная панель ввода -->
        <template v-else>
          <!-- Прикрепить медиа -->
          <label class="w-10 h-10 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors m3-press-effect shrink-0">
            <span class="material-symbols-rounded text-xl">attach_file</span>
            <input type="file" class="hidden" @change="handleAttach" />
          </label>

          <!-- Поле ввода текста сообщения -->
          <input
            v-model="inputText"
            type="text"
            placeholder="Сообщение..."
            class="flex-1 bg-transparent px-2 py-2 text-sm text-surface-on focus:outline-none placeholder:text-surface-onVariant/50"
            @keydown.enter="sendTextMessage"
          />

          <!-- Кнопка микрофона (для голосового) или Отправить -->
          <button
            v-if="!inputText.trim()"
            class="w-10 h-10 rounded-full bg-surface-low text-primary flex items-center justify-center hover:bg-primary-container transition-colors m3-press-effect shrink-0 shadow-xs cursor-pointer"
            title="Записать голосовое сообщение"
            @click="isRecordingVoice = true"
          >
            <span class="material-symbols-rounded text-xl">mic</span>
          </button>

          <button
            v-else
            class="w-10 h-10 rounded-full bg-primary text-primary-on flex items-center justify-center hover:opacity-90 active:scale-95 transition-all m3-press-effect shrink-0 shadow-sm cursor-pointer"
            @click="sendTextMessage"
          >
            <span class="material-symbols-rounded text-xl">send</span>
          </button>
        </template>
      </div>
    </footer>

    <!-- Модальные окна информации о чатах -->
    <DirectProfileModal
      v-model="showDirectModal"
      :profile="peerProfile"
    />

    <GroupProfileModal
      v-model="showGroupModal"
      :chat="chat"
    />

    <ChannelProfileModal
      v-model="showChannelModal"
      :chat="chat"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Chat, Profile } from '@/types/database';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import VoiceMessagePlayer from '@/components/messages/VoiceMessagePlayer.vue';
import VoiceRecorder from '@/components/messages/VoiceRecorder.vue';
import DirectProfileModal from '@/components/messages/DirectProfileModal.vue';
import GroupProfileModal from '@/components/messages/GroupProfileModal.vue';
import ChannelProfileModal from '@/components/messages/ChannelProfileModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';
import { localStore } from '@/lib/supabase';
import { mishaProfileMock, annaProfileMock, currentUserMock } from '@/lib/mockData';
import type { VoiceRecordingResult } from '@/lib/audioRecorder';

const props = defineProps<{
  chatId: string;
}>();

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const inputText = ref('');
const isRecordingVoice = ref(false);
const showDropdown = ref(false);
const isMuted = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

const showDirectModal = ref(false);
const showGroupModal = ref(false);
const showChannelModal = ref(false);

const chat = computed<Chat | null>(() => {
  return chatStore.chats.find(c => c.id === props.chatId) || null;
});

// Динамическое определение собеседника для любого диалога
const peerProfile = computed<Profile>(() => {
  if (chat.value?.id === 'chat-direct-misha-003') {
    // Если мы переключились на Мишу, собеседник — Алексей!
    if (authStore.user.id === mishaProfileMock.id) {
      return currentUserMock;
    }
    return mishaProfileMock;
  }
  
  // Поиск в хранилище профилей
  const customProfile = localStore.getProfile(chat.value?.created_by || '');
  if (customProfile && customProfile.id !== authStore.user.id) {
    return customProfile;
  }

  // Динамический профиль по заголовку чата
  return {
    id: `peer-${chat.value?.id || 'default'}`,
    username: (chat.value?.title || 'contact').toLowerCase().replace(/\s+/g, '_'),
    first_name: chat.value?.title || 'Собеседник',
    avatar_url: chat.value?.avatar_url || mishaProfileMock.avatar_url,
    bio: 'Пользователь социальной сети tobo',
    is_online: true,
    created_at: new Date().toISOString()
  };
});

const chatTitle = computed(() => {
  if (chat.value?.type === 'direct') {
    return peerProfile.value.first_name + (peerProfile.value.last_name ? ' ' + peerProfile.value.last_name : '');
  }
  return chat.value?.title || 'Чат';
});

const chatAvatar = computed(() => {
  if (chat.value?.type === 'direct') {
    return peerProfile.value.avatar_url;
  }
  return chat.value?.avatar_url;
});

const isPeerOnline = computed(() => {
  return chat.value?.type === 'direct' ? peerProfile.value.is_online : false;
});

const chatSubtitle = computed(() => {
  if (!chat.value) return '';
  switch (chat.value.type) {
    case 'saved':
      return 'Облако заметок';
    case 'direct':
      return isPeerOnline.value ? 'В сети' : 'Был(а) недавно';
    case 'group':
      return `${chat.value.members_count || 5} участников`;
    case 'channel':
      return `${(chat.value.subscribers_count || 1240).toLocaleString('ru-RU')} подписчиков`;
    default:
      return '';
  }
});

function goBack() {
  chatStore.selectChat(null);
}

function openChatProfile() {
  if (!chat.value) return;
  if (chat.value.type === 'direct') {
    showDirectModal.value = true;
  } else if (chat.value.type === 'group') {
    showGroupModal.value = true;
  } else if (chat.value.type === 'channel') {
    showChannelModal.value = true;
  } else {
    toastStore.show('Персональный чат "Избранное" для ваших заметок', 'info');
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value;
  toastStore.show(isMuted.value ? 'Уведомления отключены' : 'Уведомления включены', 'info');
}

function clearChat() {
  chatStore.activeMessages = [];
  toastStore.show('История сообщений очищена', 'info');
}

function sendTextMessage() {
  if (!inputText.value.trim()) return;
  chatStore.sendMessage({
    content: inputText.value.trim()
  });
  inputText.value = '';
  scrollToBottom();
}

function handleVoiceSend(res: VoiceRecordingResult) {
  isRecordingVoice.value = false;
  chatStore.sendMessage({
    voice_url: res.audioUrl,
    voice_duration: res.duration,
    voice_wave: res.waveform
  });
  toastStore.show('Голосовое сообщение отправлено', 'success');
  scrollToBottom();
}

function handleAttach(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    chatStore.sendMessage({
      content: `📎 Прикреплен файл: ${target.files[0].name}`
    });
    toastStore.show('Файл отправлен', 'success');
    scrollToBottom();
  }
}

function goToPost(postId: string) {
  router.push('/feed');
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(
  () => chatStore.activeMessages.length,
  () => {
    scrollToBottom();
  }
);
</script>
