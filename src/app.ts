import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import './app.scss';

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('暖邻社区启动');
  });

  return children;
}

export default App;
