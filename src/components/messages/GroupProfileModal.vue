<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Информация о группе"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="chat" class="flex flex-col gap-5">
      <!-- Шапка группы -->
      <div class="flex items-center gap-4">
        <M3Avatar
          :src="chat.avatar_url"
          :name="chat.title"
          size="xl"
        />
        <div class="flex flex-col">
          <h3 class="text-xl font-bold text-surface-on">
            {{ chat.title }}
          </h3>
          <span class="text-xs text-surface-onVariant/70 mt-0.5 font-medium">
            {{ currentMembers.length }} участников ({{ onlineCount }} в сети)
          </span>
        </div>
      </div>

      <!-- Описание группы -->
      <div v-if="chat.description" class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 text-xs text-surface-on leading-relaxed">
        {{ chat.description }}
      </div>

      <!-- ВМЕСТО ОБЩИХ ГРУПП: ПОЛНЫЙ СПИСОК УЧАСТНИКОВ С РОЛЯМИ -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold uppercase tracking-wider text-surface-onVariant/80">
            Участники группы ({{ currentMembers.length }})
          </span>
          <button
            class="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            @click="handleAddMember"
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
              <M3Avatar
                :src="member.profile?.avatar_url"
                :name="member.profile?.first_name || 'Участник'"
                size="sm"
                :is-online="member.profile?.is_online"
                show-online
              />
              <div class="flex flex-col">
                <span class="text-xs font-bold text-surface-on">
                  {{ member.profile?.first_name }} {{ member.profile?.last_name || '' }}
                </span>
                <span class="text-[10px] text-surface-onVariant/60 font-mono">
                  @{{ member.profile?.username }}
                </span>
              </div>
            </div>

            <!-- Роль и управление -->
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

              <!-- Кнопка удаления для админа -->
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
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Chat, ChatMember } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import { currentUserMock, mishaProfileMock, annaProfileMock } from '@/lib/mockData';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const toastStore = useToastStore();

const currentMembers = ref<ChatMember[]>([]);

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

function handleAddMember() {
  toastStore.show('Выберите пользователя для добавления в группу', 'info');
}
</script>
