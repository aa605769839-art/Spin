import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface Props {
  title: string;
  /** 是否显示左侧返回按钮（tab 页传 false） */
  showBack?: boolean;
}

/**
 * 演示用顶部导航栏。
 * 小程序端由 app.config 的 navigationBar 承载；演示产物是单页切换，这里用页面内 sticky 栏补上，
 * 保证「进入详情/发布 → 返回」链路完整，也更符合现代 App 的视觉习惯。
 */
export default function NavBar({ title, showBack = true }: Props) {
  const goBack = () => {
    try {
      Taro.navigateBack();
    } catch (e) {
      /* 已在栈底时忽略 */
    }
  };

  return (
    <View className='navbar'>
      {showBack ? (
        <View className='navbar__back' onClick={goBack}>
          <Text className='navbar__back-icon'>‹</Text>
        </View>
      ) : (
        <View className='navbar__back navbar__back--placeholder' />
      )}
      <Text className='navbar__title'>{title}</Text>
      <View className='navbar__spacer' />
    </View>
  );
}
