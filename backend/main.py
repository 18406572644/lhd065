from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date
import os

from database import engine, AsyncSessionLocal
from models import Base, User, Family, Ingredient, Inventory, Recipe, RecipeStep, RecipeIngredient, Notification
from auth import get_password_hash

from routers import auth as auth_router
from routers import users as users_router
from routers import ingredients as ingredients_router
from routers import inventory as inventory_router
from routers import recipes as recipes_router
from routers import shopping as shopping_router
from routers import stats as stats_router
from routers import upload as upload_router


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def init_sample_data():
    async with AsyncSessionLocal() as db:
        family = Family(name="幸福家庭")
        db.add(family)
        await db.flush()

        hashed_pw = get_password_hash("123456")
        user = User(
            username="demo",
            email="demo@example.com",
            hashed_password=hashed_pw,
            avatar="",
            family_id=family.id,
            role="admin"
        )
        db.add(user)
        await db.flush()

        ingredients_data = [
            {"name": "鸡胸肉", "category": "肉类", "unit": "克", "nutrition_calories": 165, "nutrition_protein": 31, "nutrition_carbs": 0, "nutrition_fat": 3.6},
            {"name": "鸡蛋", "category": "蛋类", "unit": "个", "nutrition_calories": 155, "nutrition_protein": 13, "nutrition_carbs": 1.1, "nutrition_fat": 11},
            {"name": "西红柿", "category": "蔬菜", "unit": "克", "nutrition_calories": 18, "nutrition_protein": 0.9, "nutrition_carbs": 3.9, "nutrition_fat": 0.2},
            {"name": "黄瓜", "category": "蔬菜", "unit": "克", "nutrition_calories": 16, "nutrition_protein": 0.7, "nutrition_carbs": 3.6, "nutrition_fat": 0.1},
            {"name": "大米", "category": "主食", "unit": "克", "nutrition_calories": 365, "nutrition_protein": 7.5, "nutrition_carbs": 80, "nutrition_fat": 0.5},
            {"name": "土豆", "category": "蔬菜", "unit": "克", "nutrition_calories": 77, "nutrition_protein": 2, "nutrition_carbs": 17, "nutrition_fat": 0.1},
            {"name": "牛肉", "category": "肉类", "unit": "克", "nutrition_calories": 250, "nutrition_protein": 26, "nutrition_carbs": 0, "nutrition_fat": 15},
            {"name": "胡萝卜", "category": "蔬菜", "unit": "克", "nutrition_calories": 41, "nutrition_protein": 0.9, "nutrition_carbs": 10, "nutrition_fat": 0.2},
            {"name": "青椒", "category": "蔬菜", "unit": "克", "nutrition_calories": 20, "nutrition_protein": 0.9, "nutrition_carbs": 4.6, "nutrition_fat": 0.2},
            {"name": "洋葱", "category": "蔬菜", "unit": "克", "nutrition_calories": 40, "nutrition_protein": 1.1, "nutrition_carbs": 9, "nutrition_fat": 0.1},
        ]

        ingredient_objs = []
        for ing_data in ingredients_data:
            ing = Ingredient(**ing_data)
            db.add(ing)
            ingredient_objs.append(ing)
        await db.flush()

        today = date.today()
        inventories_data = [
            (ingredient_objs[0].id, 500, today + timedelta(days=3), today, "冰箱"),
            (ingredient_objs[1].id, 10, today + timedelta(days=15), today, "冰箱"),
            (ingredient_objs[2].id, 1000, today + timedelta(days=5), today, "冰箱"),
            (ingredient_objs[3].id, 800, today + timedelta(days=6), today, "冰箱"),
            (ingredient_objs[4].id, 5000, today + timedelta(days=180), today, "储物柜"),
            (ingredient_objs[5].id, 1500, today + timedelta(days=20), today, "阴凉处"),
            (ingredient_objs[6].id, 300, today + timedelta(days=2), today, "冰箱"),
            (ingredient_objs[7].id, 500, today + timedelta(days=10), today, "冰箱"),
        ]
        for ing_id, qty, exp, pur, loc in inventories_data:
            inv = Inventory(
                ingredient_id=ing_id,
                quantity=qty,
                expiration_date=exp,
                purchase_date=pur,
                location=loc,
                user_id=user.id,
                family_id=family.id
            )
            db.add(inv)

        recipe1 = Recipe(
            title="番茄炒蛋",
            description="经典家常菜，酸甜可口，简单易做",
            category="家常菜",
            prep_time=5,
            cook_time=10,
            servings=2,
            difficulty="简单",
            image="",
            images="",
            is_public=True,
            user_id=user.id,
            family_id=family.id,
            views=128,
            likes=32
        )
        db.add(recipe1)
        await db.flush()

        steps1 = [
            RecipeStep(recipe_id=recipe1.id, step_number=1, instruction="西红柿洗净切块，鸡蛋打散加少许盐", timer_minutes=0),
            RecipeStep(recipe_id=recipe1.id, step_number=2, instruction="热锅倒油，倒入蛋液炒至凝固盛出", timer_minutes=3),
            RecipeStep(recipe_id=recipe1.id, step_number=3, instruction="锅中再加油，放入西红柿翻炒出汁", timer_minutes=4),
            RecipeStep(recipe_id=recipe1.id, step_number=4, instruction="加入炒好的鸡蛋，加盐糖调味，翻炒均匀出锅", timer_minutes=3),
        ]
        for s in steps1:
            db.add(s)

        ings1 = [
            RecipeIngredient(recipe_id=recipe1.id, ingredient_id=ingredient_objs[2].id, quantity=500),
            RecipeIngredient(recipe_id=recipe1.id, ingredient_id=ingredient_objs[1].id, quantity=4),
        ]
        for ri in ings1:
            db.add(ri)

        recipe2 = Recipe(
            title="红烧牛肉土豆",
            description="香浓入味的红烧牛肉，搭配软糯土豆",
            category="家常菜",
            prep_time=15,
            cook_time=60,
            servings=4,
            difficulty="中等",
            image="",
            images="",
            is_public=True,
            user_id=user.id,
            family_id=family.id,
            views=256,
            likes=89
        )
        db.add(recipe2)
        await db.flush()

        steps2 = [
            RecipeStep(recipe_id=recipe2.id, step_number=1, instruction="牛肉切块焯水去血沫，土豆胡萝卜切块", timer_minutes=10),
            RecipeStep(recipe_id=recipe2.id, step_number=2, instruction="热锅倒油，炒糖色至枣红色", timer_minutes=5),
            RecipeStep(recipe_id=recipe2.id, step_number=3, instruction="放入牛肉翻炒上色，加葱姜八角", timer_minutes=5),
            RecipeStep(recipe_id=recipe2.id, step_number=4, instruction="加生抽老抽料酒，倒入开水没过牛肉", timer_minutes=0),
            RecipeStep(recipe_id=recipe2.id, step_number=5, instruction="大火烧开转小火炖40分钟", timer_minutes=40),
            RecipeStep(recipe_id=recipe2.id, step_number=6, instruction="加入土豆胡萝卜继续炖15分钟，大火收汁", timer_minutes=15),
        ]
        for s in steps2:
            db.add(s)

        ings2 = [
            RecipeIngredient(recipe_id=recipe2.id, ingredient_id=ingredient_objs[6].id, quantity=500),
            RecipeIngredient(recipe_id=recipe2.id, ingredient_id=ingredient_objs[5].id, quantity=400),
            RecipeIngredient(recipe_id=recipe2.id, ingredient_id=ingredient_objs[7].id, quantity=200),
            RecipeIngredient(recipe_id=recipe2.id, ingredient_id=ingredient_objs[9].id, quantity=100),
        ]
        for ri in ings2:
            db.add(ri)

        recipe3 = Recipe(
            title="青椒炒鸡胸肉",
            description="低卡高蛋白的健康减脂菜",
            category="家常菜",
            prep_time=10,
            cook_time=15,
            servings=2,
            difficulty="简单",
            image="",
            images="",
            is_public=True,
            user_id=user.id,
            family_id=family.id,
            views=89,
            likes=24
        )
        db.add(recipe3)
        await db.flush()

        steps3 = [
            RecipeStep(recipe_id=recipe3.id, step_number=1, instruction="鸡胸肉切薄片，加料酒生抽淀粉腌制10分钟", timer_minutes=10),
            RecipeStep(recipe_id=recipe3.id, step_number=2, instruction="青椒切片，蒜切末", timer_minutes=0),
            RecipeStep(recipe_id=recipe3.id, step_number=3, instruction="热锅倒油，滑炒鸡肉至变色盛出", timer_minutes=5),
            RecipeStep(recipe_id=recipe3.id, step_number=4, instruction="锅中爆香蒜末，加入青椒翻炒", timer_minutes=3),
            RecipeStep(recipe_id=recipe3.id, step_number=5, instruction="倒回鸡肉，加盐蚝油调味炒匀", timer_minutes=2),
        ]
        for s in steps3:
            db.add(s)

        ings3 = [
            RecipeIngredient(recipe_id=recipe3.id, ingredient_id=ingredient_objs[0].id, quantity=300),
            RecipeIngredient(recipe_id=recipe3.id, ingredient_id=ingredient_objs[8].id, quantity=200),
        ]
        for ri in ings3:
            db.add(ri)

        expiring_items = [
            (ingredient_objs[6].id, 300, today + timedelta(days=2)),
        ]
        for ing_id, qty, exp in expiring_items:
            notif = Notification(
                user_id=user.id,
                title="食材即将过期提醒",
                content=f"牛肉将在 {exp.strftime('%Y-%m-%d')} 过期，剩余 {qty} 克，请尽快食用！",
                type="expiration",
                is_read=False
            )
            db.add(notif)

        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).limit(1))
        if not result.scalar_one_or_none():
            await init_sample_data()

    try:
        yield
    finally:
        await engine.dispose()


app = FastAPI(
    title="Fresh Kitchen API",
    description="智慧厨房管理系统后端 API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router.router, prefix="/api/auth", tags=["认证"])
app.include_router(users_router.router, prefix="/api/users", tags=["用户"])
app.include_router(ingredients_router.router, prefix="/api/ingredients", tags=["食材"])
app.include_router(inventory_router.router, prefix="/api/inventory", tags=["库存"])
app.include_router(recipes_router.router, prefix="/api/recipes", tags=["食谱"])
app.include_router(shopping_router.router, prefix="/api/shopping", tags=["购物清单"])
app.include_router(stats_router.router, prefix="/api/stats", tags=["统计"])
app.include_router(upload_router.router, prefix="/api/upload", tags=["上传"])


@app.get("/")
async def root():
    return {
        "name": "Fresh Kitchen API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
