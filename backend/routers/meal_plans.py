from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta
import random

from database import get_db
from models import User, MealPlan, Recipe, RecipeIngredient, Ingredient, ShoppingList
import schemas
from auth import get_current_active_user

router = APIRouter()


@router.get("", response_model=List[schemas.MealPlanResponse])
async def list_meal_plans(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal_type: Optional[str] = None,
    is_completed: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    )

    conditions = []
    if current_user.family_id:
        conditions.append(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        conditions.append(MealPlan.user_id == current_user.id)

    if start_date:
        conditions.append(MealPlan.plan_date >= start_date)
    if end_date:
        conditions.append(MealPlan.plan_date <= end_date)
    if meal_type:
        conditions.append(MealPlan.meal_type == meal_type)
    if is_completed is not None:
        conditions.append(MealPlan.is_completed == is_completed)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(MealPlan.plan_date.asc(), MealPlan.meal_type.asc()).limit(limit).offset(offset)
    result = await db.execute(query)
    plans = result.scalars().all()
    return list(plans)


@router.get("/{plan_id}", response_model=schemas.MealPlanResponse)
async def get_meal_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(MealPlan.id == plan_id)

    if current_user.family_id:
        query = query.where(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        query = query.where(MealPlan.user_id == current_user.id)

    result = await db.execute(query)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用餐计划不存在"
        )
    return plan


@router.post("", response_model=schemas.MealPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_plan(
    plan_data: schemas.MealPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recipe_query = select(Recipe).where(Recipe.id == plan_data.recipe_id)
    if current_user.family_id:
        recipe_query = recipe_query.where(or_(
            Recipe.family_id == current_user.family_id,
            Recipe.user_id == current_user.id,
            Recipe.is_public == True
        ))
    else:
        recipe_query = recipe_query.where(or_(
            Recipe.user_id == current_user.id,
            Recipe.is_public == True
        ))

    recipe_result = await db.execute(recipe_query)
    recipe = recipe_result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    plan = MealPlan(
        recipe_id=plan_data.recipe_id,
        meal_type=plan_data.meal_type,
        plan_date=plan_data.plan_date,
        servings=plan_data.servings,
        notes=plan_data.notes,
        user_id=current_user.id,
        family_id=current_user.family_id
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(MealPlan.id == plan.id)
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{plan_id}", response_model=schemas.MealPlanResponse)
async def update_meal_plan(
    plan_id: int,
    plan_data: schemas.MealPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(MealPlan).where(MealPlan.id == plan_id)
    if current_user.family_id:
        query = query.where(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        query = query.where(MealPlan.user_id == current_user.id)

    result = await db.execute(query)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用餐计划不存在"
        )

    update_data = plan_data.model_dump(exclude_unset=True)

    if "is_completed" in update_data:
        if update_data["is_completed"]:
            plan.completed_at = datetime.utcnow()
        else:
            plan.completed_at = None

    for field, value in update_data.items():
        if field != "is_completed":
            setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)

    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(MealPlan.id == plan_id)
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{plan_id}")
async def delete_meal_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(MealPlan).where(MealPlan.id == plan_id)
    if current_user.family_id:
        query = query.where(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        query = query.where(MealPlan.user_id == current_user.id)

    result = await db.execute(query)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用餐计划不存在"
        )

    await db.delete(plan)
    await db.commit()
    return {"message": "用餐计划已删除"}


@router.post("/{plan_id}/complete", response_model=schemas.MealPlanResponse)
async def complete_meal_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(MealPlan).where(MealPlan.id == plan_id)
    if current_user.family_id:
        query = query.where(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        query = query.where(MealPlan.user_id == current_user.id)

    result = await db.execute(query)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用餐计划不存在"
        )

    plan.is_completed = True
    plan.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(plan)

    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(MealPlan.id == plan_id)
    result = await db.execute(query)
    return result.scalar_one()


@router.post("/shopping-list", response_model=schemas.MealPlanShoppingResponse)
async def generate_shopping_list(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    add_to_shopping: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not start_date:
        start_date = date.today()
    if not end_date:
        end_date = start_date + timedelta(days=6)

    query = select(MealPlan).options(
        selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    )

    conditions = []
    if current_user.family_id:
        conditions.append(or_(
            MealPlan.family_id == current_user.family_id,
            MealPlan.user_id == current_user.id
        ))
    else:
        conditions.append(MealPlan.user_id == current_user.id)

    conditions.append(MealPlan.plan_date >= start_date)
    conditions.append(MealPlan.plan_date <= end_date)

    query = query.where(and_(*conditions))
    result = await db.execute(query)
    plans = result.scalars().all()

    ingredient_map = {}

    for plan in plans:
        if not plan.recipe:
            continue
        multiplier = plan.servings / plan.recipe.servings if plan.recipe.servings > 0 else 1
        for ri in plan.recipe.ingredients:
            if not ri.ingredient:
                continue
            ing_id = ri.ingredient_id
            if ing_id not in ingredient_map:
                ingredient_map[ing_id] = {
                    "ingredient_id": ing_id,
                    "ingredient_name": ri.ingredient.name,
                    "quantity": 0.0,
                    "unit": ri.ingredient.unit,
                    "category": ri.ingredient.category,
                    "source_recipes": []
                }
            ingredient_map[ing_id]["quantity"] += ri.quantity * multiplier
            recipe_name = plan.recipe.title
            if recipe_name not in ingredient_map[ing_id]["source_recipes"]:
                ingredient_map[ing_id]["source_recipes"].append(recipe_name)

    items = list(ingredient_map.values())
    items.sort(key=lambda x: x["category"])

    if add_to_shopping:
        for item in items:
            existing_query = select(ShoppingList).where(
                and_(
                    ShoppingList.ingredient_id == item["ingredient_id"],
                    ShoppingList.is_purchased == False,
                    or_(
                        ShoppingList.family_id == current_user.family_id,
                        ShoppingList.user_id == current_user.id
                    ) if current_user.family_id else (ShoppingList.user_id == current_user.id)
                )
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()

            if existing:
                existing.quantity = max(existing.quantity, item["quantity"])
            else:
                new_item = ShoppingList(
                    ingredient_id=item["ingredient_id"],
                    quantity=item["quantity"],
                    added_from="meal_plan",
                    user_id=current_user.id,
                    family_id=current_user.family_id
                )
                db.add(new_item)
        await db.commit()

    return schemas.MealPlanShoppingResponse(
        items=items,
        total_items=len(items),
        start_date=start_date,
        end_date=end_date.isoformat()
    )


@router.post("/recommend", response_model=schemas.MealPlanRecommendResponse)
async def recommend_meal_plans(
    request: schemas.MealPlanRecommendRequest,
    start_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not start_date:
        start_date = date.today()

    query = select(Recipe).options(
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    )

    visibility_conditions = [Recipe.is_public == True]
    if current_user.family_id:
        visibility_conditions.append(Recipe.family_id == current_user.family_id)
        visibility_conditions.append(Recipe.user_id == current_user.id)
    else:
        visibility_conditions.append(Recipe.user_id == current_user.id)

    query = query.where(or_(*visibility_conditions))

    if request.categories:
        query = query.where(Recipe.category.in_(request.categories))

    result = await db.execute(query)
    all_recipes = list(result.scalars().all())

    if request.max_calories is not None or request.min_protein is not None:
        filtered_recipes = []
        for recipe in all_recipes:
            calories = 0
            protein = 0
            for ri in recipe.ingredients:
                if ri.ingredient:
                    multiplier = 1 / recipe.servings if recipe.servings > 0 else 1
                    calories += (ri.ingredient.nutrition_calories or 0) * ri.quantity * multiplier
                    protein += (ri.ingredient.nutrition_protein or 0) * ri.quantity * multiplier

            if request.max_calories is not None and calories > request.max_calories:
                continue
            if request.min_protein is not None and protein < request.min_protein:
                continue

            filtered_recipes.append(recipe)
        all_recipes = filtered_recipes

    if not all_recipes:
        return schemas.MealPlanRecommendResponse(
            recommendations=[],
            message="没有找到符合条件的食谱"
        )

    recommendations = []
    used_recipes = set()
    now = datetime.utcnow()

    def recipe_to_dict(recipe: Recipe):
        return {
            "id": recipe.id,
            "name": recipe.name,
            "description": recipe.description,
            "category": recipe.category,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "difficulty": recipe.difficulty,
            "images": recipe.images,
            "is_public": recipe.is_public,
            "user_id": recipe.user_id,
            "family_id": recipe.family_id,
            "created_at": recipe.created_at,
            "views": recipe.views,
            "likes": recipe.likes,
            "steps": [],
            "ingredients": [
                {
                    "id": ri.id,
                    "recipe_id": ri.recipe_id,
                    "ingredient_id": ri.ingredient_id,
                    "quantity": ri.quantity,
                    "notes": ri.notes,
                    "ingredient": {
                        "id": ri.ingredient.id,
                        "name": ri.ingredient.name,
                        "category": ri.ingredient.category,
                        "unit": ri.ingredient.unit,
                        "nutrition_calories": ri.ingredient.nutrition_calories,
                        "nutrition_protein": ri.ingredient.nutrition_protein,
                        "nutrition_carbs": ri.ingredient.nutrition_carbs,
                        "nutrition_fat": ri.ingredient.nutrition_fat,
                    } if ri.ingredient else None
                } for ri in recipe.ingredients
            ],
            "nutrition": None,
            "is_favorite": False,
        }

    for day in range(request.days):
        plan_date = start_date + timedelta(days=day)

        available = [r for r in all_recipes if r.id not in used_recipes]
        if not available:
            used_recipes.clear()
            available = all_recipes

        recipe = random.choice(available)
        used_recipes.add(recipe.id)

        plan_dict = {
            "id": day + 1,
            "recipe_id": recipe.id,
            "meal_type": request.meal_type,
            "plan_date": plan_date.isoformat(),
            "servings": recipe.servings,
            "notes": "",
            "is_completed": False,
            "completed_at": None,
            "created_at": now,
            "updated_at": now,
            "user_id": current_user.id,
            "family_id": current_user.family_id,
            "recipe": recipe_to_dict(recipe),
        }
        recommendations.append(plan_dict)

    meal_type_label = {
        "breakfast": "早餐",
        "lunch": "午餐",
        "dinner": "晚餐",
        "snack": "加餐"
    }.get(request.meal_type, request.meal_type)

    return schemas.MealPlanRecommendResponse(
        recommendations=recommendations,
        message=f"已为你推荐 {len(recommendations)} 个{meal_type_label}计划"
    )


@router.post("/batch", response_model=List[schemas.MealPlanResponse])
async def create_batch_meal_plans(
    plans: List[schemas.MealPlanCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    created_plans = []

    for plan_data in plans:
        recipe_query = select(Recipe).where(Recipe.id == plan_data.recipe_id)
        recipe_result = await db.execute(recipe_query)
        recipe = recipe_result.scalar_one_or_none()
        if not recipe:
            continue

        existing_query = select(MealPlan).where(
            and_(
                MealPlan.plan_date == plan_data.plan_date,
                MealPlan.meal_type == plan_data.meal_type,
                or_(
                    MealPlan.family_id == current_user.family_id,
                    MealPlan.user_id == current_user.id
                ) if current_user.family_id else (MealPlan.user_id == current_user.id)
            )
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.recipe_id = plan_data.recipe_id
            existing.servings = plan_data.servings
            existing.notes = plan_data.notes
            plan = existing
        else:
            plan = MealPlan(
                recipe_id=plan_data.recipe_id,
                meal_type=plan_data.meal_type,
                plan_date=plan_data.plan_date,
                servings=plan_data.servings,
                notes=plan_data.notes,
                user_id=current_user.id,
                family_id=current_user.family_id
            )
            db.add(plan)

        created_plans.append(plan)

    await db.commit()

    result_plans = []
    for plan in created_plans:
        await db.refresh(plan)
        query = select(MealPlan).options(
            selectinload(MealPlan.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
        ).where(MealPlan.id == plan.id)
        result = await db.execute(query)
        result_plans.append(result.scalar_one())

    return result_plans
