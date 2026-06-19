import request from '@/utils/request';
import { ShoppingItem } from '@/types';
import dayjs from 'dayjs';

export const getShoppingList = () => {
  return request<ShoppingItem[]>({
    url: '/shopping',
    method: 'get',
  });
};

export const createShoppingItem = (data: Partial<ShoppingItem>) => {
  return request<ShoppingItem>({
    url: '/shopping',
    method: 'post',
    data,
  });
};

export const updateShoppingItem = (id: number, data: Partial<ShoppingItem>) => {
  return request<ShoppingItem>({
    url: `/shopping/${id}`,
    method: 'put',
    data,
  });
};

export const deleteShoppingItem = (id: number) => {
  return request({
    url: `/shopping/${id}`,
    method: 'delete',
  });
};

export const toggleShoppingItem = (id: number) => {
  return request<ShoppingItem>({
    url: `/shopping/${id}/toggle`,
    method: 'post',
  });
};

export const generateFromRecipes = (recipeIds: number[]) => {
  return request<ShoppingItem[]>({
    url: '/shopping/generate',
    method: 'post',
    data: { recipe_ids: recipeIds },
  });
};

export const clearChecked = () => {
  return request({
    url: '/shopping/clear-checked',
    method: 'delete',
  });
};

export const mockShoppingList: ShoppingItem[] = [
  { id: 1, name: '番茄', quantity: 4, unit: '个', category: '蔬菜', checked: false, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 2, name: '鸡蛋', quantity: 10, unit: '个', category: '蛋类', checked: true, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 3, name: '猪排骨', quantity: 500, unit: '克', category: '肉类', checked: false, source_recipe_id: 2, source_recipe_name: '红烧排骨', created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 4, name: '西兰花', quantity: 400, unit: '克', category: '蔬菜', checked: false, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 5, name: '牛奶', quantity: 2, unit: '盒', category: '奶制品', checked: false, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 6, name: '苹果', quantity: 6, unit: '个', category: '水果', checked: false, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
  { id: 7, name: '大蒜', quantity: 1, unit: '头', category: '调料', checked: true, created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') },
];

export const mockGetShoppingList = async () => {
  return new Promise(resolve => setTimeout(() => resolve([...mockShoppingList]), 300));
};
