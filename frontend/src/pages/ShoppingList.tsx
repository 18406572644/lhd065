import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Checkbox,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Empty,
  Tag,
  Row,
  Col,
  Space,
  Statistic,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  DeleteFilled,
  BookOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import { ShoppingItem, Recipe } from '@/types';
import { mockGetShoppingList } from '@/api/shopping';
import { mockGetRecipes } from '@/api/recipes';
import { CATEGORY_COLORS } from '@/styles/theme';

const { Option } = Select;

const CATEGORIES = ['蔬菜', '水果', '肉类', '蛋类', '奶制品', '主食', '调料', '干货', '饮品', '其他'];
const UNITS = ['克', '毫升', '个', '袋', '盒', '瓶', '根', '颗', '瓣', '勺'];

const ShoppingList: React.FC = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = (await mockGetShoppingList()) as ShoppingItem[];
      setItems(data);
      const recData = (await mockGetRecipes()) as Recipe[];
      setRecipes(recData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  };

  const deleteItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    message.success('删除成功');
  };

  const clearChecked = () => {
    setItems((prev) => prev.filter((i) => !i.checked));
    message.success('已清除已完成项');
  };

  const handleSubmit = (values: any) => {
    const newItem: ShoppingItem = {
      id: Date.now(),
      ...values,
      checked: false,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    message.success('添加成功');
    setModalOpen(false);
  };

  const generateFromRecipes = () => {
    if (selectedRecipeIds.length === 0) {
      message.warning('请至少选择一个食谱');
      return;
    }
    const selectedRecipes = recipes.filter((r) => selectedRecipeIds.includes(r.id));
    const newItems: ShoppingItem[] = [];
    selectedRecipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing, idx) => {
        newItems.push({
          id: Date.now() + idx + Math.floor(Math.random() * 1000),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: '其他',
          checked: false,
          source_recipe_id: recipe.id,
          source_recipe_name: recipe.name,
          created_at: new Date().toISOString(),
        });
      });
    });
    setItems((prev) => [...newItems, ...prev]);
    message.success(`已根据食谱生成 ${newItems.length} 项购物清单`);
    setSelectedRecipeIds([]);
    setRecipeModalOpen(false);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const uncheckedCount = items.length - checkedCount;
  const totalItems = items.length;

  const groupedItems = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">🛒 购物清单</h1>
        <Space>
          <Button icon={<BookOutlined />} onClick={() => setRecipeModalOpen(true)}>
            根据食谱生成
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            添加项目
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8} sm={8}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(139,195,74,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><ShoppingCartOutlined style={{ color: '#8BC34A' }} /> 总计</span>}
              value={totalItems}
              valueStyle={{ color: '#8BC34A' }}
              suffix="项"
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(255,138,101,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><CheckSquareOutlined style={{ color: '#FF8A65' }} /> 待购买</span>}
              value={uncheckedCount}
              valueStyle={{ color: '#FF8A65' }}
              suffix="项"
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(102,187,106,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><CheckCircleOutlined style={{ color: '#66BB6A' }} /> 已完成</span>}
              value={checkedCount}
              valueStyle={{ color: '#66BB6A' }}
              suffix="项"
            />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <Empty description="加载中..." />
      ) : items.length > 0 ? (
        <div>
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <Card
              key={category}
              style={{ borderRadius: 16, marginBottom: 16 }}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: CATEGORY_COLORS[category] || '#9E9E9E',
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{category}</span>
                  <Tag style={{ margin: 0 }}>
                    {categoryItems.filter((i) => i.checked).length}/{categoryItems.length}
                  </Tag>
                </div>
              }
            >
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`shopping-item ${item.checked ? 'checked' : ''}`}
                >
                  <Checkbox
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="shopping-name">
                    {item.name}
                    {item.source_recipe_name && (
                      <Tag
                        style={{ marginLeft: 8, fontSize: 11 }}
                        color="purple"
                      >
                        <BookOutlined /> {item.source_recipe_name}
                      </Tag>
                    )}
                  </span>
                  <span className="shopping-quantity">
                    {item.quantity} {item.unit}
                  </span>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteItem(item.id)}
                  />
                </div>
              ))}
            </Card>
          ))}
          {checkedCount > 0 && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button danger icon={<DeleteFilled />} onClick={clearChecked}>
                清除已完成 ({checkedCount})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="#BCAAA4" strokeWidth="1.5" width="120" height="120">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <div className="empty-state-text">购物清单还是空的</div>
          <div className="empty-state-hint">试试"根据食谱生成"功能快速创建清单吧</div>
          <div style={{ marginTop: 20 }}>
            <Space>
              <Button type="primary" icon={<BookOutlined />} onClick={() => setRecipeModalOpen(true)}>
                根据食谱生成
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                手动添加
              </Button>
            </Space>
          </div>
        </div>
      )}

      <Modal
        title={<span><PlusOutlined style={{ color: '#8BC34A' }} /> 添加购物项</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="食材名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：番茄" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="数量" name="quantity" rules={[{ required: true, message: '请输入数量' }]}>
                <InputNumber min={0.1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="单位" name="unit" rules={[{ required: true, message: '请选择单位' }]}>
                <Select placeholder="选择单位">
                  {UNITS.map((u) => (
                    <Option key={u} value={u}>
                      {u}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="选择分类">
              {CATEGORIES.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span><BookOutlined style={{ color: '#8BC34A' }} /> 根据食谱生成购物清单</span>}
        open={recipeModalOpen}
        onCancel={() => {
          setRecipeModalOpen(false);
          setSelectedRecipeIds([]);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setRecipeModalOpen(false);
            setSelectedRecipeIds([]);
          }}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={generateFromRecipes}>
            生成清单
          </Button>,
        ]}
        width={560}
      >
        <div style={{ marginBottom: 12, color: '#7A7A7A' }}>
          选择一个或多个食谱，系统将自动提取所需食材
        </div>
        <div
          style={{
            maxHeight: 400,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {recipes.map((recipe) => {
            const checked = selectedRecipeIds.includes(recipe.id);
            return (
              <div
                key={recipe.id}
                onClick={() => {
                  if (checked) {
                    setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipe.id));
                  } else {
                    setSelectedRecipeIds((prev) => [...prev, recipe.id]);
                  }
                }}
                style={{
                  padding: 12,
                  border: `2px solid ${checked ? '#8BC34A' : '#F0EBE0'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: checked ? 'rgba(139, 195, 74, 0.06)' : '#FFFFFF',
                  transition: 'all 0.2s',
                }}
              >
                <Checkbox checked={checked} onChange={() => {}} onClick={(e) => e.stopPropagation()} />
                <div style={{ fontSize: 28 }}>🍳</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{recipe.name}</div>
                  <div style={{ fontSize: 12, color: '#7A7A7A' }}>
                    {recipe.ingredients.length} 种食材 · {recipe.servings}人份
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {selectedRecipeIds.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Tag color="green">已选 {selectedRecipeIds.length} 个食谱</Tag>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ShoppingList;
