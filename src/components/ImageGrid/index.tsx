import { View, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface Props {
  images: string[];
  /** 点击图片是否唤出大图预览（演示环境走 stub 灯箱） */
  previewable?: boolean;
  /** 详情页等场景传 true，单图铺满整宽 */
  large?: boolean;
}

/**
 * 图片九宫格。
 * 仿微信朋友圈排版：1 张时大图、2/4 张两列、其余三列；最多 9 张。
 * 点击任意一张唤起系统/演示预览。
 */
export default function ImageGrid({ images, previewable = true, large = false }: Props) {
  const list = (images || []).slice(0, 9);
  if (list.length === 0) return null;

  const layout =
    list.length === 1 ? 'single' : list.length === 2 || list.length === 4 ? 'cols-2' : 'cols-3';

  const handlePreview = (current: string) => {
    if (!previewable) return;
    Taro.previewImage({ urls: list, current });
  };

  return (
    <View className={`img-grid img-grid--${layout} ${large ? 'img-grid--large' : ''}`}>
      {list.map((src, i) => (
        <View
          key={`${src}-${i}`}
          className='img-grid__cell'
          onClick={(e) => {
            e.stopPropagation();
            handlePreview(src);
          }}
        >
          <Image className='img-grid__img' src={src} mode='aspectFill' lazyLoad={i > 2} />
        </View>
      ))}
    </View>
  );
}
