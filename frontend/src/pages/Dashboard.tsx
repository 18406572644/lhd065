import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Button, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  BookOutlined,
  WarningOutlined,
  FireOutlined,
  HeartOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  StarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Recipe, InventoryItem } from '@/types';
import { mockGetRecommendedRecipes, mockGetFavorites } from '@/api/recipes';
import { mockGetExpiringItems, mockGetLowStock } from '@/api/inventory';
import { mockGetCookingStats } from '@/api/stats';
import { formatDuration, getCategoryIcon, getDifficultyText, getDifficultyColor } from '@/utils';
import ExpireBadge from '@/components/ExpireBadge';
import NutritionCard from '@/components/NutritionCard';
import ImageCarousel from '@/components/ImageCarousel';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState<Recipe[]>([]);
  const [expiring, setExpiring] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [cookingStats, setCookingStats] = useState<{ total_cooks: number; total_recipes: number; total_cook_time: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [rec, exp, low, fav, stats] = await Promise.all([
          mockGetRecommendedRecipes(),
          mockGetExpiringItems(7),
          mockGetLowStock(),
          mockGetFavorites(),
          mockGetCookingStats(),
        ]);
        setRecommended(rec as Recipe[]);
        setExpiring(exp as InventoryItem[]);
        setLowStock(low as InventoryItem[]);
        setFavorites(fav as Recipe[]);
        setCookingStats(stats as any);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const avgNutrition = recommended.length > 0
    ? recommended.reduce(
        (acc, r) => ({
          calories: acc.calories + r.nutrition.calories,
          protein: acc.protein + r.nutrition.protein,
          fat: acc.fat + r.nutrition.fat,
          carbs: acc.carbs + r.nutrition.carbs,
          fiber: acc.fiber + r.nutrition.fiber,
          sugar: acc.sugar + r.nutrition.sugar,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 }
      )
    : { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 };

  const greeting = (() => {
    const hour = dayjs().hour();
    if (hour < 6) return '夜深了，注意休息';
    if (hour < 11) return '早上好！';
    if (hour < 14) return '中午好！';
    if (hour < 18) return '下午好！';
    return '晚上好！';
  })();

  return (
    <div className="page-container animate-fadeIn">
      <div className="welcome-card">
        <h2>{greeting} 👋</h2>
        <p>欢迎回到温馨厨房，今天想做什么好吃的呢？</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">收藏食谱</div>
            </div>
            <div className="stat-card-icon" style={{ background: 'rgba(239, 83, 80, 0.12)', color: '#EF5350' }}>
              <HeartOutlined />
            </div>
          </div>
          <div className="stat-card-value">{favorites.length}</div>
          <div className="stat-card-footer">你的美食宝藏</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">累计烹饪</div>
            </div>
            <div className="stat-card-icon" style={{ background: 'rgba(139, 195, 74, 0.12)', color: '#8BC34A' }}>
              <BookOutlined />
            </div>
          </div>
          <div className="stat-card-value">{cookingStats?.total_cooks || 0}</div>
          <div className="stat-card-footer">次美味诞生</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">总烹饪时间</div>
            </div>
            <div className="stat-card-icon" style={{ background: 'rgba(255, 138, 101, 0.12)', color: '#FF8A65' }}>
              <ClockCircleOutlined />
            </div>
          </div>
          <div className="stat-card-value">{formatDuration(cookingStats?.total_cook_time || 0)}</div>
          <div className="stat-card-footer">沉浸在美食中</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">库存提醒</div>
            </div>
            <div className="stat-card-icon" style={{ background: 'rgba(255, 213, 79, 0.12)', color: '#FFD54F' }}>
              <WarningOutlined />
            </div>
          </div>
          <div className="stat-card-value">{expiring.length + lowStock.length}</div>
          <div className="stat-card-footer">
            <span style={{ color: '#EF5350' }}>{expiring.filter(e => dayjs(e.expire_date).diff(dayjs(), 'day') < 0).length} 项过期</span>
            {' · '}
            <span style={{ color: '#FF8A65' }}>{lowStock.length} 项库存低</span>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StarOutlined style={{ color: '#FFD54F' }} />
                <span style={{ fontWeight: 600, fontSize: 18 }}>今日推荐食谱</span>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/recipes')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 16 }}
          >
            {recommended.length > 0 ? (
              <div className="recipes-grid">
                {recommended.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="recipe-card"
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                  >
                    <div className="recipe-card-image">
                      <ImageCarousel
                        images={recipe.images || []}
                        fallbackIcon={<span style={{ fontSize: 48 }}>{getCategoryIcon(recipe.category)}</span>}
                        height={140}
                      />
                    </div>
                    <div className="recipe-card-body">
                      <div className="recipe-card-title">{recipe.name}</div>
                      <div className="recipe-card-meta">
                        <span>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {formatDuration(recipe.cook_time)}
                        </span>
                        <span>{recipe.servings}人份</span>
                      </div>
                      <div className="recipe-card-tags">
                        <Tag color="green">{recipe.category}</Tag>
                        <Tag color={getDifficultyColor(recipe.difficulty) as any}>
                          {getDifficultyText(recipe.difficulty)}
                        </Tag>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无推荐食谱" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningOutlined style={{ color: '#FF8A65' }} />
                <span style={{ fontWeight: 600, fontSize: 18 }}>库存提醒</span>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/inventory')}>
                管理库存 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 16, marginBottom: 24 }}
          >
            {expiring.length > 0 || lowStock.length > 0 ? (
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {expiring.map((item) => (
                  <div
                    key={`exp-${item.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #F5F0E6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#7A7A7A' }}>
                        {item.quantity} {item.unit}
                      </div>
                    </div>
                    <ExpireBadge expireDate={item.expire_date} size="small" />
                  </div>
                ))}
                {lowStock.slice(0, 5).map((item) => (
                  <div
                    key={`low-${item.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #F5F0E6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#7A7A7A' }}>
                        库存 {item.quantity} / 最低 {item.min_quantity} {item.unit}
                      </div>
                    </div>
                    <Tag color="warning" style={{ margin: 0 }}>
                      <ShoppingCartOutlined /> 库存低
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="库存状态良好" />
            )}
          </Card>

          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FireOutlined style={{ color: '#FF8A65' }} />
                <span style={{ fontWeight: 600, fontSize: 18 }}>平均营养概览</span>
              </div>
            }
            extra={
              <Button type="link" onClick={() => navigate('/stats')}>
                详细统计 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 16 }}
          >
            <NutritionCard
              nutrition={
                recommended.length > 0
                  ? {
                      calories: Math.round(avgNutrition.calories / recommended.length),
                      protein: Math.round(avgNutrition.protein / recommended.length),
                      fat: Math.round(avgNutrition.fat / recommended.length),
                      carbs: Math.round(avgNutrition.carbs / recommended.length),
                      fiber: Math.round(avgNutrition.fiber / recommended.length),
                      sugar: Math.round(avgNutrition.sugar / recommended.length),
                    }
                  : { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 }
              }
              showTitle={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
