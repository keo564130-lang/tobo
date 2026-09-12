<template>
  <div class="fixed inset-0 z-50 bg-surface flex flex-col">
    <!-- Верхний плавающий островок чата -->
    <header class="fixed top-3 left-0 right-0 z-40 px-4 max-w-2xl mx-auto pointer-events-none">
      <div class="pointer-events-auto flex items-center justify-between px-3.5 py-2.5 rounded-3xl bg-surface-lowest/90 backdrop-blur-xl shadow-floating-bar border border-surface-high/50">
        <!-- Кнопка Назад и Интерактивная зона заголовка (клик открывает профиль) -->
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <button
            class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors shrink-0"
            @click="goBack"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <!-- КЛИК ПО АВАТАРУ / ИМЕНИ ОТКРЫВАЕТ КАРТОЧКУ СУЩНОСТИ -->
          <div
            class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-85 transition-opacity py-0.5 px-1 rounded-2xl"
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
              <span class="text-[11px] text-surface-onVariant/70 truncate leading-tight">
                {{ chatSubtitle }}
              </span>
            </div>
          </div>
        </div>

        <!-- Правая часть: Меню "3 точки" (M3 Dropdown) -->
        <div class="relative flex items-center shrink-0">
          <button
            class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect"
            @click="showDropdown = !showDropdown"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          <!-- Выпадающее меню 3 точки -->
          <div
            v-if="showDropdown"
            class="absolute right-0 top-11 w-52 rounded-2xl bg-surface-lowest shadow-elevation-3 border border-surface-high p-1.5 z-50 flex flex-col gap-0.5 text-xs font-medium text-surface-on"
          >
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2 transition-colors"
              @click="openChatProfile(); showDropdown = false"
            >
              <svg class="w-4 h-4 text-surface-onVariant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Информация</span>
            </button>
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2 transition-colors"
              @click="toggleMute(); showDropdown = false"
            >
              <svg class="w-4 h-4 text-surface-onVariant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>{{ isMuted ? 'Включить звук' : 'Отключить звук' }}</span>
            </button>
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-high flex items-center gap-2 transition-colors"
              @click="toastStore.show('Поиск по сообщениям активен', 'info'); showDropdown = false"
            >
              <svg class="w-4 h-4 text-surface-onVariant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Поиск в чате</span>
            </button>
            <div class="h-px bg-surface-high my-1" />
            <button
              class="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 flex items-center gap-2 transition-colors"
              @click="clearChat(); showDropdown = false"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Очистить историю</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Список сообщений -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto pt-22 pb-24 px-4 max-w-2xl mx-auto w-full flex flex-col gap-3"
    >
      <!-- Приветствие для чата Избранное -->
      <div
        v-if="chat?.type === 'saved' && chatStore.activeMessages.length === 0"
        class="p-6 rounded-3xl bg-surface-low border border-primary/20 text-center flex flex-col items-center my-auto"
      >
        <div class="w-14 h-14 rounded-full bg-primary-container text-primary-on flex items-center justify-center mb-3">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
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
          class="max-w-[82%] sm:max-w-[70%] rounded-3xl p-3.5 transition-all shadow-xs"
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
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-[10px] font-bold text-primary uppercase tracking-wider">
                🔖 Сохранённая запись
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
              <svg v-if="msg.is_read" class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7m-14 4l4 4L19 7" />
              </svg>
              <!-- Одна галочка: Отправлено -->
              <svg v-else class="w-3 h-3 text-surface-onVariant/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
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

    <!-- Нижняя панель ввода -->
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
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
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
            class="w-10 h-10 rounded-full bg-surface-low text-primary flex items-center justify-center hover:bg-primary-container transition-colors m3-press-effect shrink-0 shadow-xs"
            title="Записать голосовое сообщение"
            @click="isRecordingVoice = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            v-else
            class="w-10 h-10 rounded-full bg-primary text-primary-on flex items-center justify-center hover:opacity-90 active:scale-95 transition-all m3-press-effect shrink-0 shadow-sm"
            @click="sendTextMessage"
          >
            <svg class="w-4.5 h-4.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
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
import { mishaProfileMock } from '@/lib/mockData';
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

const peerProfile = computed<Profile>(() => {
  return mishaProfileMock;
});

const chatTitle = computed(() => {
  return chat.value?.title || 'Чат';
});

const chatAvatar = computed(() => {
  return chat.value?.avatar_url;
});

const isPeerOnline = computed(() => {
  return chat.value?.type === 'direct' ? true : false;
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
