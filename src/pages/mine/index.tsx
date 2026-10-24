import { useCallback, useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Post } from '@/types/community';
import { communityApi, channelApi, dataSourceLabel } from '@/services';
import { currentUser } from '@/services/mockData';
import Avatar from '@/components/Avatar';
import EmptyState from '@/components/EmptyState';
import './index.scss';

/**
 * 我的页面（频道作用域）。
 * 顶部「我是谁」名片取自当前频道的个人资料；点击名片跳编辑（按频道独立保存）。
 * 提供「切换频道」入口；频道创建者额外可见「管理公告」。
 */
export default function Mine() {
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState({ name: currentUser.name, address: currentUser.address, age: currentUser.age });
  const [channelName, setChannelName] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [hasChannel, setHasChannel] = useState(true);

  const sync = useCallback(() => {
    const cid = channelApi.ensureCurrentChannel();
    if (!cid) {
      setHasChannel(false);
      return;
    }
    setHasChannel(true);
    setProfile(channelApi.myChannelProfile(cid));
    setChannelName(channelApi.getChannel(cid)?.name || '');
    setIsCreator(channelApi.isCreator(cid));
    communityApi.fetchMyPosts().then(setMyPosts).catch(() => {});
  }, []);

  useEffect(sync, [sync]);
  useDidShow(sync);

  const openMessages = () => {
    try {
      Taro.switchTab({ url: '/pages/messages/index' });
    } catch (e) {
      Taro.navigateTo({ url: '/pages/messages/index' });
    }
  };

  const openProfile = () => Taro.navigateTo({ url: '/pages/profile-edit/index' });
  const openSwitch = () => Taro.navigateTo({ url: '/pages/channel-switch/index' });
  const openManage = () => Taro.navigateTo({ url: '/pages/announcement-manage/index' });

  if (!hasChannel) {
    return (
      <View className='mine'>
        <View className='mine__empty'>
          <Text className='mine__empty-text'>你还没有加入任何频道</Text>
          <View className='mine__empty-btn' onClick={openSwitch}>
            <Text className='mine__empty-btn-text'>去切换 / 创建频道</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className='mine'>
      <View className='mine__profile' onClick={openProfile}>
        <Avatar user={{ ...currentUser, name: profile.name || currentUser.name, avatar: currentUser.avatar }} size='lg' />
        <View className='mine__profile-info'>
          <Text className='mine__profile-name'>{profile.name || currentUser.name}</Text>
          <Text className='mine__profile-meta'>{profile.address || '北京市 朝阳区'}</Text>
          <Text className='mine__profile-meta'>{profile.age || currentUser.age} 岁 · {channelName}</Text>
        </View>
        <Text className='mine__profile-edit'>编辑 ›</Text>
      </View>

      <View className='mine__switch' onClick={openSwitch}>
        <Text className='mine__switch-icon'>⇄</Text>
        <Text className='mine__switch-text'>切换频道</Text>
        <Text className='mine__switch-arrow'>›</Text>
      </View>

      {isCreator ? (
        <View className='mine__manage' onClick={openManage}>
          <Text className='mine__manage-icon'>📣</Text>
          <View className='mine__manage-body'>
            <Text className='mine__manage-title'>管理公告</Text>
            <Text className='mine__manage-desc'>编辑本频道的公告内容</Text>
          </View>
          <Text className='mine__manage-arrow'>›</Text>
        </View>
      ) : null}

      <View className='mine__stats'>
        <View className='mine__stat'>
          <Text className='mine__stat-num'>{myPosts.length}</Text>
          <Text className='mine__stat-label'>我的发言</Text>
        </View>
        <View className='mine__stat'>
          <Text className='mine__stat-num'>{myPosts.reduce((sum, p) => sum + p.likeCount, 0)}</Text>
          <Text className='mine__stat-label'>收到点赞</Text>
        </View>
        <View className='mine__stat'>
          <Text className='mine__stat-num'>{myPosts.reduce((sum, p) => sum + p.commentCount, 0)}</Text>
          <Text className='mine__stat-label'>收到评论</Text>
        </View>
      </View>

      <View className='mine__dm' onClick={openMessages}>
        <Text className='mine__dm-icon'>💬</Text>
        <View className='mine__dm-body'>
          <Text className='mine__dm-title'>我的私信</Text>
          <Text className='mine__dm-desc'>和邻居一对一聊天</Text>
        </View>
        <Text className='mine__dm-arrow'>›</Text>
      </View>

      <View className='mine__section'>
        <Text className='mine__section-title'>我的发言</Text>
        {myPosts.length === 0 ? (
          <EmptyState
            title='您还没有发过言'
            hint='到动态里说两句，邻居们就认识您了'
            actionText='去发言'
            onAction={() => Taro.navigateTo({ url: '/pages/publish/index' })}
          />
        ) : (
          myPosts.map((p) => (
            <View
              key={p.id}
              className='mine__post'
              onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${p.id}` })}
            >
              <Text className='mine__post-text'>{p.content}</Text>
              <View className='mine__post-foot'>
                <Text className='mine__post-topic'>{p.topic || '邻里日常'}</Text>
                <Text className='mine__post-count'>
                  {p.likeCount} 赞 · {p.commentCount} 评论
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Text className='mine__footer'>当前数据来源：{dataSourceLabel}</Text>
    </View>
  );
}
