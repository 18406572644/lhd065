import React, { useEffect, useState, useCallback } from 'react';
import {
  Input,
  Select,
  Button,
  Tag,
  Empty,
  Space,
  message,
  Row,
  Col,
  Card,
  Modal,
  Drawer,
  Progress,
  Tooltip,
  Tabs,
  Badge,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  BarChartOutlined,
  CloseOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  FireOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { IngredientEncyclopedia } from '@/types';
import {
  getEncyclopediaList,
  getCategories,
  getCurrentSeasonIngredients,
  toggleIngredientFavorite,
  compareIngredients,
} from '@/api/ingredientEncyclopedia';
import { COLORS, CATEGORY_COLORS } from '@/styles/theme';

const { Option } = Select;
const { Meta } = Card;

const SEASONS = ['全部', '春季', '夏季', '秋季', '冬季', '四季'];

const getSeasonIcon = (season: string) => {
  switch (season) {
    case '春季': return '🌸';
    case '夏季': return '☀️';
    case '秋季': return '🍂';
    case '冬季': return '❄️';
    case '四季': return '🌈';
    default: return '🥗';
  }
};

const getCategoryColor = (category: string) => {
  return CATEGORY_COLORS[category] || COLORS.primary;
};

const getCategoryEmoji = (category: string) => {
  const emojiMap: Record<string, string> = {
    '蔬菜': '🥬',
    '水果': '🍎',
    '肉类': '🥩',
    '蛋类': '🥚',
    '奶制品': '🥛',
    '豆制品': '🧈',
    '主食': '🍚',
    '调料': '🧂',
    '海鲜': '🦐',
    '其他': '🥗',
  };
  return emojiMap[category] || '🥗';
};

const IngredientsEncyclopedia: React.FC = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<IngredientEncyclopedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [season, setSeason] = useState('全部');
  const [categories, setCategories] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [compareResult, setCompareResult] = useState<IngredientEncyclopedia[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [seasonData, setSeasonData] = useState<{ season: string; ingredients: IngredientEncyclopedia[] }>({
    season: '',
    ingredients: [],
  });
  const [activeTab, setActiveTab] = useState('all');

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories);
    } catch {
      console.error('加载分类失败');
    }
  };

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.search = keyword;
      if (category && category !== '全部') params.category = category;
      if (season && season !== '全部') params.season = season;
      const data = await getEncyclopediaList(params);
      setIngredients(data);
    } catch (error) {
      message.error('加载食材百科失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, category, season]);

  const loadCurrentSeason = async () => {
    try {
      const data = await getCurrentSeasonIngredients();
      setSeasonData(data);
    } catch {
      console.error('加载当季食材失败');
    }
  };

  useEffect(() => {
    loadCategories();
    loadCurrentSeason();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      loadIngredients();
    }
  }, [activeTab, loadIngredients]);

  const handleToggleFavorite = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const result = await toggleIngredientFavorite(id);
      setIngredients((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_favorite: result.is_favorite } : i))
      );
      setSeasonData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((i) =>
          i.id === id ? { ...i, is_favorite: result.is_favorite } : i
        ),
      }));
      if (result.is_favorite) {
        message.success('已收藏');
      } else {
        message.success('已取消收藏');
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleToggleCompare = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 3) {
        message.warning('最多只能对比 3 种食材');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (compareIds.length < 2) {
      message.warning('请至少选择 2 种食材进行对比');
      return;
    }
    setCompareLoading(true);
    try {
      const result = await compareIngredients(compareIds);
      setCompareResult(result.ingredients);
      setCompareDrawerOpen(true);
    } catch {
      message.error('对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  const clearCompare = () => {
    setCompareIds([]);
    setCompareResult([]);
    setCompareDrawerOpen(false);
  };

  const renderNutritionBar = (value: number, max: number, color: string) => {
    const percent = Math.min((value / max) * 100, 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 60,
            height: 6,
            background: '#F0F0F0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: '#999', minWidth: 40 }}>{value}g</span>
      </div>
    );
  };

  const renderCard = (item: IngredientEncyclopedia) => {
    const isInCompare = compareIds.includes(item.id);
    const categoryColor = getCategoryColor(item.category);

    return (
      <Card
        hoverable
        onClick={() => navigate(`/ingredients/${item.id}`)}
        style={{
          borderRadius: 16,
          border: isInCompare ? `2px solid ${COLORS.primary}` : '1px solid #F0EBE0',
          boxShadow: isInCompare
            ? `0 4px 16px ${COLORS.primary}30`
            : '0 2px 12px rgba(139, 195, 74, 0.06)',
          overflow: 'hidden',
          transition: 'all 0.3s',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div
          style={{
            height: 120,
            background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}10 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            position: 'relative',
          }}
        >
          {getCategoryEmoji(item.category)}
          <Badge
            count={isInCompare ? '已选' : 0}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: isInCompare ? COLORS.primary : 'transparent',
            }}
          />
          <Button
            type="text"
            shape="circle"
            icon={
              item.is_favorite ? (
                <HeartFilled style={{ color: '#EF5350', fontSize: 18 }} />
              ) : (
                <HeartOutlined style={{ color: '#fff', fontSize: 18 }} />
              )
            }
            onClick={(e) => handleToggleFavorite(e, item.id)}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
            }}
          />
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2D3436' }}>
              {item.name}
            </h3>
            <span style={{ fontSize: 14 }}>{getSeasonIcon(item.season)}</span>
          </div>
          {item.aliases && (
            <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
              别名：{item.aliases.split(',')[0]}
              {item.aliases.split(',').length > 1 && ' 等'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Tag color={categoryColor} style={{ margin: 0 }}>
              {item.category}
            </Tag>
            <Tag color="blue" style={{ margin: 0 }}>
              {item.season}
            </Tag>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#7A7A7A' }}>热量</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.warning }}>
                {item.nutrition_calories} kcal
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#7A7A7A' }}>蛋白质</span>
              {renderNutritionBar(item.nutrition_protein, 30, COLORS.primary)}
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button
              size="small"
              type={isInCompare ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              onClick={(e) => handleToggleCompare(e, item.id)}
              style={{ flex: 1 }}
            >
              {isInCompare ? '取消对比' : '加入对比'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <AppstoreOutlined /> 全部食材
        </span>
      ),
    },
    {
      key: 'season',
      label: (
        <span>
          <ThunderboltOutlined /> 当季推荐
          {seasonData.season && ` (${seasonData.season})`}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">🥗 食材百科</h1>
        <Space>
          {compareIds.length > 0 && (
            <Badge count={compareIds.length} size="small">
              <Button
                type="primary"
                icon={<BarChartOutlined />}
                onClick={handleCompare}
                loading={compareLoading}
              >
                开始对比
              </Button>
            </Badge>
          )}
        </Space>
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="搜索食材名称、别名..."
              prefix={<SearchOutlined />}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={12} sm={7}>
            <Select
              value={category}
              onChange={setCategory}
              size="large"
              style={{ width: '100%' }}
            >
              <Option value="全部">所有分类</Option>
              {categories.map((c) => (
                <Option key={c} value={c}>
                  {getCategoryEmoji(c)} {c}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={7}>
            <Select
              value={season}
              onChange={setSeason}
              size="large"
              style={{ width: '100%' }}
            >
              {SEASONS.map((s) => (
                <Option key={s} value={s}>
                  {getSeasonIcon(s)} {s}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {activeTab === 'all' ? (
        loading ? (
          <Empty description="加载中..." style={{ marginTop: 64 }} />
        ) : ingredients.length > 0 ? (
          <Row gutter={[16, 16]}>
            {ingredients.map((item) => (
              <Col key={item.id} xs={12} sm={8} md={6} lg={6} xl={5}>
                {renderCard(item)}
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description="没有找到匹配的食材"
            style={{ marginTop: 64 }}
          />
        )
      ) : (
        <div>
          {seasonData.ingredients.length > 0 ? (
            <div>
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.warning}15 100%)`,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{ fontSize: 48 }}>{getSeasonIcon(seasonData.season)}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2D3436' }}>
                    {seasonData.season}当季食材推荐
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7A7A7A' }}>
                    应季食材最新鲜，营养价值也最高哦~
                  </p>
                </div>
                <RiseOutlined
                  style={{ fontSize: 32, color: COLORS.primary, marginLeft: 'auto' }}
                />
              </div>
              <Row gutter={[16, 16]}>
                {seasonData.ingredients.map((item) => (
                  <Col key={item.id} xs={12} sm={8} md={6} lg={6} xl={5}>
                    {renderCard(item)}
                  </Col>
                ))}
              </Row>
            </div>
          ) : (
            <Empty description="暂无当季食材数据" style={{ marginTop: 64 }} />
          )}
        </div>
      )}

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChartOutlined style={{ color: COLORS.primary }} />
            <span style={{ fontWeight: 700 }}>食材营养对比</span>
          </div>
        }
        placement="right"
        onClose={clearCompare}
        open={compareDrawerOpen}
        width={720}
        extra={
          <Button size="small" onClick={clearCompare} icon={<CloseOutlined />}>
            关闭
          </Button>
        }
      >
        {compareResult.length >= 2 ? (
          <div className="ingredient-compare">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: COLORS.backgroundAlt,
                      borderBottom: `2px solid ${COLORS.border}`,
                      fontWeight: 600,
                      color: '#5A5A5A',
                    }}
                  >
                    营养成分 (每100g)
                  </th>
                  {compareResult.map((item) => (
                    <th
                      key={item.id}
                      style={{
                        textAlign: 'center',
                        padding: '12px 16px',
                        background: COLORS.backgroundAlt,
                        borderBottom: `2px solid ${COLORS.border}`,
                        fontWeight: 600,
                        minWidth: 140,
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 4 }}>
                        {getCategoryEmoji(item.category)}
                      </div>
                      <div style={{ fontSize: 15, color: '#2D3436' }}>{item.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '热量', key: 'nutrition_calories', unit: 'kcal', color: COLORS.warning },
                  { label: '蛋白质', key: 'nutrition_protein', unit: 'g', color: COLORS.primary },
                  { label: '碳水化合物', key: 'nutrition_carbs', unit: 'g', color: COLORS.amber },
                  { label: '脂肪', key: 'nutrition_fat', unit: 'g', color: COLORS.error },
                  { label: '膳食纤维', key: 'nutrition_fiber', unit: 'g', color: COLORS.teal },
                  { label: '糖分', key: 'nutrition_sugar', unit: 'g', color: COLORS.pink },
                  { label: '维生素C', key: 'nutrition_vitamin_c', unit: 'mg', color: COLORS.info },
                  { label: '钙', key: 'nutrition_calcium', unit: 'mg', color: COLORS.purple },
                  { label: '铁', key: 'nutrition_iron', unit: 'mg', color: COLORS.cyan },
                ].map((item, index) => {
                  const values = compareResult.map((r) => r[item.key as keyof IngredientEncyclopedia] as number);
                  const maxValue = Math.max(...values, 1);

                  return (
                    <tr key={item.key} style={{ background: index % 2 === 0 ? '#fff' : COLORS.backgroundAlt }}>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, color: '#5A5A5A' }}>
                        {item.label}
                      </td>
                      {compareResult.map((r) => {
                        const value = r[item.key as keyof IngredientEncyclopedia] as number;
                        const percent = (value / maxValue) * 100;
                        return (
                          <td
                            key={r.id}
                            style={{
                              padding: '12px 16px',
                              borderBottom: `1px solid ${COLORS.border}`,
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#2D3436', marginBottom: 4 }}>
                              {value} {item.unit}
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: '#F0F0F0',
                                borderRadius: 3,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: '100%',
                                  background: item.color,
                                  borderRadius: 3,
                                  transition: 'width 0.5s ease',
                                }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description="暂无对比数据" style={{ marginTop: 64 }} />
        )}
      </Drawer>
    </div>
  );
};

export default IngredientsEncyclopedia;
