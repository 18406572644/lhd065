from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
import pandas as pd
import io
import re
import json
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

from database import get_db
from models import User, Recipe, RecipeStep, RecipeIngredient, Ingredient
import schemas
from auth import get_current_active_user
from routers.recipes import recipe_to_response

router = APIRouter()

REQUIRED_COLUMNS = ["title"]
OPTIONAL_COLUMNS = [
    "description", "category", "prep_time", "cook_time",
    "servings", "difficulty", "image", "ingredients", "steps", "is_public"
]
VALID_DIFFICULTIES = ["简单", "中等", "难", "easy", "medium", "hard"]

DIFFICULTY_MAP = {
    "easy": "简单",
    "medium": "中等",
    "hard": "难",
    "简单": "简单",
    "中等": "中等",
    "难": "难",
}


def parse_ingredients(text: str) -> List[dict]:
    if not text:
        return []
    ingredients = []
    lines = text.split(";") if ";" in text else text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = re.match(r"(.+?)\s*[:：]\s*(\d+\.?\d*)\s*(\w+)?", line)
        if match:
            name, qty, unit = match.groups()
            ingredients.append({
                "name": name.strip(),
                "quantity": float(qty),
                "unit": unit or "克"
            })
        else:
            ingredients.append({
                "name": line,
                "quantity": 0,
                "unit": "克"
            })
    return ingredients


def parse_steps(text: str) -> List[dict]:
    if not text:
        return []
    steps = []
    lines = text.split(";") if ";" in text else text.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        match = re.match(r"(.+?)\s*[（(]\s*(\d+)\s*分钟\s*[)）]", line)
        if match:
            instruction, minutes = match.groups()
            steps.append({
                "step_number": i + 1,
                "instruction": instruction.strip(),
                "timer_minutes": int(minutes)
            })
        else:
            steps.append({
                "step_number": i + 1,
                "instruction": line,
                "timer_minutes": 0
            })
    return steps


def validate_row(row: Dict[str, Any], row_num: int) -> List[schemas.RecipeImportError]:
    errors = []
    if not row.get("title") or not str(row["title"]).strip():
        errors.append(schemas.RecipeImportError(
            row=row_num,
            field="title",
            message="食谱名称不能为空",
            value=str(row.get("title", ""))
        ))
    elif len(str(row["title"])) > 200:
        errors.append(schemas.RecipeImportError(
            row=row_num,
            field="title",
            message="食谱名称不能超过200个字符",
            value=str(row["title"])
        ))
    difficulty = str(row.get("difficulty", "")).strip()
    if difficulty and difficulty not in VALID_DIFFICULTIES:
        errors.append(schemas.RecipeImportError(
            row=row_num,
            field="difficulty",
            message=f"难度必须是以下值之一: {', '.join(VALID_DIFFICULTIES)}",
            value=difficulty
        ))
    try:
        if row.get("prep_time"):
            int(row["prep_time"])
        if row.get("cook_time"):
            int(row["cook_time"])
        if row.get("servings"):
            servings = int(row["servings"])
            if servings <= 0:
                raise ValueError()
    except (ValueError, TypeError):
        errors.append(schemas.RecipeImportError(
            row=row_num,
            field="prep_time/cook_time/servings",
            message="时间和份量必须是正整数",
            value=str(row.get("prep_time", ""))
        ))
    return errors


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    column_map = {
        "名称": "title", "食谱名称": "title", "菜名": "title",
        "描述": "description", "简介": "description",
        "分类": "category", "类别": "category",
        "准备时间": "prep_time", "备料时间": "prep_time",
        "烹饪时间": "cook_time", "制作时间": "cook_time",
        "份量": "servings", "人数": "servings", "份": "servings",
        "难度": "difficulty", "等级": "difficulty",
        "图片": "image", "封面": "image",
        "食材": "ingredients", "配料": "ingredients", "材料": "ingredients",
        "步骤": "steps", "做法": "steps", "制作步骤": "steps",
        "是否公开": "is_public", "公开": "is_public",
    }
    df.columns = [column_map.get(col.strip(), col.strip()) for col in df.columns]
    return df


@router.post("/preview", response_model=schemas.ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持 CSV 和 Excel 格式文件"
        )
    contents = await file.read()
    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件解析失败: {str(e)}"
        )
    df = normalize_columns(df)
    columns = list(df.columns)
    if "title" not in columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件缺少必要列 'title' (食谱名称)。检测到的列: {', '.join(columns)}"
        )
    validation_errors = []
    for i, row in df.iterrows():
        errors = validate_row(row.to_dict(), i + 2)
        validation_errors.extend(errors)
    sample_data = df.head(5).fillna("").to_dict("records")
    return schemas.ImportPreviewResponse(
        total_rows=len(df),
        sample_data=sample_data,
        columns=columns,
        validation_errors=validation_errors
    )


@router.post("/import", response_model=schemas.RecipeImportResult)
async def import_recipes(
    file: UploadFile = File(...),
    skip_duplicates: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件名为空"
        )
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只支持 CSV 和 Excel 格式文件"
        )
    contents = await file.read()
    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件解析失败: {str(e)}"
        )
    df = normalize_columns(df)
    total = len(df)
    success_count = 0
    failed_count = 0
    duplicate_count = 0
    errors = []
    imported_ids = []
    existing_query = select(Recipe.title).where(
        and_(
            Recipe.user_id == current_user.id,
            Recipe.family_id == current_user.family_id
        )
    )
    existing_result = await db.execute(existing_query)
    existing_titles = {row[0] for row in existing_result.fetchall()}
    for i, row in df.iterrows():
        row_num = i + 2
        row_dict = row.to_dict()
        row_errors = validate_row(row_dict, row_num)
        if row_errors:
            errors.extend(row_errors)
            failed_count += 1
            continue
        title = str(row_dict["title"]).strip()
        if skip_duplicates and title in existing_titles:
            duplicate_count += 1
            errors.append(schemas.RecipeImportError(
                row=row_num,
                field="title",
                message="食谱已存在，已跳过",
                value=title
            ))
            continue
        try:
            difficulty = str(row_dict.get("difficulty", "简单")).strip()
            difficulty = DIFFICULTY_MAP.get(difficulty, "简单")
            recipe = Recipe(
                title=title,
                description=str(row_dict.get("description", "")).strip(),
                category=str(row_dict.get("category", "")).strip(),
                prep_time=int(row_dict.get("prep_time", 0) or 0),
                cook_time=int(row_dict.get("cook_time", 0) or 0),
                servings=int(row_dict.get("servings", 1) or 1),
                difficulty=difficulty,
                image=str(row_dict.get("image", "")).strip(),
                is_public=bool(row_dict.get("is_public", False)),
                user_id=current_user.id,
                family_id=current_user.family_id
            )
            db.add(recipe)
            await db.flush()
            ingredients_raw = str(row_dict.get("ingredients", "")).strip()
            ingredients_list = parse_ingredients(ingredients_raw)
            for ing_data in ingredients_list:
                ing_name = ing_data["name"].strip()
                if not ing_name:
                    continue
                ing_query = select(Ingredient).where(func.lower(Ingredient.name) == func.lower(ing_name))
                ing_result = await db.execute(ing_query)
                ingredient = ing_result.scalar_one_or_none()
                if not ingredient:
                    ingredient = Ingredient(
                        name=ing_name,
                        category="其他",
                        unit=ing_data.get("unit", "克"),
                        nutrition_calories=0,
                        nutrition_protein=0,
                        nutrition_carbs=0,
                        nutrition_fat=0
                    )
                    db.add(ingredient)
                    await db.flush()
                ri = RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_id=ingredient.id,
                    quantity=float(ing_data.get("quantity", 0) or 0)
                )
                db.add(ri)
            steps_raw = str(row_dict.get("steps", "")).strip()
            steps_list = parse_steps(steps_raw)
            for step_data in steps_list:
                step = RecipeStep(
                    recipe_id=recipe.id,
                    step_number=step_data["step_number"],
                    instruction=step_data["instruction"],
                    timer_minutes=step_data.get("timer_minutes", 0)
                )
                db.add(step)
            await db.commit()
            imported_ids.append(recipe.id)
            existing_titles.add(title)
            success_count += 1
        except Exception as e:
            await db.rollback()
            failed_count += 1
            errors.append(schemas.RecipeImportError(
                row=row_num,
                field="system",
                message=f"导入失败: {str(e)}",
                value=title
            ))
    return schemas.RecipeImportResult(
        success=success_count,
        failed=failed_count,
        duplicates=duplicate_count,
        total=total,
        errors=errors,
        imported_ids=imported_ids
    )


def detect_website(url: str) -> str:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if "xiachufang.com" in domain:
        return "xiachufang"
    if "meishij.net" in domain or "m.meishichina.com" in domain:
        return "meishij"
    if "douguo.com" in domain:
        return "douguo"
    if "haodou.com" in domain:
        return "haodou"
    return "unknown"


def parse_xiachufang(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")

    title = (
        soup.select_one("h1.page-title")
        or soup.select_one(".recipe-title h1")
        or soup.select_one("h1#recipe-title")
        or soup.select_one("h1")
    )
    title = title.get_text(strip=True) if title else ""

    desc = (
        soup.select_one(".recipe-description")
        or soup.select_one(".recipe-intro")
        or soup.select_one(".desc")
        or soup.select_one(".recipe-introduction")
    )
    desc = desc.get_text(strip=True) if desc else ""

    cover = (
        soup.select_one(".recipe-show .cover img")
        or soup.select_one(".main-pic img")
        or soup.select_one(".recipe_photo img")
        or soup.select_one(".cover-image img")
        or soup.select_one("img#recipe_photo")
        or soup.select_one(".recipe-image img")
    )
    image = ""
    if cover:
        image = cover.get("src", "") or cover.get("data-src", "")

    ingredients = []
    ing_selectors = [
        ".ings tr",
        ".recipe-ingredients li",
        ".materials li",
        ".ingredient-list li",
        ".rightList li",
        ".ingredients tr",
    ]
    ing_items = []
    for selector in ing_selectors:
        found = soup.select(selector)
        if found:
            ing_items = found
            break

    for item in ing_items:
        name_el = (
            item.select_one("td:nth-child(1)")
            or item.select_one(".name")
            or item.select_one("span:first-child")
            or item.select_one("a")
            or item
        )
        qty_el = (
            item.select_one("td:nth-child(2)")
            or item.select_one(".unit")
            or item.select_one(".amount")
            or item.select_one("span:last-child")
        )

        if name_el:
            name = name_el.get_text(strip=True)
            if not name or len(name) > 30:
                continue
            if qty_el:
                qty_text = qty_el.get_text(strip=True)
            else:
                item_text = item.get_text(strip=True)
                qty_text = item_text.replace(name, "").strip()

            qty_match = re.search(r"(\d+\.?\d*)", qty_text)
            qty = float(qty_match.group(1)) if qty_match else 0
            unit_match = re.search(r"([^\d.，,、\s]+)", qty_text)
            unit = unit_match.group(1).strip() if unit_match else "克"
            if not unit or len(unit) > 5:
                unit = "克"
            ingredients.append({"name": name, "quantity": qty, "unit": unit})

    steps = []
    step_selectors = [
        ".steps li",
        ".recipe-steps li",
        ".step-list li",
        ".content ol li",
        ".steps .step",
        ".recipe_method li",
        ".method li",
    ]
    step_items = []
    for selector in step_selectors:
        found = soup.select(selector)
        if found:
            step_items = found
            break

    if not step_items:
        alt_step_containers = soup.select(".steps, .recipe-steps, .step-list")
        for container in alt_step_containers:
            text = container.get_text("\n", strip=True)
            for idx, line in enumerate(text.split("\n"), 1):
                line = line.strip()
                if line and len(line) > 3 and re.match(r"^\d+[.、．]", line):
                    line = re.sub(r"^\d+[.、．]\s*", "", line)
                    steps.append({
                        "step_number": idx,
                        "instruction": line,
                        "timer_minutes": 0
                    })
            if steps:
                break

    if not steps:
        for i, step in enumerate(step_items, 1):
            instruction_el = (
                step.select_one(".content")
                or step.select_one(".step-content")
                or step.select_one(".text")
                or step.select_one(".description")
                or step.select_one("p")
                or step
            )
            instruction = instruction_el.get_text(strip=True) if instruction_el else ""
            instruction = re.sub(r"^\d+[.、．\s]*", "", instruction).strip()

            if instruction and len(instruction) > 3:
                timer = 0
                time_match = re.search(r"(\d+)\s*(分钟|分|min)", instruction)
                if time_match:
                    timer = int(time_match.group(1))
                steps.append({
                    "step_number": i,
                    "instruction": instruction,
                    "timer_minutes": timer
                })

    prep_time = 0
    cook_time = 0
    difficulty = "简单"
    servings = 2

    info_selectors = [
        ".recipe_stats",
        ".recipe-info",
        ".recipe-meta",
        ".cook-info",
        ".stats",
        ".recipe-detail",
    ]
    info_text = ""
    for selector in info_selectors:
        el = soup.select_one(selector)
        if el:
            info_text = el.get_text("\n", strip=True)
            break

    if not info_text:
        meta_items = soup.select(".meta-item, .stat-item, .info-item")
        info_text = "\n".join([m.get_text(strip=True) for m in meta_items])

    if info_text:
        prep_match = re.search(r"(准备|备料|预处理).*?(\d+)\s*(分钟|分)", info_text)
        if prep_match:
            prep_time = int(prep_match.group(2))

        cook_match = re.search(r"(烹饪|炒|煮|蒸|烤|烧).*?(\d+)\s*(分钟|分)", info_text)
        if not cook_match:
            cook_match = re.search(r"(\d+)\s*(分钟|分)", info_text)
        if cook_match:
            groups = cook_match.groups()
            if len(groups) >= 2:
                cook_time = int(groups[-2]) if groups[-2].isdigit() else int(groups[0])

        diff_map = {
            "简单": "简单", "容易": "简单", "新手": "简单", "初级": "简单", "easy": "简单",
            "中等": "中等", "一般": "中等", "普通": "中等", "中级": "中等", "medium": "中等",
            "困难": "难", "复杂": "难", "高级": "难", "hard": "难", "难": "难",
        }
        for key, val in diff_map.items():
            if key in info_text:
                difficulty = val
                break

        serving_match = re.search(r"(\d+)\s*(人份|份|人)", info_text)
        if serving_match:
            servings = int(serving_match.group(1))

    category = ""
    cat_selectors = [
        ".recipe-category a",
        ".category a",
        ".breadcrumb a",
    ]
    for sel in cat_selectors:
        cat_el = soup.select_one(sel)
        if cat_el:
            cat_text = cat_el.get_text(strip=True)
            if cat_text and len(cat_text) < 10:
                category = cat_text
                break

    return {
        "title": title,
        "description": desc,
        "image": image,
        "ingredients": ingredients,
        "steps": steps,
        "prep_time": prep_time,
        "cook_time": cook_time,
        "servings": servings,
        "difficulty": difficulty,
        "category": category
    }


def parse_meishij(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")

    title = (
        soup.select_one("h1")
        or soup.select_one(".recipe-title")
        or soup.select_one(".title h1")
    )
    title = title.get_text(strip=True) if title else ""

    desc = (
        soup.select_one(".content p")
        or soup.select_one(".recipe-intro")
        or soup.select_one(".summary")
        or soup.select_one(".description")
    )
    desc = desc.get_text(strip=True) if desc else ""

    cover = (
        soup.select_one("img#recipe_photo")
        or soup.select_one(".main-pic img")
        or soup.select_one(".recipe_photo img")
        or soup.select_one(".recipe-image img")
        or soup.select_one(".cover img")
    )
    image = ""
    if cover:
        image = cover.get("src", "") or cover.get("data-src", "")

    ingredients = []
    ing_selectors = [
        ".materials li",
        ".ings li",
        ".recipe-ingredients li",
        ".ingredient-list li",
        ".yl ul li",
        ".materials p",
    ]
    ing_items = []
    for selector in ing_selectors:
        found = soup.select(selector)
        if found:
            ing_items = found
            break

    for item in ing_items:
        name_span = (
            item.select_one("span")
            or item.select_one(".name")
            or item.select_one("a")
            or item
        )
        if name_span:
            name = name_span.get_text(strip=True)
            if not name or len(name) > 30:
                continue
            text = item.get_text(strip=True)
            text = text.replace(name, "").strip()
            qty_match = re.search(r"(\d+\.?\d*)", text)
            qty = float(qty_match.group(1)) if qty_match else 0
            unit_match = re.search(r"([^\d.，,、\s]+)", text)
            unit = unit_match.group(1).strip() if unit_match else "克"
            if not unit or len(unit) > 5:
                unit = "克"
            ingredients.append({"name": name, "quantity": qty, "unit": unit})

    steps = []
    step_selectors = [
        ".step li",
        ".content ul li",
        ".recipe-steps li",
        ".step-list li",
        ".make ol li",
        ".method li",
        ".steps .item",
    ]
    step_items = []
    for selector in step_selectors:
        found = soup.select(selector)
        if found:
            step_items = found
            break

    if not step_items:
        alt_step_containers = soup.select(".step, .content > .text, .recipe_content")
        for container in alt_step_containers:
            text = container.get_text("\n", strip=True)
            for idx, line in enumerate(text.split("\n"), 1):
                line = line.strip()
                if line and len(line) > 5:
                    line = re.sub(r"^\d+[.、．\s]*", "", line).strip()
                    if line and len(line) > 3:
                        steps.append({
                            "step_number": idx,
                            "instruction": line,
                            "timer_minutes": 0
                        })
            if steps:
                break

    for i, step in enumerate(step_items, 1):
        text = step.get_text(strip=True)
        text = re.sub(r"^\d+[.、．\s]*", "", text).strip()
        if text and len(text) > 3:
            timer = 0
            time_match = re.search(r"(\d+)\s*(分钟|分|min)", text)
            if time_match:
                timer = int(time_match.group(1))
            steps.append({
                "step_number": i,
                "instruction": text,
                "timer_minutes": timer
            })

    prep_time = 0
    cook_time = 0
    difficulty = "简单"
    servings = 2
    category = ""

    info_selectors = [
        ".recipe-info",
        ".info",
        ".cook-info",
        ".recipe-meta",
        ".detail-info",
    ]
    info_text = ""
    for selector in info_selectors:
        el = soup.select_one(selector)
        if el:
            info_text = el.get_text("\n", strip=True)
            break

    if not info_text:
        meta_items = soup.select(".meta-item, .item, .info-item")
        info_text = "\n".join([m.get_text(strip=True) for m in meta_items])

    if info_text:
        prep_match = re.search(r"(准备|备料).*?(\d+)\s*(分钟|分)", info_text)
        if prep_match:
            prep_time = int(prep_match.group(2))

        cook_match = re.search(r"(烹饪|制作|炒|煮|蒸).*?(\d+)\s*(分钟|分)", info_text)
        if not cook_match:
            cook_match = re.search(r"(\d+)\s*(分钟|分)", info_text)
        if cook_match:
            groups = cook_match.groups()
            if len(groups) >= 2:
                cook_time = int(groups[-2]) if groups[-2].isdigit() else int(groups[0])

        diff_map = {
            "简单": "简单", "容易": "简单", "新手": "简单", "初级": "简单",
            "中等": "中等", "一般": "中等", "普通": "中等", "中级": "中等",
            "困难": "难", "复杂": "难", "高级": "难", "难": "难",
        }
        for key, val in diff_map.items():
            if key in info_text:
                difficulty = val
                break

        serving_match = re.search(r"(\d+)\s*(人份|份|人)", info_text)
        if serving_match:
            servings = int(serving_match.group(1))

    cat_selectors = [
        ".recipe-category a",
        ".category a",
        ".crumb a",
        ".position a",
    ]
    for sel in cat_selectors:
        cat_el = soup.select_one(sel)
        if cat_el:
            cat_text = cat_el.get_text(strip=True)
            if cat_text and len(cat_text) < 10:
                category = cat_text
                break

    return {
        "title": title,
        "description": desc,
        "image": image,
        "ingredients": ingredients,
        "steps": steps,
        "prep_time": prep_time,
        "cook_time": cook_time,
        "servings": servings,
        "difficulty": difficulty,
        "category": category
    }


@router.post("/import/url", response_model=schemas.URLImportResponse)
async def import_from_url(
    request_data: schemas.URLImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    url = request_data.url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    website = detect_website(url)
    if website == "unknown":
        return schemas.URLImportResponse(
            success=False,
            message="暂不支持该网站。支持的网站：下厨房(xiachufang.com)、美食杰(meishij.net)",
            source="unknown"
        )
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = "utf-8"
        response.raise_for_status()
    except Exception as e:
        return schemas.URLImportResponse(
            success=False,
            message=f"获取网页内容失败: {str(e)}",
            source=website
        )
    try:
        if website == "xiachufang":
            data = parse_xiachufang(response.text)
        elif website == "meishij":
            data = parse_meishij(response.text)
        else:
            return schemas.URLImportResponse(
                success=False,
                message="暂不支持该网站",
                source=website
            )
    except Exception as e:
        return schemas.URLImportResponse(
            success=False,
            message=f"解析网页内容失败: {str(e)}",
            source=website
        )
    if not data.get("title"):
        return schemas.URLImportResponse(
            success=False,
            message="未能解析到食谱标题，请检查URL是否正确",
            source=website
        )
    existing_query = select(Recipe).where(
        and_(
            Recipe.title == data["title"],
            Recipe.user_id == current_user.id
        )
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        return schemas.URLImportResponse(
            success=False,
            message=f"食谱 '{data['title']}' 已存在",
            source=website
        )
    try:
        recipe = Recipe(
            title=data["title"],
            description=data.get("description", ""),
            category=data.get("category", "") or "",
            prep_time=int(data.get("prep_time", 0) or 0),
            cook_time=int(data.get("cook_time", 0) or 0),
            servings=int(data.get("servings", 2) or 2),
            difficulty=data.get("difficulty", "简单"),
            image=data.get("image", ""),
            is_public=False,
            user_id=current_user.id,
            family_id=current_user.family_id
        )
        db.add(recipe)
        await db.flush()
        for ing_data in data.get("ingredients", []):
            ing_name = ing_data["name"].strip()
            if not ing_name:
                continue
            ing_query = select(Ingredient).where(func.lower(Ingredient.name) == func.lower(ing_name))
            ing_result = await db.execute(ing_query)
            ingredient = ing_result.scalar_one_or_none()
            if not ingredient:
                ingredient = Ingredient(
                    name=ing_name,
                    category="其他",
                    unit=ing_data.get("unit", "克"),
                    nutrition_calories=0,
                    nutrition_protein=0,
                    nutrition_carbs=0,
                    nutrition_fat=0
                )
                db.add(ingredient)
                await db.flush()
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                quantity=float(ing_data.get("quantity", 0) or 0)
            )
            db.add(ri)
        for step_data in data.get("steps", []):
            step = RecipeStep(
                recipe_id=recipe.id,
                step_number=step_data["step_number"],
                instruction=step_data["instruction"],
                timer_minutes=step_data.get("timer_minutes", 0)
            )
            db.add(step)
        await db.commit()
        query = select(Recipe).options(
            selectinload(Recipe.steps),
            selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
        ).where(Recipe.id == recipe.id)
        result = await db.execute(query)
        recipe = result.scalar_one()
        recipe_response = await recipe_to_response(db, recipe, current_user)
        return schemas.URLImportResponse(
            success=True,
            message=f"成功导入食谱: {data['title']}",
            recipe=recipe_response,
            source=website
        )
    except Exception as e:
        await db.rollback()
        return schemas.URLImportResponse(
            success=False,
            message=f"保存食谱失败: {str(e)}",
            source=website
        )


@router.post("/export")
async def export_recipes(
    request: Request,
    export_data: schemas.ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(Recipe).options(
        selectinload(Recipe.steps),
        selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient)
    ).where(
        and_(
            Recipe.user_id == current_user.id,
            or_(
                Recipe.family_id == current_user.family_id,
                Recipe.family_id.is_(None)
            )
        )
    )
    if export_data.recipe_ids:
        query = query.where(Recipe.id.in_(export_data.recipe_ids))
    result = await db.execute(query)
    recipes = result.scalars().all()
    export_list = []
    for recipe in recipes:
        ingredients_str = "; ".join([
            f"{ri.ingredient.name}: {ri.quantity}{ri.ingredient.unit}"
            for ri in recipe.ingredients
        ]) if recipe.ingredients else ""
        steps_str = "; ".join([
            f"{step.instruction}（{step.timer_minutes}分钟）" if step.timer_minutes > 0 else step.instruction
            for step in sorted(recipe.steps, key=lambda s: s.step_number)
        ]) if recipe.steps else ""
        export_list.append({
            "title": recipe.title,
            "description": recipe.description,
            "category": recipe.category,
            "prep_time": recipe.prep_time,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "difficulty": recipe.difficulty,
            "image": recipe.image,
            "ingredients": ingredients_str,
            "steps": steps_str,
            "is_public": recipe.is_public,
            "views": recipe.views,
            "likes": recipe.likes,
            "created_at": recipe.created_at.strftime("%Y-%m-%d %H:%M:%S") if recipe.created_at else ""
        })
    df = pd.DataFrame(export_list)
    output = io.BytesIO()
    if export_data.format == "csv":
        df.to_csv(output, index=False, encoding="utf-8-sig")
        media_type = "text/csv"
        filename = f"recipes_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    else:
        df.to_excel(output, index=False, engine="openpyxl")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"recipes_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    output.seek(0)
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/export/template")
async def download_template(
    format: str = "xlsx"
):
    template_data = [{
        "title": "番茄炒蛋",
        "description": "经典家常菜，酸甜可口",
        "category": "家常菜",
        "prep_time": 5,
        "cook_time": 10,
        "servings": 2,
        "difficulty": "简单",
        "image": "",
        "ingredients": "西红柿: 500克; 鸡蛋: 4个; 盐: 5克; 糖: 10克",
        "steps": "西红柿洗净切块，鸡蛋打散; 热锅倒油，倒入蛋液炒至凝固盛出（3分钟）; 锅中再加油，放入西红柿翻炒出汁（4分钟）; 加入炒好的鸡蛋，加盐糖调味翻炒均匀出锅（3分钟）",
        "is_public": True
    }]
    df = pd.DataFrame(template_data)
    output = io.BytesIO()
    if format == "csv":
        df.to_csv(output, index=False, encoding="utf-8-sig")
        media_type = "text/csv"
        filename = "recipe_import_template.csv"
    else:
        df.to_excel(output, index=False, engine="openpyxl")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "recipe_import_template.xlsx"
    output.seek(0)
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
