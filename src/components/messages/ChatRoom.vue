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
            <span class="material-symbols-rounded text-[20px]">arrow_back</span>
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
            <span class="material-symbols-rounded text-[20px]">more_vert</span>
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
      <!-- Заглушка для закрытого канала при отсутствии доступа -->
      <div
        v-if="chat?.type === 'channel' && !hasChannelAccess"
        class="p-8 rounded-4xl bg-surface-lowest/90 backdrop-blur-md border border-rose-500/20 text-center flex flex-col items-center my-auto shadow-elevation-2 max-w-sm mx-auto"
      >
        <div class="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <span class="material-symbols-rounded text-2xl">lock</span>
        </div>
        <h4 class="font-bold text-surface-on text-base mb-1.5">Закрытый канал</h4>
        <p class="text-xs text-surface-onVariant/80 leading-relaxed mb-4">
          Этот канал является закрытым. Сообщения и публикации могут быть прочитаны только участниками, создателем канала или разработчиками tobo.
        </p>
        <button
          type="button"
          class="px-5 py-2.5 rounded-full bg-primary text-primary-on text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          @click="goBack"
        >
          Вернуться к списку чатов
        </button>
      </div>

      <template v-else>
        <!-- Приветствие для чата Избранное -->
        <div
          v-if="chat?.type === 'saved' && chatStore.activeMessages.length === 0"
          class="p-6 rounded-3xl bg-surface-low border border-primary/20 text-center flex flex-col items-center my-auto"
        >
          <div class="w-14 h-14 rounded-full bg-primary-container text-primary-on flex items-center justify-center mb-3">
            <span class="material-symbols-rounded text-2xl">bookmark</span>
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
        :id="'msg-' + msg.id"
        class="flex flex-col relative transition-transform duration-100"
        :class="msg.sender_id === authStore.user.id ? 'items-end' : 'items-start'"
        @touchstart="onMsgTouchStart($event, msg)"
        @touchmove="onMsgTouchMove($event, msg)"
        @touchend="onMsgTouchEnd($event, msg)"
        @contextmenu.prevent="openReactionMenu($event, msg)"
      >
        <!-- Индикатор свайпа для ответа (Swipe-to-Reply Icon) -->
        <div
          v-if="swipedMsgId === msg.id && swipeOffset > 12"
          class="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary transition-opacity"
          :style="{
            opacity: Math.min(1, swipeOffset / 40),
            transform: `translateY(-50%) scale(${Math.min(1.2, 0.6 + swipeOffset / 50)})`
          }"
        >
          <span class="material-symbols-rounded text-lg">reply</span>
        </div>

        <div
          class="group relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[72%] transition-transform duration-75"
          :class="msg.sender_id === authStore.user.id ? 'flex-row' : 'flex-row-reverse'"
          :style="{
            transform: swipedMsgId === msg.id ? `translateX(${swipeOffset}px)` : 'none'
          }"
        >
          <!-- Кнопка вызова реакций / меню действий на десктопе -->
          <button
            type="button"
            aria-label="Реакции и действия"
            title="Реакции и действия"
            class="opacity-0 group-hover:opacity-100 max-sm:hidden transition-opacity text-surface-onVariant/60 hover:text-primary text-xs p-1 cursor-pointer rounded-full hover:bg-surface-high flex items-center justify-center shrink-0"
            @click.stop="openReactionMenu($event, msg)"
          >
            <span class="material-symbols-rounded text-base">add_reaction</span>
          </button>

          <!-- Кнопка удаления сообщения для автора или разработчика -->
          <button
            v-if="canDeleteMessage(msg)"
            type="button"
            aria-label="Удалить сообщение"
            title="Удалить сообщение"
            class="opacity-0 group-hover:opacity-100 max-sm:opacity-60 transition-opacity text-surface-onVariant/40 hover:text-rose-500 text-xs p-1 cursor-pointer rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center shrink-0"
            @click.stop="confirmDeleteMessage(msg)"
          >
            <span class="material-symbols-rounded text-base">delete</span>
          </button>

          <div
            class="w-full rounded-3xl p-3.5 transition-all shadow-xs"
            :class="[
              msg.sender_id === authStore.user.id
                ? 'bg-primary-container text-primary-onContainer rounded-br-xs'
                : 'bg-surface-lowest text-surface-on rounded-bl-xs border border-surface-high/60'
            ]"
          >
            <!-- Блок цитаты ответа на сообщение -->
            <div
              v-if="msg.reply_to"
              class="mb-2 p-2 rounded-xl bg-surface-low/80 border-l-2 border-primary cursor-pointer hover:opacity-90 transition-opacity"
              @click.stop="scrollToMessage(msg.reply_to.id)"
            >
              <div class="flex items-center gap-1 text-[10px] font-bold text-primary">
                <span class="material-symbols-rounded text-xs">reply</span>
                <span>{{ msg.reply_to.sender_name }}</span>
              </div>
              <div class="text-xs text-surface-on/80 truncate mt-0.5">
                {{ msg.reply_to.text }}
              </div>
            </div>

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

            <!-- Кнопка комментариев к публикации канала -->
            <div v-if="chat?.type === 'channel'" class="mt-2 pt-2 border-t border-current/15 flex items-center justify-between">
              <button
                v-if="!chat.settings?.disable_comments"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors cursor-pointer"
                @click.stop="openChannelComments(msg)"
              >
                <span class="material-symbols-rounded text-sm">forum</span>
                <span>Обсудить • {{ msg.comments_count || 0 }}</span>
              </button>
              <span
                v-else
                class="inline-flex items-center gap-1 text-[11px] text-surface-onVariant/60 italic"
              >
                <span class="material-symbols-rounded text-xs">lock</span>
                <span>Комментарии отключены</span>
              </span>
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

        <!-- Чипсы реакций под сообщением -->
        <div v-if="msg.reactions && Object.keys(msg.reactions).length > 0" class="flex flex-wrap gap-1 mt-1 px-1">
          <button
            v-for="(data, emoji) in msg.reactions"
            :key="emoji"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer border"
            :class="data.users.includes(authStore.user?.id || '')
              ? 'bg-primary-container text-primary-on border-primary/40 scale-105 shadow-xs'
              : 'bg-surface-low text-surface-on border-surface-high/60 hover:bg-surface-high'"
            @click.stop="handleReactionToggle(msg, String(emoji))"
          >
            <span>{{ emoji }}</span>
            <span class="font-bold text-[11px]">{{ data.count }}</span>
          </button>
        </div>
      </div>

      <!-- Индикатор набора текста ("Миша печатает...") -->
      <div v-if="chatStore.isPeerTyping" class="flex items-center gap-2 px-2 py-1 text-xs text-primary font-medium animate-pulse">
        <span class="w-2 h-2 rounded-full bg-primary" />
        <span>{{ chatTitle }} печатает...</span>
      </div>
      </template>
    </div>

    <!-- Нижняя панель ввода с учетом iOS Safe Area -->
    <footer v-if="hasChannelAccess" class="fixed bottom-3 left-0 right-0 z-40 px-4 max-w-2xl mx-auto pointer-events-none">
      <!-- Плашка цитирования сообщения при ответе -->
      <div
        v-if="replyingTo && canPostInChannel"
        class="pointer-events-auto mb-2 px-3.5 py-2 rounded-2xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border-l-4 border-primary border border-surface-high/50 flex items-center justify-between gap-2"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="material-symbols-rounded text-primary text-base shrink-0">reply</span>
          <div class="flex flex-col min-w-0">
            <span class="text-[11px] font-bold text-primary truncate">
              В ответ: {{ replyingTo.sender?.first_name || (replyingTo.sender_id === authStore.user?.id ? 'Вам' : 'Собеседнику') }}
            </span>
            <span class="text-xs text-surface-on truncate">
              {{ replyingTo.content || (replyingTo.voice_url ? '🎤 Голосовое сообщение' : 'Вложение') }}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Отменить ответ"
          class="w-6 h-6 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors shrink-0"
          @click="replyingTo = null"
        >
          <span class="material-symbols-rounded text-sm">close</span>
        </button>
      </div>

      <!-- Плашка "Канал только для чтения" для тех, у кого нет прав на публикацию -->
      <div
        v-if="!canPostInChannel"
        class="pointer-events-auto rounded-3xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 px-4 py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <span class="material-symbols-rounded text-base text-surface-onVariant">campaign</span>
          <span class="text-xs text-surface-onVariant font-medium">Канал только для чтения</span>
        </div>
        <button
          class="text-xs font-bold text-primary flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
          @click="toggleMute"
        >
          <span class="material-symbols-rounded text-base">{{ isMuted ? 'notifications_off' : 'notifications' }}</span>
          <span>{{ isMuted ? 'Включить звук' : 'Без звука' }}</span>
        </button>
      </div>

      <!-- Стандартная панель ввода для личных чатов, групп и авторов каналов -->
      <div
        v-else
        class="pointer-events-auto rounded-3xl bg-surface-lowest/95 backdrop-blur-xl shadow-floating-bar border border-surface-high/50 p-1.5 flex items-center gap-2"
      >
        <!-- Режим записи голосового сообщения -->
        <VoiceRecorder
          v-if="isRecordingVoice"
          @send="handleVoiceSend"
          @cancel="isRecordingVoice = false"
        />

        <!-- Стандартная панель ввода -->
        <template v-else>
          <!-- Прикрепить медиа -->
          <label for="chat_attach_file" class="w-10 h-10 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors m3-press-effect shrink-0">
            <span class="material-symbols-rounded text-[20px]">attach_file</span>
            <input id="chat_attach_file" name="attachment" aria-label="Прикрепить файл" type="file" class="hidden" @change="handleAttach" />
          </label>

          <!-- Поле ввода текста сообщения с ограничением длины -->
          <input
            id="chat_message_input"
            name="message"
            aria-label="Сообщение"
            v-model="inputText"
            type="text"
            maxlength="4000"
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
            <span class="material-symbols-rounded text-[20px]">mic</span>
          </button>

          <button
            v-else
            class="w-10 h-10 rounded-full bg-primary text-primary-on flex items-center justify-center hover:opacity-90 active:scale-95 transition-all m3-press-effect shrink-0 shadow-sm cursor-pointer"
            @click="sendTextMessage"
          >
            <span class="material-symbols-rounded text-[20px]">send</span>
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

    <!-- Шторка обсуждения публикаций канала -->
    <ChannelCommentsSheet
      v-model="showCommentsSheet"
      :chat="chat"
      :message="selectedChannelMessage"
    />

    <!-- Плавающее M3 меню быстрых реакций и действий с сообщением -->
    <Teleport to="body">
      <div
        v-if="showReactionMenu && activeReactionMsg"
        class="fixed inset-0 z-[120] bg-black/30 backdrop-blur-xs"
        @click="closeReactionMenu"
      >
        <div
          class="absolute rounded-3xl bg-surface-lowest border border-surface-high/60 p-2 shadow-elevation-4 flex flex-col gap-2 min-w-[260px] animate-scale-up"
          :style="{
            left: `${reactionMenuPos.x}px`,
            top: `${reactionMenuPos.y}px`
          }"
          @click.stop
        >
          <!-- Быстрые эмодзи (реакции) -->
          <div class="flex items-center justify-between gap-1 px-1 py-0.5 overflow-x-auto">
            <button
              v-for="emoji in quickEmojis"
              :key="emoji"
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-surface-high hover:scale-125 active:scale-95 transition-all cursor-pointer"
              @click="handleReactionSelect(emoji)"
            >
              {{ emoji }}
            </button>
          </div>

          <div class="h-px bg-surface-high/50 my-0.5" />

          <!-- Действия с сообщением -->
          <div class="flex flex-col gap-0.5 text-xs font-medium text-surface-on">
            <button
              type="button"
              class="w-full text-left px-3 py-2 rounded-2xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="replyFromMenu"
            >
              <span class="material-symbols-rounded text-base text-primary">reply</span>
              <span>Ответить</span>
            </button>

            <button
              v-if="activeReactionMsg.content"
              type="button"
              class="w-full text-left px-3 py-2 rounded-2xl hover:bg-surface-high flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="copyMessageText"
            >
              <span class="material-symbols-rounded text-base text-surface-onVariant">content_copy</span>
              <span>Копировать текст</span>
            </button>

            <button
              v-if="canDeleteMessage(activeReactionMsg)"
              type="button"
              class="w-full text-left px-3 py-2 rounded-2xl hover:bg-rose-500/10 text-rose-500 flex items-center gap-2.5 transition-colors cursor-pointer"
              @click="deleteFromMenu"
            >
              <span class="material-symbols-rounded text-base text-rose-500">delete</span>
              <span>Удалить сообщение</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Подтверждение удаления сообщения -->
    <Teleport to="body">
      <div
        v-if="showDeleteMessageConfirm"
        class="fixed inset-0 z-modal bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        @click.self="showDeleteMessageConfirm = false"
      >
        <div class="w-full max-w-sm rounded-3xl bg-surface-lowest border border-surface-high/60 p-5 shadow-elevation-3 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <span class="material-symbols-rounded text-xl">delete_forever</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-surface-on">Удалить сообщение?</h3>
              <p class="text-xs text-surface-onVariant/80 mt-0.5">Это действие необратимо.</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 rounded-full text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors cursor-pointer"
              @click="showDeleteMessageConfirm = false; messageToDelete = null"
            >
              Отмена
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-xs cursor-pointer"
              @click="executeDeleteMessage"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Chat, Message, Profile } from '@/types/database';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import VoiceMessagePlayer from '@/components/messages/VoiceMessagePlayer.vue';
import VoiceRecorder from '@/components/messages/VoiceRecorder.vue';
import DirectProfileModal from '@/components/messages/DirectProfileModal.vue';
import GroupProfileModal from '@/components/messages/GroupProfileModal.vue';
import ChannelProfileModal from '@/components/messages/ChannelProfileModal.vue';
import ChannelCommentsSheet from '@/components/messages/ChannelCommentsSheet.vue';
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

// Обсуждение публикации канала
const showCommentsSheet = ref(false);
const selectedChannelMessage = ref<Message | null>(null);

function openChannelComments(msg: Message) {
  selectedChannelMessage.value = msg;
  showCommentsSheet.value = true;
}

// Ответ на сообщение (Swipe-to-Reply & Menu)
const replyingTo = ref<Message | null>(null);
const swipedMsgId = ref<string | null>(null);
const swipeOffset = ref(0);
let touchStartX = 0;
let touchStartY = 0;
let isHorizontalSwipe = false;
let longPressTimer: any = null;

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function onMsgTouchStart(e: TouchEvent, msg: Message) {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isHorizontalSwipe = false;
  swipedMsgId.value = msg.id;
  swipeOffset.value = 0;

  clearLongPress();
  longPressTimer = setTimeout(() => {
    openReactionMenu(e, msg);
  }, 450);
}

function onMsgTouchMove(e: TouchEvent, msg: Message) {
  if (e.touches.length !== 1 || swipedMsgId.value !== msg.id) return;
  const deltaX = e.touches[0].clientX - touchStartX;
  const deltaY = e.touches[0].clientY - touchStartY;

  if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
    clearLongPress();
  }

  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 5) {
    isHorizontalSwipe = true;
    swipeOffset.value = Math.min(Math.max(0, deltaX), 70);
  }
}

function onMsgTouchEnd(e: TouchEvent, msg: Message) {
  clearLongPress();
  if (swipedMsgId.value === msg.id) {
    if (swipeOffset.value >= 45) {
      replyingTo.value = msg;
      toastStore.show('Ответ на сообщение: ' + (msg.sender?.first_name || 'Пользователь'), 'info');
    }
    swipeOffset.value = 0;
    swipedMsgId.value = null;
    isHorizontalSwipe = false;
  }
}

// Меню реакций
const quickEmojis = ['❤️', '👍', '🔥', '😂', '😮', '😢', '👏'];
const activeReactionMsg = ref<Message | null>(null);
const reactionMenuPos = reactive({ x: 0, y: 0 });
const showReactionMenu = ref(false);

function openReactionMenu(e: MouseEvent | TouchEvent, msg: Message) {
  clearLongPress();
  activeReactionMsg.value = msg;
  let clientX = 0;
  let clientY = 0;
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('clientX' in e) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    clientX = window.innerWidth / 2;
    clientY = window.innerHeight / 2;
  }

  const menuWidth = 280;
  const menuHeight = 160;
  reactionMenuPos.x = Math.min(Math.max(16, clientX - menuWidth / 2), window.innerWidth - menuWidth - 16);
  reactionMenuPos.y = Math.min(Math.max(60, clientY - 80), window.innerHeight - menuHeight - 60);
  showReactionMenu.value = true;
}

function closeReactionMenu() {
  showReactionMenu.value = false;
  activeReactionMsg.value = null;
}

function handleReactionSelect(emoji: string) {
  if (!activeReactionMsg.value || !chat.value) return;
  chatStore.toggleReaction(chat.value.id, activeReactionMsg.value.id, emoji);
  closeReactionMenu();
}

function handleReactionToggle(msg: Message, emoji: string) {
  if (!chat.value) return;
  chatStore.toggleReaction(chat.value.id, msg.id, emoji);
}

function replyFromMenu() {
  if (activeReactionMsg.value) {
    replyingTo.value = activeReactionMsg.value;
    toastStore.show('Ответ на сообщение: ' + (activeReactionMsg.value.sender?.first_name || 'Пользователь'), 'info');
  }
  closeReactionMenu();
}

function copyMessageText() {
  if (activeReactionMsg.value?.content) {
    navigator.clipboard.writeText(activeReactionMsg.value.content);
    toastStore.show('Текст сообщения скопирован', 'success');
  }
  closeReactionMenu();
}

function deleteFromMenu() {
  if (activeReactionMsg.value) {
    confirmDeleteMessage(activeReactionMsg.value);
  }
  closeReactionMenu();
}

function scrollToMessage(msgId: string) {
  const el = document.getElementById('msg-' + msgId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary', 'transition-all');
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary');
    }, 1500);
  }
}

const chat = computed<Chat | null>(() => {
  const storeChat = chatStore.chats.find(c => c.id === props.chatId);
  if (storeChat) return storeChat;

  const localChat = localStore.getChatById(props.chatId);
  if (localChat) return localChat;

  try {
    const raw = localStorage.getItem('tobo_chats_cache');
    if (raw) {
      const cached = JSON.parse(raw);
      if (Array.isArray(cached)) {
        const found = cached.find((c: Chat) => c.id === props.chatId);
        if (found) return found;
      }
    }
  } catch (e) {
    console.warn('Failed to parse tobo_chats_cache in ChatRoom:', e);
  }

  return null;
});

// Проверка прав доступа к закрытому каналу (is_public === false)
const hasChannelAccess = computed(() => {
  if (!chat.value) return true;
  return chatStore.canAccessChat(chat.value);
});

// Динамические права на публикацию в канале
const canPostInChannel = computed(() => {
  if (!chat.value) return false;
  if (chat.value.type !== 'channel') return true;
  if (authStore.isDeveloper || chat.value.created_by === authStore.user?.id) return true;
  return chat.value.settings?.can_post_role === 'all';
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

  // Поиск другого участника по chat.members
  const otherMember = chat.value?.members?.find(m => m.user_id && m.user_id !== authStore.user?.id);
  if (otherMember) {
    const memberProfile = localStore.getProfile(otherMember.user_id);
    if (memberProfile) return memberProfile;
  }
  
  // Поиск в хранилище профилей
  if (chat.value?.created_by && chat.value.created_by !== authStore.user?.id) {
    const customProfile = localStore.getProfile(chat.value.created_by);
    if (customProfile) {
      return customProfile;
    }
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
    const fullName = (peerProfile.value.first_name + (peerProfile.value.last_name ? ' ' + peerProfile.value.last_name : '')).trim();
    return fullName || chat.value?.title || 'Собеседник';
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
  if (!inputText.value.trim() || !hasChannelAccess.value) return;
  const safeContent = inputText.value.trim().slice(0, 4000);
  chatStore.sendMessage({
    content: safeContent,
    reply_to: replyingTo.value ? {
      id: replyingTo.value.id,
      sender_name: replyingTo.value.sender?.first_name || (replyingTo.value.sender_id === authStore.user?.id ? 'Вы' : 'Собеседник'),
      text: replyingTo.value.content || (replyingTo.value.voice_url ? '🎤 Голосовое сообщение' : 'Вложение')
    } : null
  });
  inputText.value = '';
  replyingTo.value = null;
  scrollToBottom();
}

function handleVoiceSend(res: VoiceRecordingResult) {
  isRecordingVoice.value = false;
  chatStore.sendMessage({
    voice_url: res.audioUrl,
    voice_duration: res.duration,
    voice_wave: res.waveform,
    reply_to: replyingTo.value ? {
      id: replyingTo.value.id,
      sender_name: replyingTo.value.sender?.first_name || (replyingTo.value.sender_id === authStore.user?.id ? 'Вы' : 'Собеседник'),
      text: replyingTo.value.content || (replyingTo.value.voice_url ? '🎤 Голосовое сообщение' : 'Вложение')
    } : null
  });
  replyingTo.value = null;
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

function canDeleteMessage(msg: Message) {
  if (!authStore.user?.id) return false;
  return msg.sender_id === authStore.user.id || authStore.isDeveloper;
}

const showDeleteMessageConfirm = ref(false);
const messageToDelete = ref<Message | null>(null);

function confirmDeleteMessage(msg: Message) {
  messageToDelete.value = msg;
  showDeleteMessageConfirm.value = true;
}

async function executeDeleteMessage() {
  if (!messageToDelete.value || !chat.value) return;
  const msgId = messageToDelete.value.id;
  const chatId = chat.value.id;
  showDeleteMessageConfirm.value = false;
  messageToDelete.value = null;
  await chatStore.deleteMessage(chatId, msgId);
  toastStore.show('Сообщение удалено', 'info');
}
</script>
