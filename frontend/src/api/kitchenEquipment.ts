import request from '@/utils/request';
import {
  KitchenEquipment,
  KitchenEquipmentForm,
  EquipmentMaintenanceLog,
  EquipmentMaintenanceLogForm,
  EquipmentReminder,
  RecipeEquipment,
  RecipeEquipmentForm,
} from '@/types';

const parseImages = (img: string): string[] => {
  if (!img) return [];
  try {
    const parsed = JSON.parse(img);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return img ? [img] : [];
};

const serializeImages = (imgs: string[]): string => {
  return JSON.stringify(imgs.filter(Boolean));
};

const mapEquipmentToFE = (data: any): KitchenEquipment => ({
  id: data.id,
  name: data.name,
  brand: data.brand || '',
  model: data.model || '',
  category: data.category || '其他',
  purchase_date: data.purchase_date || '',
  warranty_expiry: data.warranty_expiry || '',
  manual_images: parseImages(data.manual_images || ''),
  total_usage_count: data.total_usage_count || 0,
  last_cleaned_date: data.last_cleaned_date || '',
  last_maintenance_date: data.last_maintenance_date || '',
  filter_replace_date: data.filter_replace_date || '',
  next_inspection_date: data.next_inspection_date || '',
  notes: data.notes || '',
  user_id: data.user_id,
  family_id: data.family_id,
  created_at: data.created_at ? data.created_at.split('T')[0] : '',
  updated_at: data.updated_at ? data.updated_at.split('T')[0] : '',
  maintenance_logs: (data.maintenance_logs || []).map(mapMaintenanceLogToFE),
});

const mapMaintenanceLogToFE = (data: any): EquipmentMaintenanceLog => ({
  id: data.id,
  equipment_id: data.equipment_id,
  log_type: data.log_type || 'other',
  title: data.title,
  description: data.description || '',
  cost: data.cost || 0,
  images: parseImages(data.images || ''),
  maintenance_date: data.maintenance_date || '',
  user_id: data.user_id,
  created_at: data.created_at ? data.created_at.split('T')[0] : '',
});

const mapReminderToFE = (data: any): EquipmentReminder => ({
  id: data.id,
  equipment_id: data.equipment_id,
  reminder_type: data.reminder_type,
  title: data.title,
  content: data.content || '',
  reminder_date: data.reminder_date || '',
  usage_threshold: data.usage_threshold,
  is_triggered: data.is_triggered || false,
  is_dismissed: data.is_dismissed || false,
  user_id: data.user_id,
  created_at: data.created_at ? data.created_at.split('T')[0] : '',
  triggered_at: data.triggered_at,
  equipment: data.equipment ? mapEquipmentToFE(data.equipment) : undefined,
});

export const getEquipmentCategories = async (): Promise<string[]> => {
  return request.get('/kitchen-equipment/categories');
};

export const getEquipmentList = async (params?: {
  search?: string;
  category?: string;
}): Promise<KitchenEquipment[]> => {
  const data: any[] = await request.get('/kitchen-equipment', { params });
  return data.map(mapEquipmentToFE);
};

export const getEquipment = async (id: number): Promise<KitchenEquipment> => {
  const data = await request.get(`/kitchen-equipment/${id}`);
  return mapEquipmentToFE(data);
};

export const createEquipment = async (form: KitchenEquipmentForm): Promise<KitchenEquipment> => {
  const payload = {
    name: form.name,
    brand: form.brand,
    model: form.model,
    category: form.category,
    purchase_date: form.purchase_date || null,
    warranty_expiry: form.warranty_expiry || null,
    manual_images: serializeImages(form.manual_images || []),
    notes: form.notes,
    filter_replace_date: form.filter_replace_date || null,
    next_inspection_date: form.next_inspection_date || null,
  };
  const data = await request.post('/kitchen-equipment', payload);
  return mapEquipmentToFE(data);
};

export const updateEquipment = async (
  id: number,
  form: Partial<KitchenEquipmentForm>
): Promise<KitchenEquipment> => {
  const payload: any = {};
  if (form.name !== undefined) payload.name = form.name;
  if (form.brand !== undefined) payload.brand = form.brand;
  if (form.model !== undefined) payload.model = form.model;
  if (form.category !== undefined) payload.category = form.category;
  if (form.purchase_date !== undefined) payload.purchase_date = form.purchase_date || null;
  if (form.warranty_expiry !== undefined) payload.warranty_expiry = form.warranty_expiry || null;
  if (form.manual_images !== undefined) payload.manual_images = serializeImages(form.manual_images || []);
  if (form.notes !== undefined) payload.notes = form.notes;
  if (form.filter_replace_date !== undefined) payload.filter_replace_date = form.filter_replace_date || null;
  if (form.next_inspection_date !== undefined) payload.next_inspection_date = form.next_inspection_date || null;
  const data = await request.put(`/kitchen-equipment/${id}`, payload);
  return mapEquipmentToFE(data);
};

export const deleteEquipment = async (id: number): Promise<boolean> => {
  await request.delete(`/kitchen-equipment/${id}`);
  return true;
};

export const incrementUsage = async (id: number): Promise<KitchenEquipment> => {
  const data = await request.post(`/kitchen-equipment/${id}/increment-usage`);
  return mapEquipmentToFE(data);
};

export const getMaintenanceLogs = async (equipmentId: number): Promise<EquipmentMaintenanceLog[]> => {
  const data: any[] = await request.get(`/kitchen-equipment/${equipmentId}/maintenance-logs`);
  return data.map(mapMaintenanceLogToFE);
};

export const createMaintenanceLog = async (
  equipmentId: number,
  form: EquipmentMaintenanceLogForm
): Promise<EquipmentMaintenanceLog> => {
  const payload = {
    equipment_id: equipmentId,
    log_type: form.log_type,
    title: form.title,
    description: form.description,
    cost: form.cost || 0,
    images: serializeImages(form.images || []),
    maintenance_date: form.maintenance_date,
  };
  const data = await request.post(`/kitchen-equipment/${equipmentId}/maintenance-logs`, payload);
  return mapMaintenanceLogToFE(data);
};

export const checkReminders = async (): Promise<{
  reminders: EquipmentReminder[];
  total_count: number;
  triggered_count: number;
}> => {
  const data = await request.get('/kitchen-equipment/reminders/check');
  return {
    reminders: (data.reminders || []).map(mapReminderToFE),
    total_count: data.total_count || 0,
    triggered_count: data.triggered_count || 0,
  };
};

export const getReminders = async (includeDismissed = false): Promise<EquipmentReminder[]> => {
  const data: any[] = await request.get('/kitchen-equipment/reminders/list', {
    params: { include_dismissed: includeDismissed },
  });
  return data.map(mapReminderToFE);
};

export const dismissReminder = async (id: number): Promise<boolean> => {
  await request.put(`/kitchen-equipment/reminders/${id}/dismiss`);
  return true;
};

export const getEquipmentCategoryStats = async (): Promise<{ category: string; count: number }[]> => {
  return request.get('/kitchen-equipment/stats/categories');
};

export const setRecipeEquipment = async (
  recipeId: number,
  equipmentList: RecipeEquipmentForm[]
): Promise<RecipeEquipment[]> => {
  const payload = equipmentList.map((eq) => ({
    recipe_id: recipeId,
    equipment_category: eq.equipment_category,
    equipment_name: eq.equipment_name,
    notes: eq.notes,
  }));
  const data: any[] = await request.post(`/kitchen-equipment/recipes/${recipeId}/equipment`, payload);
  return data.map((item) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    equipment_category: item.equipment_category,
    equipment_name: item.equipment_name,
    notes: item.notes,
  }));
};

export const getRecipeEquipment = async (recipeId: number): Promise<RecipeEquipment[]> => {
  const data: any[] = await request.get(`/kitchen-equipment/recipes/${recipeId}/equipment`);
  return data.map((item) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    equipment_category: item.equipment_category,
    equipment_name: item.equipment_name,
    notes: item.notes,
  }));
};
