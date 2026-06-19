import request from '@/utils/request';
import { MealPlan, MealPlanForm, MealPlanShoppingResponse, MealPlanRecommendRequest, MealPlanRecommendResponse } from '@/types';

export const getMealPlans = (params?: {
  start_date?: string;
  end_date?: string;
  meal_type?: string;
  is_completed?: boolean;
}): Promise<MealPlan[]> => {
  return request.get('/meal-plans', { params });
};

export const getMealPlan = (id: number): Promise<MealPlan> => {
  return request.get(`/meal-plans/${id}`);
};

export const createMealPlan = (data: MealPlanForm): Promise<MealPlan> => {
  return request.post('/meal-plans', data);
};

export const updateMealPlan = (id: number, data: Partial<MealPlanForm> & { is_completed?: boolean }): Promise<MealPlan> => {
  return request.put(`/meal-plans/${id}`, data);
};

export const deleteMealPlan = (id: number): Promise<{ message: string }> => {
  return request.delete(`/meal-plans/${id}`);
};

export const completeMealPlan = (id: number): Promise<MealPlan> => {
  return request.post(`/meal-plans/${id}/complete`);
};

export const generateShoppingList = (params?: {
  start_date?: string;
  end_date?: string;
  add_to_shopping?: boolean;
}): Promise<MealPlanShoppingResponse> => {
  return request.post('/meal-plans/shopping-list', null, { params });
};

export const recommendMealPlans = (
  data: MealPlanRecommendRequest,
  params?: { start_date?: string }
): Promise<MealPlanRecommendResponse> => {
  return request.post('/meal-plans/recommend', data, { params });
};

export const createBatchMealPlans = (plans: MealPlanForm[]): Promise<MealPlan[]> => {
  return request.post('/meal-plans/batch', plans);
};
