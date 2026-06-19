import request from '@/utils/request';
import { InventoryItem, InventoryForm } from '@/types';
import dayjs from 'dayjs';

const mapInventoryToFE = (data: any): InventoryItem => {
  const ing = data.ingredient || {};
  return {
    id: data.id,
    name: ing.name || '',
    category: ing.category || '其他',
    quantity: data.quantity || 0,
    unit: ing.unit || '克',
    min_quantity: 0,
    price: 0,
    purchase_date: data.purchase_date || '',
    expire_date: data.expiration_date || '',
    storage_location: data.location || '',
    notes: '',
  };
};

export const getInventory = async (params?: { keyword?: string; category?: string }): Promise<InventoryItem[]> => {
  const data: any[] = await request.get('/inventory', { params: { limit: 100 } });
  let items = data.map(mapInventoryToFE);
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    items = items.filter((i) => i.name.toLowerCase().includes(kw));
  }
  if (params?.category && params.category !== '全部') {
    items = items.filter((i) => i.category === params.category);
  }
  return items;
};

export const getInventoryItem = async (id: number): Promise<InventoryItem | undefined> => {
  try {
    const data = await request.get(`/inventory/${id}`);
    return mapInventoryToFE(data);
  } catch {
    return undefined;
  }
};

export const createInventoryItem = async (data: InventoryForm): Promise<InventoryItem> => {
  const ingredients: any[] = await request.get('/ingredients', { params: { search: data.name, limit: 1 } });
  const found = ingredients.find((i: any) => i.name === data.name);
  let ingredientId: number;
  if (found) {
    ingredientId = found.id;
  } else {
    const created: any = await request.post('/ingredients', {
      name: data.name,
      category: data.category || '其他',
      unit: data.unit,
      nutrition_calories: 0,
      nutrition_protein: 0,
      nutrition_carbs: 0,
      nutrition_fat: 0,
    });
    ingredientId = created.id;
  }
  const result = await request.post('/inventory', {
    ingredient_id: ingredientId,
    quantity: data.quantity,
    expiration_date: data.expire_date || null,
    purchase_date: data.purchase_date || null,
    location: data.storage_location || '冰箱',
  });
  return mapInventoryToFE(result);
};

export const updateInventoryItem = async (id: number, data: InventoryForm): Promise<InventoryItem | undefined> => {
  const payload: any = {
    quantity: data.quantity,
    expiration_date: data.expire_date || null,
    purchase_date: data.purchase_date || null,
    location: data.storage_location || '冰箱',
  };
  const result = await request.put(`/inventory/${id}`, payload);
  if (!result) return undefined;
  return mapInventoryToFE(result);
};

export const deleteInventoryItem = async (id: number): Promise<boolean> => {
  await request.delete(`/inventory/${id}`);
  return true;
};

export const stockIn = async (id: number, quantity: number): Promise<InventoryItem | undefined> => {
  try {
    const item = await getInventoryItem(id);
    if (!item) return undefined;
    const result = await request.put(`/inventory/${id}`, {
      quantity: item.quantity + quantity,
    });
    return mapInventoryToFE(result);
  } catch {
    return undefined;
  }
};

export const stockOut = async (id: number, quantity: number): Promise<InventoryItem | undefined> => {
  try {
    const item = await getInventoryItem(id);
    if (!item) return undefined;
    const result = await request.put(`/inventory/${id}`, {
      quantity: Math.max(0, item.quantity - quantity),
    });
    return mapInventoryToFE(result);
  } catch {
    return undefined;
  }
};

export const getLowStock = async (): Promise<InventoryItem[]> => {
  const allItems = await getInventory();
  return allItems.filter((i) => i.quantity <= Math.max(i.min_quantity * 1.5, 5));
};

export const getExpiringItems = async (days: number = 7): Promise<InventoryItem[]> => {
  try {
    const alerts: any[] = await request.get('/inventory/alerts/expiring', { params: { days } });
    return alerts.map((a) => ({
      id: a.inventory_id,
      name: a.ingredient_name || '',
      category: '',
      quantity: a.quantity || 0,
      unit: a.unit || '',
      min_quantity: 0,
      price: 0,
      purchase_date: '',
      expire_date: a.expiration_date || '',
      storage_location: '',
      notes: '',
    }));
  } catch {
    const allItems = await getInventory();
    const now = dayjs();
    return allItems.filter((i) => dayjs(i.expire_date).diff(now, 'day') <= days);
  }
};

export const mockInventory: InventoryItem[] = [];
export const mockGetInventory = getInventory;
export const mockGetLowStock = getLowStock;
export const mockGetExpiringItems = getExpiringItems;
