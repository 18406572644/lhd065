from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List

from database import get_db
from models import User, Family
import schemas
from auth import get_current_active_user

router = APIRouter()


@router.get("", response_model=List[dict])
async def get_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        return [{
            "id": current_user.id,
            "name": current_user.username,
            "relation": "自己",
            "age": 30,
            "gender": "other",
            "dietary_restrictions": [],
            "preferences": [],
            "avatar": current_user.avatar or ""
        }]

    query = select(User).options(selectinload(User.family)).where(
        User.family_id == current_user.family_id
    )
    result = await db.execute(query)
    users = result.scalars().all()

    relations = ["自己", "爸爸", "妈妈", "配偶", "儿子", "女儿", "兄弟", "姐妹", "其他"]
    genders = ["male", "female", "other"]

    members = []
    for i, user in enumerate(users):
        is_self = user.id == current_user.id
        members.append({
            "id": user.id,
            "name": user.username,
            "relation": "自己" if is_self else relations[(i) % len(relations)],
            "age": 30 + i,
            "gender": genders[i % len(genders)],
            "dietary_restrictions": [],
            "preferences": [],
            "avatar": user.avatar or ""
        })

    return members


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_family_member(
    member_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.family_id:
        family = Family(name=f"{current_user.username}的家庭")
        db.add(family)
        await db.flush()
        current_user.family_id = family.id

    user_id = member_data.get("user_id")
    username = member_data.get("username")

    if user_id:
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        user.family_id = current_user.family_id
    elif username:
        from auth import get_password_hash
        hashed_pw = get_password_hash(member_data.get("password", "123456"))
        email = member_data.get("email", f"{username}@example.com")
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_pw,
            avatar="",
            family_id=current_user.family_id,
            role="member"
        )
        db.add(user)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="需要提供 user_id 或 username"
        )

    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "name": user.username,
        "relation": member_data.get("relation", "家庭成员"),
        "age": member_data.get("age", 30),
        "gender": member_data.get("gender", "other"),
        "dietary_restrictions": member_data.get("dietary_restrictions", []),
        "preferences": member_data.get("preferences", []),
        "avatar": user.avatar or ""
    }


@router.put("/{member_id}", response_model=dict)
async def update_family_member(
    member_id: int,
    member_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(User).where(
        User.id == member_id,
        User.family_id == current_user.family_id if current_user.family_id else User.id == current_user.id
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="家庭成员不存在"
        )

    return {
        "id": user.id,
        "name": member_data.get("name", user.username),
        "relation": member_data.get("relation", "家庭成员"),
        "age": member_data.get("age", 30),
        "gender": member_data.get("gender", "other"),
        "dietary_restrictions": member_data.get("dietary_restrictions", []),
        "preferences": member_data.get("preferences", []),
        "avatar": user.avatar or ""
    }


@router.delete("/{member_id}")
async def remove_family_member(
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if member_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己"
        )

    query = select(User).where(
        User.id == member_id,
        User.family_id == current_user.family_id
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="家庭成员不存在"
        )

    user.family_id = None
    await db.commit()

    return {"message": "已从家庭中移除"}
