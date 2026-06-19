import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Empty, Progress } from 'antd';
import {
  FireOutlined,
  CoffeeOutlined,
  AppleOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { DailyNutrition, CategoryStat, TopRecipe } from '@/types';
import {
  getWeeklyNutrition,
  getCategoryDistribution,
  getTopRecipes,
  getCookingStats,
} from '@/api/stats';
import { COLORS, CATEGORY_COLORS } from '@/styles/theme';
import { formatDuration } from '@/utils';

const Stats: React.FC = () => {
  const [weeklyNutrition, setWeeklyNutrition] = useState<DailyNutrition[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryStat[]>([]);
  const [topRecipes, setTopRecipes] = useState<TopRecipe[]>([]);
  const [cookingStats, setCookingStats] = useState<{ total_cooks: number; total_recipes: number; total_cook_time: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [nutrition, cat, top, stats] = await Promise.allSettled([
          getWeeklyNutrition(),
          getCategoryDistribution(),
          getTopRecipes(),
          getCookingStats(),
        ]);
        setWeeklyNutrition(nutrition.status === 'fulfilled' ? (nutrition.value as DailyNutrition[]) : []);
        setCategoryDistribution(cat.status === 'fulfilled' ? (cat.value as CategoryStat[]) : []);
        setTopRecipes(top.status === 'fulfilled' ? (top.value as TopRecipe[]) : []);
        setCookingStats(stats.status === 'fulfilled' ? (stats.value as any) : null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const avgCalories =
    weeklyNutrition.length > 0
      ? Math.round(weeklyNutrition.reduce((sum, d) => sum + d.calories, 0) / weeklyNutrition.length)
      : 0;

  const targetCalories = 2000;
  const maxCookCount = topRecipes.length > 0 ? Math.max(...topRecipes.map((r) => r.cook_count)) : 1;

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">📊 饮食统计</h1>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 16, border: '1px solid rgba(139,195,74,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><BookOutlined style={{ color: '#8BC34A' }} /> 累计烹饪</span>}
              value={cookingStats?.total_cooks || 0}
              valueStyle={{ color: '#8BC34A' }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 16, border: '1px solid rgba(255,138,101,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><BookOutlined style={{ color: '#FF8A65' }} /> 食谱总数</span>}
              value={cookingStats?.total_recipes || 0}
              valueStyle={{ color: '#FF8A65' }}
              suffix="道"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 16, border: '1px solid rgba(186,104,200,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><ClockCircleOutlined style={{ color: '#BA68C8' }} /> 总时长</span>}
              value={formatDuration(cookingStats?.total_cook_time || 0)}
              valueStyle={{ color: '#BA68C8' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 16, border: '1px solid rgba(255,213,79,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><FireOutlined style={{ color: '#FFA000' }} /> 周均热量</span>}
              value={avgCalories}
              valueStyle={{ color: '#FFA000' }}
              suffix="kcal"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <div className="chart-card">
            <div className="chart-title">
              <FireOutlined style={{ color: '#FF8A65', marginRight: 8 }} />
              本周营养摄入趋势
            </div>
            {loading ? (
              <Empty description="加载中..." />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={weeklyNutrition} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F0E6" />
                  <XAxis dataKey="date" stroke="#A0A0A0" fontSize={12} />
                  <YAxis stroke="#A0A0A0" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #F0EBE0',
                      boxShadow: '0 4px 16px rgba(139,195,74,0.1)',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    name="热量 (kcal)"
                    stroke="#FF8A65"
                    strokeWidth={3}
                    dot={{ fill: '#FF8A65', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="protein"
                    name="蛋白质 (g)"
                    stroke="#8BC34A"
                    strokeWidth={2.5}
                    dot={{ fill: '#8BC34A', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="carbs"
                    name="碳水 (g)"
                    stroke="#BA68C8"
                    strokeWidth={2.5}
                    dot={{ fill: '#BA68C8', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fat"
                    name="脂肪 (g)"
                    stroke="#FFD54F"
                    strokeWidth={2.5}
                    dot={{ fill: '#FFD54F', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-title">
              <TrophyOutlined style={{ color: '#FFD54F', marginRight: 8 }} />
              最常烹饪的食谱 TOP5
            </div>
            {loading || topRecipes.length === 0 ? (
              <Empty description="暂无数据" />
            ) : (
              <div style={{ padding: '0 8px' }}>
                {topRecipes.map((recipe, index) => (
                  <div
                    key={recipe.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '14px 0',
                      borderBottom: index < topRecipes.length - 1 ? '1px solid #F5F0E6' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                            : index === 1
                            ? 'linear-gradient(135deg, #C0C0C0, #A8A8A8)'
                            : index === 2
                            ? 'linear-gradient(135deg, #CD7F32, #A0522D)'
                            : 'rgba(139, 195, 74, 0.12)',
                        color: index < 3 ? '#FFFFFF' : '#689F38',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{recipe.name}</div>
                      <Progress
                        percent={Math.round((recipe.cook_count / maxCookCount) * 100)}
                        showInfo={false}
                        strokeColor={{
                          from: '#8BC34A',
                          to: '#689F38',
                        }}
                        size="small"
                      />
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#689F38' }}>
                        {recipe.cook_count}
                      </div>
                      <div style={{ fontSize: 11, color: '#A0A0A0' }}>次</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div className="chart-card">
            <div className="chart-title">
              <ThunderboltOutlined style={{ color: '#8BC34A', marginRight: 8 }} />
              日均热量目标
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Progress
                type="dashboard"
                percent={Math.min(100, Math.round((avgCalories / targetCalories) * 100))}
                strokeColor={{
                  from: '#8BC34A',
                  to: '#FF8A65',
                }}
                strokeWidth={10}
                format={() => `${avgCalories}`}
              />
              <div style={{ marginTop: 8, color: '#7A7A7A', fontSize: 13 }}>
                目标 {targetCalories} kcal/天
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">
              <AppleOutlined style={{ color: '#BA68C8', marginRight: 8 }} />
              食材分类占比
            </div>
            {loading ? (
              <Empty description="加载中..." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.name] || COLORS.info}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, '占比']}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #F0EBE0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {categoryDistribution.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        padding: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: CATEGORY_COLORS[item.name] || COLORS.info,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: '#5A5A5A' }}>
                        {item.name}
                        <span style={{ color: '#A0A0A0', marginLeft: 4 }}>{item.value}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="chart-card">
            <div className="chart-title">
              <CoffeeOutlined style={{ color: '#4DD0E1', marginRight: 8 }} />
              营养成分平均
            </div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 70, color: '#7A7A7A', fontSize: 13 }}>蛋白质</div>
                <div style={{ flex: 1 }}>
                  <Progress
                    percent={80}
                    showInfo={false}
                    strokeColor="#8BC34A"
                    size="small"
                  />
                </div>
                <div style={{ width: 50, textAlign: 'right', color: '#689F38', fontWeight: 600 }}>
                  {weeklyNutrition.length > 0
                    ? Math.round(weeklyNutrition.reduce((s, d) => s + d.protein, 0) / weeklyNutrition.length)
                    : 0}
                  g
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 70, color: '#7A7A7A', fontSize: 13 }}>脂肪</div>
                <div style={{ flex: 1 }}>
                  <Progress
                    percent={65}
                    showInfo={false}
                    strokeColor="#FFD54F"
                    size="small"
                  />
                </div>
                <div style={{ width: 50, textAlign: 'right', color: '#FFA000', fontWeight: 600 }}>
                  {weeklyNutrition.length > 0
                    ? Math.round(weeklyNutrition.reduce((s, d) => s + d.fat, 0) / weeklyNutrition.length)
                    : 0}
                  g
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 70, color: '#7A7A7A', fontSize: 13 }}>碳水</div>
                <div style={{ flex: 1 }}>
                  <Progress
                    percent={55}
                    showInfo={false}
                    strokeColor="#BA68C8"
                    size="small"
                  />
                </div>
                <div style={{ width: 50, textAlign: 'right', color: '#9C27B0', fontWeight: 600 }}>
                  {weeklyNutrition.length > 0
                    ? Math.round(weeklyNutrition.reduce((s, d) => s + d.carbs, 0) / weeklyNutrition.length)
                    : 0}
                  g
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Stats;
