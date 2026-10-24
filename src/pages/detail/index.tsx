import { useCallback, useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Comment, Post } from '@/types/community';
import { communityApi, messageApi } from '@/services';
import { formatTime } from '@/utils/format';
import Avatar from '@/components/Avatar';
import ImageGrid from '@/components/ImageGrid';
import NavBar from '@/components/NavBar';
import PageState from '@/components/PageState';
import EmptyState from '@/components/EmptyState';
import PostStats from '@/components/PostStats';
import './index.scss';

/**
 * 动态详情页。
 *
 * 适老化设计：
 *   - 顶部导航栏返回，符合老人对「怎么回去」的心智；
 *   - 正文完整展示，字号 34rpx，行高 1.9；
 *   - 配图走统一九宫格，点击可看大图；
 *   - 评论支持「回复」，回复时输入框上方出现「回复 @某某」提示，可一键取消；
 *   - 可给作者「私信」，直接进入单聊；
 *   - 点赞用爱心图标，红色填充表示已赞；
 *   - 评论输入框固定在底部，高度 96rpx，字号 34rpx，键盘弹起时不遮挡。
 */
export default function Detail() {
  const router = useRouter();
  const postId = router.params?.id || '';

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // 评论回复态：记录被回复的评论 id 与昵称
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    if (!postId) {
      setError('没找到这条帖子');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        communityApi.fetchPostDetail(postId),
        communityApi.fetchComments(postId),
      ]);
      if (!p) {
        setError('这条帖子可能已被删除');
      }
      setPost(p);
      setComments(c);
    } catch (e) {
      setError((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = async () => {
    if (!post) return;
    const snapshot = post;
    setPost({ ...post, liked: !post.liked, likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1)) });
    try {
      await communityApi.toggleLike(post.id);
    } catch (e) {
      setPost(snapshot);
      Taro.showToast({ title: '操作没成功，请再试一次', icon: 'none', duration: 2000 });
    }
  };

  const handleReply = (c: Comment) => {
    setReplyTo({ id: c.id, name: c.author.name });
  };

  const cancelReply = () => setReplyTo(null);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || !post) return;
    const replyToId = replyTo?.id;
    setSending(true);
    try {
      const c = await communityApi.addComment({ postId: post.id, content, replyToId });
      setComments((prev) => [...prev, c]);
      setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
      setDraft('');
      setReplyTo(null);
      Taro.showToast({ title: '评论成功', icon: 'success', duration: 1500 });
    } catch (e) {
      Taro.showToast({ title: '评论没发出去，请再试一次', icon: 'none', duration: 2000 });
    } finally {
      setSending(false);
    }
  };

  const handleDm = async () => {
    if (!post) return;
    try {
      const conv = await messageApi.ensureConversation(post.author);
      Taro.navigateTo({ url: `/pages/chat/index?id=${conv.id}` });
    } catch (e) {
      Taro.showToast({ title: '暂时打不开私信', icon: 'none', duration: 1500 });
    }
  };

  if (loading) {
    return (
      <View className='detail'>
        <NavBar title='动态详情' />
        <PageState type='loading' />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View className='detail'>
        <NavBar title='动态详情' />
        <PageState type='error' text={error || '没找到这条帖子'} onRetry={load} />
      </View>
    );
  }

  return (
    <View className='detail'>
      <NavBar title='动态详情' />

      <View className='detail__main'>
        <View className='detail__head'>
          <Avatar user={post.author} size='md' />
          <View className='detail__who'>
            <Text className='detail__name'>{post.author.name}</Text>
            <Text className='detail__meta'>{formatTime(post.createdAt)}</Text>
          </View>
          <View className='detail__head-right'>
            {post.topic ? <Text className='detail__topic'>{post.topic}</Text> : null}
            <View className='detail__dm' onClick={handleDm}>
              <Text className='detail__dm-icon'>✉️</Text>
              <Text className='detail__dm-text'>私信</Text>
            </View>
          </View>
        </View>

        <Text className='detail__content'>{post.content}</Text>

        {post.images && post.images.length > 0 ? <ImageGrid images={post.images} large /> : null}

        {post.audioDuration ? (
          <View className='detail__audio'>
            <Text className='detail__audio-icon'>🔊</Text>
            <Text className='detail__audio-text'>语音 {post.audioDuration} 秒</Text>
          </View>
        ) : null}

        <PostStats post={post} onLike={handleLike} />
      </View>

      <View className='detail__comments'>
        <Text className='detail__comments-title'>邻居们怎么说（{comments.length}）</Text>

        {comments.length === 0 ? (
          <EmptyState title='还没有人评论' hint='您可以第一个说两句' />
        ) : (
          comments.map((c) => (
            <View key={c.id} className='detail__comment'>
              <Avatar user={c.author} size='sm' />
              <View className='detail__comment-body'>
                <View className='detail__comment-top'>
                  <Text className='detail__comment-name'>{c.author.name}</Text>
                  {c.replyTo ? (
                    <Text className='detail__comment-reply'>回复 {c.replyTo.name}</Text>
                  ) : null}
                </View>
                <Text className='detail__comment-text'>{c.content}</Text>
                <View className='detail__comment-foot'>
                  <Text className='detail__comment-time'>{formatTime(c.createdAt)}</Text>
                  <Text className='detail__comment-reply-btn' onClick={() => handleReply(c)}>
                    回复
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View className='detail__input-bar'>
        {replyTo ? (
          <View className='detail__reply-tip'>
            <Text className='detail__reply-tip-text'>回复 @{replyTo.name}</Text>
            <Text className='detail__reply-tip-close' onClick={cancelReply}>
              ×
            </Text>
          </View>
        ) : null}
        <View className='detail__input-row'>
          <Input
            className='detail__input'
            value={draft}
            maxlength={200}
            confirmType='send'
            placeholder={replyTo ? `回复 ${replyTo.name}…` : '说两句…'}
            placeholderClass='detail__input-placeholder'
            onInput={(e) => setDraft(e.detail.value)}
            onConfirm={handleSend}
          />
          <View
            className={`detail__send ${draft.trim() && !sending ? '' : 'is-disabled'}`}
            onClick={handleSend}
          >
            <Text className='detail__send-text'>{sending ? '发送中' : '发送'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
