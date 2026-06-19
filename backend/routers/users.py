from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from database import get_db
from models import User, Family, Notification
import schemas
from auth import get_current_active_user, get_user_by_username, get_user_by_email

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
async def update_current_user(
    user_data: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if user_data.username and user_data.username != current_user.username:
        existing = await get_user_by_username(db, user_data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被使用"
            )
        current_user.username = user_data.username

    if user_data.email and user_data.email != current_user.email:
        existing = await get_user_by_email(db, user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被使用"
            )
        current_user.email = user_data.email

    if user_data.avatar is not None:
        current_user.avatar = user_data.avatar

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/family", response_model=schemas.FamilyResponse)
async def get_my_family(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="您还没有加入任何家庭"
        )

    result = await db.execute(
        select(Family).where(Family.id == current_user.family_id)
    )
    family = result.scalar_one_or_none()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="家庭不存在"
        )

    await db.refresh(family)
    return family


@router.post("/family", response_model=schemas.FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    family_data: schemas.FamilyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已经在一个家庭中了"
        )

    family = Family(name=family_data.name)
    db.add(family)
    await db.flush()

    current_user.family_id = family.id
    current_user.role = "admin"

    await db.commit()
    await db.refresh(family)
    await db.refresh(current_user)
    return family


@router.post("/family/members", response_model=schemas.UserResponse)
async def add_family_member(
    member_data: schemas.FamilyMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您还没有创建家庭"
        )
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员才能添加成员"
        )

    user = await get_user_by_username(db, member_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    if user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户已在其他家庭中"
        )

    user.family_id = current_user.family_id
    user.role = "member"
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/family/members/{user_id}")
async def remove_family_member(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您还没有家庭"
        )
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员才能移除成员"
        )
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能移除自己"
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.family_id == current_user.family_id
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="成员不存在"
        )

    user.family_id = None
    user.role = "member"
    await db.commit()

    return {"message": "成员已移除"}


@router.get("/family/members", response_model=List[schemas.UserResponse])
async def list_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        return []

    result = await db.execute(
        select(User).where(User.family_id == current_user.family_id)
    )
    users = result.scalars().all()
    return list(users)


@router.get("/notifications", response_model=List[schemas.NotificationResponse])
async def get_notifications(
    is_read: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    query = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    notifications = result.scalars().all()
    return list(notifications)


@router.put("/notifications/{notification_id}", response_model=schemas.NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    notif_data: schemas.NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="通知不存在"
        )

    if notif_data.is_read is not None:
        notification.is_read = notif_data.is_read

    await db.commit()
    await db.refresh(notification)
    return notification


@router.put("/notifications")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    notifications = result.scalars().all()
    for notif in notifications:
        notif.is_read = True

    await db.commit()
    return {"message": f"已标记 {len(notifications)} 条通知为已读"}
