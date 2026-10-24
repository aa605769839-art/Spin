import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  /** 一句话说明空的是什么，如「还没有邻居发言」 */
  title: string;
  /** 补充引导，告诉老人下一步该做什么 */
  hint?: string;
  /** 行动按钮文案，不传则不显示 */
  actionText?: string;
  onAction?: () => void;
}

/**
 * 空状态。
 * 老人对「一片空白」容易困惑，所以必须有明确的原因说明 + 下一步引导。
 */
export default function EmptyState({ title, hint, actionText, onAction }: Props) {
  return (
    <View className='empty-state'>
      <Text className='empty-state__icon'>🍃</Text>
      <Text className='empty-state__title'>{title}</Text>
      {hint ? <Text className='empty-state__hint'>{hint}</Text> : null}
      {actionText ? (
        <View className='empty-state__action' onClick={onAction}>
          <Text className='empty-state__action-text'>{actionText}</Text>
        </View>
      ) : null}
    </View>
  );
}
