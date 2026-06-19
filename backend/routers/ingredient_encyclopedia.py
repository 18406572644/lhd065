from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional

from database import get_db
from models import User, IngredientEncyclopedia, IngredientFavorite
import schemas
from auth import get_current_active_user

router = APIRouter()


async def add_favorite_flag(
    ingredients: List[IngredientEncyclopedia],
    user_id: int,
    db: AsyncSession
) -> List[schemas.IngredientEncyclopediaResponse]:
    if not ingredients:
        return []

    ingredient_ids = [ing.id for ing in ingredients]
    result = await db.execute(
        select(IngredientFavorite.ingredient_id).where(
            IngredientFavorite.user_id == user_id,
            IngredientFavorite.ingredient_id.in_(ingredient_ids)
        )
    )
    favorite_ids = {row[0] for row in result.fetchall()}

    responses = []
    for ing in ingredients:
        resp = schemas.IngredientEncyclopediaResponse.model_validate(ing)
        resp.is_favorite = ing.id in favorite_ids
        responses.append(resp)
    return responses


@router.get("", response_model=List[schemas.IngredientEncyclopediaResponse])
async def list_encyclopedia(
    search: Optional[str] = None,
    category: Optional[str] = None,
    season: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(IngredientEncyclopedia)

    if search:
        query = query.where(or_(
            IngredientEncyclopedia.name.ilike(f"%{search}%"),
            IngredientEncyclopedia.aliases.ilike(f"%{search}%"),
            IngredientEncyclopedia.category.ilike(f"%{search}%")
        ))
    if category:
        query = query.where(IngredientEncyclopedia.category == category)
    if season:
        query = query.where(or_(
            IngredientEncyclopedia.season == season,
            IngredientEncyclopedia.season == "四季"
        ))

    query = query.order_by(IngredientEncyclopedia.name).limit(limit).offset(offset)
    result = await db.execute(query)
    ingredients = result.scalars().all()

    return await add_favorite_flag(list(ingredients), current_user.id, db)


@router.get("/categories/list")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia.category).distinct().where(IngredientEncyclopedia.category != "")
    )
    categories = [row[0] for row in result.fetchall()]
    return {"categories": categories}


@router.get("/seasons/list")
async def list_seasons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia.season).distinct()
    )
    seasons = [row[0] for row in result.fetchall()]
    return {"seasons": seasons}


@router.get("/season/current")
async def get_current_season_ingredients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from datetime import datetime
    month = datetime.now().month

    if month in [3, 4, 5]:
        season = "春季"
    elif month in [6, 7, 8]:
        season = "夏季"
    elif month in [9, 10, 11]:
        season = "秋季"
    else:
        season = "冬季"

    result = await db.execute(
        select(IngredientEncyclopedia).where(or_(
            IngredientEncyclopedia.season == season,
            IngredientEncyclopedia.season == "四季"
        )).order_by(IngredientEncyclopedia.name).limit(20)
    )
    ingredients = result.scalars().all()

    return {
        "season": season,
        "ingredients": await add_favorite_flag(list(ingredients), current_user.id, db)
    }


@router.get("/season/{season}", response_model=schemas.SeasonIngredientResponse)
async def get_season_ingredients(
    season: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(or_(
            IngredientEncyclopedia.season == season,
            IngredientEncyclopedia.season == "四季"
        )).order_by(IngredientEncyclopedia.name)
    )
    ingredients = result.scalars().all()

    return schemas.SeasonIngredientResponse(
        season=season,
        ingredients=await add_favorite_flag(list(ingredients), current_user.id, db)
    )


@router.get("/compare", response_model=schemas.IngredientCompareResponse)
async def compare_ingredients(
    ids: List[int] = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if len(ids) < 2 or len(ids) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请选择 2-3 种食材进行对比"
        )

    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.id.in_(ids))
    )
    ingredients = result.scalars().all()

    if len(ingredients) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="找到的有效食材不足 2 种"
        )

    return schemas.IngredientCompareResponse(
        ingredients=await add_favorite_flag(list(ingredients), current_user.id, db)
    )


@router.get("/{ingredient_id}", response_model=schemas.IngredientEncyclopediaResponse)
async def get_encyclopedia_detail(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材百科不存在"
        )

    responses = await add_favorite_flag([ingredient], current_user.id, db)
    return responses[0]


@router.get("/by-name/{name}", response_model=schemas.IngredientEncyclopediaResponse)
async def get_encyclopedia_by_name(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.name == name)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材百科不存在"
        )

    responses = await add_favorite_flag([ingredient], current_user.id, db)
    return responses[0]


@router.post("", response_model=schemas.IngredientEncyclopediaResponse, status_code=status.HTTP_201_CREATED)
async def create_encyclopedia(
    data: schemas.IngredientEncyclopediaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.name == data.name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该食材已存在"
        )

    ingredient = IngredientEncyclopedia(**data.model_dump())
    db.add(ingredient)
    await db.commit()
    await db.refresh(ingredient)

    responses = await add_favorite_flag([ingredient], current_user.id, db)
    return responses[0]


@router.put("/{ingredient_id}", response_model=schemas.IngredientEncyclopediaResponse)
async def update_encyclopedia(
    ingredient_id: int,
    data: schemas.IngredientEncyclopediaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材百科不存在"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ingredient, field, value)

    await db.commit()
    await db.refresh(ingredient)

    responses = await add_favorite_flag([ingredient], current_user.id, db)
    return responses[0]


@router.delete("/{ingredient_id}")
async def delete_encyclopedia(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材百科不存在"
        )

    await db.delete(ingredient)
    await db.commit()
    return {"message": "食材百科已删除"}


@router.post("/{ingredient_id}/favorite")
async def toggle_favorite(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientEncyclopedia).where(IngredientEncyclopedia.id == ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材百科不存在"
        )

    result = await db.execute(
        select(IngredientFavorite).where(
            IngredientFavorite.ingredient_id == ingredient_id,
            IngredientFavorite.user_id == current_user.id
        )
    )
    favorite = result.scalar_one_or_none()

    if favorite:
        await db.delete(favorite)
        await db.commit()
        return {"is_favorite": False, "message": "已取消收藏"}
    else:
        new_favorite = IngredientFavorite(
            ingredient_id=ingredient_id,
            user_id=current_user.id
        )
        db.add(new_favorite)
        await db.commit()
        return {"is_favorite": True, "message": "已收藏"}


@router.get("/favorites/list", response_model=List[schemas.IngredientFavoriteResponse])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(IngredientFavorite).where(
            IngredientFavorite.user_id == current_user.id
        ).order_by(IngredientFavorite.created_at.desc())
    )
    favorites = result.scalars().all()
    return list(favorites)
