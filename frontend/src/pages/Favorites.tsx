import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Empty,
  Spin,
  message,
  Input,
  Select,
  Space,
  Rate,
  Tooltip,
  Modal,
  Descriptions,
  Divider,
  List,
} from 'antd';
import {
  SearchOutlined,
  HeartFilled,
  EyeOutlined,
  ClockCircleOutlined,
  FireOutlined,
  StarOutlined,
  UserOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types';
import { getFavoriteRecipes, toggleFavorite } from '../api/recipes';
import { getDifficultyText, getDifficultyColor, getCategoryIcon } from '../utils';
import { COLORS, CATEGORY_COLORS } from '../styles/theme';
import NutritionCard from '../components/NutritionCard';

const { Search } = Input;
const { Option } = Select;
const { Meta } = Card;

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [detailModal, setDetailModal] = useState<Recipe | null>(null);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await getFavoriteRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('获取收藏食谱失败:', error);
      message.error('获取收藏食谱失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const filteredRecipes = recipes.filter((recipe) => {
    const matchSearch =
      !searchText ||
      recipe.name.toLowerCase().includes(searchText.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = !categoryFilter || recipe.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleViewDetail = (recipe: Recipe) => {
    navigate(`/recipes/${recipe.id}`);
  };

  const handleToggleFavorite = async (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(recipe.id, false);
      message.success(`已取消收藏「${recipe.name}」`);
      fetchFavorites();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const categories = Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)));

  return (
    <div className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: '#2D3436',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <HeartFilled style={{ color: '#FF6B6B', fontSize: 32 }} />
            我的收藏
            <Tag
              color="#FF6B6B"
              style={{ fontSize: 14, padding: '4px 12px', borderRadius: 12 }}
            >
              {recipes.length} 道菜谱
            </Tag>
          </h2>
          <p style={{ margin: '8px 0 0', color: '#636E72', fontSize: 14 }}>
            收藏你喜欢的美食，随时查看烹饪
          </p>
        </div>
      </div>

      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid rgba(139, 195, 74, 0.15)',
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Space wrap size="middle" style={{ width: '100%' }}>
          <Search
            placeholder="搜索食谱名称或描述..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 320 }}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            size="large"
            style={{ width: 180 }}
            prefix={<FilterOutlined />}
            onChange={setCategoryFilter}
          >
            {categories.map((cat) => (
              <Option key={cat} value={cat}>
                {getCategoryIcon(cat)} {cat}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Spin spinning={loading} size="large">
        {filteredRecipes.length === 0 ? (
          <Card
            style={{
              borderRadius: 20,
              textAlign: 'center',
              padding: '60px 20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#636E72' }}>
                  {searchText || categoryFilter
                    ? '没有找到匹配的收藏食谱'
                    : '还没有收藏任何食谱哦~'}
                </span>
              }
            >
              <Button type="primary" size="large" onClick={() => navigate('/recipes')}>
                去发现美食
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {filteredRecipes.map((recipe) => (
              <Col xs={24} sm={12} md={8} lg={6} key={recipe.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(139, 195, 74, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                  bodyStyle={{ padding: 0 }}
                  onClick={() => handleViewDetail(recipe)}
                  className="recipe-card"
                >
                  <div
                    style={{
                      height: 160,
                      background: `linear-gradient(135deg, ${
                        CATEGORY_COLORS[recipe.category as keyof typeof CATEGORY_COLORS] ||
                        COLORS.primary
                      }30 0%, ${COLORS.background} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 72,
                      position: 'relative',
                    }}
                  >
                    {getCategoryIcon(recipe.category)}
                    <Tooltip title="取消收藏">
                      <Button
                        type="text"
                        danger
                        icon={<HeartFilled style={{ fontSize: 20 }} />}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        onClick={(e) => handleToggleFavorite(recipe, e)}
                      />
                    </Tooltip>
                    <Tag
                      color={
                        CATEGORY_COLORS[recipe.category as keyof typeof CATEGORY_COLORS] ||
                        COLORS.primary
                      }
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        borderRadius: 12,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {getCategoryIcon(recipe.category)} {recipe.category}
                    </Tag>
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3
                      style={{
                        margin: '0 0 8px',
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#2D3436',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {recipe.name}
                    </h3>
                    <p
                      style={{
                        margin: '0 0 12px',
                        color: '#636E72',
                        fontSize: 13,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: 38,
                      }}
                    >
                      {recipe.description || '暂无描述'}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <Space size={8} wrap>
                        <Tag
                          color={getDifficultyColor(recipe.difficulty)}
                          style={{ borderRadius: 8, margin: 0 }}
                        >
                          {getDifficultyText(recipe.difficulty)}
                        </Tag>
                        <Tag icon={<ClockCircleOutlined />} color="blue" style={{ borderRadius: 8, margin: 0 }}>
                          {recipe.total_time || 30}分钟
                        </Tag>
                      </Space>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FireOutlined style={{ color: COLORS.warning }} />
                        <span style={{ fontSize: 13, color: '#636E72', fontWeight: 500 }}>
                          {recipe.nutrition?.calories || 0}
                          <span style={{ fontSize: 11 }}>kcal</span>
                        </span>
                      </div>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<EyeOutlined />}
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          height: 36,
                          background: COLORS.primary,
                          borderColor: COLORS.primary,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(recipe);
                        }}
                      >
                        查看详情
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        icon={<HeartFilled />}
                        danger
                        style={{ borderRadius: 10, width: 44, height: 36 }}
                        onClick={(e) => handleToggleFavorite(recipe, e)}
                      />
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeartFilled style={{ color: '#FF6B6B', fontSize: 24 }} />
            <span style={{ fontSize: 20, fontWeight: 600 }}>{detailModal?.name}</span>
          </div>
        }
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(null)} style={{ borderRadius: 10 }}>
            关闭
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => {
              detailModal && navigate(`/recipes/${detailModal.id}`);
              setDetailModal(null);
            }}
            style={{
              borderRadius: 10,
              background: COLORS.primary,
              borderColor: COLORS.primary,
            }}
          >
            查看完整详情
          </Button>,
        ]}
        width={720}
      >
        {detailModal && (
          <div>
            <div
              style={{
                height: 200,
                background: `linear-gradient(135deg, ${
                  CATEGORY_COLORS[detailModal.category as keyof typeof CATEGORY_COLORS] ||
                  COLORS.primary
                }30 0%, ${COLORS.background} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 96,
                borderRadius: 16,
                marginBottom: 20,
              }}
            >
              {getCategoryIcon(detailModal.category)}
            </div>

            <Descriptions
              bordered
              column={2}
              size="small"
              style={{ marginBottom: 20 }}
              labelStyle={{
                background: COLORS.background,
                fontWeight: 600,
                width: 120,
              }}
            >
              <Descriptions.Item label="分类">{detailModal.category}</Descriptions.Item>
              <Descriptions.Item label="难度">
                <Tag color={getDifficultyColor(detailModal.difficulty)}>
                  {getDifficultyText(detailModal.difficulty)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总时长">
                <ClockCircleOutlined /> {detailModal.total_time || 30} 分钟
              </Descriptions.Item>
              <Descriptions.Item label="份量">
                <UserOutlined /> {detailModal.servings || 2} 人份
              </Descriptions.Item>
              <Descriptions.Item label="评分" span={2}>
                <Rate
                  disabled
                  value={detailModal.rating || 4.5}
                  style={{ fontSize: 16, color: '#FFD93D' }}
                />
                <span style={{ marginLeft: 12, color: '#636E72' }}>
                  {detailModal.cook_count || 0} 人烹饪过
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {detailModal.description || '暂无描述'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" orientationMargin={0}>
              <StarOutlined style={{ color: COLORS.primary }} /> 营养成分
            </Divider>
            <NutritionCard nutrition={detailModal.nutrition} compact />

            <Divider orientation="left" orientationMargin={0} style={{ marginTop: 24 }}>
              🥗 所需食材
            </Divider>
            <List
              size="small"
              dataSource={detailModal.ingredients}
              renderItem={(item) => (
                <List.Item>
                  <span>🥬 {item.name}</span>
                  <Tag color={COLORS.primary}>
                    {item.amount} {item.unit}
                  </Tag>
                </List.Item>
              )}
              style={{
                background: COLORS.background,
                borderRadius: 12,
                padding: '12px 16px',
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Favorites;
