import React, { useEffect, useState, useCallback } from 'react';
import {
  Input,
  Select,
  Button,
  Tag,
  Modal,
  Form,
  DatePicker,
  Row,
  Col,
  Empty,
  Space,
  message,
  Popconfirm,
  Card,
  Badge,
  Descriptions,
  Table,
  InputNumber,
  Tooltip,
  Divider,
  List,
  Image as AntImage,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  BellOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  KitchenEquipment,
  KitchenEquipmentForm,
  EquipmentMaintenanceLog,
  EquipmentMaintenanceLogForm,
  EquipmentReminder,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_ICONS,
  MAINTENANCE_LOG_TYPES,
} from '@/types';
import {
  getEquipmentList,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  incrementUsage,
  getMaintenanceLogs,
  createMaintenanceLog,
  checkReminders,
  dismissReminder,
} from '@/api/kitchenEquipment';
import ImageUploader from '@/components/ImageUploader';
import { getLogTypeLabel, getLogTypeColor, getReminderTypeText } from '@/utils';

const { Option } = Select;
const { TextArea } = Input;

const getMaintenanceStatus = (equipment: KitchenEquipment) => {
  const now = dayjs();
  const warnings: { type: string; text: string; color: string }[] = [];

  if (equipment.category === '空气炸锅' && equipment.total_usage_count > 0) {
    const usesSinceClean = equipment.last_cleaned_date
      ? equipment.total_usage_count - Math.floor(equipment.total_usage_count / 50) * 50
      : equipment.total_usage_count;
    if (usesSinceClean >= 40) {
      warnings.push({
        type: 'clean',
        text: `已使用 ${usesSinceClean} 次，建议清洁`,
        color: usesSinceClean >= 50 ? 'red' : 'orange',
      });
    }
  }

  if (equipment.warranty_expiry) {
    const daysLeft = dayjs(equipment.warranty_expiry).diff(now, 'day');
    if (daysLeft <= 30 && daysLeft >= 0) {
      warnings.push({
        type: 'warranty',
        text: `保修还有 ${daysLeft} 天到期`,
        color: daysLeft <= 7 ? 'orange' : 'blue',
      });
    } else if (daysLeft < 0) {
      warnings.push({
        type: 'warranty',
        text: `保修期已过 ${Math.abs(daysLeft)} 天`,
        color: 'default',
      });
    }
  }

  if (equipment.filter_replace_date) {
    const daysLeft = dayjs(equipment.filter_replace_date).diff(now, 'day');
    if (daysLeft <= 30) {
      warnings.push({
        type: 'filter',
        text: daysLeft >= 0 ? `滤芯还有 ${daysLeft} 天需更换` : `滤芯已超期 ${Math.abs(daysLeft)} 天`,
        color: daysLeft <= 7 ? 'red' : 'orange',
      });
    }
  }

  if (equipment.next_inspection_date) {
    const daysLeft = dayjs(equipment.next_inspection_date).diff(now, 'day');
    if (daysLeft <= 30) {
      warnings.push({
        type: 'inspection',
        text: daysLeft >= 0 ? `年检还有 ${daysLeft} 天` : `年检已超期 ${Math.abs(daysLeft)} 天`,
        color: daysLeft <= 7 ? 'red' : 'orange',
      });
    }
  }

  return warnings;
};

const KitchenEquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<KitchenEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm<KitchenEquipmentForm>();
  const [selectedEquipment, setSelectedEquipment] = useState<KitchenEquipment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [logs, setLogs] = useState<EquipmentMaintenanceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logForm] = Form.useForm<EquipmentMaintenanceLogForm>();
  const [reminders, setReminders] = useState<EquipmentReminder[]>([]);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEquipmentList({
        search: keyword || undefined,
        category: category !== '全部' ? category : undefined,
      });
      setEquipment(data);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, category]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const loadReminders = useCallback(async () => {
    setReminderLoading(true);
    try {
      const result = await checkReminders();
      setReminders(result.reminders);
    } catch (error) {
      console.error('加载提醒失败:', error);
    } finally {
      setReminderLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const loadLogs = async (equipmentId: number) => {
    setLogsLoading(true);
    try {
      const data = await getMaintenanceLogs(equipmentId);
      setLogs(data);
    } catch (error) {
      message.error('加载维护日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      category: '其他',
      manual_images: [],
      notes: '',
      brand: '',
      model: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (eq: KitchenEquipment) => {
    setEditingId(eq.id);
    form.setFieldsValue({
      name: eq.name,
      brand: eq.brand,
      model: eq.model,
      category: eq.category,
      purchase_date: eq.purchase_date ? dayjs(eq.purchase_date) : undefined,
      warranty_expiry: eq.warranty_expiry ? dayjs(eq.warranty_expiry) : undefined,
      manual_images: eq.manual_images,
      notes: eq.notes,
      filter_replace_date: eq.filter_replace_date ? dayjs(eq.filter_replace_date) : undefined,
      next_inspection_date: eq.next_inspection_date ? dayjs(eq.next_inspection_date) : undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEquipment(id);
      setEquipment((prev) => prev.filter((e) => e.id !== id));
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: KitchenEquipmentForm) => {
    try {
      const payload = {
        ...values,
        purchase_date: (values.purchase_date as unknown as Dayjs)?.format('YYYY-MM-DD') || '',
        warranty_expiry: (values.warranty_expiry as unknown as Dayjs)?.format('YYYY-MM-DD') || '',
        filter_replace_date: (values.filter_replace_date as unknown as Dayjs)?.format('YYYY-MM-DD') || '',
        next_inspection_date: (values.next_inspection_date as unknown as Dayjs)?.format('YYYY-MM-DD') || '',
      };

      if (editingId) {
        await updateEquipment(editingId, payload);
        message.success('设备更新成功');
      } else {
        await createEquipment(payload);
        message.success('设备创建成功');
      }
      setModalOpen(false);
      loadEquipment();
      loadReminders();
    } catch (error) {
      message.error(editingId ? '更新失败' : '创建失败');
    }
  };

  const handleIncrementUsage = async (eq: KitchenEquipment) => {
    try {
      const updated = await incrementUsage(eq.id);
      setEquipment((prev) => prev.map((e) => (e.id === eq.id ? updated : e)));
      message.success(`已记录使用，当前累计 ${updated.total_usage_count} 次`);
      loadReminders();
    } catch {
      message.error('记录失败');
    }
  };

  const handleViewDetail = async (eq: KitchenEquipment) => {
    setSelectedEquipment(eq);
    setDetailModalOpen(true);
    await loadLogs(eq.id);
  };

  const handleAddLog = (eq: KitchenEquipment) => {
    setSelectedEquipment(eq);
    logForm.resetFields();
    logForm.setFieldsValue({
      log_type: 'cleaning',
      maintenance_date: dayjs(),
      cost: 0,
      images: [],
      description: '',
    });
    setLogModalOpen(true);
  };

  const handleSubmitLog = async (values: EquipmentMaintenanceLogForm) => {
    if (!selectedEquipment) return;
    try {
      const payload = {
        ...values,
        maintenance_date: (values.maintenance_date as unknown as Dayjs).format('YYYY-MM-DD'),
      };
      await createMaintenanceLog(selectedEquipment.id, payload);
      message.success('维护记录创建成功');
      setLogModalOpen(false);
      await loadLogs(selectedEquipment.id);
      await loadEquipment();
      await loadReminders();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDismissReminder = async (id: number) => {
    try {
      await dismissReminder(id);
      message.success('已忽略提醒');
      setReminders((prev) => prev.filter((r) => r.id !== id));
      loadReminders();
    } catch {
      message.error('操作失败');
    }
  };

  const triggeredReminders = reminders.filter((r) => r.is_triggered && !r.is_dismissed);

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">🔧 厨房设备管理</h1>
        <Space>
          <Button
            icon={<BellOutlined />}
            onClick={() => setReminderModalOpen(true)}
          >
            设备提醒
            {triggeredReminders.length > 0 && (
              <Badge
                count={triggeredReminders.length}
                size="small"
                style={{ marginLeft: 8 }}
              />
            )}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加设备
          </Button>
        </Space>
      </div>

      {triggeredReminders.length > 0 && (
        <Card
          style={{ marginBottom: 20, borderColor: '#faad14', background: '#fffbe6' }}
          bodyStyle={{ padding: '12px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ExclamationCircleOutlined style={{ fontSize: 20, color: '#faad14' }} />
            <span style={{ fontWeight: 600, color: '#d48806' }}>
              有 {triggeredReminders.length} 条设备提醒待处理：
            </span>
            <Space size={[8, 8]} wrap>
              {triggeredReminders.slice(0, 3).map((r) => (
                <Tag key={r.id} color="orange" style={{ margin: 0 }}>
                  {r.title}
                </Tag>
              ))}
            </Space>
            <Button
              size="small"
              type="link"
              onClick={() => setReminderModalOpen(true)}
            >
              查看全部 →
            </Button>
          </div>
        </Card>
      )}

      <div className="filter-bar">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Input
              placeholder="搜索设备名称、品牌或型号..."
              prefix={<SearchOutlined />}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} sm={12}>
            <Select
              value={category}
              onChange={setCategory}
              size="large"
              style={{ width: '100%' }}
            >
              <Option value="全部">所有分类</Option>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <Option key={c} value={c}>
                  {EQUIPMENT_ICONS[c]} {c}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {loading ? (
        <Empty description="加载中..." />
      ) : equipment.length > 0 ? (
        <Row gutter={[16, 16]}>
          {equipment.map((eq) => {
            const warnings = getMaintenanceStatus(eq);
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={eq.id}>
                <Card
                  hoverable
                  onClick={() => handleViewDetail(eq)}
                  className="equipment-card"
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  <div
                    style={{
                      padding: '20px 20px 16px',
                      background: 'linear-gradient(135deg, rgba(139,195,74,0.12) 0%, rgba(255,193,7,0.12) 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 28,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          flexShrink: 0,
                        }}
                      >
                        {EQUIPMENT_ICONS[eq.category] || '🔧'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: '#2D3436',
                            marginBottom: 4,
                          }}
                        >
                          {eq.name}
                        </div>
                        <Tag
                          color="green"
                          style={{ margin: 0, borderRadius: 8 }}
                        >
                          {eq.category}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px 20px 16px' }}>
                    {eq.brand || eq.model ? (
                      <div
                        style={{
                          fontSize: 13,
                          color: '#636E72',
                          marginBottom: 10,
                        }}
                      >
                        {eq.brand && <span>{eq.brand}</span>}
                        {eq.brand && eq.model && <span style={{ margin: '0 6px' }}>·</span>}
                        {eq.model && <span>{eq.model}</span>}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        marginBottom: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Tooltip title="累计使用次数">
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: '#636E72',
                          }}
                        >
                          <ThunderboltOutlined style={{ color: '#FF9800' }} />
                          {eq.total_usage_count} 次
                        </span>
                      </Tooltip>
                      {eq.purchase_date && (
                        <Tooltip title="购买日期">
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              color: '#636E72',
                            }}
                          >
                            <CalendarOutlined />
                            {eq.purchase_date}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {warnings.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {warnings.map((w, i) => (
                          <Tag key={i} color={w.color as any} style={{ margin: '0 4px 4px 0' }}>
                            ⚠️ {w.text}
                          </Tag>
                        ))}
                      </div>
                    )}

                    <Space size={[4, 4]} wrap>
                      <Button
                        size="small"
                        type="text"
                        icon={<ThunderboltOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIncrementUsage(eq);
                        }}
                      >
                        记录使用
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<ToolOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddLog(eq);
                        }}
                      >
                        维护
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(eq);
                        }}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确定删除这个设备？"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDelete(eq.id);
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
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Empty
          description="还没有添加厨房设备"
          style={{ marginTop: 64 }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加第一个设备
          </Button>
        </Empty>
      )}

      <Modal
        title={editingId ? '编辑设备' : '添加新设备'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ category: '其他' }}
        >
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="设备名称"
                name="name"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="例如：美的空气炸锅" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="品牌"
                name="brand"
              >
                <Input placeholder="例如：美的" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="型号"
                name="model"
              >
                <Input placeholder="例如：MF-KZ42E101" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="设备分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择设备分类">
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <Option key={c} value={c}>
                      {EQUIPMENT_ICONS[c]} {c}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="购买日期" name="purchase_date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="保修到期日" name="warranty_expiry">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <span>
                    滤芯更换日期 <span style={{ color: '#999' }}>(净水器)</span>
                  </span>
                }
                name="filter_replace_date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <span>
                    下次年检日期 <span style={{ color: '#999' }}>(高压锅)</span>
                  </span>
                }
                name="next_inspection_date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}></Col>
          </Row>

          <Form.Item label="说明书照片" name="manual_images">
            <ImageUploader maxCount={9} />
          </Form.Item>

          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="设备相关的其他信息..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 16, marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingId ? '保存修改' : '添加设备'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedEquipment ? `${selectedEquipment.name} - 设备详情` : '设备详情'}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={900}
        footer={[
          <Button
            key="log"
            icon={<ToolOutlined />}
            onClick={() => selectedEquipment && handleAddLog(selectedEquipment)}
          >
            添加维护记录
          </Button>,
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        destroyOnClose
      >
        {selectedEquipment && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(139,195,74,0.15), rgba(255,193,7,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                }}
              >
                {EQUIPMENT_ICONS[selectedEquipment.category] || '🔧'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, color: '#2D3436' }}>
                  {selectedEquipment.name}
                </h2>
                <div style={{ marginTop: 6 }}>
                  <Tag color="green">{selectedEquipment.category}</Tag>
                  {selectedEquipment.brand && (
                    <Tag color="blue">{selectedEquipment.brand}</Tag>
                  )}
                  {selectedEquipment.model && (
                    <Tag color="purple">{selectedEquipment.model}</Tag>
                  )}
                </div>
              </div>
            </div>

            <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="购买日期">
                {selectedEquipment.purchase_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="保修到期">
                {selectedEquipment.warranty_expiry || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="累计使用">
                <Badge
                  count={`${selectedEquipment.total_usage_count} 次`}
                  showZero
                  style={{ backgroundColor: '#8BC34A' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="上次清洁">
                {selectedEquipment.last_cleaned_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上次保养">
                {selectedEquipment.last_maintenance_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="滤芯更换">
                {selectedEquipment.filter_replace_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下次年检">
                {selectedEquipment.next_inspection_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedEquipment.created_at || '-'}
              </Descriptions.Item>
              {selectedEquipment.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {selectedEquipment.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedEquipment.manual_images && selectedEquipment.manual_images.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
                  <FileTextOutlined /> 说明书照片
                </Divider>
                <Row gutter={[8, 8]}>
                  {selectedEquipment.manual_images.map((img, i) => (
                    <Col xs={8} sm={6} key={i}>
                      <AntImage
                        src={img}
                        width="100%"
                        height={100}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
              <ToolOutlined /> 维护日志
            </Divider>
            {logsLoading ? (
              <Empty description="加载中..." />
            ) : logs.length > 0 ? (
              <List
                dataSource={logs}
                renderItem={(log) => {
                  const logType = MAINTENANCE_LOG_TYPES.find((t) => t.value === log.log_type);
                  return (
                    <List.Item key={log.id}>
                      <List.Item.Meta
                        avatar={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `var(--ant-color-${logType?.color || 'default'}-1, #f0f0f0)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ToolOutlined
                              style={{
                                color: `var(--ant-color-${logType?.color || 'default'}-5, #666)`,
                              }}
                            />
                          </div>
                        }
                        title={
                          <Space>
                            <Tag color={logType?.color as any}>{logType?.label || log.log_type}</Tag>
                            <strong>{log.title}</strong>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {log.maintenance_date}
                            </span>
                            {log.cost > 0 && (
                              <Tag color="gold">¥{log.cost}</Tag>
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            {log.description && (
                              <div style={{ marginBottom: 8, color: '#636E72' }}>
                                {log.description}
                              </div>
                            )}
                            {log.images && log.images.length > 0 && (
                              <Row gutter={[6, 6]}>
                                {log.images.map((img, i) => (
                                  <Col xs={6} sm={4} key={i}>
                                    <AntImage
                                      src={img}
                                      width="100%"
                                      height={60}
                                      style={{
                                        objectFit: 'cover',
                                        borderRadius: 6,
                                      }}
                                    />
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="暂无维护记录" style={{ padding: '24px 0' }} />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={selectedEquipment ? `添加维护记录 - ${selectedEquipment.name}` : '添加维护记录'}
        open={logModalOpen}
        onCancel={() => setLogModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={logForm}
          layout="vertical"
          onFinish={handleSubmitLog}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="维护类型"
                name="log_type"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select>
                  {MAINTENANCE_LOG_TYPES.map((t) => (
                    <Option key={t.value} value={t.value}>
                      {t.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="维护日期"
                name="maintenance_date"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如：深度清洁炸篮" />
          </Form.Item>

          <Form.Item label="详细描述" name="description">
            <TextArea rows={3} placeholder="记录具体的维护内容..." />
          </Form.Item>

          <Form.Item label="费用（元）" name="cost">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="照片记录" name="images">
            <ImageUploader maxCount={9} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 16, marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setLogModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存记录
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <span>
            <BellOutlined style={{ marginRight: 8, color: '#faad14' }} />
            设备提醒
          </span>
        }
        open={reminderModalOpen}
        onCancel={() => setReminderModalOpen(false)}
        width={700}
        footer={[
          <Button key="refresh" icon={<CheckCircleOutlined />} onClick={loadReminders}>
            刷新提醒
          </Button>,
          <Button key="close" onClick={() => setReminderModalOpen(false)}>
            关闭
          </Button>,
        ]}
        destroyOnClose
      >
        {reminderLoading ? (
          <Empty description="加载中..." />
        ) : reminders.length > 0 ? (
          <List
            dataSource={reminders.filter((r) => !r.is_dismissed)}
            locale={{ emptyText: '暂无设备提醒 🎉' }}
            renderItem={(r) => (
              <List.Item
                key={r.id}
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  marginBottom: 8,
                  padding: '12px 16px',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: r.is_triggered
                          ? 'rgba(250, 173, 20, 0.15)'
                          : 'rgba(139, 195, 74, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BellOutlined
                        style={{
                          fontSize: 18,
                          color: r.is_triggered ? '#faad14' : '#8BC34A',
                        }}
                      />
                    </div>
                  }
                  title={
                    <Space>
                      <Tag color={r.is_triggered ? 'warning' : 'success'}>
                        {getReminderTypeText(r.reminder_type)}
                      </Tag>
                      <strong style={{ color: r.is_triggered ? '#d48806' : '#2D3436' }}>
                        {r.title}
                      </strong>
                      {r.usage_threshold && (
                        <Tag color="purple">使用 {r.usage_threshold} 次触发</Tag>
                      )}
                      {r.reminder_date && (
                        <span style={{ fontSize: 12, color: '#999' }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {r.reminder_date}
                        </span>
                      )}
                    </Space>
                  }
                  description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#636E72' }}>{r.content}</span>
                      <Space>
                        <Button
                          size="small"
                          onClick={() => handleViewDetail(equipment.find((e) => e.id === r.equipment_id)!)}
                          disabled={!equipment.find((e) => e.id === r.equipment_id)}
                        >
                          查看设备
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          onClick={() => {
                            const eq = equipment.find((e) => e.id === r.equipment_id);
                            if (eq) handleAddLog(eq);
                            setReminderModalOpen(false);
                          }}
                        >
                          去处理
                        </Button>
                        <Button
                          size="small"
                          danger
                          type="text"
                          onClick={() => handleDismissReminder(r.id)}
                        >
                          忽略
                        </Button>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description={
              <span>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                太棒了！暂无设备提醒
              </span>
            }
            style={{ padding: '40px 0' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default KitchenEquipmentPage;
