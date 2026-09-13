// ==============================================================================
// ХРАНИЛИЩЕ ЛЕНТЫ НОВОСТЕЙ С ПОДДЕРЖКОЙ SUPABASE И OFFLINE-FALLBACK (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Post, PostComment, PostAudience } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>(localStore.getRankedFeed());
  const isLoading = ref(false);

  async function refreshFeed() {
    isLoading.value = true;
    try {
      if (isSupabaseConfigured() && supabase) {
        // Запрос к функции get_ranked_feed в Supabase PostgreSQL
        const { data, error } = await supabase.rpc('get_ranked_feed', {
          page_offset: 0,
          page_limit: 30
        });

        if (!error && data && data.length > 0) {
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
      }
    } catch (err) {
      console.warn('Supabase feed fetch failed, falling back to localStore:', err);
    } finally {
      isLoading.value = false;
    }

    // Офлайн/демо фолбэк
    posts.value = localStore.getRankedFeed();
  }

  async function createPost(
    content: string, 
    mediaUrls: string[] = [], 
    disableComments: boolean = false, 
    audience: PostAudience = 'all'
  ) {
    // Оптимистичное сохранение локально
    const localPost = localStore.createPost(content, mediaUrls, disableComments, audience);
    refreshFeed();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('posts').insert({
          content,
          media_urls: mediaUrls,
          disable_comments: disableComments,
          audience
        });
      } catch (err) {
        console.warn('Supabase post insert failed, saved to local cache:', err);
      }
    }

    return localPost;
  }

  async function toggleLike(postId: string) {
    const res = localStore.toggleLikePost(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_liked = res.isLiked;
      post.likes_count = res.count;
      post.rank_score = localStore.calculatePostScore(post);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        if (res.isLiked) {
          await supabase.from('post_likes').insert({ post_id: postId });
        } else {
          await supabase.from('post_likes').delete().eq('post_id', postId);
        }
      } catch (err) {
        console.warn('Supabase toggleLike failed:', err);
      }
    }

    return res;
  }

  function toggleRepost(postId: string) {
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
    return localStore.getComments(postId);
  }

  async function addComment(postId: string, text: string, parentId?: string | null): Promise<PostComment> {
    const comment = localStore.addComment(postId, text, parentId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.comments_count += 1;
      post.rank_score = localStore.calculatePostScore(post);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('comments').insert({
          post_id: postId,
          text,
          parent_id: parentId || null
        });
      } catch (err) {
        console.warn('Supabase addComment failed:', err);
      }
    }

    return comment;
  }

  function getUserPosts(userId: string): Post[] {
    return localStore.getUserPosts(userId);
  }

  // Realtime подписка
  localStore.subscribe((event) => {
    if (['new_post', 'post_updated', 'new_comment'].includes(event.type)) {
      refreshFeed();
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
