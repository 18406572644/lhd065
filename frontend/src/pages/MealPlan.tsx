import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Input,
  Select,
  InputNumber,
  Form,
  message,
  Empty,
  Space,
  Row,
  Col,
  Drawer,
  List,
  Avatar,
  Badge,
  Popconfirm,
  Tooltip,
  Divider,
  Statistic,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  FireOutlined,
  EditOutlined,
  CloseOutlined,
  BookOutlined,
  SearchOutlined,
  CheckSquareOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { Recipe, MealPlan as MealPlanType, MealType, MealPlanShoppingItem } from '@/types';
import { getRecipes } from '@/api/recipes';
import {
  getMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  completeMealPlan,
  generateShoppingList,
  recommendMealPlans,
  createBatchMealPlans,
} from '@/api/mealPlans';
import { COLORS, CATEGORY_COLORS } from '@/styles/theme';
import { formatDuration, getCategoryIcon } from '@/utils';
import ImageCarousel from '@/components/ImageCarousel';

const { Option } = Select;
const { TextArea } = Input;

const MEAL_TYPES: { type: MealType; label: string; icon: string; color: string }[] = [
  { type: 'breakfast', label: '早餐', icon: '🌅', color: COLORS.amber },
  { type: 'lunch', label: '午餐', icon: '☀️', color: COLORS.primary },
  { type: 'dinner', label: '晚餐', icon: '🌙', color: COLORS.info },
];

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const MealPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState<Dayjs>(dayjs().startOf('week'));
  const [mealPlans, setMealPlans] = useState<MealPlanType[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipeDrawerOpen, setRecipeDrawerOpen] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('全部');
  const [shoppingModalOpen, setShoppingModalOpen] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<MealPlanShoppingItem[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);
  const [recommendForm] = Form.useForm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlanType | null>(null);
  const [editForm] = Form.useForm();
  const [draggedRecipe, setDraggedRecipe] = useState<Recipe | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(currentWeek.add(i, 'day'));
    }
    return days;
  }, [currentWeek]);

  const startDate = weekDays[0].format('YYYY-MM-DD');
  const endDate = weekDays[6].format('YYYY-MM-DD');

  const loadMealPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMealPlans({
        start_date: startDate,
        end_date: endDate,
      });
      setMealPlans(data);
    } catch {
      message.error('加载用餐计划失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await getRecipes({});
      setRecipes(data);
    } catch {
      message.error('加载食谱失败');
    }
  }, []);

  useEffect(() => {
    loadMealPlans();
    loadRecipes();
  }, [loadMealPlans, loadRecipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch =
        !recipeSearch ||
        r.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(recipeSearch.toLowerCase());
      const matchCategory = recipeCategory === '全部' || r.category === recipeCategory;
      return matchSearch && matchCategory;
    });
  }, [recipes, recipeSearch, recipeCategory]);

  const getPlanForCell = (date: string, mealType: MealType) => {
    return mealPlans.find(
      (p) => p.plan_date === date && p.meal_type === mealType
    );
  };

  const handleDragStart = (recipe: Recipe) => {
    setDraggedRecipe(recipe);
  };

  const handleDragEnd = () => {
    setDraggedRecipe(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, date: string, mealType: MealType) => {
    e.preventDefault();
    setDragOverCell(`${date}-${mealType}`);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (date: string, mealType: MealType) => {
    if (!draggedRecipe) return;

    const existingPlan = getPlanForCell(date, mealType);

    try {
      if (existingPlan) {
        await updateMealPlan(existingPlan.id, { recipe_id: draggedRecipe.id });
        message.success('已替换食谱');
      } else {
        await createMealPlan({
          recipe_id: draggedRecipe.id,
          meal_type: mealType,
          plan_date: date,
          servings: draggedRecipe.servings || 2,
        });
        message.success('已添加到计划');
      }
      loadMealPlans();
    } catch {
      message.error('操作失败');
    } finally {
      setDraggedRecipe(null);
      setDragOverCell(null);
    }
  };

  const handleComplete = async (plan: MealPlanType) => {
    try {
      await completeMealPlan(plan.id);
      message.success('已标记为完成');
      loadMealPlans();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (plan: MealPlanType) => {
    try {
      await deleteMealPlan(plan.id);
      message.success('已删除');
      loadMealPlans();
    } catch {
      message.error('删除失败');
    }
  };

  const handleEdit = (plan: MealPlanType) => {
    setEditingPlan(plan);
    editForm.setFieldsValue({
      servings: plan.servings,
      notes: plan.notes,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: any) => {
    if (!editingPlan) return;
    try {
      await updateMealPlan(editingPlan.id, values);
      message.success('更新成功');
      setEditModalOpen(false);
      loadMealPlans();
    } catch {
      message.error('更新失败');
    }
  };

  const handleGenerateShopping = async () => {
    setShoppingLoading(true);
    try {
      const data = await generateShoppingList({
        start_date: startDate,
        end_date: endDate,
      });
      setShoppingItems(data.items);
      setShoppingModalOpen(true);
    } catch {
      message.error('生成购物清单失败');
    } finally {
      setShoppingLoading(false);
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      await generateShoppingList({
        start_date: startDate,
        end_date: endDate,
        add_to_shopping: true,
      });
      message.success('已添加到购物清单');
      setShoppingModalOpen(false);
    } catch {
      message.error('添加失败');
    }
  };

  const handleRecommend = async (values: any) => {
    try {
      const data = await recommendMealPlans(
        {
          meal_type: values.meal_type,
          days: 7,
          categories: values.categories || undefined,
          max_calories: values.max_calories || undefined,
          min_protein: values.min_protein || undefined,
        },
        { start_date: startDate }
      );

      const plansToCreate = data.recommendations.map((r) => ({
        recipe_id: r.recipe_id,
        meal_type: r.meal_type as MealType,
        plan_date: r.plan_date,
        servings: r.servings,
        notes: '智能推荐',
      }));

      await createBatchMealPlans(plansToCreate);
      message.success(`已为你安排 ${data.recommendations.length} 个${values.meal_type === 'dinner' ? '晚餐' : values.meal_type === 'lunch' ? '午餐' : '早餐'}计划`);
      setRecommendModalOpen(false);
      loadMealPlans();
    } catch {
      message.error('推荐失败');
    }
  };

  const goToPrevWeek = () => {
    setCurrentWeek((prev) => prev.subtract(7, 'day'));
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => prev.add(7, 'day'));
  };

  const goToThisWeek = () => {
    setCurrentWeek(dayjs().startOf('week'));
  };

  const stats = useMemo(() => {
    const total = mealPlans.length;
    const completed = mealPlans.filter((p) => p.is_completed).length;
    const totalCalories = mealPlans.reduce((sum, p) => {
      if (p.recipe?.nutrition?.calories) {
        return sum + p.recipe.nutrition.calories * p.servings;
      }
      return sum;
    }, 0);
    return { total, completed, totalCalories: Math.round(totalCalories) };
  }, [mealPlans]);

  const groupedShoppingItems = useMemo(() => {
    const groups: Record<string, MealPlanShoppingItem[]> = {};
    shoppingItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [shoppingItems]);

  const isToday = (date: Dayjs) => {
    return date.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CalendarOutlined style={{ marginRight: 8, color: COLORS.primary }} />
            用餐计划
          </h1>
          <div style={{ color: '#7A7A7A', fontSize: 13, marginTop: 4 }}>
            拖拽食谱到对应餐次，轻松规划一周饮食
          </div>
        </div>
        <Space>
          <Button icon={<BulbOutlined />} onClick={() => setRecommendModalOpen(true)}>
            智能推荐
          </Button>
          <Button icon={<ShoppingCartOutlined />} onClick={handleGenerateShopping}>
            生成购物清单
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecipeDrawerOpen(true)}>
            浏览食谱
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${COLORS.primary}20` }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>📋 本周计划</span>}
              value={stats.total}
              suffix="餐"
              valueStyle={{ color: COLORS.primary, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${COLORS.success}20` }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>✅ 已完成</span>}
              value={stats.completed}
              suffix="餐"
              valueStyle={{ color: COLORS.success, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: `1px solid ${COLORS.warning}20` }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>🔥 总热量</span>}
              value={stats.totalCalories}
              suffix="kcal"
              valueStyle={{ color: COLORS.warning, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #F0EBE0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Button size="small" icon={<LeftOutlined />} onClick={goToPrevWeek} />
              <Button size="small" type="link" onClick={goToThisWeek}>
                本周
              </Button>
              <Button size="small" icon={<RightOutlined />} onClick={goToNextWeek} />
            </div>
            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 12, color: '#7A7A7A' }}>
              {weekDays[0].format('M月D日')} - {weekDays[6].format('M月D日')}
            </div>
          </Card>
        </Col>
      </Row>

      <div
        className="meal-plan-calendar"
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #F0EBE0',
          overflow: 'hidden',
        }}
      >
        <div
          className="calendar-header"
          style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)',
            background: `linear-gradient(135deg, ${COLORS.primary}10 0%, ${COLORS.primary}05 100%)`,
            borderBottom: '1px solid #F0EBE0',
          }}
        >
          <div
            style={{
              padding: '12px 8px',
              textAlign: 'center',
              fontWeight: 600,
              color: '#7A7A7A',
              fontSize: 13,
              borderRight: '1px solid #F0EBE0',
            }}
          >
            餐次
          </div>
          {weekDays.map((day) => (
            <div
              key={day.format('YYYY-MM-DD')}
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                fontWeight: 600,
                color: isToday(day) ? COLORS.primaryDark : '#5A5A5A',
                fontSize: 13,
                position: 'relative',
                background: isToday(day) ? `${COLORS.primary}15` : 'transparent',
              }}
            >
              <div>{WEEKDAYS[day.day()]}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                {day.format('D')}
              </div>
              {isToday(day) && (
                <Tag
                  color="green"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 10,
                    margin: 0,
                  }}
                >
                  今天
                </Tag>
              )}
            </div>
          ))}
        </div>

        {MEAL_TYPES.map((meal) => (
          <div
            key={meal.type}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px repeat(7, 1fr)',
              borderBottom: '1px solid #F0EBE0',
            }}
          >
            <div
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                background: `${meal.color}08`,
                borderRight: '1px solid #F0EBE0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 24 }}>{meal.icon}</span>
              <span style={{ fontWeight: 600, color: meal.color, fontSize: 13 }}>
                {meal.label}
              </span>
            </div>
            {weekDays.map((day) => {
              const dateStr = day.format('YYYY-MM-DD');
              const plan = getPlanForCell(dateStr, meal.type);
              const isDragOver = dragOverCell === `${dateStr}-${meal.type}`;

              return (
                <div
                  key={`${dateStr}-${meal.type}`}
                  className={`meal-cell ${plan ? 'has-plan' : ''} ${plan?.is_completed ? 'completed' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  style={{
                    padding: 8,
                    minHeight: 100,
                    borderRight: '1px solid #F0EBE0',
                    background: isDragOver
                      ? `${meal.color}15`
                      : plan
                      ? 'transparent'
                      : '#FAFAFA',
                    cursor: plan ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onDragOver={(e) => handleDragOver(e, dateStr, meal.type)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(dateStr, meal.type)}
                  onClick={() => {
                    if (!plan) setRecipeDrawerOpen(true);
                  }}
                >
                  {plan && plan.recipe ? (
                    <div
                      className={`meal-card ${plan.is_completed ? 'completed' : ''}`}
                      style={{
                        background: plan.is_completed ? '#F5F5F5' : '#fff',
                        borderRadius: 10,
                        padding: 8,
                        border: `1px solid ${plan.is_completed ? '#E0E0E0' : meal.color}30`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recipes/${plan.recipe_id}`);
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: plan.is_completed ? '#A0A0A0' : '#4A4A4A',
                          marginBottom: 4,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textDecoration: plan.is_completed ? 'line-through' : 'none',
                        }}
                      >
                        {plan.recipe.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Tag
                          style={{ margin: 0, fontSize: 10, padding: '0 6px' }}
                          color={plan.recipe.category ? 'green' : 'default'}
                        >
                          {plan.recipe.category}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#A0A0A0' }}>
                          {plan.servings}人份
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <Tooltip title="编辑">
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            style={{ padding: '0 4px', fontSize: 12 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(plan);
                            }}
                          />
                        </Tooltip>
                        {!plan.is_completed && (
                          <Tooltip title="标记完成">
                            <Button
                              size="small"
                              type="text"
                              icon={<CheckCircleOutlined />}
                              style={{ padding: '0 4px', fontSize: 12, color: COLORS.success }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(plan);
                              }}
                            />
                          </Tooltip>
                        )}
                        <Popconfirm
                          title="确定删除这个计划？"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            handleDelete(plan);
                          }}
                          onCancel={(e) => e?.stopPropagation()}
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            style={{ padding: '0 4px', fontSize: 12 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#C0C0C0',
                        fontSize: 11,
                        gap: 4,
                        minHeight: 60,
                      }}
                    >
                      <PlusOutlined style={{ fontSize: 16 }} />
                      <span>拖拽食谱到这里</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 700 }}>选择食谱</span>
          </div>
        }
        placement="right"
        width={420}
        onClose={() => setRecipeDrawerOpen(false)}
        open={recipeDrawerOpen}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #F0EBE0' }}>
          <Input
            placeholder="搜索食谱..."
            prefix={<SearchOutlined />}
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
            allowClear
            size="large"
          />
          <Select
            value={recipeCategory}
            onChange={setRecipeCategory}
            style={{ width: '100%', marginTop: 12 }}
            size="large"
          >
            <Option value="全部">全部分类</Option>
            {['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '饮品', '烘焙'].map((c) => (
              <Option key={c} value={c}>
                {c}
              </Option>
            ))}
          </Select>
        </div>
        <div
          style={{
            padding: 12,
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
          }}
        >
          {filteredRecipes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  draggable
                  onDragStart={() => handleDragStart(recipe)}
                  onDragEnd={handleDragEnd}
                  style={{
                    padding: 12,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #F0EBE0',
                    cursor: 'grab',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  className="draggable-recipe"
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: `${COLORS.primary}10`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(recipe.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#4A4A4A',
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {recipe.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#A0A0A0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {formatDuration(recipe.cook_time)}
                      </span>
                      <span>{recipe.servings}人份</span>
                    </div>
                    {recipe.nutrition && recipe.nutrition.calories > 0 && (
                      <div style={{ fontSize: 11, color: COLORS.warning, marginTop: 2 }}>
                        <FireOutlined style={{ marginRight: 4 }} />
                        {Math.round(recipe.nutrition.calories)} kcal/份
                      </div>
                    )}
                  </div>
                  <Tag color="green" style={{ margin: 0 }}>
                    {recipe.category}
                  </Tag>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="没有找到食谱" style={{ marginTop: 60 }} />
          )}
        </div>
      </Drawer>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCartOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 700 }}>本周购物清单</span>
          </div>
        }
        open={shoppingModalOpen}
        onCancel={() => setShoppingModalOpen(false)}
        width={560}
        footer={[
          <Button key="cancel" onClick={() => setShoppingModalOpen(false)}>
            关闭
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={handleAddToShoppingList}
            disabled={shoppingItems.length === 0}
          >
            添加到购物清单
          </Button>,
        ]}
        loading={shoppingLoading}
      >
        {shoppingItems.length > 0 ? (
          <div>
            <div style={{ marginBottom: 12, color: '#7A7A7A', fontSize: 13 }}>
              共 {shoppingItems.length} 种食材，来自本周用餐计划
            </div>
            {Object.entries(groupedShoppingItems).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    fontWeight: 600,
                    color: '#5A5A5A',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: CATEGORY_COLORS[category] || '#9E9E9E',
                    }}
                  />
                  {category}
                  <Tag style={{ margin: 0 }}>{items.length}项</Tag>
                </div>
                {items.map((item) => (
                  <div
                    key={item.ingredient_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#FAFAFA',
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, color: '#4A4A4A' }}>
                      {item.ingredient_name}
                    </span>
                    <span style={{ fontSize: 13, color: '#7A7A7A', fontWeight: 500 }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="本周没有用餐计划，快去添加吧~" />
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BulbOutlined style={{ color: COLORS.warning }} />
            <span style={{ fontWeight: 700 }}>智能推荐</span>
          </div>
        }
        open={recommendModalOpen}
        onCancel={() => setRecommendModalOpen(false)}
        width={480}
        footer={null}
      >
        <div style={{ marginBottom: 16, color: '#7A7A7A', fontSize: 13 }}>
          根据你的喜好，智能安排一周饮食计划
        </div>
        <Form form={recommendForm} layout="vertical" onFinish={handleRecommend}>
          <Form.Item
            label="餐次类型"
            name="meal_type"
            rules={[{ required: true, message: '请选择餐次类型' }]}
            initialValue="dinner"
          >
            <Select>
              <Option value="breakfast">早餐</Option>
              <Option value="lunch">午餐</Option>
              <Option value="dinner">晚餐</Option>
            </Select>
          </Form.Item>

          <Form.Item label="偏好分类" name="categories">
            <Select mode="multiple" placeholder="选择你喜欢的分类（可多选）">
              {['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '饮品', '烘焙'].map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="热量上限 (kcal)" name="max_calories">
                <InputNumber
                  min={0}
                  placeholder="每份"
                  style={{ width: '100%' }}
                  addonAfter="kcal"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="蛋白质下限 (g)" name="min_protein">
                <InputNumber
                  min={0}
                  placeholder="每份"
                  style={{ width: '100%' }}
                  addonAfter="g"
                />
              </Form.Item>
            </Col>
          </Row>

          <div
            style={{
              padding: 12,
              background: `${COLORS.warning}08`,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 12,
              color: '#7A7A7A',
            }}
          >
            <BulbOutlined style={{ color: COLORS.warning, marginRight: 6 }} />
            小贴士：设置热量上限和蛋白质下限可以筛选出更健康的食谱哦~
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setRecommendModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<ArrowRightOutlined />}>
                生成推荐
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EditOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 700 }}>编辑计划</span>
          </div>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={420}
        footer={null}
        destroyOnClose
      >
        {editingPlan && editingPlan.recipe && (
          <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
            <div
              style={{
                padding: 12,
                background: `${COLORS.primary}08`,
                borderRadius: 10,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                }}
              >
                {getCategoryIcon(editingPlan.recipe.category)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#4A4A4A' }}>
                  {editingPlan.recipe.name}
                </div>
                <div style={{ fontSize: 12, color: '#7A7A7A' }}>
                  {MEAL_TYPES.find((m) => m.type === editingPlan.meal_type)?.label} · {editingPlan.plan_date}
                </div>
              </div>
            </div>

            <Form.Item label="份量" name="servings" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} addonAfter="人份" />
            </Form.Item>

            <Form.Item label="备注" name="notes">
              <TextArea rows={3} placeholder="添加备注..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setEditModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <style>{`
        .meal-cell:hover {
          background: rgba(139, 195, 74, 0.05) !important;
        }
        .meal-cell.drag-over {
          background: rgba(139, 195, 74, 0.15) !important;
          border: 2px dashed #8BC34A !important;
        }
        .meal-card:hover {
          box-shadow: 0 4px 12px rgba(139, 195, 74, 0.15);
          transform: translateY(-2px);
        }
        .meal-card.completed {
          opacity: 0.7;
        }
        .draggable-recipe:hover {
          box-shadow: 0 4px 12px rgba(139, 195, 74, 0.15);
          border-color: #8BC34A !important;
        }
        .draggable-recipe:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
};

export default MealPlanPage;
