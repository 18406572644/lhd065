import React, { useEffect, useState } from 'react';
import {
  Button,
  Tag,
  Card,
  Row,
  Col,
  Progress,
  Space,
  Tabs,
  message,
  Descriptions,
  Avatar,
  Divider,
  Tooltip,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  HeartOutlined,
  HeartFilled,
  ShoppingCartOutlined,
  BarChartOutlined,
  BulbOutlined,
  ShopOutlined,
  ShrinkOutlined,
  TeamOutlined,
  FireOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { IngredientEncyclopedia } from '@/types';
import {
  getEncyclopediaDetail,
  toggleIngredientFavorite,
  parsePairings,
} from '@/api/ingredientEncyclopedia';
import { COLORS, CATEGORY_COLORS } from '@/styles/theme';

const { Meta } = Card;

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

interface NutritionItem {
  label: string;
  value: number;
  unit: string;
  color: string;
  max?: number;
}

const IngredientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ingredient, setIngredient] = useState<IngredientEncyclopedia | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getEncyclopediaDetail(parseInt(id));
      setIngredient(data);
    } catch (error) {
      message.error('加载食材详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!ingredient) return;
    try {
      const result = await toggleIngredientFavorite(ingredient.id);
      setIngredient((prev) => (prev ? { ...prev, is_favorite: result.is_favorite } : null));
      message.success(result.is_favorite ? '已收藏' : '已取消收藏');
    } catch {
      message.error('操作失败');
    }
  };

  const nutritionItems: NutritionItem[] = ingredient
    ? [
        { label: '热量', value: ingredient.nutrition_calories, unit: 'kcal', color: COLORS.warning, max: 400 },
        { label: '蛋白质', value: ingredient.nutrition_protein, unit: 'g', color: COLORS.primary, max: 30 },
        { label: '碳水化合物', value: ingredient.nutrition_carbs, unit: 'g', color: COLORS.amber, max: 80 },
        { label: '脂肪', value: ingredient.nutrition_fat, unit: 'g', color: COLORS.error, max: 20 },
        { label: '膳食纤维', value: ingredient.nutrition_fiber, unit: 'g', color: COLORS.teal, max: 10 },
        { label: '糖分', value: ingredient.nutrition_sugar, unit: 'g', color: COLORS.pink, max: 15 },
        { label: '维生素C', value: ingredient.nutrition_vitamin_c, unit: 'mg', color: COLORS.info, max: 100 },
        { label: '钙', value: ingredient.nutrition_calcium, unit: 'mg', color: COLORS.purple, max: 200 },
        { label: '铁', value: ingredient.nutrition_iron, unit: 'mg', color: COLORS.cyan, max: 5 },
      ]
    : [];

  const pairings = parsePairings(ingredient?.common_pairings || '');
  const conflicts = parsePairings(ingredient?.food_conflicts || '');

  const renderTipsList = (text: string) => {
    if (!text) return <span style={{ color: '#999' }}>暂无数据</span>;
    return text
      .split('\n')
      .filter(Boolean)
      .map((tip, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 12,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: `${COLORS.primary}20`,
              color: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {index + 1}
          </div>
          <span style={{ color: '#5A5A5A', lineHeight: 1.6, fontSize: 14 }}>{tip}</span>
        </div>
      ));
  };

  const tabItems = [
    {
      key: 'nutrition',
      label: (
        <span>
          <BarChartOutlined /> 营养成分
        </span>
      ),
    },
    {
      key: 'selection',
      label: (
        <span>
          <ShopOutlined /> 选购技巧
        </span>
      ),
    },
    {
      key: 'storage',
      label: (
        <span>
          <ShrinkOutlined /> 储存方法
        </span>
      ),
    },
    {
      key: 'pairings',
      label: (
        <span>
          <TeamOutlined /> 搭配与相克
        </span>
      ),
    },
    {
      key: 'cooking',
      label: (
        <span>
          <FireOutlined /> 烹饪建议
        </span>
      ),
    },
  ];

  if (!ingredient && !loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <p>食材不存在</p>
          <Button onClick={() => navigate('/ingredients')}>返回列表</Button>
        </div>
      </div>
    );
  }

  const categoryColor = getCategoryColor(ingredient?.category || '其他');

  return (
    <div className="page-container animate-fadeIn">
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/ingredients')}
          style={{ marginBottom: 16 }}
        >
          返回食材百科
        </Button>

        <Card
          style={{ borderRadius: 20, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(139, 195, 74, 0.08)' }}
          bodyStyle={{ padding: 0 }}
        >
          <div
            style={{
              height: 200,
              background: `linear-gradient(135deg, ${categoryColor}30 0%, ${categoryColor}10 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 96,
              position: 'relative',
            }}
          >
            {getCategoryEmoji(ingredient?.category || '其他')}
            <Button
              type="text"
              shape="circle"
              size="large"
              icon={
                ingredient?.is_favorite ? (
                  <HeartFilled style={{ color: '#EF5350', fontSize: 20 }} />
                ) : (
                  <HeartOutlined style={{ color: '#fff', fontSize: 20 }} />
                )
              }
              onClick={handleToggleFavorite}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 20,
                display: 'flex',
                gap: 8,
              }}
            >
              <Tag
                color={categoryColor}
                style={{ fontSize: 13, padding: '4px 12px', borderRadius: 16 }}
              >
                {ingredient?.category}
              </Tag>
              <Tag
                color="blue"
                style={{ fontSize: 13, padding: '4px 12px', borderRadius: 16 }}
              >
                {getSeasonIcon(ingredient?.season || '四季')} {ingredient?.season}
              </Tag>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#2D3436' }}>
                  {ingredient?.name}
                </h1>
                {ingredient?.aliases && (
                  <div style={{ marginTop: 8, fontSize: 14, color: '#999' }}>
                    别名：{ingredient.aliases}
                  </div>
                )}
              </div>
              <Space>
                <Button icon={<ShoppingCartOutlined />}>加入购物清单</Button>
                <Tooltip title="添加到对比">
                  <Button icon={<BarChartOutlined />}>对比</Button>
                </Tooltip>
              </Space>
            </div>

            <div style={{ marginTop: 16, fontSize: 14, color: '#5A5A5A', lineHeight: 1.8 }}>
              {ingredient?.description}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '16px 20px',
                  background: `${COLORS.warning}10`,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>热量</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.warning }}>
                  {ingredient?.nutrition_calories}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>kcal</span>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '16px 20px',
                  background: `${COLORS.primary}10`,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>蛋白质</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary }}>
                  {ingredient?.nutrition_protein}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>g</span>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '16px 20px',
                  background: `${COLORS.amber}10`,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>碳水</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.amber }}>
                  {ingredient?.nutrition_carbs}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>g</span>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '16px 20px',
                  background: `${COLORS.error}10`,
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>脂肪</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.error }}>
                  {ingredient?.nutrition_fat}
                  <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>g</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 12px rgba(139, 195, 74, 0.06)' }}
        bodyStyle={{ padding: '8px 24px 24px' }}
      >
        <Tabs
          defaultActiveKey="nutrition"
          size="large"
          style={{ marginTop: 8 }}
          items={[
            {
              key: 'nutrition',
              label: (
                <span>
                  <BarChartOutlined /> 营养成分
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Row gutter={[24, 24]}>
                    {nutritionItems.map((item) => {
                      const max = item.max || 100;
                      const percent = Math.min((item.value / max) * 100, 100);
                      return (
                        <Col xs={12} sm={8} md={6} key={item.label}>
                          <div
                            style={{
                              padding: 16,
                              background: COLORS.backgroundAlt,
                              borderRadius: 12,
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{item.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: item.color, marginBottom: 8 }}>
                              {item.value}
                              <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>{item.unit}</span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: '#E8E8E8',
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
                                  transition: 'width 0.8s ease',
                                }}
                              />
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                  <div
                    style={{
                      marginTop: 20,
                      padding: 12,
                      background: `${COLORS.info}10`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#666',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <InfoCircleOutlined style={{ color: COLORS.info, marginTop: 2 }} />
                    <span>以上营养数据为每 100 克可食用部分的参考值，实际含量可能因品种、产地、烹饪方式等因素有所差异。</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'selection',
              label: (
                <span>
                  <ShopOutlined /> 选购与清洗
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <BulbOutlined style={{ color: COLORS.warning, fontSize: 18 }} />
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#2D3436' }}>选购小技巧</span>
                    </div>
                    {renderTipsList(ingredient?.selection_tips || '')}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <ShinkOutlined style={{ color: COLORS.teal, fontSize: 18 }} />
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#2D3436' }}>清洗处理技巧</span>
                    </div>
                    {renderTipsList(ingredient?.cleaning_tips || '')}
                  </div>
                </div>
              ),
            },
            {
              key: 'storage',
              label: (
                <span>
                  <ShrinkOutlined /> 储存方法
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  {renderTipsList(ingredient?.storage_method || '')}
                </div>
              ),
            },
            {
              key: 'pairings',
              label: (
                <span>
                  <TeamOutlined /> 搭配与相克
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                      <div
                        style={{
                          padding: 20,
                          background: `${COLORS.success}08`,
                          borderRadius: 12,
                          border: `1px solid ${COLORS.success}20`,
                          height: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: `${COLORS.success}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            ✅
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#2D3436' }}>宜搭配</span>
                        </div>
                        {pairings.length > 0 ? (
                          <div>
                            {pairings.map((pair, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '12px 0',
                                  borderBottom:
                                    index < pairings.length - 1 ? '1px dashed #E8F5E9' : 'none',
                                }}
                              >
                                <div style={{ fontWeight: 500, color: COLORS.success, marginBottom: 4 }}>
                                  {pair.name}
                                </div>
                                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                                  {pair.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#999', fontSize: 13 }}>暂无搭配数据</div>
                        )}
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div
                        style={{
                          padding: 20,
                          background: `${COLORS.error}08`,
                          borderRadius: 12,
                          border: `1px solid ${COLORS.error}20`,
                          height: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: `${COLORS.error}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >
                            ⚠️
                          </div>
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#2D3436' }}>相克食物</span>
                        </div>
                        {conflicts.length > 0 ? (
                          <div>
                            {conflicts.map((conflict, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: '12px 0',
                                  borderBottom:
                                    index < conflicts.length - 1 ? '1px dashed #FFEBEE' : 'none',
                                }}
                              >
                                <div style={{ fontWeight: 500, color: COLORS.error, marginBottom: 4 }}>
                                  {conflict.name}
                                </div>
                                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                                  {conflict.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#999', fontSize: 13 }}>暂无相克数据</div>
                        )}
                      </div>
                    </Col>
                  </Row>
                  <div
                    style={{
                      marginTop: 16,
                      padding: 12,
                      background: `${COLORS.warning}10`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#666',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <InfoCircleOutlined style={{ color: COLORS.warning, marginTop: 2 }} />
                    <span>食物相克多为传统说法，部分缺乏科学依据。正常饮食中少量食用一般不会引起不适，如有特殊健康问题请咨询专业医生或营养师。</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'cooking',
              label: (
                <span>
                  <FireOutlined /> 烹饪建议
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  {renderTipsList(ingredient?.cooking_tips || '')}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default IngredientDetail;
