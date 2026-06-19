import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Card,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  WarningOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { InventoryItem, InventoryForm } from '@/types';
import { getInventory } from '@/api/inventory';
import { getEncyclopediaByName } from '@/api/ingredientEncyclopedia';
import { getRowClassName, formatDate } from '@/utils';
import ExpireBadge from '@/components/ExpireBadge';
import { CATEGORY_COLORS } from '@/styles/theme';

const { Option } = Select;
const { TextArea } = Input;

const CATEGORIES = ['全部', '蔬菜', '水果', '肉类', '蛋类', '奶制品', '主食', '调料', '干货', '饮品', '其他'];
const STORAGE_LOCATIONS = ['冰箱冷藏', '冰箱冷冻', '储物柜', '厨房柜子', '常温', '常温阴凉处'];
const UNITS = ['克', '毫升', '个', '袋', '盒', '瓶', '根', '颗', '瓣', '勺'];

const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [modalOpen, setModalOpen] = useState(false);
  const [stockModalType, setStockModalType] = useState<'in' | 'out' | null>(null);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockForm] = Form.useForm<{ quantity: number }>();
  const [form] = Form.useForm<InventoryForm>();
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getInventory({ keyword, category });
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [keyword, category]);

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      min_quantity: 0,
      quantity: 1,
      purchase_date: dayjs().format('YYYY-MM-DD'),
      expire_date: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    } as any);
    setModalOpen(true);
  };

  const handleEdit = (record: InventoryItem) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      purchase_date: dayjs(record.purchase_date).format('YYYY-MM-DD'),
      expire_date: dayjs(record.expire_date).format('YYYY-MM-DD'),
    } as any);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setData((prev) => prev.filter((i) => i.id !== id));
    message.success('删除成功');
  };

  const handleViewEncyclopedia = async (name: string) => {
    try {
      const result = await getEncyclopediaByName(name);
      if (result) {
        navigate(`/ingredients/${result.id}`);
      } else {
        message.info('该食材暂无百科详情');
        navigate('/ingredients');
      }
    } catch {
      navigate('/ingredients');
    }
  };

  const handleSubmit = (values: InventoryForm) => {
    const submitData = {
      ...values,
      purchase_date: values.purchase_date ? dayjs(values.purchase_date as any).format('YYYY-MM-DD') : '',
      expire_date: values.expire_date ? dayjs(values.expire_date as any).format('YYYY-MM-DD') : '',
    };
    if (editingId) {
      setData((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, ...submitData } : i))
      );
      message.success('更新成功');
    } else {
      const newItem: InventoryItem = {
        id: Date.now(),
        ...submitData,
      } as InventoryItem;
      setData((prev) => [newItem, ...prev]);
      message.success('添加成功');
    }
    setModalOpen(false);
  };

  const openStockModal = (type: 'in' | 'out', item: InventoryItem) => {
    setStockModalType(type);
    setStockItem(item);
    stockForm.resetFields();
  };

  const handleStock = (values: { quantity: number }) => {
    if (!stockItem || !stockModalType) return;
    setData((prev) =>
      prev.map((i) => {
        if (i.id === stockItem.id) {
          const newQty =
            stockModalType === 'in'
              ? i.quantity + values.quantity
              : Math.max(0, i.quantity - values.quantity);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
    message.success(`${stockModalType === 'in' ? '入库' : '出库'}成功`);
    setStockModalType(null);
    setStockItem(null);
  };

  const expiringCount = data.filter((i) => dayjs(i.expire_date).diff(dayjs(), 'day') >= 0 && dayjs(i.expire_date).diff(dayjs(), 'day') <= 7).length;
  const expiredCount = data.filter((i) => dayjs(i.expire_date).diff(dayjs(), 'day') < 0).length;
  const lowStockCount = data.filter((i) => i.quantity <= i.min_quantity * 1.5).length;

  const columns: ColumnsType<InventoryItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: CATEGORY_COLORS[record.category] || '#9E9E9E',
            }}
          />
          <span
            style={{ fontWeight: 500, cursor: 'pointer', color: '#2D3436' }}
            onClick={() => handleViewEncyclopedia(text)}
          >
            {text}
          </span>
          <Tooltip title="查看百科">
            <Button
              type="text"
              size="small"
              icon={<BookOutlined />}
              style={{ color: '#8BC34A', padding: '0 4px' }}
              onClick={() => handleViewEncyclopedia(text)}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (text) => (
        <Tag
          style={{
            background: `${CATEGORY_COLORS[text] || '#9E9E9E'}15`,
            color: CATEGORY_COLORS[text] || '#9E9E9E',
            border: 'none',
          }}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: '库存',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (qty, record) => (
        <div>
          <span style={{ fontWeight: 600 }}>
            {qty} {record.unit}
          </span>
          {qty <= record.min_quantity * 1.5 && (
            <Tag color="warning" style={{ marginLeft: 6 }}>
              <WarningOutlined />
              库存低
            </Tag>
          )}
          <div style={{ fontSize: 11, color: '#A0A0A0', marginTop: 2 }}>
            最低: {record.min_quantity} {record.unit}
          </div>
        </div>
      ),
    },
    {
      title: '存放位置',
      dataIndex: 'storage_location',
      key: 'storage_location',
      width: 120,
      render: (text) => <span style={{ color: '#7A7A7A' }}>{text}</span>,
    },
    {
      title: '采购日期',
      dataIndex: 'purchase_date',
      key: 'purchase_date',
      width: 110,
      render: (text) => (
        <span style={{ color: '#7A7A7A' }}>
          <CalendarOutlined style={{ marginRight: 4 }} />
          {formatDate(text)}
        </span>
      ),
    },
    {
      title: '过期状态',
      dataIndex: 'expire_date',
      key: 'expire_date',
      width: 130,
      render: (_, record) => <ExpireBadge expireDate={record.expire_date} />,
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 120,
      ellipsis: true,
      render: (text) => (text ? <span style={{ color: '#7A7A7A' }}>{text}</span> : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<ImportOutlined />}
            onClick={() => openStockModal('in', record)}
          >
            入库
          </Button>
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={() => openStockModal('out', record)}
          >
            出库
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">🥬 食材库存</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增食材
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(139,195,74,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><ShoppingOutlined style={{ marginRight: 4, color: '#8BC34A' }} />食材总数</span>}
              value={data.length}
              valueStyle={{ color: '#8BC34A' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(255,138,101,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><WarningOutlined style={{ marginRight: 4, color: '#FF8A65' }} />7天内过期</span>}
              value={expiringCount}
              valueStyle={{ color: '#FF8A65' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(239,83,80,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><WarningOutlined style={{ marginRight: 4, color: '#EF5350' }} />已过期</span>}
              value={expiredCount}
              valueStyle={{ color: '#EF5350' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ borderRadius: 12, border: '1px solid rgba(255,213,79,0.2)' }}>
            <Statistic
              title={<span style={{ fontSize: 13 }}><WarningOutlined style={{ marginRight: 4, color: '#FFD54F' }} />库存不足</span>}
              value={lowStockCount}
              valueStyle={{ color: '#FFA000' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="filter-bar">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Input
              placeholder="搜索食材名称..."
              prefix={<SearchOutlined />}
              allowClear
              size="large"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Select
              value={category}
              onChange={setCategory}
              size="large"
              style={{ width: '100%' }}
              placeholder="选择分类"
            >
              {CATEGORIES.map((c) => (
                <Option key={c} value={c}>
                  {c === '全部' ? '所有分类' : c}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      <Card style={{ borderRadius: 16 }} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => getRowClassName(record)}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑食材' : '新增食材'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="食材名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="例如：番茄" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
                <Select placeholder="选择分类">
                  {CATEGORIES.filter((c) => c !== '全部').map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item label="数量" name="quantity" rules={[{ required: true, message: '请输入数量' }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item label="单位" name="unit" rules={[{ required: true, message: '请选择单位' }]}>
                <Select placeholder="单位">
                  {UNITS.map((u) => (
                    <Option key={u} value={u}>
                      {u}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="最低库存预警" name="min_quantity" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="采购日期" name="purchase_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="过期日期" name="expire_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="存放位置" name="storage_location" rules={[{ required: true }]}>
                <Select placeholder="选择存放位置">
                  {STORAGE_LOCATIONS.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="备注" name="notes">
                <TextArea rows={2} placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingId ? '保存' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <span>
            {stockModalType === 'in' ? <ImportOutlined style={{ color: '#8BC34A' }} /> : <ExportOutlined style={{ color: '#FF8A65' }} />}
            {' '}{stockModalType === 'in' ? '食材入库' : '食材出库'}
            {stockItem && <span style={{ marginLeft: 8, color: '#7A7A7A', fontSize: 14 }}>- {stockItem.name}</span>}
          </span>
        }
        open={!!stockModalType}
        onCancel={() => setStockModalType(null)}
        footer={null}
        width={420}
      >
        {stockItem && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(139,195,74,0.06)', borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: '#7A7A7A', marginBottom: 4 }}>当前库存</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#4A4A4A' }}>
              {stockItem.quantity} <span style={{ fontSize: 16 }}>{stockItem.unit}</span>
            </div>
          </div>
        )}
        <Form form={stockForm} layout="vertical" onFinish={handleStock}>
          <Form.Item
            label={`${stockModalType === 'in' ? '入库' : '出库'}数量`}
            name="quantity"
            rules={[
              { required: true, message: '请输入数量' },
              {
                validator: (_, value) => {
                  if (stockModalType === 'out' && stockItem && value > stockItem.quantity) {
                    return Promise.reject(new Error('出库数量不能超过库存'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} step={1} style={{ width: '100%' }} addonAfter={stockItem?.unit} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setStockModalType(null)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认{stockModalType === 'in' ? '入库' : '出库'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inventory;
