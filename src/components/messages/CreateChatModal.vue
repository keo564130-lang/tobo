<template>
  <M3BottomSheet
    :model-value="modelValue"
    :title="modalTitle"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <!-- ================================================================= -->
      <!-- A) ЛИЧНЫЙ ДИАЛОГ (type === 'direct')                              -->
      <!-- ================================================================= -->
      <template v-if="type === 'direct'">
        <!-- Кнопка импорта контактов из телефона (Contact Picker API) -->
        <div class="flex items-center justify-between">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-container text-primary-onContainer text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer m3-press-effect"
            @click="pickPhoneContact"
          >
            <span class="material-symbols-rounded text-base">import_contacts</span>
            <span>Выбрать из контактов телефона</span>
          </button>
        </div>

        <!-- Поле живого поиска собеседника -->
        <div>
          <label for="direct_user_search" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Собеседник
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-3 material-symbols-rounded text-surface-onVariant/60 text-lg pointer-events-none">
              search
            </span>
            <input
              id="direct_user_search"
              v-model="searchQuery"
              type="text"
              placeholder="Поиск по @username, имени или почте..."
              class="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              @input="handleSearchInput"
            />
            <button
              v-if="searchQuery"
              type="button"
              aria-label="Очистить поиск"
              class="absolute right-3 top-2.5 w-6 h-6 rounded-full flex items-center justify-center text-surface-onVariant/70 hover:text-surface-on hover:bg-surface-high/60 cursor-pointer transition-colors"
              @click="clearDirectSelection"
            >
              <span class="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>

        <!-- Карточка выбранного собеседника -->
        <div
          v-if="selectedUser"
          class="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/30 transition-all"
        >
          <div class="flex items-center gap-3">
            <M3Avatar
              :src="selectedUser.avatar_url"
              :name="selectedUser.first_name || 'Собеседник'"
              size="md"
            />
            <div class="flex flex-col">
              <span class="text-sm font-bold text-surface-on">
                {{ selectedUser.first_name }} {{ selectedUser.last_name || '' }}
              </span>
              <span class="text-xs text-primary font-mono">
                @{{ selectedUser.username || 'contact' }}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Отменить выбор"
            class="w-7 h-7 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high/80 cursor-pointer transition-colors"
            @click="selectedUser = null"
          >
            <span class="material-symbols-rounded text-base">close</span>
          </button>
        </div>

        <!-- Результаты живого поиска -->
        <div v-else-if="searchQuery.trim()" class="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scrollbar">
          <!-- Индикатор поиска -->
          <div v-if="isSearching" class="flex items-center justify-center py-4 text-xs text-surface-onVariant/70 gap-2">
            <span class="material-symbols-rounded text-sm animate-spin">sync</span>
            <span>Поиск пользователей...</span>
          </div>

          <!-- Список найденных в базе пользователей -->
          <template v-else-if="searchResults.length > 0">
            <div
              v-for="u in searchResults"
              :key="u.id"
              class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-low hover:bg-surface-high/60 border border-surface-high/40 transition-all cursor-pointer m3-press-effect"
              @click="selectUser(u)"
            >
              <div class="flex items-center gap-3">
                <M3Avatar
                  :src="u.avatar_url"
                  :name="u.first_name"
                  size="md"
                />
                <div class="flex flex-col">
                  <span class="text-xs sm:text-sm font-bold text-surface-on">
                    {{ u.first_name }} {{ u.last_name || '' }}
                  </span>
                  <span class="text-[11px] text-surface-onVariant/70 font-mono">
                    @{{ u.username || 'user' }}
                  </span>
                </div>
              </div>
              <span class="material-symbols-rounded text-primary text-xl">
                add_circle
              </span>
            </div>
          </template>

          <!-- Опция создания диалога с произвольным именем, если в базе не найден -->
          <div
            v-else
            class="flex items-center justify-between p-3 rounded-2xl bg-surface-low hover:bg-surface-high/60 border border-surface-high/40 transition-all cursor-pointer m3-press-effect"
            @click="selectCustomName(searchQuery.trim())"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-rounded text-xl">person_add</span>
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-surface-on">
                  Создать диалог с «{{ searchQuery.trim() }}»
                </span>
                <span class="text-[11px] text-surface-onVariant/60">
                  Пользователь не найден в базе tobo
                </span>
              </div>
            </div>
            <span class="material-symbols-rounded text-primary text-xl">
              arrow_forward
            </span>
          </div>
        </div>

        <!-- Кнопки внизу для личного диалога -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-surface-high/40">
          <M3Button variant="text" size="md" @click="closeModal">
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="md"
            :disabled="!selectedUser && !searchQuery.trim()"
            :loading="isSubmitting"
            @click="submitDirectChat"
          >
            Начать диалог
          </M3Button>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- B) ГРУППА (type === 'group')                                      -->
      <!-- ================================================================= -->
      <template v-else-if="type === 'group'">
        <!-- Выбор аватарки группы -->
        <div class="flex items-center gap-3.5 mb-1">
          <div class="relative shrink-0">
            <div
              class="w-16 h-16 rounded-full overflow-hidden bg-surface-low border-2 border-dashed border-surface-high hover:border-primary flex items-center justify-center cursor-pointer transition-all m3-press-effect group"
              @click="avatarFileInput?.click()"
            >
              <img
                v-if="chatAvatarUrl"
                :src="chatAvatarUrl"
                alt="Аватар группы"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center justify-center text-surface-onVariant/60 group-hover:text-primary transition-colors">
                <span class="material-symbols-rounded text-xl">add_a_photo</span>
              </div>
            </div>
            <button
              v-if="chatAvatarUrl"
              type="button"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-high hover:bg-rose-500 hover:text-white text-surface-onVariant flex items-center justify-center transition-colors cursor-pointer"
              title="Удалить фото"
              @click.stop="chatAvatarUrl = ''"
            >
              <span class="material-symbols-rounded text-xs">close</span>
            </button>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-surface-on">Аватарка группы</span>
            <span class="text-[11px] text-surface-onVariant/70">Нажмите, чтобы выбрать и кадрировать фото</span>
          </div>
        </div>

        <div>
          <label for="group_title" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Название группы
          </label>
          <input
            id="group_title"
            v-model="title"
            type="text"
            placeholder="Например: Семья, Команда проекта, Друзья..."
            class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label for="group_description" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Описание группы (необязательно)
          </label>
          <textarea
            id="group_description"
            v-model="description"
            rows="2"
            placeholder="Опишите назначение группы..."
            class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
          />
        </div>

        <!-- Добавление участников группы -->
        <div class="flex flex-col gap-2">
          <label class="block text-xs font-semibold text-surface-on cursor-pointer">
            Участники группы <span class="text-surface-onVariant/60 font-normal">({{ selectedMembers.length }})</span>
          </label>

          <!-- Выбранные участники в виде M3 чипов -->
          <div v-if="selectedMembers.length > 0" class="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-surface-low/80 border border-surface-high/40">
            <div
              v-for="(member, idx) in selectedMembers"
              :key="member.id || idx"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-surface-on text-xs font-medium border border-primary/20"
            >
              <span>{{ member.first_name }} {{ member.last_name || '' }}</span>
              <button
                type="button"
                aria-label="Удалить участника"
                class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
                @click="removeMember(idx)"
              >
                <span class="material-symbols-rounded text-xs">close</span>
              </button>
            </div>
          </div>

          <!-- Поиск участников для группы -->
          <div class="relative">
            <span class="absolute left-3.5 top-2.5 material-symbols-rounded text-surface-onVariant/60 text-lg pointer-events-none">
              person_search
            </span>
            <input
              v-model="groupSearchQuery"
              type="text"
              placeholder="Добавить участников по @username или имени..."
              class="w-full pl-10 pr-4 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-xs sm:text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              @input="handleGroupSearchInput"
            />
          </div>

          <!-- Выпадающий список найденных участников для группы -->
          <div v-if="groupSearchResults.length > 0" class="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar p-1 rounded-2xl bg-surface-low border border-surface-high/50">
            <div
              v-for="user in groupSearchResults"
              :key="user.id"
              class="flex items-center justify-between p-2 rounded-xl hover:bg-surface-high/60 transition-colors cursor-pointer text-xs"
              @click="addMember(user)"
            >
              <div class="flex items-center gap-2">
                <M3Avatar :src="user.avatar_url" :name="user.first_name" size="sm" />
                <span class="font-semibold text-surface-on">{{ user.first_name }} {{ user.last_name || '' }}</span>
                <span class="text-surface-onVariant/60 font-mono">@{{ user.username }}</span>
              </div>
              <span class="material-symbols-rounded text-primary text-base">add</span>
            </div>
          </div>
        </div>

        <!-- Кнопки внизу для группы -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-surface-high/40">
          <M3Button variant="text" size="md" @click="closeModal">
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="md"
            :disabled="!title.trim()"
            :loading="isSubmitting"
            @click="submitGroupChat"
          >
            Создать группу
          </M3Button>
        </div>
      </template>

      <!-- ================================================================= -->
      <!-- ================================================================= -->
      <!-- C) КАНАЛ (type === 'channel')                                     -->
      <!-- ================================================================= -->
      <template v-else-if="type === 'channel'">
        <!-- Выбор аватарки канала -->
        <div class="flex items-center gap-3.5 mb-1">
          <div class="relative shrink-0">
            <div
              class="w-16 h-16 rounded-full overflow-hidden bg-surface-low border-2 border-dashed border-surface-high hover:border-primary flex items-center justify-center cursor-pointer transition-all m3-press-effect group"
              @click="avatarFileInput?.click()"
            >
              <img
                v-if="chatAvatarUrl"
                :src="chatAvatarUrl"
                alt="Аватар канала"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex flex-col items-center justify-center text-surface-onVariant/60 group-hover:text-primary transition-colors">
                <span class="material-symbols-rounded text-xl">add_a_photo</span>
              </div>
            </div>
            <button
              v-if="chatAvatarUrl"
              type="button"
              class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-high hover:bg-rose-500 hover:text-white text-surface-onVariant flex items-center justify-center transition-colors cursor-pointer"
              title="Удалить фото"
              @click.stop="chatAvatarUrl = ''"
            >
              <span class="material-symbols-rounded text-xs">close</span>
            </button>
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-surface-on">Аватарка канала</span>
            <span class="text-[11px] text-surface-onVariant/70">Нажмите, чтобы выбрать и кадрировать фото</span>
          </div>
        </div>

        <div>
          <label for="channel_title" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Название канала
          </label>
          <input
            id="channel_title"
            v-model="title"
            type="text"
            placeholder="Например: Новости tobo, Блог разработчика..."
            class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label for="channel_description" class="block text-xs font-semibold text-surface-on mb-1.5 cursor-pointer">
            Правила и описание канала
          </label>
          <textarea
            id="channel_description"
            v-model="description"
            rows="4"
            placeholder="Укажите правила вещания, тематику постов и описание канала для подписчиков..."
            class="w-full px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all leading-relaxed"
          />
        </div>

        <!-- Кнопки внизу для канала -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-surface-high/40">
          <M3Button variant="text" size="md" @click="closeModal">
            Отмена
          </M3Button>
          <M3Button
            variant="filled"
            size="md"
            :disabled="!title.trim()"
            :loading="isSubmitting"
            @click="submitChannel"
          >
            Создать канал
          </M3Button>
        </div>
      </template>
    </div>

    <!-- Скрытый инпут выбора файла для аватарки группы или канала -->
    <input
      ref="avatarFileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleAvatarFileSelect"
    />

    <!-- Модалка кадрирования аватарки -->
    <AvatarCropperModal
      v-model="showCropperModal"
      :image-src="cropperImageSrc"
      @crop-complete="handleCropComplete"
    />
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ChatType, Profile } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Button from '@/components/ui/M3Button.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import AvatarCropperModal from '@/components/profile/AvatarCropperModal.vue';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  type: ChatType;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const chatStore = useChatStore();
const toastStore = useToastStore();

// Общие поля
const title = ref('');
const description = ref('');
const isSubmitting = ref(false);

// Аватарка для группы / канала
const chatAvatarUrl = ref('');
const showCropperModal = ref(false);
const cropperImageSrc = ref('');
const avatarFileInput = ref<HTMLInputElement | null>(null);

function handleAvatarFileSelect(event: Event) {
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

function handleCropComplete(result: string | { base64: string; blob?: Blob }) {
  const base64 = typeof result === 'string' ? result : result.base64;
  chatAvatarUrl.value = base64;
}

// Поля для личного диалога
const searchQuery = ref('');
const searchResults = ref<Profile[]>([]);
const selectedUser = ref<Profile | null>(null);
const isSearching = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Поля для участников группы
const selectedMembers = ref<Profile[]>([]);
const groupSearchQuery = ref('');
const groupSearchResults = ref<Profile[]>([]);
let groupSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const modalTitle = computed(() => {
  switch (props.type) {
    case 'direct':
      return 'Новый личный диалог';
    case 'group':
      return 'Создать группу';
    case 'channel':
      return 'Создать канал';
    default:
      return 'Создать чат';
  }
});

function resetForm() {
  title.value = '';
  description.value = '';
  chatAvatarUrl.value = '';
  searchQuery.value = '';
  searchResults.value = [];
  selectedUser.value = null;
  selectedMembers.value = [];
  groupSearchQuery.value = '';
  groupSearchResults.value = [];
  isSubmitting.value = false;
  isSearching.value = false;
}

function closeModal() {
  emit('update:modelValue', false);
  resetForm();
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      resetForm();
    }
  }
);

// Поиск для личного диалога
async function executeSearch() {
  const query = searchQuery.value.trim();
  if (!query) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  try {
    const results = await chatStore.searchUsers(query);
    searchResults.value = results;
  } catch (err) {
    console.warn('Ошибка поиска пользователей:', err);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
}

function handleSearchInput() {
  selectedUser.value = null;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    executeSearch();
  }, 250);
}

function clearDirectSelection() {
  searchQuery.value = '';
  searchResults.value = [];
  selectedUser.value = null;
}

function selectUser(user: Profile) {
  selectedUser.value = user;
  searchQuery.value = `${user.first_name} ${user.last_name || ''}`.trim();
  searchResults.value = [];
}

function selectCustomName(customName: string) {
  selectedUser.value = {
    id: `custom-${Date.now()}`,
    first_name: customName,
    username: customName.toLowerCase().replace(/\s+/g, '_'),
    is_online: false,
    created_at: new Date().toISOString()
  };
  searchResults.value = [];
}

// Запрос списка контактов телефона через Contact Picker API
async function pickPhoneContact() {
  if ('contacts' in navigator && 'ContactsManager' in window) {
    try {
      const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel'], { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        const query = c.name?.[0] || c.email?.[0] || c.tel?.[0] || '';
        if (query) {
          searchQuery.value = query;
          executeSearch();
        }
      }
    } catch (e) {
      console.warn('Contact picker cancelled or failed:', e);
    }
  } else {
    toastStore.show(
      'Импорт контактов доступен в мобильных браузерах (Android Chrome). Используйте поиск по @username или имени',
      'info'
    );
  }
}

// Поиск участников для группы
function handleGroupSearchInput() {
  if (groupSearchDebounceTimer) clearTimeout(groupSearchDebounceTimer);
  groupSearchDebounceTimer = setTimeout(async () => {
    const query = groupSearchQuery.value.trim();
    if (!query) {
      groupSearchResults.value = [];
      return;
    }
    const results = await chatStore.searchUsers(query);
    const existingIds = new Set(selectedMembers.value.map(m => m.id));
    groupSearchResults.value = results.filter(u => !existingIds.has(u.id));
  }, 250);
}

function addMember(user: Profile) {
  selectedMembers.value.push(user);
  groupSearchQuery.value = '';
  groupSearchResults.value = [];
}

function removeMember(idx: number) {
  selectedMembers.value.splice(idx, 1);
}

// Отправка форм создания
async function submitDirectChat() {
  let target: Profile | null = selectedUser.value;
  if (!target) {
    const q = searchQuery.value.trim();
    if (!q) return;
    target = {
      id: `custom-${Date.now()}`,
      first_name: q,
      username: q.toLowerCase().replace(/\s+/g, '_'),
      is_online: false,
      created_at: new Date().toISOString()
    };
  }

  isSubmitting.value = true;
  try {
    await chatStore.createDirectChat(target);
    toastStore.show('Диалог успешно открыт', 'success');
    closeModal();
  } catch (err) {
    console.error('Ошибка создания прямого диалога:', err);
    toastStore.show('Не удалось создать диалог', 'error');
  } finally {
    isSubmitting.value = false;
  }
}

async function submitGroupChat() {
  if (!title.value.trim()) return;

  isSubmitting.value = true;
  try {
    const memberIds = selectedMembers.value.map(m => m.id).filter(Boolean);
    await chatStore.createGroupChat(
      title.value.trim(),
      memberIds,
      description.value.trim() || undefined,
      chatAvatarUrl.value || undefined
    );
    toastStore.show('Группа успешно создана', 'success');
    closeModal();
  } catch (err) {
    console.error('Ошибка создания группы:', err);
    toastStore.show('Не удалось создать группу', 'error');
  } finally {
    isSubmitting.value = false;
  }
}

async function submitChannel() {
  if (!title.value.trim()) return;

  isSubmitting.value = true;
  try {
    await chatStore.createChannel(
      title.value.trim(),
      description.value.trim() || undefined,
      chatAvatarUrl.value || undefined
    );
    toastStore.show('Канал успешно создан', 'success');
    closeModal();
  } catch (err) {
    console.error('Ошибка создания канала:', err);
    toastStore.show('Не удалось создать канал', 'error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
