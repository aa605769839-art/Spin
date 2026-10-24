import { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { channelApi } from '@/services';
import { currentUser } from '@/services/mockData';
import Avatar from '@/components/Avatar';
import NavBar from '@/components/NavBar';
import './index.scss';

interface Fields {
  name: string;
  address: string;
  age: string;
  contact: string;
  bio: string;
}

/**
 * 个人资料编辑页（按频道独立保存）。
 * 保存写入当前频道的成员资料，不影响你在其它频道的资料。
 */
export default function ProfileEdit() {
  const [channelName, setChannelName] = useState('');
  const [fields, setFields] = useState<Fields>({
    name: currentUser.name,
    address: currentUser.address || '',
    age: currentUser.age ? String(currentUser.age) : '',
    contact: '',
    bio: '',
  });

  const cid = channelApi.getCurrentChannelId();

  useEffect(() => {
    if (!cid) return;
    const profile = channelApi.myChannelProfile(cid);
    setChannelName(channelApi.getChannel(cid)?.name || '');
    setFields({
      name: profile.name || currentUser.name,
      address: profile.address || '',
      age: profile.age ? String(profile.age) : '',
      contact: profile.contact || '',
      bio: profile.bio || '',
    });
  }, [cid]);

  const update = (key: keyof Fields) => (e: { detail: { value: string } }) => {
    setFields((prev) => ({ ...prev, [key]: e.detail.value }));
  };

  const handleSave = () => {
    const name = fields.name.trim();
    if (!name) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none', duration: 1600 });
      return;
    }
    const ageNum = parseInt(fields.age, 10);
    const profile = {
      name,
      address: fields.address.trim(),
      age: Number.isFinite(ageNum) && ageNum > 0 ? ageNum : undefined,
      contact: fields.contact.trim(),
      bio: fields.bio.trim(),
    };
    if (cid) {
      channelApi.updateMyProfile(cid, profile);
    }
    Taro.showToast({ title: '已保存', icon: 'success', duration: 1500 });
    setTimeout(() => {
      try {
        Taro.navigateBack();
      } catch (e) {
        Taro.switchTab({ url: '/pages/mine/index' });
      }
    }, 700);
  };

  return (
    <View className='profile-edit'>
      <NavBar title='编辑资料' showBack />

      <View className='profile-edit__hero'>
        <Avatar user={{ ...currentUser, name: fields.name || currentUser.name }} size='lg' />
        <Text className='profile-edit__hero-tip'>
          {channelName ? `以下资料仅保存在《${channelName}》` : '以下资料仅保存在当前频道'}
        </Text>
      </View>

      <View className='profile-edit__card'>
        <View className='field'>
          <Text className='field__label'>昵称</Text>
          <Input
            className='field__input'
            value={fields.name}
            maxlength={12}
            placeholder='怎么称呼您'
            placeholderClass='field__placeholder'
            onInput={update('name')}
          />
        </View>
        <View className='field'>
          <Text className='field__label'>地址</Text>
          <Input
            className='field__input'
            value={fields.address}
            maxlength={20}
            placeholder='如 北京市 朝阳区'
            placeholderClass='field__placeholder'
            onInput={update('address')}
          />
        </View>
        <View className='field'>
          <Text className='field__label'>年龄</Text>
          <Input
            className='field__input'
            value={fields.age}
            type='number'
            maxlength={3}
            placeholder='您的岁数'
            placeholderClass='field__placeholder'
            onInput={update('age')}
          />
        </View>
        <View className='field'>
          <Text className='field__label'>紧急联系人</Text>
          <Input
            className='field__input'
            value={fields.contact}
            maxlength={20}
            placeholder='子女或家属电话'
            placeholderClass='field__placeholder'
            onInput={update('contact')}
          />
        </View>
        <View className='field field--last'>
          <Text className='field__label'>个性签名</Text>
          <Input
            className='field__input'
            value={fields.bio}
            maxlength={30}
            placeholder='一句话介绍自己'
            placeholderClass='field__placeholder'
            onInput={update('bio')}
          />
        </View>
      </View>

      <View className='profile-edit__footer'>
        <View className='profile-edit__save' onClick={handleSave}>
          <Text className='profile-edit__save-text'>保存资料</Text>
        </View>
      </View>
    </View>
  );
}
