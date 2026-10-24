import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  /** 'loading' 骨架屏 | 'error' 出错 | 'end' 没有更多了 */
  type: 'loading' | 'error' | 'end';
  text?: string;
  onRetry?: () => void;
}

/**
 * 列表三态：加载中 / 出错可重试 / 到底了。
 * 适老化：出错时不用专业术语，直接给「再试一次」的大按钮。
 */
export default function PageState({ type, text, onRetry }: Props) {
  if (type === 'loading') {
    return (
      <View className='page-state'>
        <View className='page-state__skeleton'>
          <View className='page-state__line page-state__line--wide' />
          <View className='page-state__line' />
          <View className='page-state__line page-state__line--short' />
        </View>
      </View>
    );
  }

  if (type === 'error') {
    return (
      <View className='page-state'>
        <Text className='page-state__text'>{text || '网络不太顺畅，请再试一次'}</Text>
        {onRetry ? (
          <View className='page-state__retry' onClick={onRetry}>
            <Text className='page-state__retry-text'>再试一次</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className='page-state'>
      <Text className='page-state__text'>{text || '已经到底啦，看看别的吧'}</Text>
    </View>
  );
}
