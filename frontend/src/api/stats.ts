import request from '@/utils/request';
import { DailyNutrition, CategoryStat, TopRecipe } from '@/types';

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

export const mockWeeklyNutrition: DailyNutrition[] = [];
export const mockCategoryDistribution: CategoryStat[] = [];
export const mockTopRecipes: TopRecipe[] = [];
export const mockGetWeeklyNutrition = getWeeklyNutrition;
export const mockGetCategoryDistribution = getCategoryDistribution;
export const mockGetTopRecipes = getTopRecipes;
export const mockGetCookingStats = getCookingStats;
