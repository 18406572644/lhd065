from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    family_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None


class UserResponse(UserBase):
    id: int
    avatar: str
    family_id: Optional[int]
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class FamilyResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    users: List[UserResponse] = []

    class Config:
        from_attributes = True


class FamilyMemberAdd(BaseModel):
    username: str


class IngredientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = "其他"
    unit: str = "克"
    nutrition_calories: float = 0.0
    nutrition_protein: float = 0.0
    nutrition_carbs: float = 0.0
    nutrition_fat: float = 0.0
    image: str = ""


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    nutrition_calories: Optional[float] = None
    nutrition_protein: Optional[float] = None
    nutrition_carbs: Optional[float] = None
    nutrition_fat: Optional[float] = None
    image: Optional[str] = None


class IngredientResponse(IngredientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)
    expiration_date: Optional[date] = None
    purchase_date: Optional[date] = None
    location: str = "冰箱"


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    quantity: Optional[float] = None
    expiration_date: Optional[date] = None
    purchase_date: Optional[date] = None
    location: Optional[str] = None


class InventoryResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity: float
    expiration_date: Optional[date]
    purchase_date: Optional[date]
    location: str
    user_id: int
    family_id: Optional[int]
    created_at: datetime
    ingredient: Optional[IngredientResponse] = None

    class Config:
        from_attributes = True


class RecipeIngredientBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientResponse(BaseModel):
    id: int
    recipe_id: int
    ingredient_id: int
    quantity: float
    ingredient: Optional[IngredientResponse] = None

    class Config:
        from_attributes = True


class RecipeStepBase(BaseModel):
    step_number: int = Field(..., ge=1)
    instruction: str = Field(..., min_length=1)
    timer_minutes: int = 0
    image: str = ""


class RecipeStepCreate(RecipeStepBase):
    pass


class RecipeStepResponse(RecipeStepBase):
    id: int
    recipe_id: int

    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    category: str = ""
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 1
    difficulty: str = "简单"
    image: str = ""
    images: str = ""
    is_public: bool = False


class RecipeCreate(RecipeBase):
    steps: List[RecipeStepCreate] = []
    ingredients: List[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    image: Optional[str] = None
    images: Optional[str] = None
    is_public: Optional[bool] = None


class RecipeNutrition(BaseModel):
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    per_serving_calories: float
    per_serving_protein: float
    per_serving_carbs: float
    per_serving_fat: float


class RecipeResponse(RecipeBase):
    id: int
    user_id: int
    family_id: Optional[int]
    created_at: datetime
    views: int
    likes: int
    steps: List[RecipeStepResponse] = []
    ingredients: List[RecipeIngredientResponse] = []
    nutrition: Optional[RecipeNutrition] = None
    is_favorite: Optional[bool] = False
    required_equipment: List[RecipeEquipmentResponse] = []

    class Config:
        from_attributes = True


class ShoppingListBase(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0)


class ShoppingListCreate(ShoppingListBase):
    added_from: str = "manual"


class ShoppingListUpdate(BaseModel):
    quantity: Optional[float] = None
    is_purchased: Optional[bool] = None


class ShoppingListResponse(BaseModel):
    id: int
    ingredient_id: int
    quantity: float
    is_purchased: bool
    user_id: int
    family_id: Optional[int]
    created_at: datetime
    added_from: str
    ingredient: Optional[IngredientResponse] = None

    class Config:
        from_attributes = True


class ShoppingItemGap(BaseModel):
    ingredient_id: int
    ingredient_name: str
    required: float
    in_stock: float
    gap: float
    unit: str


class AutoShoppingResponse(BaseModel):
    recipe_id: int
    recipe_title: str
    items: List[ShoppingItemGap]
    total_items_added: int


class FavoriteBase(BaseModel):
    recipe_id: int


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteResponse(BaseModel):
    id: int
    recipe_id: int
    user_id: int
    created_at: datetime
    recipe: Optional[RecipeResponse] = None

    class Config:
        from_attributes = True


class NotificationBase(BaseModel):
    title: str
    content: str = ""
    type: str = "info"


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExpirationAlert(BaseModel):
    inventory_id: int
    ingredient_name: str
    quantity: float
    unit: str
    expiration_date: date
    days_left: int


class StatsOverview(BaseModel):
    total_ingredients: int
    total_recipes: int
    total_inventory_items: int
    shopping_list_count: int
    expiring_soon_count: int
    favorites_count: int


class DailyNutrition(BaseModel):
    date: date
    calories: float
    protein: float
    carbs: float
    fat: float


class WeeklyStats(BaseModel):
    week_start: date
    week_end: date
    recipes_cooked: int
    total_calories: float
    avg_daily_calories: float
    ingredient_categories: dict
    daily: List[DailyNutrition]


class UploadResponse(BaseModel):
    filename: str
    url: str
    path: str


class MealPlanBase(BaseModel):
    recipe_id: int
    meal_type: str
    plan_date: date
    servings: int = 2
    notes: str = ""


class MealPlanCreate(MealPlanBase):
    pass


class MealPlanUpdate(BaseModel):
    recipe_id: Optional[int] = None
    meal_type: Optional[str] = None
    plan_date: Optional[date] = None
    servings: Optional[int] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None


class MealPlanResponse(MealPlanBase):
    id: int
    user_id: int
    family_id: Optional[int]
    is_completed: bool
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    recipe: Optional[RecipeResponse] = None

    class Config:
        from_attributes = True


class MealPlanShoppingItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str
    category: str
    source_recipes: List[str] = []


class MealPlanShoppingResponse(BaseModel):
    items: List[MealPlanShoppingItem]
    total_items: int
    start_date: date
    end_date: str


class MealPlanRecommendRequest(BaseModel):
    meal_type: str = "dinner"
    days: int = 7
    tags: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    max_calories: Optional[float] = None
    min_protein: Optional[float] = None


class MealPlanRecommendResponse(BaseModel):
    recommendations: List[MealPlanResponse]
    message: str


class RecipeImportItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    category: str = ""
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 1
    difficulty: str = "简单"
    image: str = ""
    ingredients: List[dict] = []
    steps: List[dict] = []
    is_public: bool = False


class RecipeImportError(BaseModel):
    row: int
    field: str
    message: str
    value: Optional[str] = None


class RecipeImportResult(BaseModel):
    success: int
    failed: int
    duplicates: int
    total: int
    errors: List[RecipeImportError] = []
    imported_ids: List[int] = []


class URLImportRequest(BaseModel):
    url: str = Field(..., min_length=1)


class URLImportResponse(BaseModel):
    success: bool
    message: str
    recipe: Optional[RecipeResponse] = None
    source: str = ""


class ExportRequest(BaseModel):
    recipe_ids: Optional[List[int]] = None
    format: str = Field(default="xlsx", pattern="^(xlsx|csv)$")


class CookingRecordCreate(BaseModel):
    recipe_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    estimated_minutes: int = 0
    actual_minutes: int = 0
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: str = ""
    step_records: str = ""


class CookingRecordUpdate(BaseModel):
    completed_at: Optional[datetime] = None
    actual_minutes: Optional[int] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: Optional[str] = None


class CookingRecordResponse(BaseModel):
    id: int
    recipe_id: int
    user_id: int
    family_id: Optional[int]
    started_at: datetime
    completed_at: Optional[datetime]
    estimated_minutes: int
    actual_minutes: int
    rating: Optional[int]
    review: str
    step_records: str
    created_at: datetime
    recipe_name: Optional[str] = None
    recipe_category: Optional[str] = None

    class Config:
        from_attributes = True


class CookingCalendarDay(BaseModel):
    date: str
    records: List[CookingRecordResponse] = []


class ImportPreviewResponse(BaseModel):
    total_rows: int
    sample_data: List[dict]
    columns: List[str]
    validation_errors: List[RecipeImportError] = []


class IngredientEncyclopediaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = "其他"
    aliases: str = ""
    season: str = "四季"
    image: str = ""
    description: str = ""
    nutrition_calories: float = 0.0
    nutrition_protein: float = 0.0
    nutrition_carbs: float = 0.0
    nutrition_fat: float = 0.0
    nutrition_fiber: float = 0.0
    nutrition_sugar: float = 0.0
    nutrition_vitamin_c: float = 0.0
    nutrition_calcium: float = 0.0
    nutrition_iron: float = 0.0
    selection_tips: str = ""
    storage_method: str = ""
    cleaning_tips: str = ""
    common_pairings: str = ""
    food_conflicts: str = ""
    cooking_tips: str = ""


class IngredientEncyclopediaCreate(IngredientEncyclopediaBase):
    pass


class IngredientEncyclopediaUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    aliases: Optional[str] = None
    season: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    nutrition_calories: Optional[float] = None
    nutrition_protein: Optional[float] = None
    nutrition_carbs: Optional[float] = None
    nutrition_fat: Optional[float] = None
    nutrition_fiber: Optional[float] = None
    nutrition_sugar: Optional[float] = None
    nutrition_vitamin_c: Optional[float] = None
    nutrition_calcium: Optional[float] = None
    nutrition_iron: Optional[float] = None
    selection_tips: Optional[str] = None
    storage_method: Optional[str] = None
    cleaning_tips: Optional[str] = None
    common_pairings: Optional[str] = None
    food_conflicts: Optional[str] = None
    cooking_tips: Optional[str] = None


class IngredientEncyclopediaResponse(IngredientEncyclopediaBase):
    id: int
    created_at: datetime
    is_favorite: Optional[bool] = False

    class Config:
        from_attributes = True


class IngredientFavoriteResponse(BaseModel):
    id: int
    ingredient_id: int
    user_id: int
    created_at: datetime
    ingredient: Optional[IngredientEncyclopediaResponse] = None

    class Config:
        from_attributes = True


class SeasonIngredientResponse(BaseModel):
    season: str
    ingredients: List[IngredientEncyclopediaResponse] = []


class IngredientCompareResponse(BaseModel):
    ingredients: List[IngredientEncyclopediaResponse] = []


class KitchenEquipmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    brand: str = ""
    model: str = ""
    category: str = "其他"
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    manual_images: str = ""
    total_usage_count: int = 0
    last_cleaned_date: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    filter_replace_date: Optional[date] = None
    next_inspection_date: Optional[date] = None
    notes: str = ""


class KitchenEquipmentCreate(KitchenEquipmentBase):
    pass


class KitchenEquipmentUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    manual_images: Optional[str] = None
    total_usage_count: Optional[int] = None
    last_cleaned_date: Optional[date] = None
    last_maintenance_date: Optional[date] = None
    filter_replace_date: Optional[date] = None
    next_inspection_date: Optional[date] = None
    notes: Optional[str] = None


class EquipmentMaintenanceLogBase(BaseModel):
    equipment_id: int
    log_type: str = "cleaning"
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    cost: float = 0.0
    images: str = ""
    maintenance_date: date


class EquipmentMaintenanceLogCreate(EquipmentMaintenanceLogBase):
    pass


class EquipmentMaintenanceLogUpdate(BaseModel):
    log_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    images: Optional[str] = None
    maintenance_date: Optional[date] = None


class EquipmentMaintenanceLogResponse(EquipmentMaintenanceLogBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class KitchenEquipmentResponse(KitchenEquipmentBase):
    id: int
    user_id: int
    family_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    maintenance_logs: List[EquipmentMaintenanceLogResponse] = []
    required_equipment_recipes: Optional[int] = 0

    class Config:
        from_attributes = True


class EquipmentReminderBase(BaseModel):
    equipment_id: int
    reminder_type: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    content: str = ""
    reminder_date: Optional[date] = None
    usage_threshold: Optional[int] = None
    is_triggered: bool = False
    is_dismissed: bool = False


class EquipmentReminderCreate(EquipmentReminderBase):
    pass


class EquipmentReminderUpdate(BaseModel):
    is_triggered: Optional[bool] = None
    is_dismissed: Optional[bool] = None
    triggered_at: Optional[datetime] = None


class EquipmentReminderResponse(EquipmentReminderBase):
    id: int
    user_id: int
    created_at: datetime
    triggered_at: Optional[datetime] = None
    equipment: Optional[KitchenEquipmentResponse] = None

    class Config:
        from_attributes = True


class RecipeEquipmentBase(BaseModel):
    recipe_id: int
    equipment_category: str = Field(..., min_length=1, max_length=50)
    equipment_name: str = ""
    notes: str = ""


class RecipeEquipmentCreate(RecipeEquipmentBase):
    pass


class RecipeEquipmentResponse(RecipeEquipmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EquipmentReminderCheckResponse(BaseModel):
    reminders: List[EquipmentReminderResponse] = []
    total_count: int = 0
    triggered_count: int = 0


class EquipmentCategoryStats(BaseModel):
    category: str
    count: int
