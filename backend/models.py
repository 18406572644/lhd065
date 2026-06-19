from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="family")
    inventories = relationship("Inventory", back_populates="family")
    recipes = relationship("Recipe", back_populates="family")
    shopping_lists = relationship("ShoppingList", back_populates="family")
    meal_plans = relationship("MealPlan", back_populates="family")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar = Column(String(255), default="")
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    role = Column(String(20), default="member")
    created_at = Column(DateTime, default=datetime.utcnow)

    family = relationship("Family", back_populates="users")
    inventories = relationship("Inventory", back_populates="user")
    recipes = relationship("Recipe", back_populates="user")
    shopping_lists = relationship("ShoppingList", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), default="其他")
    unit = Column(String(20), default="克")
    nutrition_calories = Column(Float, default=0.0)
    nutrition_protein = Column(Float, default=0.0)
    nutrition_carbs = Column(Float, default=0.0)
    nutrition_fat = Column(Float, default=0.0)
    image = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    inventories = relationship("Inventory", back_populates="ingredient")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")
    shopping_lists = relationship("ShoppingList", back_populates="ingredient")


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)
    expiration_date = Column(Date, nullable=True)
    purchase_date = Column(Date, nullable=True)
    location = Column(String(50), default="冰箱")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ingredient = relationship("Ingredient", back_populates="inventories")
    user = relationship("User", back_populates="inventories")
    family = relationship("Family", back_populates="inventories")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, default="")
    category = Column(String(50), default="")
    prep_time = Column(Integer, default=0)
    cook_time = Column(Integer, default=0)
    servings = Column(Integer, default=1)
    difficulty = Column(String(20), default="简单")
    image = Column(String(255), default="")
    images = Column(Text, default="")
    is_public = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)

    user = relationship("User", back_populates="recipes")
    family = relationship("Family", back_populates="recipes")
    steps = relationship("RecipeStep", back_populates="recipe", cascade="all, delete-orphan")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="recipe", cascade="all, delete-orphan")
    meal_plans = relationship("MealPlan", back_populates="recipe", cascade="all, delete-orphan")


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    instruction = Column(Text, nullable=False)
    timer_minutes = Column(Integer, default=0)
    image = Column(String(255), default="")

    recipe = relationship("Recipe", back_populates="steps")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_ingredients")


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)
    is_purchased = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    added_from = Column(String(50), default="manual")

    ingredient = relationship("Ingredient", back_populates="shopping_lists")
    user = relationship("User", back_populates="shopping_lists")
    family = relationship("Family", back_populates="shopping_lists")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recipe = relationship("Recipe", back_populates="favorites")
    user = relationship("User", back_populates="favorites")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, default="")
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    meal_type = Column(String(20), nullable=False)
    plan_date = Column(Date, nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    servings = Column(Integer, default=2)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="meal_plans")
    family = relationship("Family", back_populates="meal_plans")
    recipe = relationship("Recipe", back_populates="meal_plans")
