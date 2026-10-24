import { useCallback, useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Channel } from '@/types/community';
import { channelApi } from '@/services';
import { currentUser } from '@/services/mockData';
import { buildInviteLink, encodeInvite } from '@/utils/invite';
import NavBar from '@/components/NavBar';
import './index.scss';

export default function ChannelSwitch() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const list = currentUser.channelIds
      .map((id) => channelApi.getChannel(id))
      .filter((c): c is Channel => !!c);
    setChannels(list);
    setCurrentId(channelApi.getCurrentChannelId());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useDidShow(() => {
    refresh();
  });

  const handleSelect = (id: string) => {
    channelApi.setCurrentChannel(id);
    Taro.navigateBack();
  };

  // 复制当前频道的邀请链接（频道中任何人都能发送）
  const copyInvite = () => {
    const ch = currentId ? channelApi.getChannel(currentId) : undefined;
    if (!ch) return;
    const link = buildInviteLink(encodeInvite(ch));
    Taro.setClipboardData({ data: link });
  };

  const canCreateMore = currentUser.channelIds.length < channelApi.MAX_CHANNELS;

  return (
    <View className='page channel-switch'>
      <NavBar title='切换频道' />
      <View className='switch'>
        <Text className='switch__hint'>你已加入 {channels.length} / {channelApi.MAX_CHANNELS} 个频道</Text>

        <View className='switch__list'>
          {channels.map((c) => (
            <View
              key={c.id}
              className={`switch__item ${currentId === c.id ? 'is-current' : ''}`}
              onClick={() => handleSelect(c.id)}
            >
              <View className='switch__item-main'>
                <Text className='switch__name'>{c.name}</Text>
                <Text className='switch__meta'>
                  {c.creatorId === currentUser.id ? '创建者' : '成员'} · {c.memberIds.length} 人
                </Text>
              </View>
              {currentId === c.id ? <Text className='switch__current-tag'>当前</Text> : null}
            </View>
          ))}

          {channels.length === 0 ? (
            <View className='switch__empty'>
              <Text className='switch__empty-text'>你还没有加入任何频道</Text>
            </View>
          ) : null}
        </View>

        <View className='switch__actions'>
          <View
            className='switch__btn'
            onClick={() => Taro.navigateTo({ url: '/pages/channel-create/index' })}
          >
            <Text className='switch__btn-icon'>+</Text>
            <Text className='switch__btn-text'>创建频道</Text>
          </View>
          <View
            className='switch__btn'
            onClick={() => Taro.navigateTo({ url: '/pages/channel-join/index' })}
          >
            <Text className='switch__btn-icon'>🔗</Text>
            <Text className='switch__btn-text'>用邀请码加入</Text>
          </View>
        </View>

        {currentId ? (
          <View className='switch__invite'>
            <Text className='switch__invite-title'>邀请邻居加入</Text>
            <Text className='switch__invite-sub'>把邀请链接发给朋友，对方打开并填资料即可加入本频道</Text>
            <View className='switch__invite-btn' onClick={copyInvite}>
              <Text className='switch__invite-btn-text'>复制邀请链接</Text>
            </View>
          </View>
        ) : null}

        {!canCreateMore ? (
          <Text className='switch__limit'>已达上限（{channelApi.MAX_CHANNELS} 个），无法再创建或加入</Text>
        ) : null}
      </View>
    </View>
  );
}
