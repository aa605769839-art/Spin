import { View, Text } from '@tarojs/components';
import { CommunityUser } from '@/types/community';
import './index.scss';

interface Props {
  user: CommunityUser;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 头像组件。
 * 老人场景下不依赖真实头像图：没有图时用「姓氏」大字做兜底，辨识度更高、也避免空图破版。
 */
export default function Avatar({ user, size = 'md' }: Props) {
  const surname = user.name ? user.name.slice(0, 1) : '邻';

  return (
    <View className={`avatar avatar--${size}`}>
      {user.avatar ? (
        <View className='avatar__img' style={{ backgroundImage: `url(${user.avatar})` }} />
      ) : (
        <Text className='avatar__char'>{surname}</Text>
      )}
    </View>
  );
}
