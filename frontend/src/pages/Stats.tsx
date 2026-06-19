import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Empty, Progress, Modal, Tag, Button, Rate } from 'antd';
import {
  FireOutlined,
  CoffeeOutlined,
  AppleOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  StarOutlined,
  EyeOutlined,
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
} from 'recharts';
import dayjs from 'dayjs';
import { DailyNutrition, CategoryStat, TopRecipe, CookingCalendarData, CookingRecord } from '@/types';
import {
  getWeeklyNutrition,
  getCategoryDistribution,
  getTopRecipes,
  getCookingStats,
} from '@/api/stats';
import { getCookingCalendar, getCookingRecord } from '@/api/cooking';
import { COLORS, CATEGORY_COLORS } from '@/styles/theme';
import { formatDuration, getCategoryIcon } from '@/utils';

const Stats: React.FC = () => {
  const [weeklyNutrition, setWeeklyNutrition] = useState<DailyNutrition[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryStat[]>([]);
  const [topRecipes, setTopRecipes] = useState<TopRecipe[]>([]);
  const [cookingStats, setCookingStats] = useState<{ total_cooks: number; total_recipes: number; total_cook_time: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [calendarYear, setCalendarYear] = useState(dayjs().year());
  const [calendarMonth, setCalendarMonth] = useState(dayjs().month() + 1);
  const [calendarData, setCalendarData] = useState<CookingCalendarData | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<CookingRecord | null>(null);

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
        setWeeklyNutrition(nutrition.status === 'fulfilled' ? nutrition.value : []);
        setCategoryDistribution(cat.status === 'fulfilled' ? cat.value : []);
        setTopRecipes(top.status === 'fulfilled' ? top.value : []);
        setCookingStats(stats.status === 'fulfilled' ? stats.value : null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadCalendar = async () => {
      setCalendarLoading(true);
      try {
        const data = await getCookingCalendar(calendarYear, calendarMonth);
        setCalendarData(data);
      } catch {
        setCalendarData(null);
      } finally {
        setCalendarLoading(false);
      }
    };
    loadCalendar();
  }, [calendarYear, calendarMonth]);

  const prevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarYear(calendarYear - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarYear(calendarYear + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const viewRecordDetail = async (recordId: number) => {
    try {
      const data = await getCookingRecord(recordId);
      setDetailRecord(data);
      setDetailVisible(true);
    } catch {
      // ignore
    }
  };

  const avgCalories =
    weeklyNutrition.length > 0
      ? Math.round(weeklyNutrition.reduce((sum, d) => sum + d.calories, 0) / weeklyNutrition.length)
      : 0;

  const targetCalories = 2000;
  const maxCookCount = topRecipes.length > 0 ? Math.max(...topRecipes.map((r) => r.cook_count)) : 1;

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const getCalendarGrid = () => {
    if (!calendarData?.days) return [];
    const firstDay = dayjs(`${calendarYear}-${String(calendarMonth).padStart(2, '0')}-01`);
    let startDow = firstDay.day();
    if (startDow === 0) startDow = 7;
    startDow -= 1;

    const daysMap: Record<string, CookingRecord[]> = {};
    for (const d of calendarData.days) {
      daysMap[d.date] = d.records;
    }

    const cells: { date: string; day: number; isCurrentMonth: boolean; records: CookingRecord[] }[] = [];

    const prevMonthDays = dayjs(firstDay).subtract(1, 'month').daysInMonth();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateStr = dayjs(firstDay).subtract(1, 'month').date(d).format('YYYY-MM-DD');
      cells.push({ date: dateStr, day: d, isCurrentMonth: false, records: daysMap[dateStr] || [] });
    }

    const daysInMonth = firstDay.daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ date: dateStr, day: i, isCurrentMonth: true, records: daysMap[dateStr] || [] });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const dateStr = dayjs(firstDay).add(1, 'month').date(i).format('YYYY-MM-DD');
      cells.push({ date: dateStr, day: i, isCurrentMonth: false, records: daysMap[dateStr] || [] });
    }

    return cells;
  };

  const calendarGrid = getCalendarGrid();

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

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="chart-title" style={{ marginBottom: 0 }}>
            <CalendarOutlined style={{ color: '#8BC34A', marginRight: 8 }} />
            烹饪历史日历
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={<LeftOutlined />} onClick={prevMonth} size="small" />
            <span style={{ fontWeight: 600, fontSize: 15, color: '#4A4A4A', minWidth: 100, textAlign: 'center' }}>
              {calendarYear}年{calendarMonth}月
            </span>
            <Button type="text" icon={<RightOutlined />} onClick={nextMonth} size="small" />
          </div>
        </div>

        {calendarLoading ? (
          <Empty description="加载中..." />
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {weekDays.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#A0A0A0',
                    padding: '8px 0',
                  }}
                >
                  周{d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calendarGrid.map((cell, idx) => (
                <div
                  key={idx}
                  style={{
                    minHeight: 80,
                    background: cell.isCurrentMonth ? '#FFFBF2' : 'transparent',
                    borderRadius: 10,
                    padding: '6px 8px',
                    border: cell.isCurrentMonth ? '1px solid rgba(139,195,74,0.08)' : '1px solid transparent',
                    position: 'relative',
                    cursor: cell.records.length > 0 ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (cell.records.length > 0) {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(139,195,74,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: cell.isCurrentMonth ? 600 : 400,
                      color: cell.isCurrentMonth ? '#4A4A4A' : '#D7CCC8',
                      marginBottom: 4,
                    }}
                  >
                    {cell.day}
                  </div>
                  {cell.records.slice(0, 2).map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => viewRecordDetail(rec.id)}
                      style={{
                        fontSize: 11,
                        color: '#5A5A5A',
                        background: 'rgba(139,195,74,0.12)',
                        borderRadius: 6,
                        padding: '2px 6px',
                        marginBottom: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 500,
                      }}
                    >
                      {getCategoryIcon(rec.recipe_category || '')} {rec.recipe_name}
                    </div>
                  ))}
                  {cell.records.length > 2 && (
                    <div style={{ fontSize: 10, color: '#A0A0A0', textAlign: 'center' }}>
                      +{cell.records.length - 2}更多
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOutlined style={{ color: '#8BC34A' }} />
            <span>烹饪记录详情</span>
          </div>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={520}
      >
        {detailRecord && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                background: 'rgba(139,195,74,0.06)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {getCategoryIcon(detailRecord.recipe_category || '')}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#4A4A4A' }}>
                    {detailRecord.recipe_name}
                  </div>
                  <Tag color="green" style={{ marginTop: 4 }}>{detailRecord.recipe_category || '食谱'}</Tag>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  background: 'rgba(255,138,101,0.06)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 4 }}>开始时间</div>
                <div style={{ fontWeight: 600, color: '#4A4A4A', fontSize: 14 }}>
                  {dayjs(detailRecord.started_at).format('HH:mm:ss')}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(102,187,106,0.06)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 4 }}>完成时间</div>
                <div style={{ fontWeight: 600, color: '#4A4A4A', fontSize: 14 }}>
                  {detailRecord.completed_at ? dayjs(detailRecord.completed_at).format('HH:mm:ss') : '—'}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(186,104,200,0.06)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 4 }}>预计用时</div>
                <div style={{ fontWeight: 600, color: '#BA68C8', fontSize: 14 }}>
                  {formatDuration(detailRecord.estimated_minutes)}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,213,79,0.06)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#A0A0A0', marginBottom: 4 }}>实际用时</div>
                <div style={{ fontWeight: 600, color: '#FF8A65', fontSize: 14 }}>
                  {formatDuration(detailRecord.actual_minutes)}
                </div>
              </div>
            </div>

            {detailRecord.rating && detailRecord.rating > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#7A7A7A', marginBottom: 6 }}>评分</div>
                <Rate value={detailRecord.rating} disabled style={{ fontSize: 20 }} />
              </div>
            )}

            {detailRecord.review && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#7A7A7A', marginBottom: 6 }}>评价</div>
                <div
                  style={{
                    background: '#FFFBF2',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    lineHeight: 1.8,
                    color: '#5A5A5A',
                    border: '1px solid rgba(139,195,74,0.1)',
                  }}
                >
                  {detailRecord.review}
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#A0A0A0' }}>
              烹饪日期：{dayjs(detailRecord.started_at).format('YYYY年MM月DD日')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Stats;
