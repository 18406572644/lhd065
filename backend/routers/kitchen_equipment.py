from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timedelta

from database import get_db
from models import (
    User, Family, KitchenEquipment, EquipmentMaintenanceLog,
    EquipmentReminder, RecipeEquipment, Recipe
)
import schemas
from auth import get_current_active_user

router = APIRouter()

EQUIPMENT_CATEGORIES = [
    '烤箱', '空气炸锅', '破壁机', '高压锅', '电饭煲',
    '微波炉', '电磁炉', '净水器', '冰箱', '洗碗机',
    '油烟机', '燃气灶', '料理机', '榨汁机', '电饼铛',
    '面包机', '咖啡机', '豆浆机', '电水壶', '其他'
]


@router.get("/categories", response_model=List[str])
async def list_equipment_categories(
    current_user: User = Depends(get_current_active_user)
):
    return EQUIPMENT_CATEGORIES


@router.get("", response_model=List[schemas.KitchenEquipmentResponse])
async def list_equipment(
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(KitchenEquipment).options(
        selectinload(KitchenEquipment.maintenance_logs)
    ).where(
        or_(
            KitchenEquipment.user_id == current_user.id,
            KitchenEquipment.family_id == current_user.family_id
        )
    )

    if search:
        query = query.where(or_(
            KitchenEquipment.name.ilike(f"%{search}%"),
            KitchenEquipment.brand.ilike(f"%{search}%"),
            KitchenEquipment.model.ilike(f"%{search}%")
        ))
    if category and category != "全部":
        query = query.where(KitchenEquipment.category == category)

    query = query.order_by(KitchenEquipment.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    equipment_list = result.scalars().all()
    return list(equipment_list)


@router.get("/{equipment_id}", response_model=schemas.KitchenEquipmentResponse)
async def get_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(KitchenEquipment).options(
            selectinload(KitchenEquipment.maintenance_logs)
        ).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="设备不存在"
        )
    return equipment


@router.post("", response_model=schemas.KitchenEquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    equipment_data: schemas.KitchenEquipmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    equipment = KitchenEquipment(
        **equipment_data.model_dump(),
        user_id=current_user.id,
        family_id=current_user.family_id
    )
    db.add(equipment)
    await db.flush()

    await create_default_reminders(db, equipment, current_user.id)

    await db.commit()
    
    result = await db.execute(
        select(KitchenEquipment).options(
            selectinload(KitchenEquipment.maintenance_logs)
        ).where(KitchenEquipment.id == equipment.id)
    )
    equipment = result.scalar_one()
    return equipment


async def create_default_reminders(db: AsyncSession, equipment: KitchenEquipment, user_id: int):
    reminder_date = None

    if equipment.category == '空气炸锅':
        reminder = EquipmentReminder(
            equipment_id=equipment.id,
            reminder_type='usage_count',
            title='空气炸锅清洗提醒',
            content=f'您的{equipment.name}已使用50次，建议进行深度清洁',
            usage_threshold=50,
            user_id=user_id
        )
        db.add(reminder)

    if equipment.category == '净水器':
        if equipment.filter_replace_date:
            reminder_date = equipment.filter_replace_date
        elif equipment.purchase_date:
            reminder_date = equipment.purchase_date + timedelta(days=180)
        reminder = EquipmentReminder(
            equipment_id=equipment.id,
            reminder_type='filter_replace',
            title='净水器滤芯更换提醒',
            content=f'您的{equipment.name}滤芯即将到期，请及时更换',
            reminder_date=reminder_date,
            user_id=user_id
        )
        db.add(reminder)

    if equipment.category == '高压锅':
        if equipment.next_inspection_date:
            reminder_date = equipment.next_inspection_date
        elif equipment.purchase_date:
            reminder_date = equipment.purchase_date + timedelta(days=365)
        reminder = EquipmentReminder(
            equipment_id=equipment.id,
            reminder_type='inspection',
            title='高压锅年检提醒',
            content=f'您的{equipment.name}即将到年检日期，请安排安全检查',
            reminder_date=reminder_date,
            user_id=user_id
        )
        db.add(reminder)

    if equipment.warranty_expiry:
        reminder = EquipmentReminder(
            equipment_id=equipment.id,
            reminder_type='warranty',
            title='设备保修到期提醒',
            content=f'您的{equipment.name}保修即将到期，请注意保修期限',
            reminder_date=equipment.warranty_expiry,
            user_id=user_id
        )
        db.add(reminder)


@router.put("/{equipment_id}", response_model=schemas.KitchenEquipmentResponse)
async def update_equipment(
    equipment_id: int,
    equipment_data: schemas.KitchenEquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(KitchenEquipment).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="设备不存在"
        )

    update_data = equipment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)

    if 'warranty_expiry' in update_data and equipment.warranty_expiry:
        warranty_reminder_result = await db.execute(
            select(EquipmentReminder).where(
                EquipmentReminder.equipment_id == equipment_id,
                EquipmentReminder.reminder_type == 'warranty'
            )
        )
        warranty_reminder = warranty_reminder_result.scalar_one_or_none()
        if warranty_reminder:
            warranty_reminder.reminder_date = equipment.warranty_expiry
            warranty_reminder.is_triggered = False
            warranty_reminder.is_dismissed = False
            warranty_reminder.triggered_at = None
        else:
            reminder = EquipmentReminder(
                equipment_id=equipment.id,
                reminder_type='warranty',
                title='设备保修到期提醒',
                content=f'您的{equipment.name}保修即将到期，请注意保修期限',
                reminder_date=equipment.warranty_expiry,
                user_id=current_user.id
            )
            db.add(reminder)

    if 'next_inspection_date' in update_data and equipment.next_inspection_date:
        inspection_reminder_result = await db.execute(
            select(EquipmentReminder).where(
                EquipmentReminder.equipment_id == equipment_id,
                EquipmentReminder.reminder_type == 'inspection'
            )
        )
        inspection_reminder = inspection_reminder_result.scalar_one_or_none()
        if inspection_reminder:
            inspection_reminder.reminder_date = equipment.next_inspection_date
            inspection_reminder.is_triggered = False
            inspection_reminder.is_dismissed = False
            inspection_reminder.triggered_at = None

    if 'filter_replace_date' in update_data and equipment.filter_replace_date:
        filter_reminder_result = await db.execute(
            select(EquipmentReminder).where(
                EquipmentReminder.equipment_id == equipment_id,
                EquipmentReminder.reminder_type == 'filter_replace'
            )
        )
        filter_reminder = filter_reminder_result.scalar_one_or_none()
        if filter_reminder:
            filter_reminder.reminder_date = equipment.filter_replace_date
            filter_reminder.is_triggered = False
            filter_reminder.is_dismissed = False
            filter_reminder.triggered_at = None

    await db.commit()
    
    result = await db.execute(
        select(KitchenEquipment).options(
            selectinload(KitchenEquipment.maintenance_logs)
        ).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one()
    return equipment


@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(KitchenEquipment).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="设备不存在"
        )

    await db.delete(equipment)
    await db.commit()
    return {"message": "设备已删除"}


@router.post("/{equipment_id}/increment-usage", response_model=schemas.KitchenEquipmentResponse)
async def increment_usage(
    equipment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(KitchenEquipment).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="设备不存在"
        )

    equipment.total_usage_count += 1

    reminder_result = await db.execute(
        select(EquipmentReminder).where(
            EquipmentReminder.equipment_id == equipment_id,
            EquipmentReminder.reminder_type == 'usage_count',
            EquipmentReminder.is_dismissed == False
        )
    )
    reminders = reminder_result.scalars().all()
    for reminder in reminders:
        if reminder.usage_threshold and equipment.total_usage_count >= reminder.usage_threshold:
            reminder.is_triggered = True
            reminder.triggered_at = datetime.utcnow()

    await db.commit()
    
    result = await db.execute(
        select(KitchenEquipment).options(
            selectinload(KitchenEquipment.maintenance_logs)
        ).where(KitchenEquipment.id == equipment_id)
    )
    equipment = result.scalar_one()
    return equipment


@router.get("/{equipment_id}/maintenance-logs", response_model=List[schemas.EquipmentMaintenanceLogResponse])
async def list_maintenance_logs(
    equipment_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(EquipmentMaintenanceLog).where(
        EquipmentMaintenanceLog.equipment_id == equipment_id
    ).order_by(EquipmentMaintenanceLog.maintenance_date.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    logs = result.scalars().all()
    return list(logs)


@router.post("/{equipment_id}/maintenance-logs", response_model=schemas.EquipmentMaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_log(
    equipment_id: int,
    log_data: schemas.EquipmentMaintenanceLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    equip_result = await db.execute(
        select(KitchenEquipment).where(KitchenEquipment.id == equipment_id)
    )
    equipment = equip_result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="设备不存在"
        )

    log = EquipmentMaintenanceLog(
        **log_data.model_dump(),
        equipment_id=equipment_id,
        user_id=current_user.id
    )
    db.add(log)

    if log_data.log_type == 'cleaning':
        equipment.last_cleaned_date = log_data.maintenance_date
    if log_data.log_type in ('maintenance', 'repair'):
        equipment.last_maintenance_date = log_data.maintenance_date
    if log_data.log_type == 'filter_replace':
        equipment.filter_replace_date = log_data.maintenance_date + timedelta(days=180)

    dismiss_result = await db.execute(
        select(EquipmentReminder).where(
            EquipmentReminder.equipment_id == equipment_id,
            EquipmentReminder.is_triggered == True
        )
    )
    reminders_to_dismiss = dismiss_result.scalars().all()
    for reminder in reminders_to_dismiss:
        reminder.is_dismissed = True

    await db.commit()
    await db.refresh(log)
    return log


@router.get("/reminders/check", response_model=schemas.EquipmentReminderCheckResponse)
async def check_reminders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()

    equip_ids_result = await db.execute(
        select(KitchenEquipment.id).where(
            or_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.family_id == current_user.family_id
            )
        )
    )
    equipment_ids = [row[0] for row in equip_ids_result.fetchall()]

    if not equipment_ids:
        return {"reminders": [], "total_count": 0, "triggered_count": 0}

    all_equipment_result = await db.execute(
        select(KitchenEquipment).where(
            KitchenEquipment.id.in_(equipment_ids)
        )
    )
    all_equipment = list(all_equipment_result.scalars().all())
    
    for equip in all_equipment:
        if equip.warranty_expiry:
            existing_warranty_result = await db.execute(
                select(EquipmentReminder).where(
                    EquipmentReminder.equipment_id == equip.id,
                    EquipmentReminder.reminder_type == 'warranty'
                )
            )
            existing_warranty = existing_warranty_result.scalar_one_or_none()
            if not existing_warranty:
                reminder = EquipmentReminder(
                    equipment_id=equip.id,
                    reminder_type='warranty',
                    title='设备保修到期提醒',
                    content=f'您的{equip.name}保修即将到期，请注意保修期限',
                    reminder_date=equip.warranty_expiry,
                    user_id=current_user.id
                )
                db.add(reminder)
        
        if equip.category == '高压锅' and equip.next_inspection_date:
            existing_inspection_result = await db.execute(
                select(EquipmentReminder).where(
                    EquipmentReminder.equipment_id == equip.id,
                    EquipmentReminder.reminder_type == 'inspection'
                )
            )
            existing_inspection = existing_inspection_result.scalar_one_or_none()
            if not existing_inspection:
                reminder = EquipmentReminder(
                    equipment_id=equip.id,
                    reminder_type='inspection',
                    title='高压锅年检提醒',
                    content=f'您的{equip.name}即将到年检日期，请安排安全检查',
                    reminder_date=equip.next_inspection_date,
                    user_id=current_user.id
                )
                db.add(reminder)
        
        if equip.category == '净水器' and equip.filter_replace_date:
            existing_filter_result = await db.execute(
                select(EquipmentReminder).where(
                    EquipmentReminder.equipment_id == equip.id,
                    EquipmentReminder.reminder_type == 'filter_replace'
                )
            )
            existing_filter = existing_filter_result.scalar_one_or_none()
            if not existing_filter:
                reminder = EquipmentReminder(
                    equipment_id=equip.id,
                    reminder_type='filter_replace',
                    title='净水器滤芯更换提醒',
                    content=f'您的{equip.name}滤芯即将到期，请及时更换',
                    reminder_date=equip.filter_replace_date,
                    user_id=current_user.id
                )
                db.add(reminder)
    
    await db.flush()

    query = select(EquipmentReminder).options(
        selectinload(EquipmentReminder.equipment).selectinload(
            KitchenEquipment.maintenance_logs
        )
    ).where(
        EquipmentReminder.equipment_id.in_(equipment_ids),
        EquipmentReminder.is_dismissed == False
    )
    result = await db.execute(query)
    all_reminders = list(result.scalars().all())

    triggered_reminders = []
    for reminder in all_reminders:
        is_triggered = reminder.is_triggered

        if reminder.reminder_date:
            days_until = (reminder.reminder_date - today).days
            if not is_triggered and days_until <= 7:
                is_triggered = True
                reminder.is_triggered = True
                reminder.triggered_at = datetime.utcnow()
            
            if is_triggered:
                equip_name = reminder.equipment.name if reminder.equipment else '设备'
                if days_until < 0:
                    days_overdue = abs(days_until)
                    if reminder.reminder_type == 'warranty':
                        reminder.title = '⚠️ 设备保修已过期'
                        reminder.content = f'您的{equip_name}保修已过期{days_overdue}天，已不在保修期内'
                    elif reminder.reminder_type == 'inspection':
                        reminder.title = '⚠️ 年检已超期'
                        reminder.content = f'您的{equip_name}年检已超期{days_overdue}天，请尽快安排安全检查'
                    elif reminder.reminder_type == 'filter_replace':
                        reminder.title = '⚠️ 滤芯更换已超期'
                        reminder.content = f'您的{equip_name}滤芯更换已超期{days_overdue}天，请及时更换'
                else:
                    if reminder.reminder_type == 'warranty':
                        reminder.title = '设备保修到期提醒'
                        reminder.content = f'您的{equip_name}保修将在{days_until}天后到期'
                    elif reminder.reminder_type == 'inspection':
                        reminder.title = '年检提醒'
                        reminder.content = f'您的{equip_name}将在{days_until}天后需要年检'
                    elif reminder.reminder_type == 'filter_replace':
                        reminder.title = '滤芯更换提醒'
                        reminder.content = f'您的{equip_name}滤芯将在{days_until}天后需要更换'

        if not is_triggered and reminder.usage_threshold and reminder.equipment_id:
            equip_result_inner = await db.execute(
                select(KitchenEquipment.total_usage_count).where(
                    KitchenEquipment.id == reminder.equipment_id
                )
            )
            usage_count = equip_result_inner.scalar_one_or_none() or 0
            if usage_count >= reminder.usage_threshold:
                is_triggered = True
                reminder.is_triggered = True
                reminder.triggered_at = datetime.utcnow()

        if is_triggered:
            triggered_reminders.append(reminder)

    await db.commit()

    return {
        "reminders": triggered_reminders,
        "total_count": len(all_reminders),
        "triggered_count": len(triggered_reminders)
    }


@router.get("/reminders/list", response_model=List[schemas.EquipmentReminderResponse])
async def list_reminders(
    include_dismissed: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    equip_ids_result = await db.execute(
        select(KitchenEquipment.id).where(
            or_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.family_id == current_user.family_id
            )
        )
    )
    equipment_ids = [row[0] for row in equip_ids_result.fetchall()]

    if not equipment_ids:
        return []

    query = select(EquipmentReminder).options(
        selectinload(EquipmentReminder.equipment).selectinload(
            KitchenEquipment.maintenance_logs
        )
    ).where(
        EquipmentReminder.equipment_id.in_(equipment_ids)
    )
    if not include_dismissed:
        query = query.where(EquipmentReminder.is_dismissed == False)

    query = query.order_by(EquipmentReminder.created_at.desc())
    result = await db.execute(query)
    reminders = result.scalars().all()
    return list(reminders)


@router.put("/reminders/{reminder_id}/dismiss")
async def dismiss_reminder(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(EquipmentReminder).where(EquipmentReminder.id == reminder_id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="提醒不存在"
        )

    reminder.is_dismissed = True
    await db.commit()
    return {"message": "提醒已忽略"}


@router.get("/stats/categories", response_model=List[schemas.EquipmentCategoryStats])
async def get_equipment_category_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = (
        select(
            KitchenEquipment.category,
            func.count(KitchenEquipment.id).label('count')
        )
        .where(
            or_(
                KitchenEquipment.user_id == current_user.id,
                KitchenEquipment.family_id == current_user.family_id
            )
        )
        .group_by(KitchenEquipment.category)
    )
    result = await db.execute(query)
    rows = result.fetchall()
    return [{"category": row[0] or "其他", "count": row[1]} for row in rows]


@router.post("/recipes/{recipe_id}/equipment", response_model=List[schemas.RecipeEquipmentResponse])
async def set_recipe_equipment(
    recipe_id: int,
    equipment_list: List[schemas.RecipeEquipmentCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    recipe_result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id)
    )
    recipe = recipe_result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在"
        )

    await db.execute(
        delete(RecipeEquipment).where(RecipeEquipment.recipe_id == recipe_id)
    )

    created = []
    for eq in equipment_list:
        rel = RecipeEquipment(
            recipe_id=recipe_id,
            equipment_category=eq.equipment_category,
            equipment_name=eq.equipment_name,
            notes=eq.notes
        )
        db.add(rel)
        created.append(rel)

    await db.commit()
    for item in created:
        await db.refresh(item)
    return created


@router.get("/recipes/{recipe_id}/equipment", response_model=List[schemas.RecipeEquipmentResponse])
async def get_recipe_equipment(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(RecipeEquipment).where(
        RecipeEquipment.recipe_id == recipe_id
    ).order_by(RecipeEquipment.created_at.asc())
    result = await db.execute(query)
    return list(result.scalars().all())
