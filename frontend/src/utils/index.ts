import dayjs from 'dayjs';
import { InventoryItem } from '@/types';

export const getExpireStatus = (expireDate: string) => {
  const now = dayjs();
  const expire = dayjs(expireDate);
  const diffDays = expire.diff(now, 'day');

  if (diffDays < 0) {
    return { status: 'expired', color: 'red', text: '已过期' };
  } else if (diffDays <= 7) {
    return { status: 'warning', color: 'orange', text: `${diffDays}天后过期` };
  } else {
    return { status: 'normal', color: 'green', text: `${diffDays}天后过期` };
  }
};

export const getRowClassName = (record: InventoryItem) => {
  const { status } = getExpireStatus(record.expire_date);
  if (status === 'expired') return 'row-expired';
  if (status === 'warning') return 'row-warning';
  return '';
};

export const formatDate = (date: string, format = 'YYYY-MM-DD') => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

export const getDifficultyText = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  return map[difficulty] || difficulty;
};

export const getDifficultyColor = (difficulty: string) => {
  const map: Record<string, string> = {
    easy: 'green',
    medium: 'gold',
    hard: 'red',
  };
  return map[difficulty] || 'default';
};

export const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    '家常菜': '🍳',
    '汤羹': '🍲',
    '主食': '🍚',
    '甜点': '🍰',
    '凉菜': '🥗',
    '早餐': '🍞',
    '饮品': '🥤',
    '烘焙': '🥐',
  };
  return icons[category] || '🍽️';
};

export const getLogTypeLabel = (logType: string) => {
  const map: Record<string, string> = {
    cleaning: '清洁',
    maintenance: '保养',
    repair: '维修',
    filter_replace: '更换滤芯',
    inspection: '年检',
    other: '其他',
  };
  return map[logType] || logType;
};

export const getLogTypeColor = (logType: string) => {
  const map: Record<string, string> = {
    cleaning: 'blue',
    maintenance: 'green',
    repair: 'orange',
    filter_replace: 'cyan',
    inspection: 'purple',
    other: 'default',
  };
  return map[logType] || 'default';
};

export const getReminderTypeText = (type: string) => {
  const map: Record<string, string> = {
    usage_count: '使用次数',
    filter_replace: '滤芯更换',
    inspection: '年检提醒',
    warranty: '保修到期',
    cleaning: '清洁提醒',
    custom: '自定义',
  };
  return map[type] || type;
};
