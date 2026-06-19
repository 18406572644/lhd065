from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from database import get_db
from models import User, Recipe, RecipeStep, RecipeIngredient, Ingredient, Favorite
import schemas
from auth import get_current_active_user
from routers.inventory import deduct_inventory

router = APIRouter()


async def calculate_recipe_nutrition(
    db: AsyncSession,
    recipe: Recipe
) -> schemas.RecipeNutrition:
    query = select(RecipeIngredient).options(selectinload(RecipeIngredient.ingredient)).where(
        RecipeIngredient.recipe_id == recipe.id
    )
    result = await db.execute(query)
    recipe_ingredients = result.scalars().all()

    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0

    for ri in recipe_ingredients:
        if ri.ingredient:
            qty = ri.quantity
            total_calories += ri.ingredient.nutrition_calories * qty / 100
            total_protein += ri.ingredient.nutrition_protein * qty / 100
            total_carbs += ri.ingredient.nutrition_carbs * qty / 100
            total_fat += ri.ingredient.nutrition_fat * qty / 100

    servings = max(1, recipe.servings)
    return schemas.RecipeNutrition(
        total_calories=round(total_calories, 2),
        total_protein=round(total_protein, 2),
        total_carbs=round(total_carbs, 2),
        total_fat=round(total_fat, 2),
        per_serving_calories=round(total_calories / servings, 2),
        per_serving_protein=round(total_protein / servings, 2),
        per_serving_carbs=round(total_carbs / servings, 2),
        per_serving_fat=round(total_fat / servings, 2)
    )


async def recipe_to_response(
    db: AsyncSession,
    recipe: Recipe,
    current_user: User
) -> schemas.RecipeResponse:
    recipe_dict = {c.name: getattr(recipe, c.name) for c in recipe.__table__.columns}
    recipe_dict["steps"] = list(recipe.steps) if recipe.steps else []
    recipe_dict["ingredients"] = list(recipe.ingredients) if recipe.ingredients else []
    recipe_dict["nutrition"] = await calculate_recipe_nutrition(db, recipe)

    fav_query = select(Favorite).where(
        and_(
            Favorite.recipe_id == recipe.id,
            Favorite.user_id == current_user.id
        )
    )
    fav_result = await db.execute(fav_query)
    recipe_dict["is_favorite"] = fav_result.scalar_one_or_none() is not None

    return schemas.RecipeResponse(**recipe_dict)


@router.get("", response_model=List[schemas.RecipeResponse])
async def list_recipes(
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    is_public: Optional[bool] = None,
    mine_only: bool = False,
    family_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    )

    conditions = []
    if is_public is not None:
        conditions.append(Recipe.is_public == is_public)
    else:
        visibility = [Recipe.is_public == True]
        visibility.append(Recipe.user_id == current_user.id)
        if current_user.family_id:
            visibility.append(Recipe.family_id == current_user.family_id)
        conditions.append(or_(*visibility))

    if mine_only:
        conditions.append(Recipe.user_id == current_user.id)
    if family_only and current_user.family_id:
        conditions.append(Recipe.family_id == current_user.family_id)
    if search:
        conditions.append(or_(
            Recipe.title.ilike(f"%{search}%"),
            Recipe.description.ilike(f"%{search}%")
        ))
    if difficulty:
        conditions.append(Recipe.difficulty == difficulty)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(Recipe.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    recipes = result.scalars().all()

    responses = []
    for recipe in recipes:
        responses.append(await recipe_to_response(db, recipe, current_user))
    return responses


@router.get("/{recipe_id}", response_model=schemas.RecipeResponse)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(Recipe.id == recipe_id)

    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    if not recipe.is_public and recipe.user_id != current_user.id:
        if current_user.family_id and recipe.family_id == current_user.family_id:
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此食谱"
            )

    recipe.views += 1
    await db.commit()
    await db.refresh(recipe)

    return await recipe_to_response(db, recipe, current_user)


@router.post("", response_model=schemas.RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    recipe_data: schemas.RecipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recipe_dict = recipe_data.model_dump(exclude={"steps", "ingredients"})
    recipe = Recipe(
        **recipe_dict,
        user_id=current_user.id,
        family_id=current_user.family_id
    )
    db.add(recipe)
    await db.flush()

    for step_data in recipe_data.steps:
        step = RecipeStep(
            recipe_id=recipe.id,
            **step_data.model_dump()
        )
        db.add(step)

    for ing_data in recipe_data.ingredients:
        ing_result = await db.execute(
            select(Ingredient).where(Ingredient.id == ing_data.ingredient_id)
        )
        if not ing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"食材 ID {ing_data.ingredient_id} 不存在"
            )
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            **ing_data.model_dump()
        )
        db.add(ri)

    await db.commit()
    await db.refresh(recipe)

    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(Recipe.id == recipe.id)
    result = await db.execute(query)
    recipe = result.scalar_one()

    return await recipe_to_response(db, recipe, current_user)


@router.put("/{recipe_id}", response_model=schemas.RecipeResponse)
async def update_recipe(
    recipe_id: int,
    recipe_data: schemas.RecipeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    if recipe.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能修改自己创建的食谱"
        )

    update_data = recipe_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recipe, field, value)

    await db.commit()
    await db.refresh(recipe)

    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one()

    return await recipe_to_response(db, recipe, current_user)


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    if recipe.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己创建的食谱"
        )

    await db.delete(recipe)
    await db.commit()
    return {"message": "食谱已删除"}


@router.get("/{recipe_id}/nutrition", response_model=schemas.RecipeNutrition)
async def get_recipe_nutrition(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    return await calculate_recipe_nutrition(db, recipe)


@router.post("/{recipe_id}/cook")
async def cook_recipe(
    recipe_id: int,
    servings: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.ingredients)
    ).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    multiplier = 1.0
    if servings and servings > 0 and recipe.servings > 0:
        multiplier = servings / recipe.servings

    deduction_results = []
    for ri in recipe.ingredients:
        needed = ri.quantity * multiplier
        success = await deduct_inventory(db, current_user, ri.ingredient_id, needed)
        deduction_results.append({
            "ingredient_id": ri.ingredient_id,
            "quantity_needed": needed,
            "success": success
        })

    failed = [d for d in deduction_results if not d["success"]]
    if failed:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "库存不足，以下食材数量不够",
                "failed_items": failed
            }
        )

    await db.commit()

    nutrition = await calculate_recipe_nutrition(db, recipe)
    nutrition_dict = nutrition.model_dump()
    if multiplier != 1.0:
        for key in nutrition_dict:
            nutrition_dict[key] = round(nutrition_dict[key] * multiplier, 2)

    return {
        "message": "食谱制作完成，库存已扣减",
        "recipe_title": recipe.title,
        "servings": servings or recipe.servings,
        "nutrition": nutrition_dict,
        "items_processed": len(deduction_results)
    }


@router.get("/{recipe_id}/steps", response_model=List[schemas.RecipeStepResponse])
async def get_recipe_steps(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(RecipeStep).where(
        RecipeStep.recipe_id == recipe_id
    ).order_by(RecipeStep.step_number.asc())
    result = await db.execute(query)
    steps = result.scalars().all()
    return list(steps)


@router.post("/{recipe_id}/steps", response_model=schemas.RecipeStepResponse, status_code=status.HTTP_201_CREATED)
async def add_recipe_step(
    recipe_id: int,
    step_data: schemas.RecipeStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).where(
        and_(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
    )
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在或无权修改"
        )

    step = RecipeStep(recipe_id=recipe_id, **step_data.model_dump())
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


@router.get("/favorites/list", response_model=List[schemas.FavoriteResponse])
async def list_favorites(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Favorite).options(
        selectinload(Favorite.recipe).selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient),
        selectinload(Favorite.recipe).selectinload(Recipe.steps)
    ).where(
        Favorite.user_id == current_user.id
    ).order_by(Favorite.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    favorites = result.scalars().all()
    return list(favorites)


@router.post("/{recipe_id}/favorite")
async def toggle_favorite(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).where(Recipe.id == recipe_id)
    result = await db.execute(query)
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    fav_query = select(Favorite).where(
        and_(
            Favorite.recipe_id == recipe_id,
            Favorite.user_id == current_user.id
        )
    )
    fav_result = await db.execute(fav_query)
    favorite = fav_result.scalar_one_or_none()

    if favorite:
        await db.delete(favorite)
        recipe.likes = max(0, recipe.likes - 1)
        is_favorite = False
        message = "已取消收藏"
    else:
        favorite = Favorite(recipe_id=recipe_id, user_id=current_user.id)
        db.add(favorite)
        recipe.likes += 1
        is_favorite = True
        message = "已添加收藏"

    await db.commit()
    return {"message": message, "is_favorite": is_favorite, "likes": recipe.likes}
