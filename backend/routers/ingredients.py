from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional

from database import get_db
from models import User, Ingredient
import schemas
from auth import get_current_active_user

router = APIRouter()


@router.get("", response_model=List[schemas.IngredientResponse])
async def list_ingredients(
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Ingredient)

    if search:
        query = query.where(or_(
            Ingredient.name.ilike(f"%{search}%"),
            Ingredient.category.ilike(f"%{search}%")
        ))
    if category:
        query = query.where(Ingredient.category == category)

    query = query.order_by(Ingredient.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    ingredients = result.scalars().all()
    return list(ingredients)


@router.get("/{ingredient_id}", response_model=schemas.IngredientResponse)
async def get_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient).where(Ingredient.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )
    return ingredient


@router.post("", response_model=schemas.IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(
    ingredient_data: schemas.IngredientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient).where(Ingredient.name == ingredient_data.name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该食材已存在"
        )

    ingredient = Ingredient(**ingredient_data.model_dump())
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.put("/{ingredient_id}", response_model=schemas.IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    ingredient_data: schemas.IngredientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient).where(Ingredient.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )

    update_data = ingredient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ingredient, field, value)

    await db.commit()
    await db.refresh(ingredient)
    return ingredient


@router.delete("/{ingredient_id}")
async def delete_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient).where(Ingredient.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )

    await db.delete(ingredient)
    await db.commit()
    return {"message": "食材已删除"}


@router.get("/categories/list")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient.category).distinct().where(Ingredient.category != "")
    )
    categories = [row[0] for row in result.fetchall()]
    return {"categories": categories}
