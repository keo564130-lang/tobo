// ==============================================================================
// ХРАНИЛИЩЕ ЛЕНТЫ НОВОСТЕЙ С ПОДДЕРЖКОЙ SUPABASE И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Post, PostComment, PostAudience } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from './auth';
import { useChatStore } from './chat';

function loadIdSetFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw);
    return new Set<string>(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set<string>();
  }
}

function saveIdSetToStorage(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Игнорируем переполнение квоты localStorage
  }
}

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>(isSupabaseConfigured() ? [] : localStore.getRankedFeed());
  const isLoading = ref(false);
  const isCreatingPost = ref(false);
  const commentsMap = ref<Record<string, PostComment[]>>({});

  function deduplicatePosts(items: Post[]): Post[] {
    const map = new Map<string, Post>();
    items.forEach(p => {
      if (p && p.id) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }

  async function refreshFeed() {
    isLoading.value = true;
    try {
      const authStore = useAuthStore();
      let authUser: any = null;
      let currentUserId = authStore.user?.id || 'guest';

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data } = await supabase.auth.getUser();
          authUser = data?.user || null;
          if (authUser?.id) {
            currentUserId = authUser.id;
          }
        } catch (e) {
          console.warn('Supabase auth.getUser error in refreshFeed:', e);
        }
      }

      const likesKey = `tobo_user_likes_${currentUserId}`;
      const repostsKey = `tobo_user_reposts_${currentUserId}`;
      const bookmarksKey = `tobo_saved_post_ids_${currentUserId || 'guest'}`;

      const likedSet = loadIdSetFromStorage(likesKey);
      const repostedSet = loadIdSetFromStorage(repostsKey);
      const bookmarkSet = loadIdSetFromStorage(bookmarksKey);

      // При наличии authUser в Supabase параллельно запрашиваем post_likes и post_reposts
      if (authUser && isSupabaseConfigured() && supabase) {
        try {
          const [likesRes, repostsRes] = await Promise.all([
            supabase.from('post_likes').select('post_id').eq('user_id', authUser.id),
            supabase.from('post_reposts').select('post_id').eq('user_id', authUser.id)
          ]);

          if (!likesRes.error && likesRes.data) {
            likesRes.data.forEach((r: { post_id: string }) => likedSet.add(r.post_id));
            saveIdSetToStorage(likesKey, likedSet);
          }
          if (!repostsRes.error && repostsRes.data) {
            repostsRes.data.forEach((r: { post_id: string }) => repostedSet.add(r.post_id));
            saveIdSetToStorage(repostsKey, repostedSet);
          }
        } catch (syncErr) {
          console.warn('Parallel likes/reposts fetch error:', syncErr);
        }
      }

      const applyInteractions = (items: Post[]): Post[] => {
        items.forEach(post => {
          post.is_liked = likedSet.has(post.id);
          post.is_reposted = repostedSet.has(post.id);
          post.is_bookmarked = bookmarkSet.has(post.id);
        });
        return items;
      };

      if (isSupabaseConfigured() && supabase) {
        // 1. Попытка запроса к функции get_ranked_feed в Supabase PostgreSQL
        const { data, error } = await supabase.rpc('get_ranked_feed', {
          page_offset: 0,
          page_limit: 30
        });

        if (!error && data) {
          const mappedPosts: Post[] = data.map((row: any) => ({
            id: row.id,
            author_id: row.author_id,
            author: {
              id: row.author_id,
              username: row.author_username,
              first_name: row.author_first_name,
              last_name: row.author_last_name,
              avatar_url: row.author_avatar_url,
              is_developer: Boolean(row.author_is_developer),
              is_online: false,
              created_at: row.created_at
            },
            content: row.content,
            media_urls: row.media_urls || [],
            disable_comments: row.disable_comments,
            audience: row.audience as PostAudience,
            likes_count: Number(row.likes_count),
            comments_count: Number(row.comments_count),
            reposts_count: Number(row.reposts_count),
            views_count: Number(row.views_count),
            created_at: row.created_at,
            rank_score: Number(row.rank_score)
          }));
          posts.value = deduplicatePosts(applyInteractions(mappedPosts));
          return;
        }

        // 2. Если RPC не сработал, прямой select из таблицы posts
        const { data: directPosts, error: directError } = await supabase
          .from('posts')
          .select(`
            id,
            author_id,
            content,
            media_urls,
            disable_comments,
            audience,
            likes_count,
            comments_count,
            reposts_count,
            views_count,
            created_at,
            author:profiles(id, username, first_name, last_name, avatar_url, is_developer)
          `)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!directError && directPosts) {
          const mappedPosts: Post[] = directPosts.map((row: any) => ({
            id: row.id,
            author_id: row.author_id,
            author: row.author ? {
              id: row.author.id,
              username: row.author.username,
              first_name: row.author.first_name,
              last_name: row.author.last_name,
              avatar_url: row.author.avatar_url,
              is_developer: Boolean(row.author.is_developer),
              is_online: false,
              created_at: row.created_at
            } : undefined,
            content: row.content,
            media_urls: row.media_urls || [],
            disable_comments: row.disable_comments,
            audience: row.audience as PostAudience,
            likes_count: Number(row.likes_count || 0),
            comments_count: Number(row.comments_count || 0),
            reposts_count: Number(row.reposts_count || 0),
            views_count: Number(row.views_count || 0),
            created_at: row.created_at,
            rank_score: 0
          }));
          posts.value = deduplicatePosts(applyInteractions(mappedPosts));
          return;
        }

        // При активном Supabase: если постов нет или ошибка — строго пустой массив! Никаких моков!
        posts.value = [];
        return;
      }

      // Офлайн режим
      const localFeed = localStore.getRankedFeed();
      posts.value = deduplicatePosts(applyInteractions(localFeed));
    } catch (err) {
      console.warn('Supabase feed fetch failed:', err);
      if (isSupabaseConfigured()) {
        posts.value = [];
        return;
      }
      const localFeed = localStore.getRankedFeed();
      posts.value = deduplicatePosts(localFeed);
    } finally {
      isLoading.value = false;
    }
  }

  async function createPost(
    content: string, 
    mediaUrls: string[] = [], 
    disableComments: boolean = false, 
    audience: PostAudience = 'all'
  ) {
    if (isCreatingPost.value) return null;
    isCreatingPost.value = true;
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('Пользователь не авторизован');
        }

        const { data, error } = await supabase.from('posts').insert({
          author_id: authUser.id,
          content,
          media_urls: mediaUrls,
          disable_comments: disableComments,
          audience
        }).select().single();

        if (!error && data) {
          await refreshFeed();
          return data;
        }
        return null;
      } else {
        // Офлайн режим
        const localPost = localStore.createPost(content, mediaUrls, disableComments, audience);
        refreshFeed();
        return localPost;
      }
    } catch (err) {
      console.warn('Supabase post insert failed:', err);
      return null;
    } finally {
      isCreatingPost.value = false;
    }
  }

  async function toggleLike(postId: string): Promise<{ isLiked: boolean; count: number }> {
    let post = posts.value.find(p => p.id === postId);
    if (!post) {
      post = localStore.getPost(postId);
    }
    if (!post) return { isLiked: false, count: 0 };

    const willLike = !post.is_liked;
    post.is_liked = willLike;
    post.likes_count = Math.max(0, (post.likes_count || 0) + (willLike ? 1 : -1));

    const authStore = useAuthStore();
    let currentUserId = authStore.user?.id || 'guest';

    if (isSupabaseConfigured() && supabase) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        currentUserId = authUser.id;
      }
      const likesKey = `tobo_user_likes_${currentUserId}`;
      const likedSet = loadIdSetFromStorage(likesKey);
      if (willLike) likedSet.add(postId);
      else likedSet.delete(postId);
      saveIdSetToStorage(likesKey, likedSet);

      if (authUser) {
        try {
          if (willLike) {
            await supabase.from('post_likes').upsert({ post_id: postId, user_id: authUser.id });
          } else {
            await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', authUser.id);
          }
          await supabase.from('posts').update({ likes_count: Math.max(0, post.likes_count) }).eq('id', postId);
        } catch (err) {
          console.warn('Supabase toggleLike failed:', err);
        }
      }
      return { isLiked: willLike, count: post.likes_count };
    }

    // Офлайн-режим
    post.is_liked = !willLike;
    post.likes_count = Math.max(0, post.likes_count + (willLike ? -1 : 1));
    const res = localStore.toggleLikePost(postId);
    post.is_liked = res.isLiked;
    post.likes_count = res.count;
    post.rank_score = localStore.calculatePostScore(post);

    const likesKey = `tobo_user_likes_${currentUserId}`;
    const likedSet = loadIdSetFromStorage(likesKey);
    if (res.isLiked) likedSet.add(postId);
    else likedSet.delete(postId);
    saveIdSetToStorage(likesKey, likedSet);

    return res;
  }

  function toggleRepost(postId: string): { isReposted: boolean; count: number } {
    let post = posts.value.find(p => p.id === postId);
    if (!post) {
      post = localStore.getPost(postId);
    }
    if (!post) return { isReposted: false, count: 0 };

    const willRepost = !post.is_reposted;
    post.is_reposted = willRepost;
    post.reposts_count = Math.max(0, (post.reposts_count || 0) + (willRepost ? 1 : -1));

    const authStore = useAuthStore();
    let currentUserId = authStore.user?.id || 'guest';

    // Сразу сохраняем ID в кэше localStorage
    const repostsKey = `tobo_user_reposts_${currentUserId}`;
    const repostedSet = loadIdSetFromStorage(repostsKey);
    if (willRepost) repostedSet.add(postId);
    else repostedSet.delete(postId);
    saveIdSetToStorage(repostsKey, repostedSet);

    if (isSupabaseConfigured() && supabase) {
      // Background Supabase sync
      (async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            if (authUser.id !== currentUserId) {
              const authRepostsKey = `tobo_user_reposts_${authUser.id}`;
              const authRepostedSet = loadIdSetFromStorage(authRepostsKey);
              if (willRepost) authRepostedSet.add(postId);
              else authRepostedSet.delete(postId);
              saveIdSetToStorage(authRepostsKey, authRepostedSet);
            }
            if (willRepost) {
              await supabase.from('post_reposts').insert({ post_id: postId, user_id: authUser.id });
            } else {
              await supabase.from('post_reposts').delete().eq('post_id', postId).eq('user_id', authUser.id);
            }
            await supabase.from('posts').update({ reposts_count: Math.max(0, post!.reposts_count) }).eq('id', postId);
          }
        } catch (err) {
          console.warn('Supabase toggleRepost sync failed:', err);
        }
      })();

      return { isReposted: willRepost, count: post.reposts_count };
    }

    // Офлайн-режим
    post.is_reposted = !willRepost;
    post.reposts_count = Math.max(0, post.reposts_count + (willRepost ? -1 : 1));
    const res = localStore.toggleRepost(postId);
    post.is_reposted = res.isReposted;
    post.reposts_count = res.count;
    post.rank_score = localStore.calculatePostScore(post);

    const offlineKey = `tobo_user_reposts_${currentUserId}`;
    const offlineSet = loadIdSetFromStorage(offlineKey);
    if (res.isReposted) offlineSet.add(postId);
    else offlineSet.delete(postId);
    saveIdSetToStorage(offlineKey, offlineSet);

    return res;
  }

  function toggleBookmark(postId: string): boolean {
    let post = posts.value.find(p => p.id === postId);
    if (!post) {
      post = localStore.getPost(postId);
    }
    if (!post) return false;

    post.is_bookmarked = !post.is_bookmarked;
    const isBookmarked = post.is_bookmarked;

    const authStore = useAuthStore();
    const userId = authStore.user?.id || 'guest';
    const bookmarksKey = `tobo_saved_post_ids_${userId || 'guest'}`;
    const bookmarkSet = loadIdSetFromStorage(bookmarksKey);
    if (isBookmarked) {
      bookmarkSet.add(postId);
    } else {
      bookmarkSet.delete(postId);
    }
    saveIdSetToStorage(bookmarksKey, bookmarkSet);

    // Синхронизация с localStore при наличии записи
    const localPost = localStore.getPost(postId);
    if (localPost) {
      localPost.is_bookmarked = isBookmarked;
    }

    // Если post.is_bookmarked === true: автоматически находим чат типа saved и вызываем sendMessage
    if (isBookmarked) {
      const chatStore = useChatStore();
      (async () => {
        try {
          let savedChat = chatStore.chats.find(c => c.type === 'saved');
          if (!savedChat && isSupabaseConfigured() && supabase) {
            await chatStore.refreshChats();
            savedChat = chatStore.chats.find(c => c.type === 'saved');
            if (!savedChat) {
              savedChat = await chatStore.createChat('saved', 'Избранное', 'Ваше персональное облачное хранилище') as any;
            }
          }
          if (!savedChat && !isSupabaseConfigured()) {
            savedChat = localStore.getChats().find(c => c.type === 'saved');
          }

          if (savedChat) {
            await chatStore.sendMessage({
              chat_id: savedChat.id,
              content: `🔖 Сохраненный пост от @${post!.author?.username || 'пользователя'}:\n\n${post!.content.slice(0, 140)}${post!.content.length > 140 ? '...' : ''}`,
              forwarded_post_id: post!.id,
              forwarded_post: post
            });
          }
        } catch (err) {
          console.warn('Failed to forward bookmarked post to saved chat:', err);
        }
      })();
    }

    return isBookmarked;
  }

  function getComments(postId: string): PostComment[] {
    if (isSupabaseConfigured() && supabase) {
      if (!commentsMap.value[postId]) {
        commentsMap.value[postId] = [];
        // Асинхронно подгружаем комментарии из Supabase
        supabase
          .from('comments')
          .select('*, author:profiles(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) {
              const tempComments = (commentsMap.value[postId] || []).filter(c => c.id.startsWith('temp-'));
              const loadedComments: PostComment[] = data.map((c: any) => ({
                id: c.id,
                post_id: c.post_id,
                author_id: c.author_id,
                author: c.author,
                text: c.text,
                parent_id: c.parent_id,
                created_at: c.created_at
              }));
              commentsMap.value[postId] = [...loadedComments, ...tempComments];
            }
          });
      }
      return commentsMap.value[postId] || [];
    }
    const localComments = localStore.getComments(postId);
    commentsMap.value[postId] = localComments;
    return localComments;
  }

  async function addComment(postId: string, text: string, parentId?: string | null): Promise<PostComment | undefined> {
    let post = posts.value.find(p => p.id === postId);
    if (!post) {
      post = localStore.getPost(postId);
    }
    if (!post) return undefined;
    if (post.disable_comments) return undefined;

    const authStore = useAuthStore();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: PostComment = {
      id: tempId,
      post_id: postId,
      author_id: authStore.user?.id || 'guest',
      author: { ...authStore.user },
      text,
      parent_id: parentId || null,
      created_at: new Date().toISOString()
    };

    if (!commentsMap.value[postId]) {
      commentsMap.value[postId] = [];
    }
    commentsMap.value[postId].push(optimisticComment);
    post.comments_count = (post.comments_count || 0) + 1;

    if (isSupabaseConfigured() && supabase) {
      (async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const authorId = authUser?.id || authStore.user?.id;
          if (!authorId) return;

          const { data, error } = await supabase.from('comments').insert({
            post_id: postId,
            author_id: authorId,
            text,
            parent_id: parentId || null
          }).select('*, author:profiles(*)').single();

          if (!error && data) {
            const list = commentsMap.value[postId];
            if (list) {
              const target = list.find(c => c.id === tempId);
              if (target) {
                target.id = data.id;
                if (data.author) target.author = data.author;
                if (data.created_at) target.created_at = data.created_at;
              }
            }
            await supabase.from('posts').update({ comments_count: post!.comments_count }).eq('id', postId);
          } else if (error) {
            console.warn('Supabase comment insert error:', error);
          }
        } catch (err) {
          console.warn('Supabase addComment background failed:', err);
        }
      })();

      return optimisticComment;
    }

    // Офлайн режим
    const localComment = localStore.addComment(postId, text, parentId);
    const list = commentsMap.value[postId];
    if (list) {
      const idx = list.findIndex(c => c.id === tempId);
      if (idx !== -1) {
        list[idx] = localComment;
      }
    }
    post.rank_score = localStore.calculatePostScore(post);
    return localComment;
  }

  async function deletePost(postId: string): Promise<boolean> {
    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) {
          console.warn('Supabase deletePost error:', error);
          return false;
        }
      } else {
        localStore.deletePost(postId);
      }
      posts.value = posts.value.filter(p => p.id !== postId);
      delete commentsMap.value[postId];
      return true;
    } catch (err) {
      console.warn('deletePost failed:', err);
      return false;
    }
  }

  function getUserPosts(userId: string): Post[] {
    if (isSupabaseConfigured()) {
      return posts.value.filter(p => p.author_id === userId);
    }
    return localStore.getUserPosts(userId);
  }

  // Realtime подписка только для офлайн режима
  localStore.subscribe((event) => {
    if (!isSupabaseConfigured()) {
      if (['new_post', 'post_updated', 'new_comment', 'post_deleted'].includes(event.type)) {
        refreshFeed();
      }
    }
  });

  return {
    posts,
    isLoading,
    isCreatingPost,
    commentsMap,
    refreshFeed,
    createPost,
    deletePost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    getComments,
    addComment,
    getUserPosts
  };
});
