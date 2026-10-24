import { useState } from 'react';
import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { TOPICS } from '@/services/mockData';
import { communityApi } from '@/services';
import NavBar from '@/components/NavBar';
import './index.scss';

/**
 * 发布动态页。
 *
 * 适老化设计：
 *   - 输入区给足高度（400rpx）和 36rpx 大字号，避免老人反复滚动；
 *   - 话题不做下拉选择，改为「大胶囊单选」，一屏内可见全部选项；
 *   - 图片选择用系统相册（老人更熟悉），最多 9 张，选完可逐张删除；
 *   - 底部「发布」按钮整宽 104rpx 高，主色实心，位置固定不随键盘漂移。
 */
export default function Publish() {
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !submitting;

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });
      setImages((prev) => [...prev, ...(res.tempFilePaths || [])].slice(0, 9));
    } catch (e) {
      // 用户取消选择不算错误，静默处理
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await communityApi.publishPost({ content: content.trim(), topic, images });
      Taro.showToast({ title: '发布成功', icon: 'success', duration: 1500 });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (e) {
      Taro.showToast({ title: '发布没成功，请再试一次', icon: 'none', duration: 2000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className='publish'>
      <NavBar title='发布动态' />

      <View className='publish__card'>
        <Text className='publish__label'>说点什么</Text>
        <Textarea
          className='publish__textarea'
          value={content}
          maxlength={500}
          placeholder='街坊邻居都在看，说说您今天想聊的事…'
          placeholderClass='publish__placeholder'
          onInput={(e) => setContent(e.detail.value)}
        />
        <Text className='publish__counter'>{content.length} / 500</Text>
      </View>

      <View className='publish__card'>
        <Text className='publish__label'>选个话题</Text>
        <View className='publish__topics'>
          {TOPICS.map((t) => (
            <View
              key={t}
              className={`publish__topic ${topic === t ? 'is-active' : ''}`}
              onClick={() => setTopic(t)}
            >
              <Text className='publish__topic-text'>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='publish__card'>
        <Text className='publish__label'>配张照片（可选，最多 9 张）</Text>
        <View className='publish__images'>
          {images.map((src, i) => (
            <View key={`${src}-${i}`} className='publish__image-wrap'>
              <Image className='publish__image' src={src} mode='aspectFill' />
              <View className='publish__image-remove' onClick={() => handleRemoveImage(i)}>
                <Text className='publish__image-remove-text'>×</Text>
              </View>
            </View>
          ))}

          {images.length < 9 ? (
            <View className='publish__image-add' onClick={handleChooseImage}>
              <Text className='publish__image-add-icon'>＋</Text>
              <Text className='publish__image-add-text'>加照片</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className='publish__footer'>
        <View
          className={`publish__submit ${canSubmit ? '' : 'is-disabled'}`}
          onClick={handleSubmit}
        >
          <Text className='publish__submit-text'>{submitting ? '正在发布…' : '发布'}</Text>
        </View>
        <Text className='publish__tip'>发布后邻居们都能看到</Text>
      </View>
    </View>
  );
}
