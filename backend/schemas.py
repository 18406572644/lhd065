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
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 1
    difficulty: str = "简单"
    image: str = ""
    is_public: bool = False


class RecipeCreate(RecipeBase):
    steps: List[RecipeStepCreate] = []
    ingredients: List[RecipeIngredientCreate] = []


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    image: Optional[str] = None
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
