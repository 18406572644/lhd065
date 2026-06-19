import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, timedelta, datetime

from database import get_db
from models import User, Recipe, CookingRecord
import schemas
from auth import get_current_active_user

router = APIRouter()


@router.post("", response_model=schemas.CookingRecordResponse)
async def create_cooking_record(
    data: schemas.CookingRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recipe_result = await db.execute(select(Recipe).where(Recipe.id == data.recipe_id))
    recipe = recipe_result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="食谱不存在")

    record = CookingRecord(
        recipe_id=data.recipe_id,
        user_id=current_user.id,
        family_id=current_user.family_id,
        started_at=data.started_at,
        completed_at=data.completed_at,
        estimated_minutes=data.estimated_minutes,
        actual_minutes=data.actual_minutes,
        rating=data.rating,
        review=data.review,
        step_records=data.step_records,
    )
    db.add(record)

    recipe.views = (recipe.views or 0) + 1
    await db.commit()
    await db.refresh(record)

    result = await db.execute(select(Recipe).where(Recipe.id == record.recipe_id))
    r = result.scalar_one_or_none()

    return schemas.CookingRecordResponse(
        id=record.id,
        recipe_id=record.recipe_id,
        user_id=record.user_id,
        family_id=record.family_id,
        started_at=record.started_at,
        completed_at=record.completed_at,
        estimated_minutes=record.estimated_minutes,
        actual_minutes=record.actual_minutes,
        rating=record.rating,
        review=record.review,
        step_records=record.step_records,
        created_at=record.created_at,
        recipe_name=r.title if r else None,
        recipe_category=r.category if r else None,
    )


@router.put("/{record_id}", response_model=schemas.CookingRecordResponse)
async def update_cooking_record(
    record_id: int,
    data: schemas.CookingRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(CookingRecord).where(
            and_(CookingRecord.id == record_id, CookingRecord.user_id == current_user.id)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="烹饪记录不存在")

    if data.completed_at is not None:
        record.completed_at = data.completed_at
    if data.actual_minutes is not None:
        record.actual_minutes = data.actual_minutes
    if data.rating is not None:
        record.rating = data.rating
    if data.review is not None:
        record.review = data.review

    await db.commit()
    await db.refresh(record)

    recipe_result = await db.execute(select(Recipe).where(Recipe.id == record.recipe_id))
    r = recipe_result.scalar_one_or_none()

    return schemas.CookingRecordResponse(
        id=record.id,
        recipe_id=record.recipe_id,
        user_id=record.user_id,
        family_id=record.family_id,
        started_at=record.started_at,
        completed_at=record.completed_at,
        estimated_minutes=record.estimated_minutes,
        actual_minutes=record.actual_minutes,
        rating=record.rating,
        review=record.review,
        step_records=record.step_records,
        created_at=record.created_at,
        recipe_name=r.title if r else None,
        recipe_category=r.category if r else None,
    )


@router.get("/list")
async def get_cooking_records(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = (
        select(CookingRecord)
        .where(
            or_(
                CookingRecord.user_id == current_user.id,
                (CookingRecord.family_id == current_user.family_id) if current_user.family_id else False,
            )
        )
        .order_by(CookingRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    recipe_ids = list(set(r.recipe_id for r in records))
    recipe_map = {}
    if recipe_ids:
        recipe_result = await db.execute(select(Recipe).where(Recipe.id.in_(recipe_ids)))
        for r in recipe_result.scalars().all():
            recipe_map[r.id] = r

    items = []
    for record in records:
        r = recipe_map.get(record.recipe_id)
        items.append({
            "id": record.id,
            "recipe_id": record.recipe_id,
            "user_id": record.user_id,
            "family_id": record.family_id,
            "started_at": record.started_at.isoformat() if record.started_at else None,
            "completed_at": record.completed_at.isoformat() if record.completed_at else None,
            "estimated_minutes": record.estimated_minutes,
            "actual_minutes": record.actual_minutes,
            "rating": record.rating,
            "review": record.review,
            "step_records": record.step_records,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "recipe_name": r.title if r else None,
            "recipe_category": r.category if r else None,
        })
    return items


@router.get("/calendar")
async def get_cooking_calendar(
    year: int = None,
    month: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    now = datetime.now()
    y = year or now.year
    m = month or now.month

    start_date = date(y, m, 1)
    if m == 12:
        end_date = date(y + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(y, m + 1, 1) - timedelta(days=1)

    query = (
        select(CookingRecord)
        .where(
            and_(
                or_(
                    CookingRecord.user_id == current_user.id,
                    (CookingRecord.family_id == current_user.family_id) if current_user.family_id else False,
                ),
                func.date(CookingRecord.started_at) >= start_date,
                func.date(CookingRecord.started_at) <= end_date,
            )
        )
        .order_by(CookingRecord.started_at)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    recipe_ids = list(set(r.recipe_id for r in records))
    recipe_map = {}
    if recipe_ids:
        recipe_result = await db.execute(select(Recipe).where(Recipe.id.in_(recipe_ids)))
        for r in recipe_result.scalars().all():
            recipe_map[r.id] = r

    calendar: dict = {}
    for record in records:
        day_key = record.started_at.strftime("%Y-%m-%d") if record.started_at else None
        if not day_key:
            continue
        if day_key not in calendar:
            calendar[day_key] = []
        r = recipe_map.get(record.recipe_id)
        calendar[day_key].append({
            "id": record.id,
            "recipe_id": record.recipe_id,
            "user_id": record.user_id,
            "family_id": record.family_id,
            "started_at": record.started_at.isoformat() if record.started_at else None,
            "completed_at": record.completed_at.isoformat() if record.completed_at else None,
            "estimated_minutes": record.estimated_minutes,
            "actual_minutes": record.actual_minutes,
            "rating": record.rating,
            "review": record.review,
            "step_records": record.step_records,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "recipe_name": r.title if r else None,
            "recipe_category": r.category if r else None,
        })

    days = []
    current = start_date
    while current <= end_date:
        day_key = current.isoformat()
        days.append({
            "date": day_key,
            "records": calendar.get(day_key, []),
        })
        current += timedelta(days=1)

    return {"year": y, "month": m, "days": days}


@router.get("/{record_id}")
async def get_cooking_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(CookingRecord).where(
            and_(
                CookingRecord.id == record_id,
                or_(
                    CookingRecord.user_id == current_user.id,
                    (CookingRecord.family_id == current_user.family_id) if current_user.family_id else False,
                ),
            )
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="烹饪记录不存在")

    recipe_result = await db.execute(select(Recipe).where(Recipe.id == record.recipe_id))
    r = recipe_result.scalar_one_or_none()

    return {
        "id": record.id,
        "recipe_id": record.recipe_id,
        "user_id": record.user_id,
        "family_id": record.family_id,
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "estimated_minutes": record.estimated_minutes,
        "actual_minutes": record.actual_minutes,
        "rating": record.rating,
        "review": record.review,
        "step_records": record.step_records,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "recipe_name": r.title if r else None,
        "recipe_category": r.category if r else None,
    }
