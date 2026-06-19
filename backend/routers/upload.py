from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
import uuid
import shutil
from datetime import datetime

from database import get_db
from models import User
import schemas
from auth import get_current_active_user

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "images": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"},
    "documents": {".pdf", ".doc", ".docx", ".txt"},
}

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


def is_allowed_file(filename: str, file_type: str = "images") -> bool:
    ext = get_file_extension(filename)
    allowed = ALLOWED_EXTENSIONS.get(file_type, ALLOWED_EXTENSIONS["images"])
    return ext in allowed


def generate_unique_filename(filename: str) -> str:
    ext = get_file_extension(filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{timestamp}_{unique_id}{ext}"


def ensure_subdirectory(subdir: str) -> str:
    target_dir = os.path.join(UPLOAD_DIR, subdir)
    os.makedirs(target_dir, exist_ok=True)
    return target_dir


def get_file_url(request: Request, filepath: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    relative_path = os.path.relpath(filepath, UPLOAD_DIR).replace("\\", "/")
    return f"{base_url}/uploads/{relative_path}"


@router.post("/image", response_model=schemas.UploadResponse)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )

    if not is_allowed_file(file.filename, "images"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式。支持的格式: {', '.join(ALLOWED_EXTENSIONS['images'])}"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大。最大支持 10MB"
        )

    subdir = "images"
    target_dir = ensure_subdirectory(subdir)
    unique_name = generate_unique_filename(file.filename)
    filepath = os.path.join(target_dir, unique_name)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    return schemas.UploadResponse(
        filename=unique_name,
        url=get_file_url(request, filepath),
        path=filepath
    )


@router.post("/images/batch", response_model=List[schemas.UploadResponse])
async def upload_images_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="一次最多上传10个文件"
        )

    results = []
    for file in files:
        if not file.filename:
            continue
        if not is_allowed_file(file.filename, "images"):
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            continue

        subdir = "images"
        target_dir = ensure_subdirectory(subdir)
        unique_name = generate_unique_filename(file.filename)
        filepath = os.path.join(target_dir, unique_name)

        with open(filepath, "wb") as buffer:
            buffer.write(contents)

        results.append(schemas.UploadResponse(
            filename=unique_name,
            url=get_file_url(request, filepath),
            path=filepath
        ))

    return results


@router.post("/avatar", response_model=schemas.UploadResponse)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )

    if not is_allowed_file(file.filename, "images"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大"
        )

    subdir = "avatars"
    target_dir = ensure_subdirectory(subdir)
    unique_name = generate_unique_filename(file.filename)
    filepath = os.path.join(target_dir, unique_name)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    file_url = get_file_url(request, filepath)
    current_user.avatar = file_url
    await db.commit()

    return schemas.UploadResponse(
        filename=unique_name,
        url=file_url,
        path=filepath
    )


@router.post("/recipe/{recipe_id}", response_model=schemas.UploadResponse)
async def upload_recipe_image(
    request: Request,
    recipe_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy import select, and_
    from models import Recipe

    recipe_result = await db.execute(
        select(Recipe).where(
            and_(Recipe.id == recipe_id, Recipe.user_id == current_user.id)
        )
    )
    recipe = recipe_result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食谱不存在或无权修改"
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )

    if not is_allowed_file(file.filename, "images"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大"
        )

    subdir = "recipes"
    target_dir = ensure_subdirectory(subdir)
    unique_name = generate_unique_filename(file.filename)
    filepath = os.path.join(target_dir, unique_name)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    file_url = get_file_url(request, filepath)
    recipe.image = file_url
    await db.commit()

    return schemas.UploadResponse(
        filename=unique_name,
        url=file_url,
        path=filepath
    )


@router.post("/ingredient/{ingredient_id}", response_model=schemas.UploadResponse)
async def upload_ingredient_image(
    request: Request,
    ingredient_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from sqlalchemy import select
    from models import Ingredient

    ing_result = await db.execute(
        select(Ingredient).where(Ingredient.id == ingredient_id)
    )
    ingredient = ing_result.scalar_one_or_none()
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="食材不存在"
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )

    if not is_allowed_file(file.filename, "images"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大"
        )

    subdir = "ingredients"
    target_dir = ensure_subdirectory(subdir)
    unique_name = generate_unique_filename(file.filename)
    filepath = os.path.join(target_dir, unique_name)

    with open(filepath, "wb") as buffer:
        buffer.write(contents)

    file_url = get_file_url(request, filepath)
    ingredient.image = file_url
    await db.commit()

    return schemas.UploadResponse(
        filename=unique_name,
        url=file_url,
        path=filepath
    )


@router.delete("/{filename}")
async def delete_file(
    filename: str,
    subdir: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if subdir:
        filepath = os.path.join(UPLOAD_DIR, subdir, filename)
    else:
        for sd in ["", "images", "avatars", "recipes", "ingredients"]:
            candidate = os.path.join(UPLOAD_DIR, sd, filename) if sd else os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(candidate):
                filepath = candidate
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="文件不存在"
            )

    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )

    try:
        os.remove(filepath)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除文件失败: {str(e)}"
        )

    return {"message": "文件已删除", "filename": filename}
