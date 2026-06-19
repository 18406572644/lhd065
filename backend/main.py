from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, date
import os

from database import engine, AsyncSessionLocal
from models import Base, User, Family, Ingredient, Inventory, Recipe, RecipeStep, RecipeIngredient, Notification, IngredientEncyclopedia
from auth import get_password_hash

from routers import auth as auth_router
from routers import users as users_router
from routers import ingredients as ingredients_router
from routers import inventory as inventory_router
from routers import recipes as recipes_router
from routers import shopping as shopping_router
from routers import stats as stats_router
from routers import upload as upload_router
from routers import family as family_router
from routers import meal_plans as meal_plans_router
from routers import recipe_import_export as import_export_router
from routers import cooking as cooking_router
from routers import ingredient_encyclopedia as encyclopedia_router


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

        encyclopedia_data = [
            {
                "name": "西红柿",
                "category": "蔬菜",
                "aliases": "番茄,洋柿子,番柿",
                "season": "夏季",
                "description": "西红柿是一种常见的蔬果，味道酸甜可口，富含维生素C和番茄红素，具有很高的营养价值。既可生食，也可烹饪，是家常菜的重要食材。",
                "nutrition_calories": 18,
                "nutrition_protein": 0.9,
                "nutrition_carbs": 3.9,
                "nutrition_fat": 0.2,
                "nutrition_fiber": 1.2,
                "nutrition_sugar": 2.6,
                "nutrition_vitamin_c": 13.7,
                "nutrition_calcium": 10,
                "nutrition_iron": 0.3,
                "selection_tips": "1. 选择颜色鲜艳、均匀的西红柿，成熟度好\n2. 果形圆润饱满，表皮光滑无损伤\n3. 手感有弹性，不过软也不过硬\n4. 蒂部呈绿色且新鲜的更优\n5. 尽量选择自然成熟的，避免催熟的",
                "storage_method": "1. 未成熟的西红柿可放在室温下催熟\n2. 成熟的西红柿放入冰箱冷藏，可保存5-7天\n3. 不要将西红柿和苹果、香蕉等释放乙烯的水果放在一起\n4. 冷冻保存：切块后装入保鲜袋，可保存3个月",
                "cleaning_tips": "1. 先用流动水冲洗表面\n2. 可用软毛刷轻轻刷洗表皮缝隙\n3. 也可用淡盐水浸泡5分钟后冲洗\n4. 去除蒂部时不要挖太深，避免营养流失",
                "common_pairings": "鸡蛋-营养互补，经典搭配\n牛肉-增加风味，促进铁吸收\n土豆-口感丰富，营养均衡\n豆腐-植物蛋白与维生素结合",
                "food_conflicts": "黄瓜-黄瓜含维生素C分解酶，会破坏西红柿的维生素C\n螃蟹-可能引起肠胃不适\n虾-与鞣酸结合易产生不适",
                "cooking_tips": "1. 炒西红柿时加点糖可以中和酸味\n2. 西红柿去皮：顶部划十字，用开水烫30秒即可轻松去皮\n3. 炖煮时间越长，番茄红素越容易被人体吸收\n4. 与油脂一起烹饪更有利于番茄红素的吸收"
            },
            {
                "name": "黄瓜",
                "category": "蔬菜",
                "aliases": "胡瓜,青瓜,刺瓜",
                "season": "夏季",
                "description": "黄瓜是一种常见的瓜类蔬菜，口感清脆爽口，水分含量高，热量低，是夏季消暑的佳品。可生食、凉拌、炒食或腌制。",
                "nutrition_calories": 16,
                "nutrition_protein": 0.7,
                "nutrition_carbs": 3.6,
                "nutrition_fat": 0.1,
                "nutrition_fiber": 0.5,
                "nutrition_sugar": 1.8,
                "nutrition_vitamin_c": 2.8,
                "nutrition_calcium": 16,
                "nutrition_iron": 0.3,
                "selection_tips": "1. 选择深绿色、有光泽的黄瓜\n2. 表皮的刺白且坚硬的更新鲜\n3. 瓜条直、粗细均匀的品质好\n4. 手感紧实有分量，不要发软的\n5. 带花带刺的更新鲜",
                "storage_method": "1. 用保鲜膜包裹放入冰箱冷藏，可保存1周\n2. 存放时不要与其他蔬果混放\n3. 不宜冷冻，会变软变烂\n4. 切片后容易变质，最好现切现吃",
                "cleaning_tips": "1. 用流动水冲洗干净\n2. 可用刷子刷洗表皮的刺和缝隙\n3. 淡盐水浸泡10分钟可去除残留农药\n4. 如担心农药残留，可削皮后食用",
                "common_pairings": "木耳-清肠排毒，营养互补\n鸡蛋-营养均衡，口感丰富\n蒜末-提味增香，促进食欲\n豆腐-清淡爽口，夏季必备",
                "food_conflicts": "西红柿-黄瓜含维生素C分解酶，会破坏维生素C\n花生-可能引起腹泻（因人而异）\n辣椒-会破坏辣椒中的维生素C",
                "cooking_tips": "1. 凉拌黄瓜时最后放盐，避免出水\n2. 拍黄瓜比切的更入味\n3. 炒黄瓜时间不要太长，保持脆嫩口感\n4. 黄瓜皮营养丰富，建议带皮食用"
            },
            {
                "name": "鸡胸肉",
                "category": "肉类",
                "aliases": "鸡脯肉,鸡大胸",
                "season": "四季",
                "description": "鸡胸肉是鸡身上脂肪含量最低、蛋白质含量最高的部位，肉质细嫩，营养丰富，是健身减脂人群的首选蛋白质来源。",
                "nutrition_calories": 165,
                "nutrition_protein": 31,
                "nutrition_carbs": 0,
                "nutrition_fat": 3.6,
                "nutrition_fiber": 0,
                "nutrition_sugar": 0,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 11,
                "nutrition_iron": 0.7,
                "selection_tips": "1. 肉色呈淡粉红色，有光泽\n2. 表面微干或略显湿润，不粘手\n3. 肉质紧实有弹性，指压后凹陷能快速恢复\n4. 无异味，有鲜肉的正常气味\n5. 选择正规渠道购买，注意保质期",
                "storage_method": "1. 新鲜鸡胸肉可冷藏保存1-2天\n2. 冷冻保存可长达6个月\n3. 冷冻前分装成小份，方便取用\n4. 解冻最好在冰箱冷藏室缓慢进行，保持肉质",
                "cleaning_tips": "1. 用流动清水冲洗表面\n2. 去除多余的脂肪和筋膜\n3. 处理前后注意洗手，防止交叉污染\n4. 不要在水龙头下直接冲洗生鸡肉，防止细菌飞溅",
                "common_pairings": "西兰花-减脂经典搭配，营养均衡\n蘑菇-增加鲜味，口感丰富\n青椒-清爽解腻，维生素互补\n柠檬-去腥提鲜，增加风味",
                "food_conflicts": "芝麻-可能影响消化（少量无碍）\n大蒜-过量同食可能引起肠胃不适\n李子-同食可能引起身体不适",
                "cooking_tips": "1. 煎鸡胸肉前用刀背敲打，肉质更嫩\n2. 腌制时加少许淀粉或酸奶，肉质更滑嫩\n3. 煎制时火不要太大，避免外焦里生\n4. 煮鸡胸肉时冷水下锅，保持肉质鲜嫩\n5. 切丝切片时顺着纹理切，口感更好"
            },
            {
                "name": "鸡蛋",
                "category": "蛋类",
                "aliases": "鸡卵,鸡子",
                "season": "四季",
                "description": "鸡蛋是最常见的蛋类食品，营养丰富且均衡，含有人体所需的多种氨基酸，是优质蛋白质的重要来源，被称为\"理想的营养库\"。",
                "nutrition_calories": 155,
                "nutrition_protein": 13,
                "nutrition_carbs": 1.1,
                "nutrition_fat": 11,
                "nutrition_fiber": 0,
                "nutrition_sugar": 1.1,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 50,
                "nutrition_iron": 1.2,
                "selection_tips": "1. 蛋壳清洁完整，无裂纹\n2. 拿在手里有分量感，太轻的可能不新鲜\n3. 轻摇时没有晃动感，蛋黄完整\n4. 放入水中下沉的是新鲜蛋，上浮的不新鲜\n5. 注意查看生产日期和保质期",
                "storage_method": "1. 大头朝上放入冰箱冷藏，可保存3-5周\n2. 不要清洗后存放，会破坏蛋壳保护膜\n3. 存放时远离有强烈气味的食物\n4. 从冰箱取出后尽快食用，不要久放",
                "cleaning_tips": "1. 烹饪前用流动水冲洗蛋壳表面\n2. 注意不要让蛋壳内容物接触到蛋壳外表面的细菌\n3. 打鸡蛋前先洗手\n4. 不要使用有裂纹的鸡蛋",
                "common_pairings": "西红柿-经典搭配，营养互补\n韭菜-温补肾阳，春季养生\n牛奶-补充钙质，早餐黄金组合\n菠菜-促进钙吸收，营养加倍",
                "food_conflicts": "豆浆-豆浆中的胰蛋白酶抑制物影响蛋白质吸收（加热后可）\n柿子-可能引起消化不良\n兔肉-传统说法认为同食易致腹泻",
                "cooking_tips": "1. 煮鸡蛋：冷水下锅，水开后煮8分钟，焖2分钟，蛋黄刚好凝固\n2. 炒鸡蛋：加几滴清水或牛奶，更蓬松嫩滑\n3. 蒸蛋羹：用温水调蛋液，过筛后蒸更细腻\n4. 煎蛋：小火慢煎，保持形状完整"
            },
            {
                "name": "土豆",
                "category": "蔬菜",
                "aliases": "马铃薯,洋芋,山药蛋",
                "season": "秋季",
                "description": "土豆是一种粮菜两用的食材，淀粉含量高，饱腹感强，富含维生素C和钾元素，是世界范围内的重要主食之一。",
                "nutrition_calories": 77,
                "nutrition_protein": 2,
                "nutrition_carbs": 17,
                "nutrition_fat": 0.1,
                "nutrition_fiber": 2.2,
                "nutrition_sugar": 0.8,
                "nutrition_vitamin_c": 19.7,
                "nutrition_calcium": 12,
                "nutrition_iron": 0.8,
                "selection_tips": "1. 表皮光滑，形状规整，芽眼浅\n2. 颜色均匀，无绿色部分（发绿的土豆有毒）\n3. 手感沉重，干燥不粘手\n4. 无损伤、无腐烂、无虫眼\n5. 不要选发芽的土豆",
                "storage_method": "1. 放在阴凉、干燥、通风处保存\n2. 避免阳光直射，防止发芽变绿\n3. 可和苹果放在一起，延缓发芽\n4. 不要放入冰箱，低温会使淀粉转化为糖\n5. 已发芽或变绿的土豆不宜食用",
                "cleaning_tips": "1. 用流动水冲洗表面泥土\n2. 用削皮刀削去外皮\n3. 芽眼部分要深挖去除\n4. 削皮后的土豆放入水中，防止氧化变黑",
                "common_pairings": "牛肉-经典搭配，营养丰富\n鸡肉-蛋白质与碳水结合\n西红柿-酸甜可口，开胃下饭\n青椒-色彩搭配，维生素互补",
                "food_conflicts": "香蕉-同食可能引起面部生斑（无科学依据）\n柿子-可能引起消化不良\n石榴-影响营养吸收",
                "cooking_tips": "1. 土豆丝切好后用清水浸泡，去掉多余淀粉，炒出来更脆\n2. 炖土豆时大火烧开小火慢炖，更入味\n3. 炸薯条切好后冲洗擦干，油温六成热下锅\n4. 蒸土豆带皮蒸，营养保留更好\n5. 发芽的土豆不能吃，龙葵素有毒"
            },
            {
                "name": "胡萝卜",
                "category": "蔬菜",
                "aliases": "红萝卜,甘荀,丁香萝卜",
                "season": "秋季",
                "description": "胡萝卜是一种根茎类蔬菜，富含胡萝卜素，对眼睛和皮肤健康有益。口感脆嫩，既可生食也可烹饪，有\"小人参\"的美誉。",
                "nutrition_calories": 41,
                "nutrition_protein": 0.9,
                "nutrition_carbs": 10,
                "nutrition_fat": 0.2,
                "nutrition_fiber": 2.8,
                "nutrition_sugar": 4.7,
                "nutrition_vitamin_c": 5.9,
                "nutrition_calcium": 32,
                "nutrition_iron": 0.6,
                "selection_tips": "1. 表皮光滑，色泽橙红鲜艳\n2. 形状均匀，根茎粗壮\n3. 重量感好，沉甸甸的更水润\n4. 带叶子的更新鲜，叶子翠绿不枯萎\n5. 避免选择有裂纹或损伤的",
                "storage_method": "1. 切掉叶子后冷藏，可保存2-3周\n2. 用保鲜膜或保鲜袋包装，防止失水\n3. 不要和苹果、梨等水果放在一起\n4. 冷冻保存：焯水后分装冷冻，可保存6个月",
                "cleaning_tips": "1. 用流动水冲洗干净\n2. 用刷子刷洗表皮缝隙中的泥土\n3. 可削皮食用，也可带皮吃（营养更丰富）\n4. 去皮后立即放入水中，防止氧化变色",
                "common_pairings": "牛肉-荤素搭配，营养均衡\n排骨-补钙佳品，汤鲜味美\n羊肉-温补身体，冬季养生\n玉米-膳食纤维丰富，促进消化",
                "food_conflicts": "白萝卜-胡萝卜含维生素C分解酶，会破坏白萝卜的维C\n醋-醋酸会破坏胡萝卜素（炒菜时不要先放醋）",
                "cooking_tips": "1. 胡萝卜与油脂一起烹饪，更有利于胡萝卜素吸收\n2. 切丝炒比切块炒更容易熟\n3. 炖菜时最后放胡萝卜，保持口感\n4. 榨汁喝营养易吸收，但最好连渣一起吃\n5. 胡萝卜不宜生吃太多，消化吸收率低"
            },
            {
                "name": "牛肉",
                "category": "肉类",
                "aliases": "黄牛肉,水牛肉",
                "season": "冬季",
                "description": "牛肉是一种高蛋白、低脂肪的优质红肉，富含铁、锌等矿物质和B族维生素，有\"肉中骄子\"的美称，是补充体力和营养的佳品。",
                "nutrition_calories": 250,
                "nutrition_protein": 26,
                "nutrition_carbs": 0,
                "nutrition_fat": 15,
                "nutrition_fiber": 0,
                "nutrition_sugar": 0,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 6,
                "nutrition_iron": 2.6,
                "selection_tips": "1. 肉色呈均匀的红色，有光泽\n2. 脂肪呈白色或淡黄色，分布均匀\n3. 表面微干，不粘手\n4. 肉质紧实有弹性，指压后能迅速恢复\n5. 闻起来有鲜肉味，无异味",
                "storage_method": "1. 新鲜牛肉冷藏可保存2-3天\n2. 冷冻保存可长达6-12个月\n3. 冷冻前分装成适当分量，方便取用\n4. 解冻最好在冰箱中缓慢进行，保持口感",
                "cleaning_tips": "1. 用厨房纸擦去表面血水即可\n2. 不要长时间浸泡，会流失营养\n3. 去除多余的筋膜和脂肪\n4. 处理前后注意洗手和刀具清洁",
                "common_pairings": "土豆-经典搭配，口感丰富\n胡萝卜-荤素搭配，营养均衡\n洋葱-去腥增香，促进消化\n西红柿-增加风味，促进铁吸收",
                "food_conflicts": "栗子-同食可能引起消化不良\n红糖-同食可能引起腹胀\n田螺-同食不利于消化",
                "cooking_tips": "1. 炒牛肉：逆纹理切薄片，用淀粉腌制，大火快炒\n2. 炖牛肉：用热水下锅，肉质更嫩\n3. 煎牛排：提前回温，煎后静置锁汁\n4. 煮牛肉时加少许茶叶，更容易煮烂\n5. 牛肉不宜常吃，每周2-3次为宜"
            },
            {
                "name": "青椒",
                "category": "蔬菜",
                "aliases": "菜椒,甜椒,灯笼椒",
                "season": "夏季",
                "description": "青椒是一种常见的蔬菜，味道清甜不辣，富含维生素C，颜色鲜艳（有青、红、黄等多种颜色），既可做主菜也可做配菜。",
                "nutrition_calories": 20,
                "nutrition_protein": 0.9,
                "nutrition_carbs": 4.6,
                "nutrition_fat": 0.2,
                "nutrition_fiber": 1.7,
                "nutrition_sugar": 2.4,
                "nutrition_vitamin_c": 72,
                "nutrition_calcium": 5,
                "nutrition_iron": 0.3,
                "selection_tips": "1. 表皮光滑有光泽，颜色鲜艳\n2. 形状饱满，果肉厚实\n3. 果蒂鲜绿，表明新鲜\n4. 手感紧实有弹性\n5. 无损伤、无腐烂、无虫眼",
                "storage_method": "1. 用保鲜袋装好放入冰箱冷藏，可保存1周\n2. 不要清洗后存放，容易腐烂\n3. 避免与释放乙烯的水果放在一起\n4. 冷冻保存：去籽切块后焯水冷冻，可保存3个月",
                "cleaning_tips": "1. 先用流动水冲洗表面\n2. 去蒂去籽（籽周围的白色部分有点辣）\n3. 可以用盐搓洗表皮\n4. 切的时候注意不要辣到眼睛",
                "common_pairings": "肉丝-经典家常菜，下饭神器\n鸡蛋-营养互补，色彩搭配\n土豆-口感丰富，家常美味\n牛肉-增加维生素，促进铁吸收",
                "food_conflicts": "黄瓜-黄瓜含维生素C分解酶，会破坏青椒的维C\n胡萝卜-胡萝卜含分解酶，影响维C吸收",
                "cooking_tips": "1. 炒青椒时大火快炒，保持脆嫩口感和营养\n2. 搭配肉类炒，营养更易吸收\n3. 可以生吃，维生素C保留最完整\n4. 做菜时最后放，避免长时间加热\n5. 青椒蒂和籽可以去掉，减少辣味"
            },
            {
                "name": "洋葱",
                "category": "蔬菜",
                "aliases": "圆葱,玉葱,葱头",
                "season": "春季",
                "description": "洋葱是一种常见的调味蔬菜，具有独特的辛辣香气，富含硫化物和槲皮素等抗氧化成分，被誉为\"蔬菜皇后\"，具有多种保健功效。",
                "nutrition_calories": 40,
                "nutrition_protein": 1.1,
                "nutrition_carbs": 9,
                "nutrition_fat": 0.1,
                "nutrition_fiber": 1.7,
                "nutrition_sugar": 4.2,
                "nutrition_vitamin_c": 7.4,
                "nutrition_calcium": 23,
                "nutrition_iron": 0.2,
                "selection_tips": "1. 表皮干燥光滑，有光泽\n2. 形状圆整，紧实有分量\n3. 颈部紧实，不发软\n4. 无发芽、无腐烂、无损伤\n5. 同样大小选重的，水分含量高",
                "storage_method": "1. 放在阴凉、干燥、通风处\n2. 不要放入冰箱，低温会变味\n3. 不要和土豆放在一起，互相影响保存期\n4. 切开后用保鲜膜包好冷藏，2-3天内用完",
                "cleaning_tips": "1. 剥去外层干皮\n2. 切去两端后用水冲洗\n3. 切洋葱前放冰箱冷藏10分钟，可以减少流泪\n4. 也可以在流水下切，减少刺激",
                "common_pairings": "牛肉-去腥增香，经典搭配\n鸡蛋-营养均衡，家常美味\n土豆-口感丰富，风味独特\n胡萝卜-营养互补，颜色搭配",
                "food_conflicts": "蜂蜜-同食可能伤眼睛（传统说法）\n海带-多食可能导致便秘\n鱼类-洋葱中的草酸可能影响钙吸收",
                "cooking_tips": "1. 炒洋葱时小火慢炒，炒出甜味最好吃\n2. 切洋葱时刀沾水，可以减少对眼睛的刺激\n3. 凉拌洋葱前先用盐腌一下，去掉辛辣味\n4. 洋葱不宜炒太久，保持脆嫩口感更好\n5. 紫皮洋葱比白皮洋葱营养价值更高"
            },
            {
                "name": "大米",
                "category": "主食",
                "aliases": "稻米,白米,粳米",
                "season": "秋季",
                "description": "大米是最主要的粮食作物之一，是我国南方地区的主食，富含碳水化合物，是人体能量的主要来源，也是B族维生素的重要来源。",
                "nutrition_calories": 365,
                "nutrition_protein": 7.5,
                "nutrition_carbs": 80,
                "nutrition_fat": 0.5,
                "nutrition_fiber": 1.3,
                "nutrition_sugar": 0.7,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 8,
                "nutrition_iron": 1.2,
                "selection_tips": "1. 米粒饱满、完整，色泽均匀有光泽\n2. 无异味，有新鲜稻米的清香味\n3. 碎米少，杂质少\n4. 注意查看生产日期，越新鲜越好\n5. 优先选择当季新米",
                "storage_method": "1. 放在干燥、通风、阴凉处\n2. 避免阳光直射和潮湿\n3. 可用密封容器保存，防止生虫\n4. 可以放几瓣大蒜或花椒，有驱虫效果\n5. 夏季注意防潮防霉",
                "cleaning_tips": "1. 淘米不要超过3次，避免营养流失\n2. 用凉水轻轻淘洗即可\n3. 不要用力揉搓\n4. 淘米水可以用来洗菜或浇花，不要浪费",
                "common_pairings": "鸡蛋-营养互补，蛋炒饭经典\n蔬菜-增加纤维和维生素\n豆类-蛋白质互补，提高营养价值\n肉类-荤素搭配，营养均衡",
                "food_conflicts": "蜂蜜-同食可能导致胃痛（因人而异）\n蕨菜-同食可能影响维生素B1吸收",
                "cooking_tips": "1. 米和水的比例约为1:1.2-1.5\n2. 煮前浸泡30分钟，米饭更松软\n3. 煮好后焖10分钟，口感更好\n4. 蒸饭比煮饭营养保留更好\n5. 剩饭要冷藏保存，吃前彻底加热"
            },
            {
                "name": "苹果",
                "category": "水果",
                "aliases": "平安果,智慧果",
                "season": "秋季",
                "description": "苹果是最常见的水果之一，营养丰富全面，富含果胶、维生素C和多种抗氧化物质，有\"一天一苹果，医生远离我\"的说法。",
                "nutrition_calories": 52,
                "nutrition_protein": 0.3,
                "nutrition_carbs": 14,
                "nutrition_fat": 0.2,
                "nutrition_fiber": 2.4,
                "nutrition_sugar": 10,
                "nutrition_vitamin_c": 4.6,
                "nutrition_calcium": 6,
                "nutrition_iron": 0.1,
                "selection_tips": "1. 表皮光滑有光泽，颜色鲜艳\n2. 果柄新鲜不枯萎\n3. 手感沉重，水分足\n4. 闻起来有果香\n5. 避免选择有碰伤或虫眼的",
                "storage_method": "1. 放入冰箱冷藏可保存2-3周\n2. 单独存放，避免与其他蔬果混放\n3. 不要和释放乙烯的水果密封在一起\n4. 常温下可保存1周左右",
                "cleaning_tips": "1. 用流动水冲洗干净\n2. 可以用盐搓洗表皮，去除蜡质\n3. 也可以用蔬果清洁剂清洗\n4. 苹果皮营养丰富，建议带皮吃",
                "common_pairings": "牛奶-营养互补，早餐好搭档\n燕麦-膳食纤维丰富，促进消化\n蜂蜜-润肠通便，美容养颜\n酸奶-益生菌+果胶，肠道健康",
                "food_conflicts": "萝卜-同食可能诱发甲状腺肿大（缺碘地区）\n海鲜-同食可能引起腹痛\n牛奶-传统说法认为果酸影响钙吸收（少量无碍）",
                "cooking_tips": "1. 苹果生吃营养最完整\n2. 可以做成苹果派、苹果酱\n3. 煮苹果有收敛止泻的作用\n4. 苹果切开后容易氧化，可泡盐水防变色\n5. 带皮吃营养更好，但要清洗干净"
            },
            {
                "name": "香蕉",
                "category": "水果",
                "aliases": "甘蕉,蕉果",
                "season": "四季",
                "description": "香蕉是一种热带水果，口感软糯香甜，富含钾元素和碳水化合物，能快速补充能量，是运动前后的理想食物，也有助于缓解便秘。",
                "nutrition_calories": 89,
                "nutrition_protein": 1.1,
                "nutrition_carbs": 23,
                "nutrition_fat": 0.3,
                "nutrition_fiber": 2.6,
                "nutrition_sugar": 12,
                "nutrition_vitamin_c": 8.7,
                "nutrition_calcium": 5,
                "nutrition_iron": 0.3,
                "selection_tips": "1. 果皮金黄，有芝麻点的最甜\n2. 果形饱满，有棱边\n3. 果柄新鲜不发黑\n4. 不要选择全青的，还没成熟\n5. 也不要选太软的，已经过熟",
                "storage_method": "1. 常温下存放，不要放入冰箱\n2. 悬挂保存，可以延长保鲜期\n3. 用保鲜膜包住果柄，延缓成熟\n4. 香蕉变黑不影响食用，果肉好就行\n5. 成熟的香蕉要尽快食用",
                "cleaning_tips": "1. 剥皮前先冲洗表皮\n2. 从果柄处开始剥皮\n3. 注意不要让果皮内侧接触果肉\n4. 香蕉皮可以用来擦皮鞋或浇花",
                "common_pairings": "牛奶-经典搭配，香蕉牛奶\n燕麦-早餐好搭档，营养均衡\n蜂蜜-润肠通便，美容养颜\n酸奶-益生菌+钾，促进消化",
                "food_conflicts": "芋头-同食可能引起腹胀\n红薯-同食可能引起腹胀\n西瓜-同食可能引起腹泻",
                "cooking_tips": "1. 香蕉熟吃也很美味，可以烤、炸\n2. 做奶昔时加香蕉，口感更绵密\n3. 太熟的香蕉可以做香蕉面包\n4. 香蕉不宜空腹吃太多\n5. 未成熟的香蕉不要吃，会加重便秘"
            },
            {
                "name": "牛奶",
                "category": "奶制品",
                "aliases": "牛乳,鲜奶",
                "season": "四季",
                "description": "牛奶是最古老的天然乳制品之一，营养丰富，富含优质蛋白质和钙质，且钙磷比例适当，易于人体吸收，是补钙的最佳食品之一。",
                "nutrition_calories": 42,
                "nutrition_protein": 3.4,
                "nutrition_carbs": 5,
                "nutrition_fat": 1,
                "nutrition_fiber": 0,
                "nutrition_sugar": 5,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 120,
                "nutrition_iron": 0.1,
                "selection_tips": "1. 查看生产日期和保质期，选择近期生产的\n2. 包装完好，无涨袋、无渗漏\n3. 全脂牛奶口感香浓，脱脂牛奶热量低\n4. 优先选择巴氏杀菌奶，营养保留更好\n5. 注意查看配料表，纯牛奶配料只有生牛乳",
                "storage_method": "1. 鲜奶要冷藏保存，温度2-6℃\n2. 开封后尽快饮用，24小时内喝完\n3. 不要放在冰箱门上，温度波动大\n4. 避光保存，避免维生素流失\n5. 超高温灭菌奶可常温保存",
                "cleaning_tips": "1. 饮用前检查保质期和外观\n2. 盒装牛奶开口处注意清洁\n3. 加热时不要煮沸太久，避免营养流失\n4. 牛奶袋/盒开封后注意密封",
                "common_pairings": "鸡蛋-营养互补，早餐黄金搭配\n面包-碳水+蛋白，能量满满\n燕麦-膳食纤维+钙，营养均衡\n水果-维生素+钙，促进吸收",
                "food_conflicts": "巧克力-草酸影响钙吸收（少量无碍）\n橘子-果酸影响蛋白质吸收（间隔1小时即可）\n茶-鞣酸影响钙吸收（避免同时大量饮用）",
                "cooking_tips": "1. 牛奶不要煮沸太久，温热即可\n2. 煮牛奶时不要加糖，煮好后再加\n3. 微波炉加热注意时间，防止溢出\n4. 牛奶可以做菜，如奶油蘑菇汤、牛奶炖蛋\n5. 睡前喝杯温牛奶，有助于睡眠"
            },
            {
                "name": "豆腐",
                "category": "豆制品",
                "aliases": "水豆腐,嫩豆腐",
                "season": "四季",
                "description": "豆腐是我国传统的豆制品，以大豆为原料制成，富含优质植物蛋白和钙，营养丰富且容易消化吸收，素有\"植物肉\"之美称。",
                "nutrition_calories": 76,
                "nutrition_protein": 8,
                "nutrition_carbs": 1.9,
                "nutrition_fat": 4.8,
                "nutrition_fiber": 0.4,
                "nutrition_sugar": 1.9,
                "nutrition_vitamin_c": 0,
                "nutrition_calcium": 138,
                "nutrition_iron": 1.5,
                "selection_tips": "1. 颜色洁白或微黄，有光泽\n2. 形状完整，不破碎\n3. 闻起来有豆香味，无酸味\n4. 手感细腻有弹性\n5. 包装豆腐注意查看生产日期",
                "storage_method": "1. 泡在凉水中放入冰箱，每天换水，可保存2-3天\n2. 也可用淡盐水浸泡，延长保存期\n3. 冷冻保存可做成冻豆腐，别有风味\n4. 开封后尽快食用，避免变质",
                "cleaning_tips": "1. 用清水轻轻冲洗即可\n2. 小心操作，避免弄碎\n3. 盒装豆腐开封后要冲洗一下\n4. 焯水后更干净，也能去除豆腥味",
                "common_pairings": "青菜-营养均衡，清淡爽口\n鸡蛋-植物+动物蛋白互补\n海带-补钙补碘，营养丰富\n肉沫-荤素搭配，增加风味",
                "food_conflicts": "菠菜-菠菜含草酸，会影响钙吸收（菠菜焯水后可）\n蜂蜜-同食可能引起腹泻（因人而异）\n葱-传统说法认为同食影响钙吸收",
                "cooking_tips": "1. 豆腐下锅前焯水，去除豆腥味，不易碎\n2. 煎豆腐时用中小火，一面煎黄再翻面\n3. 煮豆腐时不要用力搅拌，防止破碎\n4. 麻婆豆腐、红烧豆腐都很美味\n5. 嫩豆腐适合凉拌、做汤，老豆腐适合煎、炒"
            },
            {
                "name": "菠菜",
                "category": "蔬菜",
                "aliases": "赤根菜,波斯菜",
                "season": "春季",
                "description": "菠菜是一种营养丰富的绿叶蔬菜，富含铁、钙、叶酸和多种维生素，尤其是胡萝卜素含量很高，对视力和皮肤健康有益。",
                "nutrition_calories": 23,
                "nutrition_protein": 2.9,
                "nutrition_carbs": 3.6,
                "nutrition_fat": 0.4,
                "nutrition_fiber": 2.2,
                "nutrition_sugar": 0.7,
                "nutrition_vitamin_c": 28.1,
                "nutrition_calcium": 99,
                "nutrition_iron": 2.7,
                "selection_tips": "1. 叶片翠绿，色泽鲜艳\n2. 叶子肥厚，叶柄短\n3. 根部呈红色，新鲜\n4. 无黄叶、无烂叶\n5. 选择小颗的菠菜，口感更嫩",
                "storage_method": "1. 用保鲜袋装好放入冰箱冷藏\n2. 不要清洗后存放，容易腐烂\n3. 可在袋上扎几个孔，通风透气\n4. 冷冻保存：焯水后挤干水分冷冻，可保存6个月",
                "cleaning_tips": "1. 先去掉根部\n2. 用流动水冲洗叶片\n3. 淡盐水浸泡5分钟，去除农药残留\n4. 要多洗几遍，叶子缝隙容易藏土",
                "common_pairings": "鸡蛋-营养互补，色香味俱全\n豆腐-补钙佳品（菠菜需焯水）\n猪肝-补血效果好\n蒜末-提味增香，促进营养吸收",
                "food_conflicts": "豆腐-菠菜含草酸，影响钙吸收（焯水后可）\n牛奶-草酸影响钙吸收\n黄瓜-维C分解酶破坏菠菜的维生素C",
                "cooking_tips": "1. 菠菜烹饪前先焯水，去除草酸\n2. 大火快炒，保持翠绿色泽\n3. 焯水时间不要太长，30秒-1分钟即可\n4. 做汤时最后放菠菜，营养保留更好\n5. 菠菜根也很有营养，不要扔掉"
            },
        ]

        for enc_data in encyclopedia_data:
            enc = IngredientEncyclopedia(**enc_data)
            db.add(enc)

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
app.include_router(family_router.router, prefix="/api/family", tags=["家庭"])
app.include_router(meal_plans_router.router, prefix="/api/meal-plans", tags=["用餐计划"])
app.include_router(import_export_router.router, prefix="/api/recipes", tags=["食谱导入导出"])
app.include_router(cooking_router.router, prefix="/api/cooking-records", tags=["烹饪记录"])
app.include_router(encyclopedia_router.router, prefix="/api/ingredient-encyclopedia", tags=["食材百科"])


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
