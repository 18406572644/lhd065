import request from '@/utils/request';
import { Recipe, RecipeForm, ImportPreviewResponse, RecipeImportResult, URLImportRequest, URLImportResponse, ExportRequest } from '@/types';

const DIFFICULTY_MAP: Record<string, string> = {
  '简单': 'easy',
  '中等': 'medium',
  '难': 'hard',
  'easy': '简单',
  'medium': '中等',
  'hard': '难',
};

const mapDifficultyToFE = (d: string): 'easy' | 'medium' | 'hard' => {
  return (DIFFICULTY_MAP[d] || 'easy') as 'easy' | 'medium' | 'hard';
};

const mapDifficultyToBE = (d: string): string => {
  return DIFFICULTY_MAP[d] || '简单';
};

const parseImages = (img: string): string[] => {
  if (!img) return [];
  try {
    const parsed = JSON.parse(img);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  if (img.startsWith('[')) return [];
  return img ? [img] : [];
};

const serializeImages = (imgs: string[]): string => {
  return JSON.stringify(imgs.filter(Boolean));
};

const mapRecipeToFE = (data: any): Recipe => {
  const nutrition = data.nutrition;
  return {
    id: data.id,
    name: data.title,
    description: data.description || '',
    category: data.category || '家常菜',
    difficulty: mapDifficultyToFE(data.difficulty),
    prep_time: data.prep_time || 0,
    cook_time: data.cook_time || 0,
    total_time: (data.prep_time || 0) + (data.cook_time || 0),
    servings: data.servings || 1,
    image_url: data.image || undefined,
    images: parseImages(data.images || data.image || ''),
    is_favorite: data.is_favorite || false,
    rating: data.likes ? Math.min(5, Math.max(3, data.likes / 10 + 3)) : undefined,
    cook_count: data.views || 0,
    ingredients: (data.ingredients || []).map((ing: any) => ({
      id: ing.id,
      name: ing.ingredient?.name || '',
      quantity: ing.quantity || 0,
      amount: ing.quantity || 0,
      unit: ing.ingredient?.unit || '克',
      ingredient_id: ing.ingredient_id,
    })),
    steps: (data.steps || []).map((step: any) => ({
      id: step.id,
      order: step.step_number,
      description: step.instruction,
      duration_minutes: step.timer_minutes || 0,
    })),
    nutrition: nutrition
      ? {
          calories: Math.round(nutrition.total_calories || 0),
          protein: Math.round(nutrition.total_protein || 0),
          fat: Math.round(nutrition.total_fat || 0),
          carbs: Math.round(nutrition.total_carbs || 0),
          fiber: 0,
          sugar: 0,
        }
      : { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 },
    created_at: data.created_at ? data.created_at.split('T')[0] : '',
    created_by: data.user_id || 0,
  };
};

const ensureIngredients = async (ingredients: { name: string; quantity: number; unit: string }[]): Promise<{ ingredient_id: number; quantity: number }[]> => {
  const result: { ingredient_id: number; quantity: number }[] = [];
  for (const ing of ingredients) {
    if (!ing.name.trim()) continue;
    try {
      const list: any[] = await request.get('/ingredients', { params: { search: ing.name, limit: 1 } });
      const found = list.find((i: any) => i.name === ing.name);
      if (found) {
        result.push({ ingredient_id: found.id, quantity: ing.quantity });
      } else {
        const created: any = await request.post('/ingredients', {
          name: ing.name,
          category: '其他',
          unit: ing.unit,
          nutrition_calories: 0,
          nutrition_protein: 0,
          nutrition_carbs: 0,
          nutrition_fat: 0,
        });
        result.push({ ingredient_id: created.id, quantity: ing.quantity });
      }
    } catch {
      continue;
    }
  }
  return result;
};

export const getRecipes = async (params?: {
  keyword?: string;
  category?: string;
  difficulty?: string;
}): Promise<Recipe[]> => {
  const queryParams: Record<string, string> = {};
  if (params?.keyword) queryParams.search = params.keyword;
  if (params?.difficulty && params.difficulty !== '全部') {
    queryParams.difficulty = mapDifficultyToBE(params.difficulty);
  }
  const data: any[] = await request.get('/recipes', { params: queryParams });
  let recipes = data.map(mapRecipeToFE);
  if (params?.category && params.category !== '全部') {
    recipes = recipes.filter((r) => r.category === params.category);
  }
  return recipes;
};

export const getRecipe = async (id: number): Promise<Recipe | undefined> => {
  const data = await request.get(`/recipes/${id}`);
  if (!data) return undefined;
  return mapRecipeToFE(data);
};

export const createRecipe = async (data: RecipeForm): Promise<Recipe> => {
  const resolvedIngredients = await ensureIngredients(data.ingredients);
  const payload: any = {
    title: data.name,
    description: data.description,
    category: data.category,
    difficulty: mapDifficultyToBE(data.difficulty),
    prep_time: data.prep_time || 0,
    cook_time: data.cook_time,
    servings: data.servings,
    images: serializeImages(data.images || []),
    image: (data.images && data.images.length > 0) ? data.images[0] : '',
    is_public: true,
    steps: data.steps.map((step, index) => ({
      step_number: index + 1,
      instruction: step.description,
      timer_minutes: step.duration_minutes || 0,
    })),
    ingredients: resolvedIngredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
    })),
  };
  const result = await request.post('/recipes', payload);
  return mapRecipeToFE(result);
};

export const updateRecipe = async (id: number, data: RecipeForm): Promise<Recipe | undefined> => {
  const payload: any = {
    title: data.name,
    description: data.description,
    category: data.category,
    difficulty: mapDifficultyToBE(data.difficulty),
    prep_time: data.prep_time || 0,
    cook_time: data.cook_time,
    servings: data.servings,
    images: serializeImages(data.images || []),
    image: (data.images && data.images.length > 0) ? data.images[0] : '',
  };
  const result = await request.put(`/recipes/${id}`, payload);
  if (!result) return undefined;
  return mapRecipeToFE(result);
};

export const deleteRecipe = async (id: number): Promise<boolean> => {
  await request.delete(`/recipes/${id}`);
  return true;
};

export const toggleFavorite = async (id: number, _favorited?: boolean): Promise<Recipe> => {
  await request.post(`/recipes/${id}/favorite`);
  const updated = await request.get(`/recipes/${id}`);
  return mapRecipeToFE(updated);
};

export const getFavorites = async (): Promise<Recipe[]> => {
  const data: any[] = await request.get('/recipes/favorites/list');
  return data
    .map((fav: any) => fav.recipe ? mapRecipeToFE(fav.recipe) : null)
    .filter(Boolean) as Recipe[];
};

export const getFavoriteRecipes = getFavorites;

export const getRecommendedRecipes = async (): Promise<Recipe[]> => {
  const data: any[] = await request.get('/recipes', { params: { limit: 4 } });
  return data.map(mapRecipeToFE);
};

export const mockGetRecipes = getRecipes;
export const mockGetRecipe = getRecipe;
export const mockGetFavorites = getFavorites;
export const mockGetRecommendedRecipes = getRecommendedRecipes;
export const mockRecipes: Recipe[] = [];

export const previewImport = async (file: File): Promise<ImportPreviewResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/recipes/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const importRecipes = async (file: File, skipDuplicates: boolean = true): Promise<RecipeImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('skip_duplicates', String(skipDuplicates));
  return request.post('/recipes/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const importFromURL = async (data: URLImportRequest): Promise<URLImportResponse> => {
  return request.post('/recipes/import/url', data);
};

export const exportRecipes = async (data: ExportRequest): Promise<void> => {
  const response = await request.post('/recipes/export', data, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response]));
  const link = document.createElement('a');
  link.href = url;
  const ext = data.format === 'csv' ? 'csv' : 'xlsx';
  link.setAttribute('download', `recipes_${Date.now()}.${ext}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx'): Promise<void> => {
  const response = await request.get('/recipes/export/template', {
    params: { format },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `recipe_import_template.${format}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
