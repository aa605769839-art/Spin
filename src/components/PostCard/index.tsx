import { View, Text } from '@tarojs/components';
import { Post } from '@/types/community';
import { formatTime } from '@/utils/format';
import Avatar from '../Avatar';
import ImageGrid from '../ImageGrid';
import PostStats from '../PostStats';
import './index.scss';

interface Props {
  post: Post;
  onLike: (post: Post) => void;
  onOpen: (post: Post) => void;
}

/** 话题 → 配色类名，给不同话题不同的柔和色，避免整页一个色调显得单调 */
const TOPIC_CLASS: Record<string, string> = {
  邻里互助: 'help',
  生活分享: 'share',
  健康养生: 'health',
  活动召集: 'event',
};

export function isHot(post: Post): boolean {
  return post.likeCount + post.commentCount >= 80;
}

/**
 * 动态卡片。
 * 适老化要点：
 *   - 正文 34rpx(≈17px)、行高 1.85、最多折 6 行，超出由详情页承接；
 *   - 点赞 / 评论用图标 + 数字呈现（整块可点，最小高 88rpx）；
 *   - 点赞用爱心图标，红色填充表示已赞，反馈直观；
 *   - 配图走统一九宫格组件，点击可看大图；
 *   - 热门动态加火焰徽标，增加视觉层次。
 */
export default function PostCard({ post, onLike, onOpen }: Props) {
  const topic = post.topic || '邻里日常';
  const topicClass = TOPIC_CLASS[topic] || 'default';
  const hot = isHot(post);

  return (
    <View className='post-card ec-fade-up'>
      <View className='post-card__head'>
        <Avatar user={post.author} size='md' />
        <View className='post-card__who'>
          <Text className='post-card__name'>{post.author.name}</Text>
          <Text className='post-card__meta'>{formatTime(post.createdAt)}</Text>
        </View>
        <View className='post-card__tags'>
          {hot ? <Text className='post-card__hot'>🔥 热门</Text> : null}
          <Text className={`post-card__topic post-card__topic--${topicClass}`}>{topic}</Text>
        </View>
      </View>

      <View className='post-card__body' onClick={() => onOpen(post)}>
        <Text className='post-card__text'>{post.content}</Text>

        {post.images && post.images.length > 0 && <ImageGrid images={post.images} />}

        {post.audioDuration ? (
          <View className='post-card__audio'>
            <Text className='post-card__audio-icon'>🔊</Text>
            <Text className='post-card__audio-text'>语音 {post.audioDuration} 秒</Text>
          </View>
        ) : null}
      </View>

      <PostStats
        post={post}
        onLike={() => onLike(post)}
        onComment={() => onOpen(post)}
      />
    </View>
  );
}
