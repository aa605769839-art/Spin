import { useState } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { channelApi } from '@/services';
import NavBar from '@/components/NavBar';
import './index.scss';

export default function ChannelCreate() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请填写频道名称', icon: 'none' });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const { error } = channelApi.createChannel({ name, description: desc });
    setSubmitting(false);
    if (error) {
      Taro.showToast({ title: error, icon: 'none' });
      return;
    }
    Taro.showToast({ title: '频道已创建', icon: 'success' });
    Taro.switchTab({ url: '/pages/index/index' });
  };

  return (
    <View className='page channel-create'>
      <NavBar title='创建频道' />
      <View className='form'>
        <View className='form__field'>
          <Text className='form__label'>频道名称</Text>
          <Input
            className='form__input'
            value={name}
            maxlength={20}
            placeholder='如：阳光花园邻里'
            placeholderClass='form__placeholder'
            onInput={(e) => setName(e.detail.value)}
          />
        </View>

        <View className='form__field'>
          <Text className='form__label'>频道简介（选填）</Text>
          <Textarea
            className='form__textarea'
            value={desc}
            maxlength={120}
            placeholder='一句话介绍这个频道是做什么的'
            placeholderClass='form__placeholder'
            onInput={(e) => setDesc(e.detail.value)}
          />
        </View>

        <Text className='form__tip'>创建后你将作为创建者，可管理公告。最多可创建或加入 3 个频道。</Text>

        <View className='form__submit' onClick={handleCreate}>
          <Text className='form__submit-text'>{submitting ? '创建中…' : '创建频道'}</Text>
        </View>
      </View>
    </View>
  );
}
