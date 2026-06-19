import React, { useEffect, useState } from 'react';
import {
  Input,
  Select,
  Button,
  Tag,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  Empty,
  Space,
  message,
  Popconfirm,
  Dropdown,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  MinusOutlined,
  EditOutlined,
  HeartOutlined,
  HeartFilled,
  ImportOutlined,
  ExportOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Recipe, RecipeForm, RecipeIngredient, RecipeStep } from '@/types';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, toggleFavorite } from '@/api/recipes';
import { formatDuration, getCategoryIcon, getDifficultyText, getDifficultyColor } from '@/utils';
import ImageUploader from '@/components/ImageUploader';
import ImageCarousel from '@/components/ImageCarousel';
import RecipeImportExport from '@/components/RecipeImportExport';

const { Option } = Select;
const { TextArea } = Input;

const CATEGORIES = ['全部', '家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '饮品', '烘焙'];
const DIFFICULTIES = ['全部', 'easy', 'medium', 'hard'];
const UNITS = ['克', '毫升', '个', '勺', '片', '块', '根', '颗', '瓣', '适量'];

const Recipes: React.FC = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [difficulty, setDifficulty] = useState('全部');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm<RecipeForm>();
  const [importExportOpen, setImportExportOpen] = useState(false);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await getRecipes({ keyword, category, difficulty });
      setRecipes(data);
    } catch (error) {
      message.error('加载食谱失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [keyword, category, difficulty]);

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      difficulty: 'easy',
      cook_time: 30,
      servings: 2,
      ingredients: [{ name: '', quantity: 1, unit: '克' }],
      steps: [{ order: 1, description: '', duration_minutes: 5 }],
      nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 },
      images: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    form.setFieldsValue({
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      difficulty: recipe.difficulty,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', quantity: 1, unit: '克' }],
      steps: recipe.steps.length > 0 ? recipe.steps : [{ order: 1, description: '', duration_minutes: 5 }],
      nutrition: recipe.nutrition,
      images: recipe.images || [],
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const updated = await toggleFavorite(id);
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: updated.is_favorite } : r))
      );
    } catch {
      message.error('操作失败');
    }
  };

  const handleSubmit = async (values: RecipeForm) => {
    try {
      if (editingId) {
        await updateRecipe(editingId, values);
        message.success('食谱更新成功');
      } else {
        await createRecipe(values);
        message.success('食谱创建成功');
      }
      setModalOpen(false);
      loadRecipes();
    } catch {
      message.error(editingId ? '更新失败' : '创建失败');
    }
  };

  const importExportMenuItems = [
    {
      key: 'import',
      icon: <ImportOutlined />,
      label: '批量导入',
      onClick: () => setImportExportOpen(true),
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: '导出食谱',
      onClick: () => {
        setImportExportOpen(true);
      },
    },
  ];

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">📖 食谱库</h1>
        <Space>
          <Dropdown menu={{ items: importExportMenuItems }}>
            <Button icon={<DownOutlined />}>
              <ImportOutlined /> 导入 / 导出
            </Button>
          </Dropdown>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建食谱
          </Button>
        </Space>
      </div>

      <div className="filter-bar">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="搜索食谱名称或描述..."
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
              {CATEGORIES.map((c) => (
                <Option key={c} value={c}>
                  {c === '全部' ? '所有分类' : c}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={7}>
            <Select
              value={difficulty}
              onChange={setDifficulty}
              size="large"
              style={{ width: '100%' }}
            >
              {DIFFICULTIES.map((d) => (
                <Option key={d} value={d}>
                  {d === '全部' ? '所有难度' : getDifficultyText(d)}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {loading ? (
        <Empty description="加载中..." />
      ) : recipes.length > 0 ? (
        <div className="recipes-grid">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div className="recipe-card-image">
                <ImageCarousel
                  images={recipe.images || []}
                  fallbackIcon={<span style={{ fontSize: 48 }}>{getCategoryIcon(recipe.category)}</span>}
                  height={180}
                />
                <Button
                  className="favorite-btn"
                  type="text"
                  shape="circle"
                  icon={
                    recipe.is_favorite ? (
                      <HeartFilled style={{ color: '#EF5350' }} />
                    ) : (
                      <HeartOutlined style={{ color: '#FFFFFF' }} />
                    )
                  }
                  onClick={(e) => handleToggleFavorite(e, recipe.id)}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(4px)',
                  }}
                />
              </div>
              <div className="recipe-card-body">
                <div className="recipe-card-title">{recipe.name}</div>
                <div style={{ fontSize: 13, color: '#7A7A7A', marginBottom: 8, minHeight: 36 }}>
                  {recipe.description}
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 4 }}>
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(recipe);
                    }}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定删除这个食谱？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDelete(recipe.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          description="没有找到匹配的食谱"
          style={{ marginTop: 64 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建第一个食谱
          </Button>
        </Empty>
      )}

      <Modal
        title={editingId ? '编辑食谱' : '创建新食谱'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            difficulty: 'easy',
            cook_time: 30,
            servings: 2,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="食谱名称"
                name="name"
                rules={[{ required: true, message: '请输入食谱名称' }]}
              >
                <Input placeholder="例如：番茄炒蛋" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  {CATEGORIES.filter((c) => c !== '全部').map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <TextArea rows={2} placeholder="简短描述这道菜的特点" />
          </Form.Item>

          <Form.Item
            label="食谱图片"
            name="images"
          >
            <ImageUploader maxCount={9} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Form.Item
                label="难度"
                name="difficulty"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="easy">简单</Option>
                  <Option value="medium">中等</Option>
                  <Option value="hard">困难</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item
                label="烹饪时间（分钟）"
                name="cook_time"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="份量（人份）"
                name="servings"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="食材清单"
            required
          >
            <Form.List name="ingredients">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="ingredient-row">
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '食材名' }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="食材名" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '数量' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} step={0.1} style={{ width: '100%' }} placeholder="数量" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'unit']}
                        rules={[{ required: true, message: '单位' }]}
                        style={{ margin: 0 }}
                      >
                        <Select placeholder="单位">
                          {UNITS.map((u) => (
                            <Option key={u} value={u}>
                              {u}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length === 1}
                      />
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ name: '', quantity: 1, unit: '克' })}>
                    添加食材
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            label="烹饪步骤"
            required
          >
            <Form.List name="steps">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div key={key} className="step-row">
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8BC34A, #689F38)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        {index + 1}
                      </div>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: '步骤描述' }]}
                        style={{ margin: 0 }}
                      >
                        <TextArea rows={2} placeholder="描述这个步骤..." />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'duration_minutes']}
                        rules={[{ required: true, message: '分钟' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} addonAfter="分钟" style={{ width: '100%' }} />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<MinusOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length === 1}
                      />
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ order: fields.length + 1, description: '', duration_minutes: 5 })}>
                    添加步骤
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          <div style={{ fontSize: 14, fontWeight: 500, color: '#5A5A5A', marginBottom: 12 }}>
            营养成分（每份）
          </div>
          <Row gutter={16}>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'calories']} label="热量 (kcal)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'protein']} label="蛋白质 (g)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'fat']} label="脂肪 (g)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'carbs']} label="碳水 (g)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'fiber']} label="纤维 (g)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name={['nutrition', 'sugar']} label="糖分 (g)">
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingId ? '保存修改' : '创建食谱'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <RecipeImportExport
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        onSuccess={() => loadRecipes()}
      />
    </div>
  );
};

export default Recipes;
