import request from '@/utils/request';
import { DailyNutrition, CategoryStat, TopRecipe } from '@/types';
import dayjs from 'dayjs';

export const getWeeklyNutrition = () => {
  return request<DailyNutrition[]>({
    url: '/stats/weekly-nutrition',
    method: 'get',
  });
};

export const getCategoryDistribution = () => {
  return request<CategoryStat[]>({
    url: '/stats/category-distribution',
    method: 'get',
  });
};

export const getTopRecipes = (limit: number = 5) => {
  return request<TopRecipe[]>({
    url: '/stats/top-recipes',
    method: 'get',
    params: { limit },
  });
};

export const getCookingStats = () => {
  return request<{ total_cooks: number; total_recipes: number; total_cook_time: number }>({
    url: '/stats/cooking',
    method: 'get',
  });
};

export const mockWeeklyNutrition: DailyNutrition[] = Array.from({ length: 7 }, (_, i) => {
  const baseCalories = 1800 + Math.random() * 600;
  return {
    date: dayjs().subtract(6 - i, 'day').format('MM-DD'),
    calories: Math.round(baseCalories),
    protein: Math.round(60 + Math.random() * 40),
    fat: Math.round(50 + Math.random() * 30),
    carbs: Math.round(200 + Math.random() * 100),
  };
});

export const mockCategoryDistribution: CategoryStat[] = [
  { name: '蔬菜', value: 35 },
  { name: '水果', value: 20 },
  { name: '肉类', value: 18 },
  { name: '主食', value: 15 },
  { name: '奶制品', value: 7 },
  { name: '其他', value: 5 },
];

export const mockTopRecipes: TopRecipe[] = [
  { id: 1, name: '番茄炒蛋', cook_count: 15 },
  { id: 3, name: '紫菜蛋花汤', cook_count: 12 },
  { id: 2, name: '红烧排骨', cook_count: 8 },
  { id: 4, name: '蒜蓉西兰花', cook_count: 7 },
  { id: 5, name: '红烧肉', cook_count: 5 },
];

export const mockGetWeeklyNutrition = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockWeeklyNutrition), 300));
};

export const mockGetCategoryDistribution = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockCategoryDistribution), 300));
};

export const mockGetTopRecipes = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockTopRecipes), 300));
};

export const mockGetCookingStats = async () => {
  return new Promise(resolve => setTimeout(() => resolve({
    total_cooks: 156,
    total_recipes: 24,
    total_cook_time: 4680,
  }), 300));
};
