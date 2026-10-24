import { View, Text } from '@tarojs/components';
import { Post } from '@/types/community';
import { formatCount } from '@/utils/format';
import './index.scss';

interface Props {
  post: Post;
  /** 点赞回调（列表/详情都会传入，点击爱心切换） */
  onLike?: () => void;
  /** 评论回调（列表里点评论进入详情；详情页可不传，仅展示） */
  onComment?: () => void;
  /** 是否展示评论项，默认展示 */
  showComment?: boolean;
}

/**
 * 动态数据条：浏览量(👓) + 点赞(♥) + 评论(💬)。
 * 适老化要点：用「小标签 + 图标」紧凑并排，替代原来又大又占地方的长方形按钮；
 * 点赞可点（高亮红心），评论可点（列表里进详情）；点击均阻止冒泡，避免误触打开详情。
 */
export default function PostStats({ post, onLike, onComment, showComment = true }: Props) {
  return (
    <View className='post-stats'>
      <View className='post-stats__item post-stats__item--view'>
        <Text className='post-stats__icon'>👓</Text>
        <Text className='post-stats__num'>{formatCount(post.viewCount || 0)}</Text>
      </View>

      <View
        className={`post-stats__item post-stats__item--like ${post.liked ? 'is-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onLike && onLike();
        }}
      >
        <Text className={`post-stats__icon post-stats__icon--like ${post.liked ? 'is-liked' : ''}`}>
          {post.liked ? '♥' : '♡'}
        </Text>
        <Text className='post-stats__num'>{formatCount(post.likeCount)}</Text>
      </View>

      {showComment ? (
        <View
          className='post-stats__item post-stats__item--comment'
          onClick={(e) => {
            e.stopPropagation();
            onComment && onComment();
          }}
        >
          <Text className='post-stats__icon'>💬</Text>
          <Text className='post-stats__num'>{formatCount(post.commentCount)}</Text>
        </View>
      ) : null}
    </View>
  );
}
