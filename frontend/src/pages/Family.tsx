import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Popconfirm,
  Empty,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  HeartOutlined,
  ExclamationCircleOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { FamilyMember } from '@/types';
import { getFamilyMembers } from '@/api/family';

const { Option } = Select;
const { TextArea } = Input;

const RELATIONS = ['父亲', '母亲', '儿子', '女儿', '爷爷', '奶奶', '外公', '外婆', '配偶', '其他'];
const DIETARY_OPTIONS = ['素食', '少盐', '低糖', '低脂', '不吃辣', '海鲜过敏', '坚果过敏', '乳糖不耐受'];
const PREFERENCE_CATEGORIES = ['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '饮品', '烘焙', '海鲜', '辣菜'];

const AVATAR_COLORS = [
  { bg: '#DCEDC8', color: '#689F38', emoji: '👨' },
  { bg: '#FFCCBC', color: '#E64A19', emoji: '👩' },
  { bg: '#BBDEFB', color: '#1976D2', emoji: '👦' },
  { bg: '#F8BBD0', color: '#C2185B', emoji: '👧' },
  { bg: '#FFF9C4', color: '#F9A825', emoji: '👴' },
  { bg: '#E1BEE7', color: '#7B1FA2', emoji: '👵' },
];

const Family: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = (await getFamilyMembers()) as FamilyMember[];
      setMembers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAvatarStyle = (index: number, gender: string) => {
    const colorIdx = index % AVATAR_COLORS.length;
    let emoji = AVATAR_COLORS[colorIdx].emoji;
    if (gender === 'male') emoji = ['👨', '👦', '👴'][colorIdx % 3];
    if (gender === 'female') emoji = ['👩', '👧', '👵'][colorIdx % 3];
    return { ...AVATAR_COLORS[colorIdx], emoji };
  };

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      gender: 'male',
      age: 30,
      dietary_restrictions: [],
      preferences: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingId(member.id);
    form.setFieldsValue(member);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    message.success('删除成功');
  };

  const handleSubmit = (values: any) => {
    if (editingId) {
      setMembers((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, ...values } : m))
      );
      message.success('更新成功');
    } else {
      const newMember: FamilyMember = {
        id: Date.now(),
        ...values,
      };
      setMembers((prev) => [...prev, newMember]);
      message.success('添加成功');
    }
    setModalOpen(false);
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">👨‍👩‍👧‍👦 家庭成员</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          添加成员
        </Button>
      </div>

      <div style={{ marginBottom: 24, padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139, 195, 74, 0.1), rgba(255, 138, 101, 0.1))', border: '1px solid rgba(139, 195, 74, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16 }}>
          <div style={{ fontSize: 28 }}>❤️</div>
          <div>
            <strong style={{ color: '#689F38' }}>我们家一共 {members.length} 口人</strong>
            <div style={{ fontSize: 13, color: '#7A7A7A', marginTop: 4 }}>
              记录每位家人的饮食偏好，让每餐都更贴心
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Empty description="加载中..." />
      ) : members.length > 0 ? (
        <div className="family-grid">
          {members.map((member, index) => {
            const avatar = getAvatarStyle(index, member.gender);
            return (
              <div key={member.id} className="family-card animate-fadeIn">
                <div
                  className="family-avatar"
                  style={{
                    background: avatar.bg,
                    color: avatar.color,
                    fontSize: 48,
                  }}
                >
                  {avatar.emoji}
                </div>
                <div className="family-name">{member.name}</div>
                <div className="family-relation">
                  {member.relation} · {member.age}岁 · {member.gender === 'male' ? '♂' : member.gender === 'female' ? '♀' : ''}
                </div>

                {member.dietary_restrictions && member.dietary_restrictions.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
                        <ExclamationCircleOutlined style={{ color: '#FF8A65', marginRight: 4 }} />
                        饮食限制
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {member.dietary_restrictions.map((r) => (
                          <Tag key={r} color="orange" style={{ margin: 0 }}>
                            {r}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {member.preferences && member.preferences.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
                        <HeartOutlined style={{ color: '#8BC34A', marginRight: 4 }} />
                        喜欢的类型
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {member.preferences.map((p) => (
                          <Tag key={p} color="green" style={{ margin: 0 }}>
                            {p}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Divider style={{ margin: '12px 0' }} />
                <Space size="small">
                  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(member)}>
                    编辑
                  </Button>
                  <Popconfirm title="确定删除这个成员？" onConfirm={() => handleDelete(member.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div style={{ fontSize: 100, marginBottom: 16, opacity: 0.6 }}>👨‍👩‍👧‍👦</div>
          <div className="empty-state-text">还没有添加家庭成员</div>
          <div className="empty-state-hint">添加家人，记录他们的饮食偏好</div>
          <div style={{ marginTop: 20 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              添加第一位成员
            </Button>
          </div>
        </div>
      )}

      <Modal
        title={editingId ? '编辑成员' : '添加家庭成员'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="关系" name="relation" rules={[{ required: true, message: '请选择关系' }]}>
                <Select placeholder="选择关系">
                  {RELATIONS.map((r) => (
                    <Option key={r} value={r}>
                      {r}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={12}>
              <Form.Item label="年龄" name="age" rules={[{ required: true, message: '请输入年龄' }]}>
                <InputNumber min={0} max={150} style={{ width: '100%' }} addonAfter="岁" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12}>
              <Form.Item label="性别" name="gender" rules={[{ required: true, message: '请选择性别' }]}>
                <Select placeholder="选择性别">
                  <Option value="male">♂ 男</Option>
                  <Option value="female">♀ 女</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="饮食限制（多选）" name="dietary_restrictions">
            <Select mode="multiple" placeholder="选择饮食限制或忌口" allowClear>
              {DIETARY_OPTIONS.map((o) => (
                <Option key={o} value={o}>
                  {o}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="饮食偏好（多选）" name="preferences">
            <Select mode="multiple" placeholder="选择喜欢的菜系/类型" allowClear>
              {PREFERENCE_CATEGORIES.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </Form.Item>
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
    </div>
  );
};

export default Family;
