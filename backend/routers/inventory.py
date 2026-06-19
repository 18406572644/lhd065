from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta

from database import get_db
from models import User, Inventory, Ingredient, Notification, ShoppingList
import schemas
from auth import get_current_active_user

router = APIRouter()


def get_family_filter(current_user: User):
    if current_user.family_id:
        return or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id)
    return Inventory.user_id == current_user.id


@router.get("", response_model=List[schemas.InventoryResponse])
async def list_inventory(
    location: Optional[str] = None,
    expiring_soon: Optional[bool] = None,
    ingredient_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Inventory).options(selectinload(Inventory.ingredient))

    conditions = []
    if current_user.family_id:
        conditions.append(or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id))
    else:
        conditions.append(Inventory.user_id == current_user.id)

    if location:
        conditions.append(Inventory.location == location)
    if ingredient_id:
        conditions.append(Inventory.ingredient_id == ingredient_id)
    if expiring_soon:
        today = date.today()
        week_later = today + timedelta(days=7)
        conditions.append(and_(
            Inventory.expiration_date.isnot(None),
            Inventory.expiration_date <= week_later
        ))

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(Inventory.expiration_date.asc().nullslast()).limit(limit).offset(offset)
    result = await db.execute(query)
    inventories = result.scalars().all()
    return list(inventories)


@router.get("/{inventory_id}", response_model=schemas.InventoryResponse)
async def get_inventory(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Inventory).options(selectinload(Inventory.ingredient)).where(
        Inventory.id == inventory_id
    )
    if current_user.family_id:
        query = query.where(or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id))
    else:
        query = query.where(Inventory.user_id == current_user.id)

    result = await db.execute(query)
    inventory = result.scalar_one_or_none()
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="库存记录不存在"
        )
    return inventory


@router.post("", response_model=schemas.InventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory(
    inventory_data: schemas.InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Ingredient).where(Ingredient.id == inventory_data.ingredient_id)
    )
    ingredient = result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )

    query = select(Inventory).where(
        and_(
            Inventory.ingredient_id == inventory_data.ingredient_id,
            Inventory.expiration_date == inventory_data.expiration_date,
            Inventory.location == inventory_data.location,
            or_(
                Inventory.family_id == current_user.family_id if current_user.family_id else Inventory.user_id == current_user.id,
                Inventory.user_id == current_user.id
            )
        )
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        existing.quantity += inventory_data.quantity
        if inventory_data.purchase_date:
            existing.purchase_date = inventory_data.purchase_date
        inventory = existing
    else:
        inventory = Inventory(
            **inventory_data.model_dump(),
            user_id=current_user.id,
            family_id=current_user.family_id
        )
        db.add(inventory)

    await db.commit()
    await db.refresh(inventory)

    query = select(Inventory).options(selectinload(Inventory.ingredient)).where(Inventory.id == inventory.id)
    result = await db.execute(query)
    inventory = result.scalar_one()

    return inventory


@router.put("/{inventory_id}", response_model=schemas.InventoryResponse)
async def update_inventory(
    inventory_id: int,
    inventory_data: schemas.InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Inventory).where(Inventory.id == inventory_id)
    if current_user.family_id:
        query = query.where(or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id))
    else:
        query = query.where(Inventory.user_id == current_user.id)

    result = await db.execute(query)
    inventory = result.scalar_one_or_none()
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="库存记录不存在"
        )

    update_data = inventory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inventory, field, value)

    await db.commit()
    await db.refresh(inventory)

    query = select(Inventory).options(selectinload(Inventory.ingredient)).where(Inventory.id == inventory_id)
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{inventory_id}")
async def delete_inventory(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Inventory).where(Inventory.id == inventory_id)
    if current_user.family_id:
        query = query.where(or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id))
    else:
        query = query.where(Inventory.user_id == current_user.id)

    result = await db.execute(query)
    inventory = result.scalar_one_or_none()
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="库存记录不存在"
        )

    await db.delete(inventory)
    await db.commit()
    return {"message": "库存记录已删除"}


@router.get("/alerts/expiring", response_model=List[schemas.ExpirationAlert])
async def get_expiring_soon(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()
    target_date = today + timedelta(days=days)

    query = select(Inventory).options(selectinload(Inventory.ingredient)).where(
        and_(
            Inventory.expiration_date.isnot(None),
            Inventory.expiration_date <= target_date,
            Inventory.quantity > 0,
            or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id) if current_user.family_id else Inventory.user_id == current_user.id
        )
    ).order_by(Inventory.expiration_date.asc())

    result = await db.execute(query)
    inventories = result.scalars().all()

    alerts = []
    for inv in inventories:
        days_left = (inv.expiration_date - today).days
        alerts.append(schemas.ExpirationAlert(
            inventory_id=inv.id,
            ingredient_name=inv.ingredient.name if inv.ingredient else "未知",
            quantity=inv.quantity,
            unit=inv.ingredient.unit if inv.ingredient else "",
            expiration_date=inv.expiration_date,
            days_left=days_left
        ))
    return alerts


@router.post("/alerts/expiring/generate-notifications")
async def generate_expiration_notifications(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()
    target_date = today + timedelta(days=days)

    query = select(Inventory).options(selectinload(Inventory.ingredient)).where(
        and_(
            Inventory.expiration_date.isnot(None),
            Inventory.expiration_date <= target_date,
            Inventory.quantity > 0,
            or_(Inventory.family_id == current_user.family_id, Inventory.user_id == current_user.id) if current_user.family_id else Inventory.user_id == current_user.id
        )
    )
    result = await db.execute(query)
    inventories = result.scalars().all()

    user_ids = {current_user.id}
    if current_user.family_id:
        from models import User as UserModel
        family_result = await db.execute(
            select(UserModel.id).where(UserModel.family_id == current_user.family_id)
        )
        user_ids = {row[0] for row in family_result.fetchall()}

    count = 0
    for inv in inventories:
        days_left = (inv.expiration_date - today).days
        ingredient_name = inv.ingredient.name if inv.ingredient else "未知"
        unit = inv.ingredient.unit if inv.ingredient else ""

        for uid in user_ids:
            check_query = select(Notification).where(
                and_(
                    Notification.user_id == uid,
                    Notification.type == "expiration",
                    Notification.title.contains(ingredient_name),
                    func.date(Notification.created_at) == today
                )
            )
            check_result = await db.execute(check_query)
            if not check_result.scalar_one_or_none():
                notif = Notification(
                    user_id=uid,
                    title="食材即将过期提醒",
                    content=f"{ingredient_name} 将在 {inv.expiration_date.strftime('%Y-%m-%d')} 过期（还剩 {days_left} 天），剩余 {inv.quantity} {unit}，请尽快食用！",
                    type="expiration",
                    is_read=False
                )
                db.add(notif)
                count += 1

    await db.commit()
    return {"message": f"已生成 {count} 条过期提醒通知"}


async def deduct_inventory(
    db: AsyncSession,
    user: User,
    ingredient_id: int,
    quantity: float
) -> bool:
    family_condition = or_(
        Inventory.family_id == user.family_id,
        Inventory.user_id == user.id
    ) if user.family_id else (Inventory.user_id == user.id)

    query = select(Inventory).where(
        and_(
            Inventory.ingredient_id == ingredient_id,
            Inventory.quantity > 0,
            family_condition
        )
    ).order_by(Inventory.expiration_date.asc().nullslast())

    result = await db.execute(query)
    inventories = result.scalars().all()

    remaining = quantity
    for inv in inventories:
        if remaining <= 0:
            break
        if inv.quantity >= remaining:
            inv.quantity -= remaining
            remaining = 0
        else:
            remaining -= inv.quantity
            inv.quantity = 0

    return remaining <= 0


async def get_total_inventory_quantity(
    db: AsyncSession,
    user: User,
    ingredient_id: int
) -> float:
    family_condition = or_(
        Inventory.family_id == user.family_id,
        Inventory.user_id == user.id
    ) if user.family_id else (Inventory.user_id == user.id)

    query = select(func.sum(Inventory.quantity)).where(
        and_(
            Inventory.ingredient_id == ingredient_id,
            Inventory.quantity > 0,
            family_condition
        )
    )
    result = await db.execute(query)
    total = result.scalar_one_or_none()
    return total or 0.0
