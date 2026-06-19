import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Tabs,
  message,
  Divider,
  Checkbox,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  HomeOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth';
import { COLORS } from '../styles/theme';
import { KitchenDecor } from '../components/KitchenDecor';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('登录成功！欢迎回来 ~');
        navigate('/dashboard', { replace: true });
      } else {
        message.error(result.message || '登录失败');
      }
    } catch (error: any) {
      message.error(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      const result = await register(values);
      if (result.success) {
        message.success('注册成功！请登录');
        setActiveTab('login');
        loginForm.setFieldsValue({ username: values.username });
      } else {
        message.error(result.message || '注册失败');
      }
    } catch (error: any) {
      message.error(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = () => {
    loginForm.setFieldsValue({
      username: 'demo',
      password: '123456',
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: `linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.background} 40%, ${COLORS.warning}20 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '3%',
          opacity: 0.15,
          transform: 'rotate(-15deg)',
        }}
      >
        <KitchenDecor width={120} height={120} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          opacity: 0.15,
          transform: 'rotate(20deg)',
        }}
      >
        <KitchenDecor width={100} height={100} type="tomato" />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '8%',
          opacity: 0.15,
          transform: 'rotate(10deg)',
        }}
      >
        <KitchenDecor width={90} height={90} type="carrot" />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '3%',
          opacity: 0.15,
          transform: 'rotate(-10deg)',
        }}
      >
        <KitchenDecor width={110} height={110} type="broccoli" />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '2%',
          opacity: 0.12,
          transform: 'translateY(-50%) rotate(5deg)',
        }}
      >
        <KitchenDecor width={80} height={80} type="apple" />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '2%',
          opacity: 0.12,
          transform: 'translateY(-50%) rotate(-5deg)',
        }}
      >
        <KitchenDecor width={85} height={85} type="bread" />
      </div>

      <Row
        align="middle"
        justify="center"
        style={{ width: '100%', maxWidth: 1100, zIndex: 10 }}
      >
        <Col xs={0} md={12} lg={14} style={{ paddingRight: 40 }}>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 24,
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ transform: 'translateY(-10px)' }}>
                <KitchenDecor width={70} height={70} type="fork" />
              </div>
              <div>
                <KitchenDecor width={90} height={90} type="plate" />
              </div>
              <div style={{ transform: 'translateY(-10px)' }}>
                <KitchenDecor width={70} height={70} type="spoon" />
              </div>
            </div>

            <Title
              level={1}
              style={{
                margin: '0 0 12px',
                fontSize: 48,
                fontWeight: 800,
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.warning} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              温馨厨房
            </Title>
            <Text
              style={{
                fontSize: 20,
                color: '#636E72',
                marginBottom: 32,
                display: 'block',
                fontWeight: 500,
              }}
            >
              让每一餐都充满爱意 🍳
            </Text>

            <div
              style={{
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 20,
                padding: 24,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(139, 195, 74, 0.2)',
                boxShadow: '0 8px 32px rgba(139, 195, 74, 0.1)',
              }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div
                    style={{
                      background: `${COLORS.primary}15`,
                      borderRadius: 16,
                      padding: '16px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                    <Text strong style={{ color: '#2D3436', fontSize: 14 }}>
                      智能食谱库
                    </Text>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 12,
                        color: '#636E72',
                        lineHeight: 1.4,
                      }}
                    >
                      精选食谱，步骤清晰
                    </p>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      background: `${COLORS.warning}15`,
                      borderRadius: 16,
                      padding: '16px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🥬</div>
                    <Text strong style={{ color: '#2D3436', fontSize: 14 }}>
                      食材管理
                    </Text>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 12,
                        color: '#636E72',
                        lineHeight: 1.4,
                      }}
                    >
                      库存追踪，过期提醒
                    </p>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      background: '#5C9EFF15',
                      borderRadius: 16,
                      padding: '16px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <Text strong style={{ color: '#2D3436', fontSize: 14 }}>
                      营养统计
                    </Text>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 12,
                        color: '#636E72',
                        lineHeight: 1.4,
                      }}
                    >
                      健康分析，科学饮食
                    </p>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      background: '#9D65C915',
                      borderRadius: 16,
                      padding: '16px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧‍👦</div>
                    <Text strong style={{ color: '#2D3436', fontSize: 14 }}>
                      家庭共享
                    </Text>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 12,
                        color: '#636E72',
                        lineHeight: 1.4,
                      }}
                    >
                      全家参与，爱意满满
                    </p>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        <Col xs={24} md={12} lg={10}>
          <Card
            style={{
              borderRadius: 24,
              boxShadow: '0 12px 48px rgba(139, 195, 74, 0.18)',
              border: '2px solid rgba(139, 195, 74, 0.2)',
              overflow: 'hidden',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary}CC 100%)`,
                padding: '28px 32px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <KitchenDecor width={60} height={60} type="plate" />
              </div>
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 24,
                }}
              >
                {activeTab === 'login' ? '欢迎回来' : '加入我们'}
              </Title>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 14,
                  marginTop: 6,
                  display: 'block',
                }}
              >
                {activeTab === 'login'
                  ? '登录你的账户，继续美食之旅'
                  : '创建账户，开启温馨厨房时光'}
              </Text>
            </div>

            <div style={{ padding: '28px 32px 32px' }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                size="large"
                items={[
                  {
                    key: 'login',
                    label: (
                      <span style={{ padding: '0 12px', fontSize: 16, fontWeight: 600 }}>
                        <LoginOutlined /> 登录
                      </span>
                    ),
                  },
                  {
                    key: 'register',
                    label: (
                      <span style={{ padding: '0 12px', fontSize: 16, fontWeight: 600 }}>
                        <UserAddOutlined /> 注册
                      </span>
                    ),
                  },
                ]}
                style={{ marginBottom: 20 }}
              />

              {activeTab === 'login' ? (
                <Form
                  form={loginForm}
                  onFinish={handleLogin}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 3, message: '用户名至少3个字符' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: COLORS.primary }} />}
                      placeholder="请输入用户名"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, message: '密码至少6个字符' },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: COLORS.primary }} />}
                      placeholder="请输入密码"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Form.Item
                        name="remember"
                        valuePropName="checked"
                        noStyle
                      >
                        <Checkbox style={{ color: '#636E72' }}>记住我</Checkbox>
                      </Form.Item>
                      <a
                        style={{ color: COLORS.primary }}
                        onClick={() => message.info('请联系管理员重置密码')}
                      >
                        忘记密码？
                      </a>
                    </div>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 12 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      size="large"
                      style={{
                        height: 48,
                        borderRadius: 14,
                        fontSize: 16,
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary}DD 100%)`,
                        border: 'none',
                        boxShadow: `0 4px 16px ${COLORS.primary}40`,
                      }}
                    >
                      <LoginOutlined /> 立即登录
                    </Button>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      block
                      size="large"
                      icon={<HomeOutlined />}
                      style={{
                        height: 44,
                        borderRadius: 12,
                        border: `1.5px dashed ${COLORS.primary}`,
                        color: COLORS.primary,
                        background: `${COLORS.primary}08`,
                        fontWeight: 500,
                      }}
                      onClick={demoLogin}
                    >
                      体验账号一键登录 (demo / 123456)
                    </Button>
                  </Form.Item>
                </Form>
              ) : (
                <Form
                  form={registerForm}
                  onFinish={handleRegister}
                  layout="vertical"
                  size="large"
                >
                  <Form.Item
                    name="username"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 3, max: 20, message: '用户名长度3-20个字符' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: COLORS.primary }} />}
                      placeholder="3-20个字符"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: COLORS.primary }} />}
                      placeholder="your@email.com"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: '请输入密码' },
                      { min: 6, max: 32, message: '密码长度6-32个字符' },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: COLORS.primary }} />}
                      placeholder="至少6个字符"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label="确认密码"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: '请再次输入密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: COLORS.warning }} />}
                      placeholder="再次输入密码"
                      style={{ borderRadius: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="agree"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value
                            ? Promise.resolve()
                            : Promise.reject(new Error('请阅读并同意用户协议')),
                      },
                    ]}
                  >
                    <Checkbox style={{ color: '#636E72', fontSize: 13 }}>
                      我已阅读并同意
                      <a style={{ color: COLORS.primary, margin: '0 4px' }}>《用户协议》</a>
                      和
                      <a style={{ color: COLORS.primary, margin: '0 4px' }}>《隐私政策》</a>
                    </Checkbox>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      block
                      size="large"
                      style={{
                        height: 48,
                        borderRadius: 14,
                        fontSize: 16,
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.warning}DD 100%)`,
                        border: 'none',
                        boxShadow: `0 4px 16px ${COLORS.warning}40`,
                      }}
                    >
                      <UserAddOutlined /> 立即注册
                    </Button>
                  </Form.Item>
                </Form>
              )}

              <Divider style={{ margin: '24px 0 16px' }}>
                <Text style={{ color: '#B2BEC3', fontSize: 12 }}>开始美食之旅</Text>
              </Divider>

              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#B2BEC3', fontSize: 13 }}>
                  {activeTab === 'login' ? '还没有账户？' : '已有账户？'}
                </Text>
                <Button
                  type="link"
                  style={{
                    color: activeTab === 'login' ? COLORS.warning : COLORS.primary,
                    fontWeight: 600,
                    padding: '0 4px',
                    fontSize: 14,
                  }}
                  onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
                >
                  {activeTab === 'login' ? '立即注册' : '去登录'}
                </Button>
              </div>
            </div>
          </Card>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ color: '#B2BEC3', fontSize: 12 }}>
              © 2024 温馨厨房 · 让爱与美食相伴 💕
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
