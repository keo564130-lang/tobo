<template>
  <M3BottomSheet
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Шапка шторки: заголовок и кнопка "Назад" при добавлении -->
    <template #header>
      <div class="flex items-center gap-2">
        <button
          v-if="currentView === 'add'"
          class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-high text-surface-onVariant cursor-pointer -ml-2"
          @click="currentView = 'info'"
        >
          <span class="material-symbols-rounded text-xl">arrow_back</span>
        </button>
        <h3 class="text-base font-bold text-surface-on">
          {{ currentView === 'info' ? 'Информация о группе' : 'Добавить участников' }}
        </h3>
      </div>
    </template>

    <!-- РЕЖИМ 1: Информация о группе -->
    <div v-if="currentView === 'info'" class="flex flex-col gap-4">
      <div class="flex flex-col items-center text-center">
        <div class="relative mb-3 group">
          <M3Avatar
            :src="chat?.avatar_url"
            :name="chat?.title || 'Группа'"
            size="xl"
          />
          <button
            v-if="canEdit"
            type="button"
            aria-label="Изменить аватарку группы"
            title="Изменить аватарку группы"
            class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-on shadow-md flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all"
            @click="avatarFileInput?.click()"
          >
            <span class="material-symbols-rounded text-base">photo_camera</span>
          </button>
          <input
            ref="avatarFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="uploadAvatar"
          />
        </div>
        <h3 class="text-lg font-bold text-surface-on">
          {{ chat?.title }}
        </h3>
        <span class="text-xs text-surface-onVariant/70 mt-0.5 font-medium">
          {{ currentMembers.length }} участников ({{ onlineCount }} в сети)
        </span>
      </div>

      <div v-if="chat?.description" class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 text-xs text-surface-on leading-relaxed">
        {{ chat.description }}
      </div>

      <!-- Список участников -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold uppercase tracking-wider text-surface-onVariant/80">
            Участники группы ({{ currentMembers.length }})
          </span>
          <button
            class="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            @click="currentView = 'add'"
          >
            <span class="material-symbols-rounded text-base">person_add</span>
            <span>Добавить</span>
          </button>
        </div>

        <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="member in currentMembers"
            :key="member.user_id"
            class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-low hover:bg-surface-high/40 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <M3Avatar :src="member.profile?.avatar_url" :name="member.profile?.first_name || 'Участник'" size="sm" />
              <div class="flex flex-col">
                <span class="text-xs font-bold text-surface-on">
                  {{ member.profile?.first_name }} {{ member.profile?.last_name || '' }}
                </span>
                <span class="text-[10px] text-surface-onVariant/60 font-mono">
                  @{{ member.profile?.username }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                :class="[
                  member.role === 'owner' ? 'bg-primary-container text-primary-on' : '',
                  member.role === 'admin' ? 'bg-secondary-container text-secondary-on' : '',
                  member.role === 'member' ? 'bg-surface-high text-surface-onVariant' : ''
                ]"
              >
                {{ member.role === 'owner' ? 'Владелец' : (member.role === 'admin' ? 'Админ' : 'Участник') }}
              </span>

              <button
                v-if="member.role !== 'owner'"
                class="w-7 h-7 rounded-full flex items-center justify-center text-surface-onVariant hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Удалить из группы"
                @click="removeMember(member.user_id)"
              >
                <span class="material-symbols-rounded text-base">close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- РЕЖИМ 2: Выбор и добавление контакта (прямо в этой же шторке) -->
    <div v-else class="flex flex-col gap-2 min-h-[220px]">
      <div v-if="availableUsersToAdd.length === 0" class="py-12 text-center text-xs text-surface-onVariant">
        Все доступные контакты уже добавлены в группу
      </div>
      <div v-else class="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
        <button
          v-for="user in availableUsersToAdd"
          :key="user.id"
          class="flex items-center gap-3 p-3 rounded-2xl bg-surface-low hover:bg-surface-high transition-colors text-left cursor-pointer m3-press-effect"
          @click="addMemberToGroup(user)"
        >
          <M3Avatar :src="user.avatar_url" :name="user.first_name" size="sm" />
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-xs font-bold text-surface-on truncate">{{ user.first_name }} {{ user.last_name || '' }}</span>
            <span class="text-[10px] text-surface-onVariant/60 font-mono">@{{ user.username }}</span>
          </div>
          <span class="material-symbols-rounded text-primary text-xl">add_circle</span>
        </button>
      </div>
    </div>

    <!-- Модалка круглого кроппера аватара группы -->
    <AvatarCropperModal
      v-model="showCropperModal"
      :image-src="cropperImageSrc"
      @crop-complete="handleCropComplete"
    />
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chat, ChatMember, Profile } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import AvatarCropperModal from '@/components/profile/AvatarCropperModal.vue';
import { currentUserMock, mishaProfileMock, annaProfileMock, toboOfficialProfileMock } from '@/lib/mockData';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const authStore = useAuthStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const canEdit = computed(() => {
  if (!props.chat || !authStore.user?.id) return false;
  return props.chat.created_by === authStore.user.id || authStore.isDeveloper;
});

const avatarFileInput = ref<HTMLInputElement | null>(null);
const showCropperModal = ref(false);
const cropperImageSrc = ref('');

function uploadAvatar(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    cropperImageSrc.value = reader.result as string;
    showCropperModal.value = true;
  };
  reader.readAsDataURL(file);
  target.value = '';
}

async function handleCropComplete(result: string | { base64: string; blob?: Blob }) {
  const base64 = typeof result === 'string' ? result : result.base64;
  if (!props.chat?.id || !base64) return;
  try {
    await chatStore.updateChat(props.chat.id, { avatar_url: base64 });
    toastStore.show('Аватарка группы успешно обновлена!', 'success');
  } catch (err) {
    console.error(err);
    toastStore.show('Не удалось обновить аватарку', 'error');
  }
}

const currentView = ref<'info' | 'add'>('info');
const currentMembers = ref<ChatMember[]>([]);

const allMockUsers = [currentUserMock, mishaProfileMock, annaProfileMock, toboOfficialProfileMock];
const availableUsersToAdd = computed(() => {
  const existingIds = new Set(currentMembers.value.map(m => m.user_id));
  return allMockUsers.filter(u => !existingIds.has(u.id));
});

function addMemberToGroup(user: Profile) {
  currentMembers.value.push({
    chat_id: props.chat?.id || 'group-custom',
    user_id: user.id,
    role: 'member',
    joined_at: new Date().toISOString(),
    profile: user
  });
  currentView.value = 'info';
  toastStore.show(`${user.first_name} добавлен(а) в группу`, 'success');
}

// При закрытии/открытии возвращаем вид на 'info'
watch(() => props.modelValue, (val) => {
  if (val) currentView.value = 'info';
});

function initMembers() {
  if (props.chat?.id === 'chat-group-family-004') {
    currentMembers.value = [
      {
        chat_id: 'chat-group-family-004',
        user_id: currentUserMock.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
        profile: currentUserMock
      },
      {
        chat_id: 'chat-group-family-004',
        user_id: mishaProfileMock.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
        profile: mishaProfileMock
      },
      {
        chat_id: 'chat-group-family-004',
        user_id: annaProfileMock.id,
        role: 'member',
        joined_at: new Date().toISOString(),
        profile: annaProfileMock
      }
    ];
  } else {
    // Динамический список участников для любого созданного группового чата
    currentMembers.value = [
      {
        chat_id: props.chat?.id || 'group-custom',
        user_id: currentUserMock.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
        profile: currentUserMock
      },
      {
        chat_id: props.chat?.id || 'group-custom',
        user_id: mishaProfileMock.id,
        role: 'member',
        joined_at: new Date().toISOString(),
        profile: mishaProfileMock
      }
    ];
  }
}

watch(() => props.chat, () => initMembers(), { immediate: true });

const onlineCount = computed(() => {
  return currentMembers.value.filter(m => m.profile?.is_online).length;
});

function removeMember(userId: string) {
  currentMembers.value = currentMembers.value.filter(m => m.user_id !== userId);
  toastStore.show('Участник исключён из группы', 'info');
}
</script>
