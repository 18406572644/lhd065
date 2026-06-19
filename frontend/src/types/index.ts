export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  token?: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  email: string;
  confirmPassword: string;
}

export interface RecipeIngredient {
  id?: number;
  name: string;
  quantity: number;
  amount: number;
  unit: string;
}

export interface RecipeStep {
  id?: number;
  order: number;
  description: string;
  duration_minutes: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
}

export interface Recipe {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cook_time: number;
  total_time: number;
  servings: number;
  image_url?: string;
  images: string[];
  is_favorite: boolean;
  rating?: number;
  cook_count?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: Nutrition;
  created_at: string;
  created_by: number;
}

export interface RecipeForm {
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cook_time: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: Nutrition;
  images: string[];
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  price?: number;
  purchase_date: string;
  expire_date: string;
  storage_location: string;
  notes?: string;
}

export interface InventoryForm {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  price?: number;
  purchase_date: string;
  expire_date: string;
  storage_location: string;
  notes?: string;
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  source_recipe_id?: number;
  source_recipe_name?: string;
  created_at: string;
}

export interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dietary_restrictions?: string[];
  preferences?: string[];
  avatar?: string;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface CategoryStat {
  name: string;
  value: number;
}

export interface TopRecipe {
  id: number;
  name: string;
  cook_count: number;
}
