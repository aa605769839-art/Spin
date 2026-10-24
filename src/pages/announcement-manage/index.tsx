import { useCallback, useEffect, useState } from 'react';
import { View, Text, Textarea, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Announcement } from '@/types/community';
import { channelApi } from '@/services';
import NavBar from '@/components/NavBar';
import './index.scss';

export default function AnnouncementManage() {
  const [cid, setCid] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [list, setList] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // null=列表, 'new'=新建, id=编辑
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const refresh = useCallback(() => {
    const id = channelApi.getCurrentChannelId();
    setCid(id);
    if (id) {
      setIsOwner(channelApi.isCreator(id));
      setList(channelApi.getAnnouncements(id));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useDidShow(() => {
    refresh();
  });

  const openNew = () => {
    setTitle('');
    setBody('');
    setEditing('new');
  };

  const openEdit = (a: Announcement) => {
    setTitle(a.title);
    setBody(a.body);
    setEditing(a.id);
  };

  const save = () => {
    if (!cid || !isOwner) return;
    if (!title.trim()) {
      Taro.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    const res = editing === 'new'
      ? channelApi.addAnnouncement(cid, { title, body })
      : channelApi.updateAnnouncement(cid, editing as string, { title, body });
    if (!res.ok) {
      Taro.showToast({ title: res.error || '保存失败', icon: 'none' });
      return;
    }
    Taro.showToast({ title: '已保存', icon: 'success' });
    setEditing(null);
    setList(channelApi.getAnnouncements(cid));
  };

  const remove = (a: Announcement) => {
    if (!cid || !isOwner) return;
    Taro.showModal({
      title: '删除公告',
      content: `确定删除《${a.title}》吗？`,
      success: (r) => {
        if (r.confirm) {
          const res = channelApi.deleteAnnouncement(cid, a.id);
          if (res.ok) setList(channelApi.getAnnouncements(cid));
          else Taro.showToast({ title: res.error || '删除失败', icon: 'none' });
        }
      },
    });
  };

  if (cid && !isOwner) {
    return (
      <View className='page ann-manage'>
        <NavBar title='公告管理' />
        <View className='ann-manage__deny'>
          <Text className='ann-manage__deny-text'>只有频道创建者可以管理公告</Text>
        </View>
      </View>
    );
  }

  return (
    <View className='page ann-manage'>
      <NavBar title='公告管理' />

      {editing === null ? (
        <View className='ann-manage__list'>
          {list.map((a) => (
            <View key={a.id} className='ann-manage__item'>
              <View className='ann-manage__item-main'>
                <Text className='ann-manage__item-title'>{a.title}</Text>
                <Text className='ann-manage__item-body'>{a.body}</Text>
              </View>
              <View className='ann-manage__item-ops'>
                <View className='ann-manage__op' onClick={() => openEdit(a)}>
                  <Text className='ann-manage__op-text'>编辑</Text>
                </View>
                <View className='ann-manage__op ann-manage__op--danger' onClick={() => remove(a)}>
                  <Text className='ann-manage__op-text'>删除</Text>
                </View>
              </View>
            </View>
          ))}

          <View className='ann-manage__add' onClick={openNew}>
            <Text className='ann-manage__add-text'>+ 新增公告</Text>
          </View>
        </View>
      ) : (
        <View className='ann-manage__form'>
          <View className='ann-manage__field'>
            <Text className='ann-manage__label'>标题</Text>
            <Input
              className='ann-manage__input'
              value={title}
              maxlength={30}
              placeholder='如：本周活动预告'
              placeholderClass='ann-manage__placeholder'
              onInput={(e) => setTitle(e.detail.value)}
            />
          </View>
          <View className='ann-manage__field'>
            <Text className='ann-manage__label'>内容</Text>
            <Textarea
              className='ann-manage__textarea'
              value={body}
              maxlength={200}
              placeholder='写点什么吧'
              placeholderClass='ann-manage__placeholder'
              onInput={(e) => setBody(e.detail.value)}
            />
          </View>
          <View className='ann-manage__btns'>
            <View className='ann-manage__btn' onClick={() => setEditing(null)}>
              <Text className='ann-manage__btn-text'>取消</Text>
            </View>
            <View className='ann-manage__btn ann-manage__btn--primary' onClick={save}>
              <Text className='ann-manage__btn-text'>保存</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
