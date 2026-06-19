import request from '@/utils/request';
import { Recipe, RecipeForm } from '@/types';

export const getRecipes = async (params?: { keyword?: string; category?: string; difficulty?: string }): Promise<Recipe[]> => {
  let list = [...mockRecipes];
  if (params?.keyword) {
    list = list.filter(r => r.name.includes(params.keyword!) || r.description.includes(params.keyword!));
  }
  if (params?.category) {
    list = list.filter(r => r.category === params.category);
  }
  if (params?.difficulty) {
    list = list.filter(r => r.difficulty === params.difficulty);
  }
  return new Promise(resolve => setTimeout(() => resolve(list), 200));
};

export const getRecipe = async (id: number): Promise<Recipe | undefined> => {
  return mockGetRecipe(id) as Promise<Recipe | undefined>;
};

export const createRecipe = async (data: RecipeForm): Promise<Recipe> => {
  const newRecipe: Recipe = {
    id: mockRecipes.length + 1,
    ...data,
    total_time: data.cook_time,
    is_favorite: false,
    rating: 5,
    cook_count: 0,
    created_at: new Date().toISOString(),
    created_by: 1,
    ingredients: data.ingredients.map(ing => ({ ...ing, amount: ing.amount || ing.quantity })),
    images: data.images || [],
  };
  mockRecipes.unshift(newRecipe);
  return new Promise(resolve => setTimeout(() => resolve(newRecipe), 300));
};

export const updateRecipe = async (id: number, data: RecipeForm): Promise<Recipe | undefined> => {
  const idx = mockRecipes.findIndex(r => r.id === id);
  if (idx > -1) {
    mockRecipes[idx] = {
      ...mockRecipes[idx],
      ...data,
      total_time: data.cook_time,
      ingredients: data.ingredients.map(ing => ({ ...ing, amount: ing.amount || ing.quantity })),
      images: data.images || mockRecipes[idx].images || [],
    };
    return new Promise(resolve => setTimeout(() => resolve(mockRecipes[idx]), 300));
  }
  return undefined;
};

export const deleteRecipe = async (id: number): Promise<boolean> => {
  const idx = mockRecipes.findIndex(r => r.id === id);
  if (idx > -1) {
    mockRecipes.splice(idx, 1);
  }
  return new Promise(resolve => setTimeout(() => resolve(true), 200));
};

export const toggleFavorite = async (id: number, favorited?: boolean): Promise<Recipe> => {
  const recipe = mockRecipes.find(r => r.id === id);
  if (recipe) {
    recipe.is_favorite = favorited !== undefined ? favorited : !recipe.is_favorite;
  }
  return new Promise(resolve => setTimeout(() => resolve(recipe as Recipe), 200));
};

export const getFavorites = async (): Promise<Recipe[]> => {
  return mockGetFavorites() as Promise<Recipe[]>;
};

export const getFavoriteRecipes = getFavorites;

export const getRecommendedRecipes = async (): Promise<Recipe[]> => {
  return mockGetRecommendedRecipes() as Promise<Recipe[]>;
};

const addIng = (ings: any[]) => ings.map(i => ({ ...i, amount: i.quantity || i.amount || 0 }));

export const mockRecipes: Recipe[] = [
  {
    id: 1,
    name: '番茄炒蛋',
    description: '经典家常菜，酸甜可口，简单易做',
    category: '家常菜',
    difficulty: 'easy',
    cook_time: 15,
    total_time: 20,
    rating: 4.8,
    cook_count: 128,
    servings: 2,
    is_favorite: true,
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '番茄', quantity: 2, unit: '个' },
      { name: '鸡蛋', quantity: 3, unit: '个' },
      { name: '葱花', quantity: 10, unit: '克' },
      { name: '盐', quantity: 3, unit: '克' },
      { name: '糖', quantity: 5, unit: '克' },
    ]),
    steps: [
      { order: 1, description: '番茄洗净切块，鸡蛋打散加少许盐', duration_minutes: 3 },
      { order: 2, description: '热油炒蛋，凝固后盛出备用', duration_minutes: 3 },
      { order: 3, description: '热油炒番茄出汁，加糖和盐', duration_minutes: 5 },
      { order: 4, description: '倒入鸡蛋翻炒均匀，撒葱花出锅', duration_minutes: 4 },
    ],
    nutrition: { calories: 320, protein: 18, fat: 22, carbs: 15, fiber: 3, sugar: 8 },
    created_at: '2026-06-15',
    created_by: 1,
  },
  {
    id: 2,
    name: '红烧排骨',
    description: '色泽红亮，肉质酥烂，甜咸适中',
    category: '家常菜',
    difficulty: 'medium',
    cook_time: 60,
    total_time: 80,
    rating: 4.9,
    cook_count: 86,
    servings: 4,
    is_favorite: false,
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      'https://images.unsplash.com/photo-1625938145744-e380515399b7?w=800&q=80',
      'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '猪排骨', quantity: 500, unit: '克' },
      { name: '冰糖', quantity: 30, unit: '克' },
      { name: '生抽', quantity: 20, unit: '毫升' },
      { name: '老抽', quantity: 10, unit: '毫升' },
      { name: '料酒', quantity: 15, unit: '毫升' },
      { name: '姜片', quantity: 10, unit: '克' },
    ]),
    steps: [
      { order: 1, description: '排骨冷水下锅焯水，去血沫捞出', duration_minutes: 10 },
      { order: 2, description: '锅中放冰糖炒糖色至焦糖色', duration_minutes: 5 },
      { order: 3, description: '下排骨翻炒上色', duration_minutes: 5 },
      { order: 4, description: '加调料和开水，大火烧开转小火炖40分钟', duration_minutes: 40 },
    ],
    nutrition: { calories: 680, protein: 45, fat: 50, carbs: 20, fiber: 1, sugar: 15 },
    created_at: '2026-06-10',
    created_by: 1,
  },
  {
    id: 3,
    name: '紫菜蛋花汤',
    description: '清淡鲜美，营养丰富的家常汤品',
    category: '汤羹',
    difficulty: 'easy',
    cook_time: 10,
    total_time: 15,
    rating: 4.6,
    cook_count: 203,
    servings: 3,
    is_favorite: true,
    images: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '紫菜', quantity: 10, unit: '克' },
      { name: '鸡蛋', quantity: 2, unit: '个' },
      { name: '虾皮', quantity: 5, unit: '克' },
      { name: '葱花', quantity: 5, unit: '克' },
    ]),
    steps: [
      { order: 1, description: '锅中加水烧开', duration_minutes: 5 },
      { order: 2, description: '放入紫菜和虾皮煮2分钟', duration_minutes: 2 },
      { order: 3, description: '淋入蛋液成蛋花，调味撒葱花', duration_minutes: 3 },
    ],
    nutrition: { calories: 150, protein: 12, fat: 8, carbs: 6, fiber: 1, sugar: 2 },
    created_at: '2026-06-12',
    created_by: 1,
  },
  {
    id: 4,
    name: '蒜蓉西兰花',
    description: '翠绿爽脆，健康美味的素菜',
    category: '家常菜',
    difficulty: 'easy',
    cook_time: 15,
    total_time: 20,
    rating: 4.7,
    cook_count: 156,
    servings: 2,
    is_favorite: false,
    images: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '西兰花', quantity: 300, unit: '克' },
      { name: '大蒜', quantity: 5, unit: '瓣' },
      { name: '蚝油', quantity: 10, unit: '毫升' },
    ]),
    steps: [
      { order: 1, description: '西兰花切小朵，焯水1分钟捞出', duration_minutes: 3 },
      { order: 2, description: '热油爆香蒜末', duration_minutes: 2 },
      { order: 3, description: '下西兰花翻炒，加蚝油调味', duration_minutes: 5 },
    ],
    nutrition: { calories: 120, protein: 6, fat: 6, carbs: 10, fiber: 4, sugar: 3 },
    created_at: '2026-06-08',
    created_by: 1,
  },
  {
    id: 5,
    name: '红烧肉',
    description: '肥而不腻，入口即化的经典硬菜',
    category: '家常菜',
    difficulty: 'hard',
    cook_time: 90,
    total_time: 120,
    rating: 5.0,
    cook_count: 64,
    servings: 6,
    is_favorite: true,
    images: [
      'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800&q=80',
      'https://images.unsplash.com/photo-1569058242252-623df4670c97?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '五花肉', quantity: 800, unit: '克' },
      { name: '冰糖', quantity: 50, unit: '克' },
      { name: '生抽', quantity: 30, unit: '毫升' },
    ]),
    steps: [
      { order: 1, description: '五花肉切块焯水', duration_minutes: 10 },
      { order: 2, description: '炒糖色', duration_minutes: 8 },
      { order: 3, description: '加肉翻炒上色', duration_minutes: 5 },
      { order: 4, description: '慢炖1小时收汁', duration_minutes: 60 },
    ],
    nutrition: { calories: 850, protein: 40, fat: 70, carbs: 25, fiber: 0, sugar: 20 },
    created_at: '2026-06-05',
    created_by: 1,
  },
  {
    id: 6,
    name: '清炒时蔬',
    description: '时令蔬菜的简单做法',
    category: '凉菜',
    difficulty: 'easy',
    cook_time: 10,
    total_time: 15,
    rating: 4.3,
    cook_count: 98,
    servings: 2,
    is_favorite: false,
    images: [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '时令蔬菜', quantity: 400, unit: '克' },
      { name: '蒜末', quantity: 10, unit: '克' },
    ]),
    steps: [
      { order: 1, description: '蔬菜洗净切好', duration_minutes: 3 },
      { order: 2, description: '热油快炒调味', duration_minutes: 5 },
    ],
    nutrition: { calories: 90, protein: 4, fat: 4, carbs: 10, fiber: 5, sugar: 3 },
    created_at: '2026-06-14',
    created_by: 1,
  },
  {
    id: 7,
    name: '小米粥',
    description: '养胃早餐的首选',
    category: '主食',
    difficulty: 'easy',
    cook_time: 30,
    total_time: 35,
    rating: 4.5,
    cook_count: 312,
    servings: 3,
    is_favorite: false,
    images: [
      'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '小米', quantity: 100, unit: '克' },
      { name: '清水', quantity: 1000, unit: '毫升' },
    ]),
    steps: [
      { order: 1, description: '小米淘洗干净', duration_minutes: 2 },
      { order: 2, description: '加水煮开转小火', duration_minutes: 25 },
      { order: 3, description: '煮至浓稠即可', duration_minutes: 3 },
    ],
    nutrition: { calories: 360, protein: 10, fat: 3, carbs: 72, fiber: 3, sugar: 2 },
    created_at: '2026-06-11',
    created_by: 1,
  },
  {
    id: 8,
    name: '水果沙拉',
    description: '清爽健康的餐后甜品',
    category: '甜点',
    difficulty: 'easy',
    cook_time: 10,
    total_time: 12,
    rating: 4.4,
    cook_count: 77,
    servings: 2,
    is_favorite: true,
    images: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    ],
    ingredients: addIng([
      { name: '苹果', quantity: 1, unit: '个' },
      { name: '香蕉', quantity: 1, unit: '根' },
      { name: '酸奶', quantity: 100, unit: '克' },
    ]),
    steps: [
      { order: 1, description: '水果洗净切块', duration_minutes: 5 },
      { order: 2, description: '淋上酸奶拌匀', duration_minutes: 3 },
    ],
    nutrition: { calories: 220, protein: 6, fat: 3, carbs: 45, fiber: 4, sugar: 30 },
    created_at: '2026-06-13',
    created_by: 1,
  },
];

export const mockGetRecipes = async (params?: { keyword?: string; category?: string; difficulty?: string }) => {
  let result = [...mockRecipes];
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    result = result.filter(r =>
      r.name.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw)
    );
  }
  if (params?.category && params.category !== '全部') {
    result = result.filter(r => r.category === params.category);
  }
  if (params?.difficulty && params.difficulty !== '全部') {
    result = result.filter(r => r.difficulty === params.difficulty);
  }
  return new Promise(resolve => setTimeout(() => resolve(result), 300));
};

export const mockGetRecipe = async (id: number) => {
  const recipe = mockRecipes.find(r => r.id === id);
  return new Promise(resolve => setTimeout(() => resolve(recipe), 300));
};

export const mockGetFavorites = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockRecipes.filter(r => r.is_favorite)), 300));
};

export const mockGetRecommendedRecipes = async () => {
  return new Promise(resolve => setTimeout(() => resolve(mockRecipes.slice(0, 4)), 300));
};
