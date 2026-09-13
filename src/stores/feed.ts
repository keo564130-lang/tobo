// ==============================================================================
// ХРАНИЛИЩЕ ЛЕНТЫ НОВОСТЕЙ С ПОДДЕРЖКОЙ SUPABASE И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Post, PostComment, PostAudience } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>(isSupabaseConfigured() ? [] : localStore.getRankedFeed());
  const isLoading = ref(false);
  const commentsMap = ref<Record<string, PostComment[]>>({});

  async function refreshFeed() {
    isLoading.value = true;
    try {
      if (isSupabaseConfigured() && supabase) {
        // 1. Попытка запроса к функции get_ranked_feed в Supabase PostgreSQL
        const { data, error } = await supabase.rpc('get_ranked_feed', {
          page_offset: 0,
          page_limit: 30
        });

        if (!error && data) {
          posts.value = data.map((row: any) => ({
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
          posts.value = directPosts.map((row: any) => ({
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
          return;
        }

        // При активном Supabase: если постов нет или ошибка — строго пустой массив! Никаких моков!
        posts.value = [];
        return;
      }
    } catch (err) {
      console.warn('Supabase feed fetch failed:', err);
      if (isSupabaseConfigured()) {
        posts.value = [];
        return;
      }
    } finally {
      isLoading.value = false;
    }

    if (!isSupabaseConfigured()) {
      posts.value = localStore.getRankedFeed();
    }
  }

  async function createPost(
    content: string, 
    mediaUrls: string[] = [], 
    disableComments: boolean = false, 
    audience: PostAudience = 'all'
  ) {
    if (isSupabaseConfigured() && supabase) {
      try {
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
      } catch (err) {
        console.warn('Supabase post insert failed:', err);
      }
      return null;
    }

    // Офлайн режим
    const localPost = localStore.createPost(content, mediaUrls, disableComments, audience);
    refreshFeed();
    return localPost;
  }

  async function toggleLike(postId: string) {
    if (isSupabaseConfigured() && supabase) {
      const post = posts.value.find(p => p.id === postId);
      if (!post) return { isLiked: false, count: 0 };

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return { isLiked: false, count: post.likes_count };

      const willLike = !post.is_liked;
      post.is_liked = willLike;
      post.likes_count += willLike ? 1 : -1;

      try {
        if (willLike) {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: authUser.id });
        } else {
          await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', authUser.id);
        }
      } catch (err) {
        console.warn('Supabase toggleLike failed:', err);
      }
      return { isLiked: willLike, count: post.likes_count };
    }

    const res = localStore.toggleLikePost(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_liked = res.isLiked;
      post.likes_count = res.count;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return res;
  }

  function toggleRepost(postId: string): { isReposted: boolean; count: number } {
    if (isSupabaseConfigured() && supabase) {
      const post = posts.value.find(p => p.id === postId);
      if (!post) return { isReposted: false, count: 0 };

      const willRepost = !post.is_reposted;
      post.is_reposted = willRepost;
      post.reposts_count += willRepost ? 1 : -1;

      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (!authUser || !supabase) return;
        if (willRepost) {
          supabase.from('post_reposts').insert({ post_id: postId, user_id: authUser.id }).then();
        } else {
          supabase.from('post_reposts').delete().eq('post_id', postId).eq('user_id', authUser.id).then();
        }
      });

      return { isReposted: willRepost, count: post.reposts_count };
    }

    const res = localStore.toggleRepost(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_reposted = res.isReposted;
      post.reposts_count = res.count;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return res;
  }

  function toggleBookmark(postId: string) {
    const isBookmarked = localStore.toggleBookmark(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_bookmarked = isBookmarked;
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
              commentsMap.value[postId] = data.map((c: any) => ({
                id: c.id,
                post_id: c.post_id,
                author_id: c.author_id,
                author: c.author,
                text: c.text,
                parent_id: c.parent_id,
                created_at: c.created_at
              }));
            }
          });
      }
      return commentsMap.value[postId] || [];
    }
    return localStore.getComments(postId);
  }

  async function addComment(postId: string, text: string, parentId?: string | null): Promise<PostComment | undefined> {
    if (isSupabaseConfigured() && supabase) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return undefined;

      try {
        const { data, error } = await supabase.from('comments').insert({
          post_id: postId,
          author_id: authUser.id,
          text,
          parent_id: parentId || null
        }).select('*, author:profiles(*)').single();

        if (!error && data) {
          const post = posts.value.find(p => p.id === postId);
          if (post) {
            post.comments_count += 1;
          }
          if (!commentsMap.value[postId]) {
            commentsMap.value[postId] = [];
          }
          commentsMap.value[postId].push(data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase addComment failed:', err);
      }
      return undefined;
    }

    const comment = localStore.addComment(postId, text, parentId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.comments_count += 1;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return comment;
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
      if (['new_post', 'post_updated', 'new_comment'].includes(event.type)) {
        refreshFeed();
      }
    }
  });

  return {
    posts,
    isLoading,
    refreshFeed,
    createPost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    getComments,
    addComment,
    getUserPosts
  };
});
