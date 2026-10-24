import { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Conversation } from '@/types/community';
import { messageApi } from '@/services';
import { formatTime } from '@/utils/format';
import Avatar from '@/components/Avatar';
import NavBar from '@/components/NavBar';
import EmptyState from '@/components/EmptyState';
import PageState from '@/components/PageState';
import './index.scss';

/**
 * 私信 / 群组列表页（频道作用域）。
 * 顺序：群组（置顶，含频道所有人）→ 消息提醒（置顶）→ 私信，其余按最近时间倒序。
 */
export default function Messages() {
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    messageApi
      .listConversations()
      .then(setList)
      .catch((e) => setError((e as Error).message || '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useDidShow(load);

  const openChat = (conv: Conversation) => {
    setList((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
    messageApi.markRead(conv.id).catch(() => {});
    Taro.navigateTo({ url: `/pages/chat/index?id=${conv.id}` });
  };

  const renderIcon = (c: Conversation) => {
    if (c.kind === 'group') {
      return (
        <View className='msg-item__group-icon'>
          <Text className='msg-item__group-icon-text'>👥</Text>
        </View>
      );
    }
    if (c.kind === 'system') {
      return <View className='msg-item__sys-icon'>{c.peer.name === '消息提醒' ? '🔔' : '📢'}</View>;
    }
    return <Avatar user={c.peer} size='lg' />;
  };

  const renderName = (c: Conversation) => {
    if (c.kind === 'group') return c.title || '群聊';
    if (c.kind === 'system') return c.peer.name;
    return c.peer.name;
  };

  return (
    <View className='messages'>
      <NavBar title='私信' showBack={false} />

      {loading ? (
        <PageState type='loading' />
      ) : error ? (
        <PageState type='error' text={error} onRetry={load} />
      ) : list.length === 0 ? (
        <EmptyState title='还没有会话' hint='在群聊里点头像就能给邻居发私信啦' />
      ) : (
        <View className='messages__list'>
          {list.map((c) => (
            <View
              key={c.id}
              className={`msg-item ${c.pinned ? 'is-pinned' : ''} msg-item--${c.kind}`}
              onClick={() => openChat(c)}
            >
              {renderIcon(c)}
              <View className='msg-item__body'>
                <View className='msg-item__top'>
                  <Text className='msg-item__name'>
                    {renderName(c)}
                    {c.pinned ? <Text className='msg-item__pin'>置顶</Text> : null}
                    {c.kind === 'group' && c.memberIds ? (
                      <Text className='msg-item__count'>{c.memberIds.length} 人</Text>
                    ) : null}
                  </Text>
                  <Text className='msg-item__time'>{formatTime(c.lastAt)}</Text>
                </View>
                <View className='msg-item__bottom'>
                  <Text className='msg-item__preview'>{c.lastMessage || '开始聊天吧'}</Text>
                  {c.unread > 0 ? (
                    <View className='msg-item__unread'>
                      <Text className='msg-item__unread-text'>{c.unread > 99 ? '99+' : c.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
