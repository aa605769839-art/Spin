import { useEffect, useRef, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { AppNotification, CommunityUser, Conversation, Message } from '@/types/community';
import { messageApi, channelApi } from '@/services';
import { currentUser } from '@/services/mockData';
import { formatTime } from '@/utils/format';
import Avatar from '@/components/Avatar';
import NavBar from '@/components/NavBar';
import PageState from '@/components/PageState';
import './index.scss';

type DmCheck = { ok: boolean; reason?: string; unreplied?: number };

/**
 * 聊天页（频道作用域）。三种会话：
 * - group：公共群聊（频道所有人），顶部成员头像墙，点头像即可给某人发起私信；
 * - dm：私信，规则——对方未回复时单向最多 3 条，对方可「拒收」；
 * - system：消息提醒卡片，进入即已读，无输入框。
 */
export default function Chat() {
  const router = useRouter();
  const convId = router.params?.id || '';
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [dmCheck, setDmCheck] = useState<DmCheck>({ ok: true });

  useEffect(() => {
    if (!convId) {
      setError('没找到这个会话');
      setLoading(false);
      return;
    }
    setLoading(true);
    messageApi
      .listConversations()
      .then(
        (convs): Promise<{ kind: 'sys'; ns: AppNotification[] } | { kind: 'chat'; ms: Message[] }> => {
          const found = convs.find((c) => c.id === convId) || null;
          setConv(found);
          return found && found.kind === 'system'
            ? messageApi.listNotifications().then((ns) => ({ kind: 'sys' as const, ns }))
            : messageApi.getMessages(convId).then((ms) => ({ kind: 'chat' as const, ms }));
        }
      )
      .then((res) => {
        if (res.kind === 'sys') {
          setNotifs(res.ns);
          setMessages([]);
          messageApi.markNotificationsRead().catch(() => {});
        } else {
          setMessages(res.ms);
          setNotifs([]);
        }
      })
      .catch((e) => setError((e as Error).message || '加载失败'))
      .finally(() => setLoading(false));
  }, [convId]);

  const cid = conv?.channelId;
  const isGroup = conv?.kind === 'group';
  const isSystem = conv?.kind === 'system';
  const isDm = conv?.kind === 'dm';

  // 私信发送权限（每次发送后刷新）
  useEffect(() => {
    if (isDm && conv?.peer && cid) {
      setDmCheck(channelApi.canSendDm(currentUser.id, conv.peer.id, cid));
    } else {
      setDmCheck({ ok: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv]);

  useEffect(() => {
    try {
      const el = bottomRef.current;
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      /* ignore */
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || !convId) return;
    if (isDm && conv?.peer && cid) {
      const check = channelApi.canSendDm(currentUser.id, conv.peer.id, cid);
      if (!check.ok) {
        Taro.showToast({ title: check.reason || '暂时无法发送', icon: 'none', duration: 2000 });
        setDmCheck(check);
        return;
      }
    }
    setSending(true);
    try {
      const res = await messageApi.sendMessage(convId, content);
      if (!res.ok) {
        Taro.showToast({ title: res.error || '发送失败', icon: 'none' });
        return;
      }
      setMessages((prev) => [...prev, res.message!]);
      setDraft('');
      if (cid && conv?.peer) setDmCheck(channelApi.canSendDm(currentUser.id, conv.peer.id, cid));
    } catch (e) {
      Taro.showToast({ title: '没发出去，请再试一次', icon: 'none', duration: 1800 });
    } finally {
      setSending(false);
    }
  };

  const handleReject = () => {
    if (!isDm || !conv?.peer || !cid) return;
    Taro.showModal({
      title: '拒收消息',
      content: `确定拒收「${conv.peer.name}」发来的消息吗？拒收后对方将无法再给你发私信。`,
      success: (r) => {
        if (r.confirm) {
          channelApi.rejectDm(currentUser.id, conv.peer!.id, cid!);
          setDmCheck(channelApi.canSendDm(currentUser.id, conv.peer!.id, cid!));
          Taro.showToast({ title: '已拒收', icon: 'success' });
        }
      },
    });
  };

  const openDm = async (peer: CommunityUser) => {
    const c = await messageApi.ensureConversation(peer);
    Taro.navigateTo({ url: `/pages/chat/index?id=${c.id}` });
  };

  const title = isGroup ? conv?.title || '群聊' : isSystem ? '消息提醒' : conv?.peer?.name || '私信';

  if (loading) {
    return (
      <View className='chat'>
        <NavBar title={title} />
        <PageState type='loading' />
      </View>
    );
  }

  if (error || !conv) {
    return (
      <View className='chat'>
        <NavBar title='私信' />
        <PageState type='error' text={error || '会话不存在'} />
      </View>
    );
  }

  // 群聊成员头像墙
  const members = isGroup && cid ? channelApi.getMembers(cid) : [];
  const others = members.filter((m) => m.userId !== currentUser.id);

  return (
    <View className='chat'>
      <NavBar title={title} />

      <View className='chat__body'>
        {isGroup ? (
          <View className='chat__members'>
            <Text className='chat__members-tip'>点击邻居头像，给对方发私信</Text>
            <View className='chat__members-grid'>
              {members.map((m) => {
                const u: CommunityUser = {
                  id: m.userId,
                  name: m.profile.name || '邻居',
                  avatar: m.profile.avatar || '',
                  isSelf: m.userId === currentUser.id,
                };
                return (
                  <View
                    key={m.userId}
                    className='chat__member'
                    onClick={() => !u.isSelf && openDm(u)}
                  >
                    <Avatar user={u} size='md' />
                    <Text className='chat__member-name'>{u.isSelf ? '我' : u.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {isSystem ? (
          notifs.map((n) => (
            <View
              key={n.id}
              className='notify-card'
              onClick={() => n.postId && Taro.navigateTo({ url: `/pages/detail/index?id=${n.postId}` })}
            >
              <View className='notify-card__icon'>{n.icon}</View>
              <View className='notify-card__body'>
                <Text className='notify-card__title'>{n.title}</Text>
                <Text className='notify-card__text'>{n.body}</Text>
                <Text className='notify-card__time'>{formatTime(n.createdAt)}</Text>
              </View>
              {!n.read ? <View className='notify-card__dot' /> : null}
            </View>
          ))
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUser.id;
            const peerUser: CommunityUser = conv.peer || { id: '', name: '', avatar: '', isSelf: false };
            return (
              <View key={m.id} className={`bubble-row ${mine ? 'is-mine' : 'is-peer'}`}>
                {!mine ? <Avatar user={peerUser} size='sm' /> : null}
                <View className='bubble'>
                  <Text className='bubble__text'>{m.content}</Text>
                  <Text className='bubble__time'>{formatTime(m.createdAt)}</Text>
                </View>
                {mine ? <Avatar user={currentUser} size='sm' /> : null}
              </View>
            );
          })
        )}
        <View ref={bottomRef as any} className='chat__bottom' />
      </View>

      {isSystem ? (
        <View className='chat__sys-foot'>以上为系统消息提醒，无需回复</View>
      ) : (
        <View className='chat__input-bar'>
          {isDm && !dmCheck.ok ? (
            <View className='chat__dm-hint'>{dmCheck.reason}</View>
          ) : null}
          {isDm && dmCheck.ok && dmCheck.unreplied ? (
            <View className='chat__dm-hint chat__dm-hint--soft'>
              对方还未回复，你最多可再发 {3 - dmCheck.unreplied} 条
            </View>
          ) : null}
          <View className='chat__input-row'>
            <Input
              className='chat__input'
              value={draft}
              maxlength={200}
              confirmType='send'
              disabled={isDm && !dmCheck.ok}
              placeholder={isGroup ? '在群组里说点什么…' : '说点什么…'}
              placeholderClass='chat__input-placeholder'
              onInput={(e) => setDraft(e.detail.value)}
              onConfirm={handleSend}
            />
            <View
              className={`chat__send ${draft.trim() && !sending && !(isDm && !dmCheck.ok) ? '' : 'is-disabled'}`}
              onClick={handleSend}
            >
              <Text className='chat__send-text'>{sending ? '发送中' : '发送'}</Text>
            </View>
          </View>
          {isDm && conv.peer ? (
            <View className='chat__reject' onClick={handleReject}>
              <Text className='chat__reject-text'>拒收 {conv.peer.name} 的消息</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
