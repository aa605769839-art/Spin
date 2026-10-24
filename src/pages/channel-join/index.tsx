import { useMemo, useState } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { channelApi } from '@/services';
import { currentUser } from '@/services/mockData';
import { decodeInvite, readInviteFromUrl } from '@/utils/invite';
import NavBar from '@/components/NavBar';
import './index.scss';

export default function ChannelJoin() {
  const router = useRouter();
  // 启动时带的 ?invite= 优先；其次支持手动粘贴邀请码
  const urlPayload = useMemo(() => readInviteFromUrl(), []);
  const codeFromUrl = router.params?.code;
  const pasted = decodeInvite(codeFromUrl || '');

  const initial = urlPayload || pasted;
  const [name, setName] = useState(currentUser.name);
  const [address, setAddress] = useState(currentUser.address || '');
  const [age, setAge] = useState(currentUser.age ? String(currentUser.age) : '');
  const [contact, setContact] = useState('');
  const [bio, setBio] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const payload = initial;
  const channelName = payload?.name || '';

  const handleJoin = () => {
    if (!payload) {
      const decoded = decodeInvite(manualCode.trim());
      if (!decoded) {
        Taro.showToast({ title: '邀请码无效', icon: 'none' });
        return;
      }
      doJoin(decoded);
      return;
    }
    doJoin(payload);
  };

  const doJoin = (p: { id: string; name: string; creatorName?: string }) => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = channelApi.joinChannel(p, {
      name: name.trim() || currentUser.name,
      address: address.trim(),
      age: age ? Number(age) : undefined,
      contact: contact.trim(),
      bio: bio.trim(),
    });
    setSubmitting(false);
    if (error) {
      Taro.showToast({ title: error, icon: 'none' });
      return;
    }
    Taro.showToast({ title: '已加入频道', icon: 'success' });
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className='page channel-join'>
      <NavBar title='加入频道' />
      <View className='join'>
        {channelName ? (
          <View className='join__hero'>
            <Text className='join__icon'>🔗</Text>
            <Text className='join__title'>加入《{channelName}》</Text>
            <Text className='join__sub'>填写下面的信息，你将成为频道的一员。</Text>
          </View>
        ) : (
          <View className='join__hero'>
            <Text className='join__icon'>🔗</Text>
            <Text className='join__title'>用邀请码加入</Text>
            <Text className='join__sub'>把朋友发来的邀请码粘贴到下面。</Text>
          </View>
        )}

        {!channelName ? (
          <View className='join__field'>
            <Text className='join__label'>邀请码</Text>
            <Input
              className='join__input'
              value={manualCode}
              placeholder='粘贴邀请码'
              placeholderClass='join__placeholder'
              onInput={(e) => setManualCode(e.detail.value)}
            />
          </View>
        ) : null}

        <View className='join__field'>
          <Text className='join__label'>昵称</Text>
          <Input
            className='join__input'
            value={name}
            maxlength={20}
            placeholder='你的昵称'
            placeholderClass='join__placeholder'
            onInput={(e) => setName(e.detail.value)}
          />
        </View>

        <View className='join__field'>
          <Text className='join__label'>所在地区（城市 + 区）</Text>
          <Input
            className='join__input'
            value={address}
            maxlength={30}
            placeholder='如 北京市 朝阳区'
            placeholderClass='join__placeholder'
            onInput={(e) => setAddress(e.detail.value)}
          />
        </View>

        <View className='join__row'>
          <View className='join__field join__field--half'>
            <Text className='join__label'>年龄</Text>
            <Input
              className='join__input'
              value={age}
              type='number'
              maxlength={3}
              placeholder='如 68'
              placeholderClass='join__placeholder'
              onInput={(e) => setAge(e.detail.value)}
            />
          </View>
        </View>

        <View className='join__field'>
          <Text className='join__label'>紧急联系人（选填）</Text>
          <Input
            className='join__input'
            value={contact}
            maxlength={30}
            placeholder='姓名 / 电话'
            placeholderClass='join__placeholder'
            onInput={(e) => setContact(e.detail.value)}
          />
        </View>

        <View className='join__field'>
          <Text className='join__label'>个性签名（选填）</Text>
          <Textarea
            className='join__textarea'
            value={bio}
            maxlength={60}
            placeholder='一句话介绍自己'
            placeholderClass='join__placeholder'
            onInput={(e) => setBio(e.detail.value)}
          />
        </View>

        <Text className='join__tip'>加入后资料仅在该频道内生效，可随时在「我的」中修改。</Text>

        <View className='join__submit' onClick={handleJoin}>
          <Text className='join__submit-text'>{submitting ? '加入中…' : '加入频道'}</Text>
        </View>
      </View>
    </View>
  );
}
