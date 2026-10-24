import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Announcement, Post } from '@/types/community';
import { communityApi, channelApi } from '@/services';
import { currentUser } from '@/services/mockData';
import { weatherFor } from '@/utils/weather';
import PostCard from '@/components/PostCard';
import EmptyState from '@/components/EmptyState';
import PageState from '@/components/PageState';
import './index.scss';

const TOPIC_FILTERS = ['全部', '生活分享', '健康养生', '活动召集'];
const TOPIC_ICONS: Record<string, string> = {
  全部: '🌟',
  生活分享: '🍲',
  健康养生: '💪',
  活动召集: '📢',
};
const NOTICE_ICONS = ['📌', '🎉', '💡', '📢', '🌟'];
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 动态（原邻里圈）首页 —— 频道作用域的信息流。
 * - 无频道时整页引导（创建 / 用邀请码加入）；
 * - 顶部不放个人头像，留天气与问候；天气按「当前频道资料里的地址」派生；
 * - 话题筛选胶囊一排横滑；发帖入口右下角固定；
 * - 「公告」由频道创建者管理，普通成员仅查看。
 */
export default function Feed() {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('全部');
  const [firstLoaded, setFirstLoaded] = useState(false);

  const todayLabel = (() => {
    const n = new Date();
    return `${n.getMonth() + 1}月${n.getDate()}日 ${WEEK[n.getDay()]}`;
  })();

  const syncChannel = useCallback(() => {
    const cid = channelApi.ensureCurrentChannel();
    setChannelId(cid);
    if (cid) {
      setIsCreator(channelApi.isCreator(cid));
      setAnnouncements(channelApi.getAnnouncements(cid));
    }
  }, []);

  const weather = useMemo(() => {
    const addr = (channelId && channelApi.myChannelProfile(channelId).address) || currentUser.address;
    return weatherFor(addr);
  }, [channelId]);

  const myName = channelId ? channelApi.myChannelProfile(channelId).name || currentUser.name : currentUser.name;
  const channelName = channelId ? channelApi.getChannel(channelId)?.name : '';

  const load = useCallback(
    async (nextCursor?: string, replace = false) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const page = await communityApi.fetchFeed(nextCursor);
        setPosts((prev) => (replace ? page.list : [...prev, ...page.list]));
        setCursor(page.nextCursor || undefined);
        setHasMore(page.hasMore);
      } catch (e) {
        console.warn('[feed] 加载失败', e);
        setError((e as Error).message || '加载失败');
      } finally {
        setLoading(false);
        setFirstLoaded(true);
      }
    },
    [loading]
  );

  useEffect(() => {
    syncChannel();
    if (channelApi.getCurrentChannelId()) load(undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDidShow(() => {
    syncChannel();
    if (channelApi.getCurrentChannelId()) load(undefined, true);
  });

  const handleLike = async (post: Post) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked: !p.liked, likeCount: Math.max(0, p.likeCount + (p.liked ? -1 : 1)) }
          : p
      )
    );
    try {
      await communityApi.toggleLike(post.id);
    } catch (e) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, liked: post.liked, likeCount: post.likeCount } : p))
      );
      Taro.showToast({ title: '操作没成功，请再试一次', icon: 'none', duration: 2000 });
    }
  };

  const handleOpen = (post: Post) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${post.id}` });
  };
  const handlePublish = () => Taro.navigateTo({ url: '/pages/publish/index' });
  const handleSwitch = () => Taro.navigateTo({ url: '/pages/channel-switch/index' });
  const handleManageNotice = () => Taro.navigateTo({ url: '/pages/announcement-manage/index' });

  const visiblePosts = topic === '全部' ? posts : posts.filter((p) => p.topic === topic);

  // —— 无频道：整页引导 ——
  if (!channelId) {
    return (
      <View className='feed feed--onboard'>
        <View className='onboard'>
          <Text className='onboard__brand ec-gradient-text'>频道</Text>
          <Text className='onboard__title'>欢迎来到你的邻里频道</Text>
          <Text className='onboard__sub'>你还没有任何频道。创建一个，或用朋友发来的邀请链接加入。</Text>
          <View className='onboard__actions'>
            <View className='onboard__btn onboard__btn--primary' onClick={() => Taro.navigateTo({ url: '/pages/channel-create/index' })}>
              <Text className='onboard__btn-icon'>+</Text>
              <Text className='onboard__btn-text'>创建频道</Text>
            </View>
            <View className='onboard__btn' onClick={() => Taro.navigateTo({ url: '/pages/channel-join/index' })}>
              <Text className='onboard__btn-icon'>🔗</Text>
              <Text className='onboard__btn-text'>用邀请码加入</Text>
            </View>
          </View>
          <Text className='onboard__hint'>每个用户最多可创建或加入 3 个频道</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='feed'>
      <View className='feed__hero'>
        <View className='feed__hero-top'>
          <View className='feed__hero-greet'>
            <Text className='feed__brand ec-gradient-text'>{channelName}</Text>
            <Text className='feed__greeting'>早上好，{myName}</Text>
            <Text className='feed__subtitle'>看看今天街坊邻居都聊了些什么</Text>
          </View>
          <View className='feed__switch' onClick={handleSwitch}>
            <Text className='feed__switch-icon'>⇄</Text>
            <Text className='feed__switch-text'>切换</Text>
          </View>
        </View>
        <View className='feed__hero-tags'>
          <Text className='feed__weather'>
            {weather.icon} {weather.label} {weather.temp}°
          </Text>
          <Text className='feed__weather-dist'>{weather.district}</Text>
          <Text className='feed__date'>{todayLabel}</Text>
        </View>
      </View>

      <View className='feed__filters'>
        {TOPIC_FILTERS.map((t) => (
          <View
            key={t}
            className={`feed__filter ${topic === t ? 'is-active' : ''}`}
            onClick={() => setTopic(t)}
          >
            <Text className='feed__filter-icon'>{TOPIC_ICONS[t]}</Text>
            <Text className='feed__filter-text'>{t}</Text>
          </View>
        ))}
      </View>

      <View className='feed__highlights'>
        <View className='feed__highlights-head'>
          <Text className='feed__highlights-title'>📣 公告</Text>
          {isCreator ? (
            <View className='feed__manage' onClick={handleManageNotice}>
              <Text className='feed__manage-text'>管理</Text>
            </View>
          ) : (
            <Text className='feed__highlights-sub'>左右滑动看看</Text>
          )}
        </View>
        <View className='feed__highlights-scroll'>
          {announcements.map((n, i) => (
            <View key={n.id} className='notice-card'>
              <Text className='notice-card__icon'>{NOTICE_ICONS[i % NOTICE_ICONS.length]}</Text>
              <Text className='notice-card__title'>{n.title}</Text>
              <Text className='notice-card__body'>{n.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='feed__list'>
        {!firstLoaded && loading ? <PageState type='loading' /> : null}

        {firstLoaded && error && posts.length === 0 ? (
          <PageState type='error' text={error} onRetry={() => load(undefined, true)} />
        ) : null}

        {firstLoaded && !error && visiblePosts.length === 0 ? (
          <EmptyState
            title={topic === '全部' ? '还没有邻居发言哦' : `「${topic}」暂时没有新内容`}
            hint='您可以先说两句，邻居们就都来啦'
            actionText='我要发言'
            onAction={handlePublish}
          />
        ) : null}

        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onLike={handleLike} onOpen={handleOpen} />
        ))}
      </View>

      {firstLoaded && !error && hasMore && topic === '全部' ? (
        <View className='feed__more' onClick={() => load(cursor)}>
          <Text className='feed__more-text'>{loading ? '正在加载…' : '看更早的帖子'}</Text>
        </View>
      ) : null}

      {firstLoaded && !error && !hasMore && visiblePosts.length > 0 && topic === '全部' ? (
        <PageState type='end' />
      ) : null}

      <View className='feed__fab' onClick={handlePublish}>
        <Text className='feed__fab-icon'>✎</Text>
        <Text className='feed__fab-text'>发言</Text>
      </View>
    </View>
  );
}
