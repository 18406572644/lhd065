import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Divider,
  Empty,
  Breadcrumb,
  message,
  Steps,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  HeartOutlined,
  HeartFilled,
  UserOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { Recipe } from '@/types';
import { getRecipe, toggleFavorite as toggleFav } from '@/api/recipes';
import { createCookingRecord } from '@/api/cooking';
import { formatDuration, getCategoryIcon, getDifficultyText, getDifficultyColor } from '@/utils';
import CountdownTimer from '@/components/CountdownTimer';
import NutritionCard from '@/components/NutritionCard';
import ImageCarousel from '@/components/ImageCarousel';
import CookingMode from '@/components/CookingMode';

const { Step } = Steps;

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [cookingMode, setCookingMode] = useState(false);

  useEffect(() => {
    const loadRecipe = async () => {
      setLoading(true);
      try {
        const data = await getRecipe(Number(id));
        setRecipe(data || null);
      } catch {
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id]);

  const toggleFavorite = async () => {
    if (recipe) {
      try {
        const updated = await toggleFav(recipe.id);
        setRecipe({ ...recipe, is_favorite: updated.is_favorite });
        message.success(updated.is_favorite ? '已加入收藏' : '已取消收藏');
      } catch {
        message.error('操作失败');
      }
    }
  };

  const markStepComplete = (stepOrder: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepOrder)) {
        next.delete(stepOrder);
      } else {
        next.add(stepOrder);
      }
      return next;
    });
    if (currentStep === stepOrder - 1) {
      setCurrentStep(stepOrder);
    }
  };

  const addToShoppingList = () => {
    message.success('已将食材添加到购物清单');
  };

  const handleCookingComplete = async (data: {
    startedAt: string;
    completedAt: string;
    actualMinutes: number;
    stepRecords: string;
    rating: number;
    review: string;
  }) => {
    if (!recipe) return;
    try {
      await createCookingRecord({
        recipe_id: recipe.id,
        started_at: data.startedAt,
        completed_at: data.completedAt,
        estimated_minutes: recipe.cook_time,
        actual_minutes: data.actualMinutes,
        rating: data.rating || undefined as any,
        review: data.review,
        step_records: data.stepRecords,
      });
      message.success('烹饪记录已保存！');
      setCookingMode(false);
    } catch {
      message.error('保存烹饪记录失败');
    }
  };

  if (loading) {
    return <Empty description="加载中..." style={{ marginTop: 64 }} />;
  }

  if (!recipe) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Empty description="食谱不存在" />
        <Button type="primary" onClick={() => navigate('/recipes')} style={{ marginTop: 16 }}>
          返回食谱列表
        </Button>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn">
      {cookingMode && recipe && (
        <CookingMode
          steps={recipe.steps}
          recipeName={recipe.name}
          recipeId={recipe.id}
          estimatedMinutes={recipe.cook_time}
          onComplete={handleCookingComplete}
          onCancel={() => setCookingMode(false)}
        />
      )}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            首页
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <span onClick={() => navigate('/recipes')} style={{ cursor: 'pointer' }}>
            食谱库
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{recipe.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/recipes')}>
          返回食谱列表
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ShoppingCartOutlined />} onClick={addToShoppingList}>
            添加到购物清单
          </Button>
          <Button
            type={recipe.is_favorite ? 'primary' : 'default'}
            danger={recipe.is_favorite}
            icon={recipe.is_favorite ? <HeartFilled /> : <HeartOutlined />}
            onClick={toggleFavorite}
          >
            {recipe.is_favorite ? '已收藏' : '收藏食谱'}
          </Button>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ position: 'relative' }}>
              <ImageCarousel
                images={recipe.images || []}
                fallbackIcon={
                  <span style={{ fontSize: 96, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
                    {getCategoryIcon(recipe.category)}
                  </span>
                }
                height={320}
                interval={4000}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  gap: 8,
                  zIndex: 10,
                }}
              >
                <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                  {recipe.category}
                </Tag>
                <Tag
                  color={getDifficultyColor(recipe.difficulty) as any}
                  style={{ fontSize: 14, padding: '4px 12px' }}
                >
                  {getDifficultyText(recipe.difficulty)}
                </Tag>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <h1 style={{ fontSize: 28, margin: '0 0 8px 0', color: '#4A4A4A' }}>{recipe.name}</h1>
              <p style={{ fontSize: 15, color: '#7A7A7A', margin: '0 0 20px 0' }}>{recipe.description}</p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7A7A7A' }}>
                  <ClockCircleOutlined style={{ color: '#8BC34A' }} />
                  <span>烹饪时间：</span>
                  <strong style={{ color: '#4A4A4A' }}>{formatDuration(recipe.cook_time)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7A7A7A' }}>
                  <TeamOutlined style={{ color: '#FF8A65' }} />
                  <span>份量：</span>
                  <strong style={{ color: '#4A4A4A' }}>{recipe.servings} 人份</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7A7A7A' }}>
                  <UserOutlined style={{ color: '#BA68C8' }} />
                  <span>创建时间：</span>
                  <strong style={{ color: '#4A4A4A' }}>{recipe.created_at}</strong>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title={
              <div style={{ fontWeight: 600, fontSize: 18 }}>
                🥘 烹饪步骤
                <span style={{ fontSize: 13, color: '#7A7A7A', fontWeight: 400, marginLeft: 12 }}>
                  已完成 {completedSteps.size}/{recipe.steps.length}
                </span>
              </div>
            }
            style={{ borderRadius: 16, marginBottom: 24 }}
          >
            {recipe.steps.length > 1 && (
              <div style={{ marginBottom: 24 }}>
                <Steps current={currentStep} size="small">
                  {recipe.steps.map((step) => (
                    <Step
                      key={step.order}
                      title={`步骤${step.order}`}
                      status={completedSteps.has(step.order) ? 'finish' : currentStep >= step.order ? 'process' : 'wait'}
                    />
                  ))}
                </Steps>
              </div>
            )}

            {recipe.steps.map((step, index) => (
              <div
                key={step.order}
                className="step-container"
                style={{
                  opacity: completedSteps.has(step.order) ? 0.7 : 1,
                  border: completedSteps.has(step.order) ? '1px solid rgba(102, 187, 106, 0.3)' : undefined,
                }}
              >
                <div className="step-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="step-number">{step.order}</div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#4A4A4A' }}>
                      步骤 {step.order}
                      {step.duration_minutes > 0 && (
                        <span style={{ fontWeight: 400, color: '#FF8A65', marginLeft: 8 }}>
                          · 约 {formatDuration(step.duration_minutes)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type={completedSteps.has(step.order) ? 'primary' : 'default'}
                    icon={<CheckCircleOutlined />}
                    onClick={() => markStepComplete(step.order)}
                    size="small"
                  >
                    {completedSteps.has(step.order) ? '已完成' : '标记完成'}
                  </Button>
                </div>
                <p className="step-description">{step.description}</p>
                {step.duration_minutes > 0 && (
                  <CountdownTimer
                    minutes={step.duration_minutes}
                    stepName={`步骤${step.order}`}
                    onComplete={() => {
                      if (!completedSteps.has(step.order)) {
                        markStepComplete(step.order);
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </Card>

          <Button
            type="primary"
            size="large"
            block
            icon={<FireOutlined />}
            onClick={() => setCookingMode(true)}
            style={{
              height: 56,
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF8A65, #FF5722)',
              border: 'none',
              boxShadow: '0 6px 20px rgba(255,87,34,0.3)',
              marginBottom: 24,
            }}
          >
            开始烹饪
          </Button>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<div style={{ fontWeight: 600, fontSize: 18 }}>🥗 食材清单</div>}
            style={{ borderRadius: 16, marginBottom: 24 }}
          >
            {recipe.ingredients.length > 0 ? (
              <div>
                {recipe.ingredients.map((ing, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: index < recipe.ingredients.length - 1 ? '1px solid #F5F0E6' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{ing.name}</span>
                    </div>
                    <span style={{ color: '#7A7A7A' }}>
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
                <Divider />
                <Button type="primary" block icon={<ShoppingCartOutlined />} onClick={addToShoppingList}>
                  全部添加到购物清单
                </Button>
              </div>
            ) : (
              <Empty description="暂无食材信息" />
            )}
          </Card>

          <Card style={{ borderRadius: 16 }}>
            <NutritionCard nutrition={recipe.nutrition} servings={recipe.servings} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RecipeDetail;
