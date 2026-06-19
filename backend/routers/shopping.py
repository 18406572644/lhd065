from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from database import get_db
from models import User, ShoppingList, Ingredient, Recipe, RecipeIngredient, Inventory
import schemas
from auth import get_current_active_user
from routers.inventory import get_total_inventory_quantity

router = APIRouter()


@router.get("", response_model=List[schemas.ShoppingListResponse])
async def list_shopping(
    is_purchased: Optional[bool] = None,
    added_from: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).options(selectinload(ShoppingList.ingredient))

    conditions = []
    if current_user.family_id:
        conditions.append(or_(
            ShoppingList.family_id == current_user.family_id,
            ShoppingList.user_id == current_user.id
        ))
    else:
        conditions.append(ShoppingList.user_id == current_user.id)

    if is_purchased is not None:
        conditions.append(ShoppingList.is_purchased == is_purchased)
    if added_from:
        conditions.append(ShoppingList.added_from == added_from)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(ShoppingList.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    items = result.scalars().all()
    return list(items)


@router.get("/{item_id}", response_model=schemas.ShoppingListResponse)
async def get_shopping_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).options(selectinload(ShoppingList.ingredient)).where(
        ShoppingList.id == item_id
    )
    if current_user.family_id:
        query = query.where(or_(
            ShoppingList.family_id == current_user.family_id,
            ShoppingList.user_id == current_user.id
        ))
    else:
        query = query.where(ShoppingList.user_id == current_user.id)

    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="购物清单项不存在"
        )
    return item


@router.post("", response_model=schemas.ShoppingListResponse, status_code=status.HTTP_201_CREATED)
async def create_shopping_item(
    item_data: schemas.ShoppingListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ing_result = await db.execute(
        select(Ingredient).where(Ingredient.id == item_data.ingredient_id)
    )
    if not ing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )

    query = select(ShoppingList).where(
        and_(
            ShoppingList.ingredient_id == item_data.ingredient_id,
            ShoppingList.is_purchased == False,
            or_(
                ShoppingList.family_id == current_user.family_id,
                ShoppingList.user_id == current_user.id
            ) if current_user.family_id else (ShoppingList.user_id == current_user.id)
        )
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        existing.quantity += item_data.quantity
        item = existing
    else:
        item = ShoppingList(
            ingredient_id=item_data.ingredient_id,
            quantity=item_data.quantity,
            added_from=item_data.added_from,
            user_id=current_user.id,
            family_id=current_user.family_id
        )
        db.add(item)

    await db.commit()
    await db.refresh(item)

    query = select(ShoppingList).options(selectinload(ShoppingList.ingredient)).where(
        ShoppingList.id == item.id
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{item_id}", response_model=schemas.ShoppingListResponse)
async def update_shopping_item(
    item_id: int,
    item_data: schemas.ShoppingListUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).where(ShoppingList.id == item_id)
    if current_user.family_id:
        query = query.where(or_(
            ShoppingList.family_id == current_user.family_id,
            ShoppingList.user_id == current_user.id
        ))
    else:
        query = query.where(ShoppingList.user_id == current_user.id)

    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="购物清单项不存在"
        )

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    query = select(ShoppingList).options(selectinload(ShoppingList.ingredient)).where(
        ShoppingList.id == item_id
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{item_id}")
async def delete_shopping_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).where(ShoppingList.id == item_id)
    if current_user.family_id:
        query = query.where(or_(
            ShoppingList.family_id == current_user.family_id,
            ShoppingList.user_id == current_user.id
        ))
    else:
        query = query.where(ShoppingList.user_id == current_user.id)

    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="购物清单项不存在"
        )

    await db.delete(item)
    await db.commit()
    return {"message": "购物清单项已删除"}


@router.post("/recipe/{recipe_id}", response_model=schemas.AutoShoppingResponse)
async def generate_shopping_from_recipe(
    recipe_id: int,
    servings: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
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

    gap_items = []
    added_count = 0

    for ri in recipe.ingredients:
        needed = ri.quantity * multiplier
        in_stock = await get_total_inventory_quantity(db, current_user, ri.ingredient_id)
        gap = max(0, needed - in_stock)

        ingredient_name = ri.ingredient.name if ri.ingredient else "未知"
        unit = ri.ingredient.unit if ri.ingredient else ""

        gap_item = schemas.ShoppingItemGap(
            ingredient_id=ri.ingredient_id,
            ingredient_name=ingredient_name,
            required=needed,
            in_stock=in_stock,
            gap=gap,
            unit=unit
        )
        gap_items.append(gap_item)

        if gap > 0:
            existing_query = select(ShoppingList).where(
                and_(
                    ShoppingList.ingredient_id == ri.ingredient_id,
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
                if gap > existing.quantity:
                    existing.quantity = gap
            else:
                new_item = ShoppingList(
                    ingredient_id=ri.ingredient_id,
                    quantity=gap,
                    added_from=f"recipe_{recipe_id}",
                    user_id=current_user.id,
                    family_id=current_user.family_id
                )
                db.add(new_item)
            added_count += 1

    await db.commit()

    return schemas.AutoShoppingResponse(
        recipe_id=recipe_id,
        recipe_title=recipe.title,
        items=gap_items,
        total_items_added=added_count
    )


@router.post("/recipes/batch")
async def generate_shopping_from_recipes(
    recipe_ids: List[int],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    all_gaps = {}
    total_added = 0

    for recipe_id in recipe_ids:
        query = select(Recipe).options(
            selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
        ).where(Recipe.id == recipe_id)
        result = await db.execute(query)
        recipe = result.scalar_one_or_none()
        if not recipe:
            continue

        for ri in recipe.ingredients:
            ing_id = ri.ingredient_id
            if ing_id not in all_gaps:
                in_stock = await get_total_inventory_quantity(db, current_user, ing_id)
                all_gaps[ing_id] = {
                    "ingredient_id": ing_id,
                    "ingredient_name": ri.ingredient.name if ri.ingredient else "未知",
                    "unit": ri.ingredient.unit if ri.ingredient else "",
                    "required": 0.0,
                    "in_stock": in_stock,
                    "recipes": []
                }
            all_gaps[ing_id]["required"] += ri.quantity
            all_gaps[ing_id]["recipes"].append(recipe.title)

    for ing_id, data in all_gaps.items():
        gap = max(0, data["required"] - data["in_stock"])
        data["gap"] = gap

        if gap > 0:
            existing_query = select(ShoppingList).where(
                and_(
                    ShoppingList.ingredient_id == ing_id,
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
                if gap > existing.quantity:
                    existing.quantity = gap
            else:
                new_item = ShoppingList(
                    ingredient_id=ing_id,
                    quantity=gap,
                    added_from="recipes_batch",
                    user_id=current_user.id,
                    family_id=current_user.family_id
                )
                db.add(new_item)
            total_added += 1

    await db.commit()

    return {
        "message": f"已根据 {len(recipe_ids)} 个食谱生成购物清单",
        "total_items_added": total_added,
        "gaps": list(all_gaps.values())
    }


@router.post("/purchase/{item_id}")
async def mark_purchased_and_add_inventory(
    item_id: int,
    location: str = "冰箱",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).options(selectinload(ShoppingList.ingredient)).where(
        ShoppingList.id == item_id
    )
    if current_user.family_id:
        query = query.where(or_(
            ShoppingList.family_id == current_user.family_id,
            ShoppingList.user_id == current_user.id
        ))
    else:
        query = query.where(ShoppingList.user_id == current_user.id)

    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="购物清单项不存在"
        )

    item.is_purchased = True

    inventory = Inventory(
        ingredient_id=item.ingredient_id,
        quantity=item.quantity,
        location=location,
        user_id=current_user.id,
        family_id=current_user.family_id
    )
    db.add(inventory)

    await db.commit()

    return {
        "message": "已标记为已购买并添加到库存",
        "ingredient_name": item.ingredient.name if item.ingredient else "未知",
        "quantity": item.quantity,
        "unit": item.ingredient.unit if item.ingredient else ""
    }


@router.delete("/purchased/clear")
async def clear_purchased_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(ShoppingList).where(
        and_(
            ShoppingList.is_purchased == True,
            or_(
                ShoppingList.family_id == current_user.family_id,
                ShoppingList.user_id == current_user.id
            ) if current_user.family_id else (ShoppingList.user_id == current_user.id)
        )
    )
    result = await db.execute(query)
    items = result.scalars().all()
    count = len(items)

    for item in items:
        await db.delete(item)

    await db.commit()
    return {"message": f"已清空 {count} 个已购买项"}
