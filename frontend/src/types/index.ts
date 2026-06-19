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
  ingredient_id?: number;
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
  prep_time: number;
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
  required_equipment: RecipeEquipment[];
}

export interface RecipeForm {
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time: number;
  cook_time: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: Nutrition;
  images: string[];
  required_equipment: RecipeEquipmentForm[];
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

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlan {
  id: number;
  recipe_id: number;
  meal_type: MealType;
  plan_date: string;
  servings: number;
  notes: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  family_id?: number;
  recipe?: Recipe;
}

export interface MealPlanForm {
  recipe_id: number;
  meal_type: MealType;
  plan_date: string;
  servings: number;
  notes?: string;
}

export interface MealPlanShoppingItem {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category: string;
  source_recipes: string[];
}

export interface MealPlanShoppingResponse {
  items: MealPlanShoppingItem[];
  total_items: number;
  start_date: string;
  end_date: string;
}

export interface MealPlanRecommendRequest {
  meal_type: MealType;
  days: number;
  tags?: string[];
  categories?: string[];
  max_calories?: number;
  min_protein?: number;
}

export interface MealPlanRecommendResponse {
  recommendations: MealPlan[];
  message: string;
}

export interface RecipeImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface RecipeImportResult {
  success: number;
  failed: number;
  duplicates: number;
  total: number;
  errors: RecipeImportError[];
  imported_ids: number[];
}

export interface ImportPreviewResponse {
  total_rows: number;
  sample_data: Record<string, any>[];
  columns: string[];
  validation_errors: RecipeImportError[];
}

export interface URLImportRequest {
  url: string;
}

export interface URLImportResponse {
  success: boolean;
  message: string;
  recipe?: Recipe;
  source: string;
}

export interface ExportRequest {
  recipe_ids?: number[];
  format: 'xlsx' | 'csv';
}

export interface CookingRecord {
  id: number;
  recipe_id: number;
  user_id: number;
  family_id?: number | null;
  started_at: string;
  completed_at?: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  rating?: number | null;
  review: string;
  step_records: string;
  created_at: string;
  recipe_name?: string | null;
  recipe_category?: string | null;
}

export interface CookingRecordCreate {
  recipe_id: number;
  started_at: string;
  completed_at?: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  rating?: number | null;
  review: string;
  step_records: string;
}

export interface CookingRecordUpdate {
  completed_at?: string | null;
  actual_minutes?: number;
  rating?: number | null;
  review?: string | null;
}

export interface CookingCalendarDay {
  date: string;
  records: CookingRecord[];
}

export interface CookingCalendarData {
  year: number;
  month: number;
  days: CookingCalendarDay[];
}

export interface IngredientEncyclopedia {
  id: number;
  name: string;
  category: string;
  aliases: string;
  season: string;
  image: string;
  description: string;
  nutrition_calories: number;
  nutrition_protein: number;
  nutrition_carbs: number;
  nutrition_fat: number;
  nutrition_fiber: number;
  nutrition_sugar: number;
  nutrition_vitamin_c: number;
  nutrition_calcium: number;
  nutrition_iron: number;
  selection_tips: string;
  storage_method: string;
  cleaning_tips: string;
  common_pairings: string;
  food_conflicts: string;
  cooking_tips: string;
  created_at: string;
  is_favorite: boolean;
}

export interface IngredientPairing {
  name: string;
  description: string;
}

export interface SeasonIngredients {
  season: string;
  ingredients: IngredientEncyclopedia[];
}

export interface IngredientCompareResult {
  ingredients: IngredientEncyclopedia[];
}

import type { Dayjs } from 'dayjs';

export type EquipmentCategory =
  | '烤箱' | '空气炸锅' | '破壁机' | '高压锅' | '电饭煲'
  | '微波炉' | '电磁炉' | '净水器' | '冰箱' | '洗碗机'
  | '油烟机' | '燃气灶' | '料理机' | '榨汁机' | '电饼铛'
  | '面包机' | '咖啡机' | '豆浆机' | '电水壶' | '其他';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  '烤箱', '空气炸锅', '破壁机', '高压锅', '电饭煲',
  '微波炉', '电磁炉', '净水器', '冰箱', '洗碗机',
  '油烟机', '燃气灶', '料理机', '榨汁机', '电饼铛',
  '面包机', '咖啡机', '豆浆机', '电水壶', '其他'
];

export const EQUIPMENT_ICONS: Record<EquipmentCategory | string, string> = {
  '烤箱': '🔥',
  '空气炸锅': '🍟',
  '破壁机': '🥤',
  '高压锅': '🍲',
  '电饭煲': '🍚',
  '微波炉': '📡',
  '电磁炉': '🔌',
  '净水器': '💧',
  '冰箱': '🧊',
  '洗碗机': '🍽️',
  '油烟机': '💨',
  '燃气灶': '🔥',
  '料理机': '🌀',
  '榨汁机': '🧃',
  '电饼铛': '🥞',
  '面包机': '🍞',
  '咖啡机': '☕',
  '豆浆机': '🥛',
  '电水壶': '🫖',
  '其他': '🔧',
};

export interface KitchenEquipment {
  id: number;
  name: string;
  brand: string;
  model: string;
  category: EquipmentCategory | string;
  purchase_date: string;
  warranty_expiry: string;
  manual_images: string[];
  total_usage_count: number;
  last_cleaned_date: string;
  last_maintenance_date: string;
  filter_replace_date: string;
  next_inspection_date: string;
  notes: string;
  user_id: number;
  family_id?: number;
  created_at: string;
  updated_at: string;
  maintenance_logs: EquipmentMaintenanceLog[];
}

export interface KitchenEquipmentForm {
  name: string;
  brand: string;
  model: string;
  category: EquipmentCategory | string;
  purchase_date: string | Dayjs | undefined;
  warranty_expiry: string | Dayjs | undefined;
  manual_images: string[];
  notes: string;
  filter_replace_date?: string | Dayjs | undefined;
  next_inspection_date?: string | Dayjs | undefined;
}

export type MaintenanceLogType = 'cleaning' | 'maintenance' | 'repair' | 'filter_replace' | 'inspection' | 'other';

export const MAINTENANCE_LOG_TYPES: { value: MaintenanceLogType; label: string; color: string }[] = [
  { value: 'cleaning', label: '清洁', color: 'blue' },
  { value: 'maintenance', label: '保养', color: 'green' },
  { value: 'repair', label: '维修', color: 'orange' },
  { value: 'filter_replace', label: '更换滤芯', color: 'cyan' },
  { value: 'inspection', label: '年检', color: 'purple' },
  { value: 'other', label: '其他', color: 'default' },
];

export interface EquipmentMaintenanceLog {
  id: number;
  equipment_id: number;
  log_type: MaintenanceLogType | string;
  title: string;
  description: string;
  cost: number;
  images: string[];
  maintenance_date: string;
  user_id: number;
  created_at: string;
}

export interface EquipmentMaintenanceLogForm {
  log_type: MaintenanceLogType | string;
  title: string;
  description: string;
  cost: number;
  images: string[];
  maintenance_date: string | Dayjs;
}

export type ReminderType = 'usage_count' | 'filter_replace' | 'inspection' | 'warranty' | 'cleaning' | 'custom';

export interface EquipmentReminder {
  id: number;
  equipment_id: number;
  reminder_type: ReminderType | string;
  title: string;
  content: string;
  reminder_date: string;
  usage_threshold?: number;
  is_triggered: boolean;
  is_dismissed: boolean;
  user_id: number;
  created_at: string;
  triggered_at?: string;
  equipment?: KitchenEquipment;
}

export interface RecipeEquipment {
  id?: number;
  recipe_id: number;
  equipment_category: EquipmentCategory | string;
  equipment_name: string;
  notes: string;
}

export interface RecipeEquipmentForm {
  equipment_category: EquipmentCategory | string;
  equipment_name: string;
  notes: string;
}
