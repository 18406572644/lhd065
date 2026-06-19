import request from '@/utils/request';
import { IngredientEncyclopedia, SeasonIngredients, IngredientCompareResult } from '@/types';

export const getEncyclopediaList = async (params?: {
  search?: string;
  category?: string;
  season?: string;
  limit?: number;
  offset?: number;
}): Promise<IngredientEncyclopedia[]> => {
  const data = await request.get('/ingredient-encyclopedia', { params });
  return data as IngredientEncyclopedia[];
};

export const getEncyclopediaDetail = async (id: number): Promise<IngredientEncyclopedia> => {
  const data = await request.get(`/ingredient-encyclopedia/${id}`);
  return data as IngredientEncyclopedia;
};

export const getEncyclopediaByName = async (name: string): Promise<IngredientEncyclopedia> => {
  const data = await request.get(`/ingredient-encyclopedia/by-name/${encodeURIComponent(name)}`);
  return data as IngredientEncyclopedia;
};

export const getCategories = async (): Promise<{ categories: string[] }> => {
  return request.get('/ingredient-encyclopedia/categories/list');
};

export const getSeasons = async (): Promise<{ seasons: string[] }> => {
  return request.get('/ingredient-encyclopedia/seasons/list');
};

export const getCurrentSeasonIngredients = async (): Promise<SeasonIngredients> => {
  return request.get('/ingredient-encyclopedia/season/current');
};

export const getSeasonIngredients = async (season: string): Promise<SeasonIngredients> => {
  return request.get(`/ingredient-encyclopedia/season/${season}`);
};

export const compareIngredients = async (ids: number[]): Promise<IngredientCompareResult> => {
  return request.get('/ingredient-encyclopedia/compare', {
    params: { ids },
    paramsSerializer: (params) => {
      return params.ids.map((id: number) => `ids=${id}`).join('&');
    },
  } as any);
};

export const toggleIngredientFavorite = async (id: number): Promise<{ is_favorite: boolean; message: string }> => {
  return request.post(`/ingredient-encyclopedia/${id}/favorite`);
};

export const getFavoriteIngredients = async (): Promise<any[]> => {
  return request.get('/ingredient-encyclopedia/favorites/list');
};

export const parsePairings = (text: string): { name: string; desc: string }[] => {
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => {
    const [name, desc] = line.split('-');
    return { name: name?.trim() || '', desc: desc?.trim() || '' };
  });
};
