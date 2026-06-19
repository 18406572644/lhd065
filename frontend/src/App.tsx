import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Badge,
  Typography,
  Space,
  Drawer,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  TeamOutlined,
  HeartOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  HomeOutlined,
  PlusOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Inventory from './pages/Inventory';
import ShoppingList from './pages/ShoppingList';
import Stats from './pages/Stats';
import Family from './pages/Family';
import Favorites from './pages/Favorites';
import MealPlan from './pages/MealPlan';
import Login from './pages/Login';
import IngredientsEncyclopedia from './pages/IngredientsEncyclopedia';
import IngredientDetail from './pages/IngredientDetail';
import { logout, getCurrentUser } from './api/auth';
import { getExpiringItems } from './api/inventory';
import { COLORS } from './styles/theme';
import { KitchenDecor } from './components/KitchenDecor';
import { InventoryItem } from './types';
import { getExpireStatus } from './utils';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface AppState {
  token: string | null;
  user: any;
}

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({
    token: localStorage.getItem('token'),
    user: getCurrentUser(),
  });
  const [expiringCount, setExpiringCount] = useState(0);

  const fetchExpiringCount = async () => {
    try {
      const data: InventoryItem[] = await getExpiringItems();
      setExpiringCount(data.length);
    } catch (error) {
      console.error('获取临期食材失败:', error);
    }
  };

  useEffect(() => {
    if (appState.token) {
      fetchExpiringCount();
    }
  }, [appState.token]);

  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      const user = getCurrentUser();
      setAppState({ token, user });
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    logout();
    setAppState({ token: null, user: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/family'),
    },
    {
      key: 'favorites',
      icon: <HeartOutlined />,
      label: '我的收藏',
      onClick: () => navigate('/favorites'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/meal-plan',
      icon: <CalendarOutlined />,
      label: '用餐计划',
    },
    {
      key: '/recipes',
      icon: <BookOutlined />,
      label: '食谱管理',
    },
    {
      key: '/ingredients',
      icon: <AppstoreOutlined />,
      label: '食材百科',
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: '食材库存',
    },
    {
      key: '/shopping',
      icon: <ShoppingCartOutlined />,
      label: '购物清单',
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: '饮食统计',
    },
    {
      key: '/family',
      icon: <TeamOutlined />,
      label: '家庭成员',
    },
    {
      key: '/favorites',
      icon: <HeartOutlined />,
      label: '我的收藏',
    },
  ];

  const selectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/recipes/')) return '/recipes';
    if (path.startsWith('/ingredients/')) return '/ingredients';
    return path;
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileMenuOpen(false);
  };

  if (!appState.token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const userInitial = appState.user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        width={260}
        style={{
          background: '#fff',
          borderRight: '1px solid rgba(139, 195, 74, 0.12)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.03)',
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
        className="custom-sider"
      >
        <div
          style={{
            padding: collapsed ? '20px 12px' : '24px 20px 20px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(139, 195, 74, 0.1)',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 14,
            }}
          >
            <div
              style={{
                width: collapsed ? 48 : 54,
                height: collapsed ? 48 : 54,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primary}DD 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${COLORS.primary}40`,
                flexShrink: 0,
              }}
            >
              <KitchenDecor width={collapsed ? 28 : 32} height={collapsed ? 28 : 32} type="plate" />
            </div>
            {!collapsed && (
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.warning} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.2,
                  }}
                >
                  温馨厨房
                </Title>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#B2BEC3',
                    marginTop: 2,
                    display: 'block',
                  }}
                >
                  家庭饮食管理系统
                </Text>
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div style={{ padding: '8px 16px 16px' }}>
            <Button
              type="primary"
              block
              icon={<PlusOutlined />}
              size="large"
              onClick={() => navigate('/recipes?action=create')}
              style={{
                height: 44,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.warning}DD 100%)`,
                border: 'none',
                boxShadow: `0 4px 16px ${COLORS.warning}30`,
                fontWeight: 600,
              }}
            >
              创建食谱
            </Button>
          </div>
        )}

        <Menu
          mode="inline"
          selectedKeys={[selectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 'none',
            background: 'transparent',
            padding: collapsed ? '8px 8px' : '8px 12px',
          }}
          className="custom-menu"
        />

        {!collapsed && (
          <div
            style={{
              margin: '24px 16px 16px',
              padding: 16,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.warning}15 100%)`,
              border: '1px dashed rgba(139, 195, 74, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 20 }}>💡</div>
              <Text strong style={{ fontSize: 13, color: '#2D3436' }}>
                小贴士
              </Text>
            </div>
            <Text style={{ fontSize: 12, color: '#636E72', lineHeight: 1.6 }}>
              记得及时标记已完成的购物项，保持清单整洁哦~
            </Text>
          </div>
        )}
      </Sider>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KitchenDecor width={32} height={32} type="plate" />
            <span style={{ fontWeight: 700, fontSize: 18 }}>温馨厨房</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={260}
        styles={{ body: { padding: 0 } }}
        className="mobile-drawer"
      >
        <div style={{ padding: 16 }}>
          <Button
            type="primary"
            block
            icon={<PlusOutlined />}
            size="large"
            onClick={() => {
              navigate('/recipes?action=create');
              setMobileMenuOpen(false);
            }}
            style={{
              height: 44,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.warning}DD 100%)`,
              border: 'none',
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            创建食谱
          </Button>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey()]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 'none' }}
          />
        </div>
      </Drawer>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: 0,
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(139, 195, 74, 0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
          className="custom-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 20,
                width: 48,
                height: 68,
                color: '#636E72',
              }}
              className="ant-btn-hidden-lg"
            />
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              style={{
                fontSize: 20,
                width: 48,
                height: 68,
                color: '#636E72',
              }}
              className="ant-btn-visible-lg"
            />

            <Tooltip title="返回首页">
              <Button
                type="text"
                icon={<HomeOutlined />}
                onClick={() => navigate('/dashboard')}
                style={{
                  fontSize: 18,
                  width: 48,
                  height: 68,
                  color: COLORS.primary,
                }}
              />
            </Tooltip>

            <div style={{ marginLeft: 12 }}>
              <BreadcrumbTitle pathname={location.pathname} />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingRight: 24,
              gap: 8,
              height: '100%',
            }}
          >
            <Tooltip title={expiringCount > 0 ? `${expiringCount} 种食材即将过期` : '暂无过期提醒'}>
              <Badge count={expiringCount} size="small" offset={[-4, 4]}>
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18 }} />}
                  onClick={() => navigate('/inventory')}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    color: '#636E72',
                  }}
                />
              </Badge>
            </Tooltip>

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 14,
                  transition: 'all 0.2s',
                }}
                className="user-dropdown-trigger"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = COLORS.background;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <Avatar
                  size={40}
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.warning} 100%)`,
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: `0 2px 8px ${COLORS.primary}30`,
                  }}
                  icon={<UserOutlined />}
                >
                  {userInitial}
                </Avatar>
                <div style={{ textAlign: 'left' }} className="ant-visible-md">
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#2D3436',
                      lineHeight: 1.3,
                    }}
                  >
                    {appState.user?.username || '用户'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#B2BEC3',
                      lineHeight: 1.3,
                    }}
                  >
                    {appState.user?.email || '家庭管理员'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            padding: '24px 28px 48px',
            minHeight: 'calc(100vh - 68px)',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          <Routes>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/meal-plan"
              element={
                <PrivateRoute>
                  <MealPlan />
                </PrivateRoute>
              }
            />
            <Route
              path="/recipes"
              element={
                <PrivateRoute>
                  <Recipes />
                </PrivateRoute>
              }
            />
            <Route
              path="/recipes/:id"
              element={
                <PrivateRoute>
                  <RecipeDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/ingredients"
              element={
                <PrivateRoute>
                  <IngredientsEncyclopedia />
                </PrivateRoute>
              }
            />
            <Route
              path="/ingredients/:id"
              element={
                <PrivateRoute>
                  <IngredientDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <PrivateRoute>
                  <Inventory />
                </PrivateRoute>
              }
            />
            <Route
              path="/shopping"
              element={
                <PrivateRoute>
                  <ShoppingList />
                </PrivateRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <PrivateRoute>
                  <Stats />
                </PrivateRoute>
              }
            />
            <Route
              path="/family"
              element={
                <PrivateRoute>
                  <Family />
                </PrivateRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <PrivateRoute>
                  <Favorites />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

const BreadcrumbTitle: React.FC<{ pathname: string }> = ({ pathname }) => {
  const getTitle = () => {
    if (pathname === '/dashboard') return { title: '仪表盘', desc: '今日美食概览' };
    if (pathname === '/meal-plan') return { title: '用餐计划', desc: '轻松规划一周饮食' };
    if (pathname === '/recipes') return { title: '食谱管理', desc: '浏览与创建食谱' };
    if (pathname.startsWith('/recipes/')) return { title: '食谱详情', desc: '烹饪步骤与营养' };
    if (pathname === '/ingredients') return { title: '食材百科', desc: '探索食材的奥秘' };
    if (pathname.startsWith('/ingredients/')) return { title: '食材详情', desc: '营养与选购指南' };
    if (pathname === '/inventory') return { title: '食材库存', desc: '管理你的食材仓库' };
    if (pathname === '/shopping') return { title: '购物清单', desc: '轻松采购不遗漏' };
    if (pathname === '/stats') return { title: '饮食统计', desc: '可视化营养分析' };
    if (pathname === '/family') return { title: '家庭成员', desc: '管理家庭饮食偏好' };
    if (pathname === '/favorites') return { title: '我的收藏', desc: '珍藏的美味食谱' };
    return { title: '温馨厨房', desc: '让每一餐都有爱' };
  };

  const { title, desc } = getTitle();

  return (
    <div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#2D3436',
          lineHeight: 1.2,
        }}
        className="ant-visible-md"
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#B2BEC3',
          marginTop: 2,
          lineHeight: 1.2,
        }}
        className="ant-visible-md"
      >
        {desc}
      </div>
    </div>
  );
};

export default App;
