import request from '@/utils/request';
import { InventoryItem, InventoryForm } from '@/types';
import dayjs from 'dayjs';

export const getInventory = async (params?: { keyword?: string; category?: string }): Promise<InventoryItem[]> => {
  return mockGetInventory(params) as Promise<InventoryItem[]>;
};

export const getInventoryItem = async (id: number): Promise<InventoryItem | undefined> => {
  const item = mockInventory.find(i => i.id === id);
  return new Promise(resolve => setTimeout(() => resolve(item), 200));
};

export const createInventoryItem = async (data: InventoryForm): Promise<InventoryItem> => {
  const newItem: InventoryItem = {
    id: mockInventory.length + 1,
    ...data,
  };
  mockInventory.unshift(newItem);
  return new Promise(resolve => setTimeout(() => resolve(newItem), 300));
};

export const updateInventoryItem = async (id: number, data: InventoryForm): Promise<InventoryItem | undefined> => {
  const idx = mockInventory.findIndex(i => i.id === id);
  if (idx > -1) {
    mockInventory[idx] = { ...mockInventory[idx], ...data };
    return new Promise(resolve => setTimeout(() => resolve(mockInventory[idx]), 300));
  }
  return undefined;
};

export const deleteInventoryItem = async (id: number): Promise<boolean> => {
  const idx = mockInventory.findIndex(i => i.id === id);
  if (idx > -1) mockInventory.splice(idx, 1);
  return new Promise(resolve => setTimeout(() => resolve(true), 200));
};

export const stockIn = async (id: number, quantity: number): Promise<InventoryItem | undefined> => {
  const item = mockInventory.find(i => i.id === id);
  if (item) item.quantity += quantity;
  return new Promise(resolve => setTimeout(() => resolve(item), 200));
};

export const stockOut = async (id: number, quantity: number): Promise<InventoryItem | undefined> => {
  const item = mockInventory.find(i => i.id === id);
  if (item) item.quantity = Math.max(0, item.quantity - quantity);
  return new Promise(resolve => setTimeout(() => resolve(item), 200));
};

export const getLowStock = async (): Promise<InventoryItem[]> => {
  return mockGetLowStock() as Promise<InventoryItem[]>;
};

export const getExpiringItems = async (days: number = 7): Promise<InventoryItem[]> => {
  return mockGetExpiringItems(days) as Promise<InventoryItem[]>;
};

export const mockInventory: InventoryItem[] = [
  { id: 1, name: '番茄', category: '蔬菜', quantity: 5, unit: '个', min_quantity: 2, price: 4.5, purchase_date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(5, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏', notes: '新鲜番茄' },
  { id: 2, name: '鸡蛋', category: '蛋类', quantity: 12, unit: '个', min_quantity: 6, price: 15, purchase_date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(20, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏' },
  { id: 3, name: '猪排骨', category: '肉类', quantity: 500, unit: '克', min_quantity: 200, price: 35, purchase_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(2, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷冻' },
  { id: 4, name: '西兰花', category: '蔬菜', quantity: 300, unit: '克', min_quantity: 100, price: 8, purchase_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(4, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏' },
  { id: 5, name: '五花肉', category: '肉类', quantity: 800, unit: '克', min_quantity: 300, price: 48, purchase_date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(1, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷冻', notes: '做红烧肉' },
  { id: 6, name: '大米', category: '主食', quantity: 5000, unit: '克', min_quantity: 1000, price: 25, purchase_date: dayjs().subtract(20, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(180, 'day').format('YYYY-MM-DD'), storage_location: '储物柜' },
  { id: 7, name: '牛奶', category: '奶制品', quantity: 2000, unit: '毫升', min_quantity: 500, price: 20, purchase_date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), expire_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏', notes: '即将过期！' },
  { id: 8, name: '苹果', category: '水果', quantity: 6, unit: '个', min_quantity: 3, price: 18, purchase_date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(10, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏' },
  { id: 9, name: '小米', category: '主食', quantity: 1000, unit: '克', min_quantity: 300, price: 12, purchase_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(150, 'day').format('YYYY-MM-DD'), storage_location: '储物柜' },
  { id: 10, name: '紫菜', category: '干货', quantity: 50, unit: '克', min_quantity: 20, price: 15, purchase_date: dayjs().subtract(50, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(200, 'day').format('YYYY-MM-DD'), storage_location: '储物柜' },
  { id: 11, name: '香蕉', category: '水果', quantity: 8, unit: '根', min_quantity: 4, price: 12, purchase_date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(2, 'day').format('YYYY-MM-DD'), storage_location: '常温' },
  { id: 12, name: '大蒜', category: '调料', quantity: 20, unit: '瓣', min_quantity: 5, price: 8, purchase_date: dayjs().subtract(15, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(45, 'day').format('YYYY-MM-DD'), storage_location: '常温阴凉处' },
  { id: 13, name: '生抽', category: '调料', quantity: 500, unit: '毫升', min_quantity: 100, price: 18, purchase_date: dayjs().subtract(40, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(300, 'day').format('YYYY-MM-DD'), storage_location: '厨房柜子' },
  { id: 14, name: '酸奶', category: '奶制品', quantity: 400, unit: '克', min_quantity: 100, price: 12, purchase_date: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(0, 'day').format('YYYY-MM-DD'), storage_location: '冰箱冷藏', notes: '今天到期！' },
  { id: 15, name: '冰糖', category: '调料', quantity: 300, unit: '克', min_quantity: 50, price: 10, purchase_date: dayjs().subtract(60, 'day').format('YYYY-MM-DD'), expire_date: dayjs().add(365, 'day').format('YYYY-MM-DD'), storage_location: '厨房柜子' },
];

export const mockGetInventory = async (params?: { keyword?: string; category?: string }) => {
  let result = [...mockInventory];
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    result = result.filter(i => i.name.toLowerCase().includes(kw));
  }
  if (params?.category && params.category !== '全部') {
    result = result.filter(i => i.category === params.category);
  }
  return new Promise(resolve => setTimeout(() => resolve(result), 300));
};

export const mockGetLowStock = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockInventory.filter(i => i.quantity <= i.min_quantity * 1.5)), 300));
};

export const mockGetExpiringItems = async (days: number = 7) => {
  const now = dayjs();
  return new Promise(resolve => setTimeout(() => resolve(
    mockInventory.filter(i => dayjs(i.expire_date).diff(now, 'day') <= days)
  ), 300));
};
