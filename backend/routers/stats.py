from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, timedelta, datetime

from database import get_db
from models import User, Ingredient, Inventory, Recipe, ShoppingList, Favorite, RecipeIngredient, Notification
import schemas
from auth import get_current_active_user

router = APIRouter()


@router.get("/overview", response_model=schemas.StatsOverview)
async def get_overview_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    family_condition = or_(
        Inventory.family_id == current_user.family_id,
        Inventory.user_id == current_user.id
    ) if current_user.family_id else (Inventory.user_id == current_user.id)

    ing_result = await db.execute(select(func.count(Ingredient.id)))
    total_ingredients = ing_result.scalar_one() or 0

    recipe_query = select(func.count(Recipe.id)).where(
        or_(
            Recipe.user_id == current_user.id,
            Recipe.is_public == True,
            (Recipe.family_id == current_user.family_id) if current_user.family_id else False
        )
    )
    recipe_result = await db.execute(recipe_query)
    total_recipes = recipe_result.scalar_one() or 0

    inv_result = await db.execute(
        select(func.count(Inventory.id)).where(and_(family_condition, Inventory.quantity > 0))
    )
    total_inventory_items = inv_result.scalar_one() or 0

    shop_family = or_(
        ShoppingList.family_id == current_user.family_id,
        ShoppingList.user_id == current_user.id
    ) if current_user.family_id else (ShoppingList.user_id == current_user.id)
    shop_result = await db.execute(
        select(func.count(ShoppingList.id)).where(and_(shop_family, ShoppingList.is_purchased == False))
    )
    shopping_list_count = shop_result.scalar_one() or 0

    today = date.today()
    week_later = today + timedelta(days=7)
    exp_result = await db.execute(
        select(func.count(Inventory.id)).where(
            and_(
                family_condition,
                Inventory.quantity > 0,
                Inventory.expiration_date.isnot(None),
                Inventory.expiration_date <= week_later
            )
        )
    )
    expiring_soon_count = exp_result.scalar_one() or 0

    fav_result = await db.execute(
        select(func.count(Favorite.id)).where(Favorite.user_id == current_user.id)
    )
    favorites_count = fav_result.scalar_one() or 0

    return schemas.StatsOverview(
        total_ingredients=total_ingredients,
        total_recipes=total_recipes,
        total_inventory_items=total_inventory_items,
        shopping_list_count=shopping_list_count,
        expiring_soon_count=expiring_soon_count,
        favorites_count=favorites_count
    )


@router.get("/weekly")
async def get_weekly_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    family_condition = or_(
        Inventory.family_id == current_user.family_id,
        Inventory.user_id == current_user.id
    ) if current_user.family_id else (Inventory.user_id == current_user.id)

    recipe_query = select(func.count(Recipe.id)).where(
        and_(
            Recipe.user_id == current_user.id,
            func.date(Recipe.created_at) >= week_start,
            func.date(Recipe.created_at) <= week_end
        )
    )
    recipe_result = await db.execute(recipe_query)
    recipes_cooked = recipe_result.scalar_one() or 0

    cat_query = select(
        Ingredient.category,
        func.count(Inventory.id)
    ).join(
        Inventory, Inventory.ingredient_id == Ingredient.id
    ).where(
        and_(family_condition, Inventory.quantity > 0)
    ).group_by(Ingredient.category)
    cat_result = await db.execute(cat_query)
    ingredient_categories = {row[0] or "其他": row[1] for row in cat_result.fetchall()}

    daily = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        day_start = datetime.combine(d, datetime.min.time())
        day_end = datetime.combine(d, datetime.max.time())

        inv_query = select(Inventory).where(
            and_(
                family_condition,
                Inventory.created_at >= day_start,
                Inventory.created_at <= day_end
            )
        ).options(selectinload(Inventory.ingredient))
        inv_result = await db.execute(inv_query)
        day_inventories = inv_result.scalars().all()

        day_calories = 0.0
        day_protein = 0.0
        day_carbs = 0.0
        day_fat = 0.0

        for inv in day_inventories:
            if inv.ingredient:
                qty = inv.quantity
                day_calories += inv.ingredient.nutrition_calories * qty / 100
                day_protein += inv.ingredient.nutrition_protein * qty / 100
                day_carbs += inv.ingredient.nutrition_carbs * qty / 100
                day_fat += inv.ingredient.nutrition_fat * qty / 100

        daily.append(schemas.DailyNutrition(
            date=d,
            calories=round(day_calories, 2),
            protein=round(day_protein, 2),
            carbs=round(day_carbs, 2),
            fat=round(day_fat, 2)
        ))

    total_calories = sum(d.calories for d in daily)
    avg_daily_calories = round(total_calories / 7, 2) if 7 > 0 else 0

    return schemas.WeeklyStats(
        week_start=week_start,
        week_end=week_end,
        recipes_cooked=recipes_cooked,
        total_calories=round(total_calories, 2),
        avg_daily_calories=avg_daily_calories,
        ingredient_categories=ingredient_categories,
        daily=daily
    )


@router.get("/inventory/by-category")
async def get_inventory_by_category(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    family_condition = or_(
        Inventory.family_id == current_user.family_id,
        Inventory.user_id == current_user.id
    ) if current_user.family_id else (Inventory.user_id == current_user.id)

    query = select(
        Ingredient.category,
        func.count(Inventory.id).label("count"),
        func.sum(Inventory.quantity).label("total_quantity")
    ).join(
        Inventory, Inventory.ingredient_id == Ingredient.id
    ).where(
        and_(family_condition, Inventory.quantity > 0)
    ).group_by(Ingredient.category).order_by(func.count(Inventory.id).desc())

    result = await db.execute(query)
    rows = result.fetchall()

    categories = []
    for row in rows:
        categories.append({
            "category": row[0] or "其他",
            "item_count": row[1] or 0,
            "total_quantity": round(row[2] or 0, 2)
        })

    return {"categories": categories}


@router.get("/inventory/by-location")
async def get_inventory_by_location(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    family_condition = or_(
        Inventory.family_id == current_user.family_id,
        Inventory.user_id == current_user.id
    ) if current_user.family_id else (Inventory.user_id == current_user.id)

    query = select(
        Inventory.location,
        func.count(Inventory.id).label("count"),
        func.sum(Inventory.quantity).label("total_quantity")
    ).where(
        and_(family_condition, Inventory.quantity > 0)
    ).group_by(Inventory.location).order_by(func.count(Inventory.id).desc())

    result = await db.execute(query)
    rows = result.fetchall()

    locations = []
    for row in rows:
        locations.append({
            "location": row[0] or "未分类",
            "item_count": row[1] or 0,
            "total_quantity": round(row[2] or 0, 2)
        })

    return {"locations": locations}


@router.get("/recipes/trending")
async def get_trending_recipes(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(
        or_(
            Recipe.is_public == True,
            Recipe.user_id == current_user.id,
            (Recipe.family_id == current_user.family_id) if current_user.family_id else False
        )
    ).order_by(
        (Recipe.views + Recipe.likes * 3).desc()
    ).limit(limit)

    result = await db.execute(query)
    recipes = result.scalars().all()

    trending = []
    for r in recipes:
        trending.append({
            "id": r.id,
            "title": r.title,
            "views": r.views,
            "likes": r.likes,
            "score": r.views + r.likes * 3,
            "difficulty": r.difficulty,
            "cook_time": r.cook_time,
            "ingredient_count": len(r.ingredients)
        })

    return {"trending": trending}


@router.get("/nutrition/top-ingredients")
async def get_top_nutrition_ingredients(
    sort_by: str = "calories",
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    valid_sorts = {
        "calories": Ingredient.nutrition_calories,
        "protein": Ingredient.nutrition_protein,
        "carbs": Ingredient.nutrition_carbs,
        "fat": Ingredient.nutrition_fat
    }
    order_col = valid_sorts.get(sort_by, Ingredient.nutrition_calories)

    query = select(Ingredient).order_by(order_col.desc()).limit(limit)
    result = await db.execute(query)
    ingredients = result.scalars().all()

    top = []
    for ing in ingredients:
        top.append({
            "id": ing.id,
            "name": ing.name,
            "category": ing.category,
            "unit": ing.unit,
            "nutrition_calories": ing.nutrition_calories,
            "nutrition_protein": ing.nutrition_protein,
            "nutrition_carbs": ing.nutrition_carbs,
            "nutrition_fat": ing.nutrition_fat
        })

    return {"sort_by": sort_by, "top_ingredients": top}


@router.get("/notifications/summary")
async def get_notification_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    total_query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id
    )
    total_result = await db.execute(total_query)
    total = total_result.scalar_one() or 0

    unread_query = select(func.count(Notification.id)).where(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread_result = await db.execute(unread_query)
    unread = unread_result.scalar_one() or 0

    type_query = select(
        Notification.type,
        func.count(Notification.id)
    ).where(
        Notification.user_id == current_user.id
    ).group_by(Notification.type)
    type_result = await db.execute(type_query)
    by_type = {row[0] or "info": row[1] for row in type_result.fetchall()}

    return {
        "total": total,
        "unread": unread,
        "read": total - unread,
        "by_type": by_type
    }
