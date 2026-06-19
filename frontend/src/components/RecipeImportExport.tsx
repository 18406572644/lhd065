import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Upload,
  Table,
  Checkbox,
  Alert,
  Progress,
  Tag,
  Space,
  Select,
  Statistic,
  Row,
  Col,
  Divider,
  message,
} from 'antd';
import {
  ImportOutlined,
  ExportOutlined,
  DownloadOutlined,
  LinkOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import {
  previewImport,
  importRecipes,
  importFromURL,
  exportRecipes,
  downloadTemplate,
  getRecipes,
} from '@/api/recipes';
import {
  ImportPreviewResponse,
  RecipeImportResult,
  URLImportResponse,
  Recipe,
  RecipeImportError,
} from '@/types';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

interface RecipeImportExportProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RecipeImportExport: React.FC<RecipeImportExportProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('file');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<RecipeImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [urlForm] = Form.useForm();
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState<URLImportResponse | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPreviewData(null);
    setImportResult(null);
    setUrlResult(null);
    setFile(null);
    if (key === 'export') {
      loadRecipesForExport();
    }
  };

  const loadRecipesForExport = async () => {
    setLoadingRecipes(true);
    try {
      const data = await getRecipes();
      setRecipes(data);
    } catch {
      message.error('加载食谱列表失败');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (uploadFile) => {
      const ext = uploadFile.name.split('.').pop()?.toLowerCase();
      if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
        message.error('只支持 CSV 和 Excel 格式文件');
        return Upload.LIST_IGNORE;
      }
      const isLt10M = uploadFile.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      setFile(uploadFile as File);
      setPreviewData(null);
      setImportResult(null);
      handlePreview(uploadFile as File);
      return false;
    },
    fileList: file ? [{ uid: '-1', name: file.name, size: file.size, originFileObj: file as any } as UploadFile] : [],
    maxCount: 1,
    accept: '.csv,.xlsx,.xls',
  };

  const handlePreview = async (uploadFile: File) => {
    try {
      const data = await previewImport(uploadFile);
      setPreviewData(data);
      if (data.validation_errors.length > 0) {
        message.warning(`检测到 ${data.validation_errors.length} 个数据校验错误`);
      }
    } catch (error: any) {
      message.error(error.message || '预览失败');
    }
  };

  const handleImport = async () => {
    if (!file) {
      message.error('请先选择文件');
      return;
    }
    setImporting(true);
    try {
      const result = await importRecipes(file, skipDuplicates);
      setImportResult(result);
      if (result.success > 0) {
        message.success(`成功导入 ${result.success} 条食谱`);
        onSuccess?.();
      }
      if (result.failed > 0 || result.duplicates > 0) {
        message.warning(`${result.failed} 条失败，${result.duplicates} 条重复已跳过`);
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleUrlImport = async (values: { url: string }) => {
    setUrlLoading(true);
    setUrlResult(null);
    try {
      const result = await importFromURL(values);
      setUrlResult(result);
      if (result.success) {
        message.success(result.message);
        onSuccess?.();
      } else {
        message.error(result.message);
      }
    } catch (error: any) {
      message.error(error.message || '导入失败');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedRecipeIds.length === 0) {
      message.warning('请选择要导出的食谱');
      return;
    }
    setExporting(true);
    try {
      await exportRecipes({
        recipe_ids: selectedRecipeIds,
        format: exportFormat,
      });
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      await exportRecipes({
        format: exportFormat,
      });
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    downloadTemplate(format);
    message.success('模板下载成功');
  };

  const renderErrorTag = (errors: RecipeImportError[], row: number) => {
    const rowErrors = errors.filter((e) => e.row === row + 2);
    if (rowErrors.length === 0) return null;
    return (
      <Tag color="red" icon={<ExclamationCircleOutlined />}>
        {rowErrors.length} 个错误
      </Tag>
    );
  };

  const errorColumns = [
    {
      title: '行号',
      dataIndex: 'row',
      key: 'row',
      width: 80,
    },
    {
      title: '字段',
      dataIndex: 'field',
      key: 'field',
      width: 150,
    },
    {
      title: '错误信息',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
    },
  ];

  const exportColumns = [
    {
      title: '食谱名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (d: string) => {
        const map: Record<string, string> = { easy: '简单', medium: '中等', hard: '难' };
        return map[d] || d;
      },
    },
    {
      title: '烹饪时间',
      dataIndex: 'cook_time',
      key: 'cook_time',
      width: 100,
      render: (t: number) => `${t} 分钟`,
    },
    {
      title: '食材数量',
      key: 'ingredients',
      width: 100,
      render: (_: any, record: Recipe) => record.ingredients.length,
    },
    {
      title: '步骤数量',
      key: 'steps',
      width: 100,
      render: (_: any, record: Recipe) => record.steps.length,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <ImportOutlined />
          批量导入 / 导出
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane
          tab={
            <span>
              <FileExcelOutlined />
              文件导入
            </span>
          }
          key="file"
        >
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="导入说明"
              description={
                <div>
                  <p>支持 CSV 和 Excel 格式文件，文件需包含 "title"（食谱名称）列。</p>
                  <p>食材格式示例：<code>西红柿: 500克; 鸡蛋: 4个</code>，步骤格式示例：<code>洗净切块; 热油翻炒（5分钟）</code></p>
                  <p>
                    <Space>
                      下载模板：
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadTemplate('xlsx')}>
                        Excel 模板
                      </Button>
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadTemplate('csv')}>
                        CSV 模板
                      </Button>
                    </Space>
                  </p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>

          <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
            <p className="ant-upload-drag-icon">
              <ImportOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
            <p className="ant-upload-hint">支持 .csv, .xlsx, .xls 格式，最大 10MB</p>
          </Upload.Dragger>

          {previewData && (
            <>
              <Divider orientation="left">数据预览</Divider>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title="总行数" value={previewData.total_rows} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="校验错误"
                    value={previewData.validation_errors.length}
                    valueStyle={{ color: previewData.validation_errors.length > 0 ? '#ff4d4f' : '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="可导入"
                    value={previewData.total_rows - previewData.validation_errors.filter((e) => e.field !== 'title').length}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              </Row>

              <div style={{ marginBottom: 16 }}>
                <Checkbox
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                >
                  跳过重复食谱（按名称匹配）
                </Checkbox>
              </div>

              <Table
                size="small"
                dataSource={previewData.sample_data}
                pagination={false}
                scroll={{ x: 800 }}
                columns={previewData.columns.map((col) => ({
                  title: col,
                  dataIndex: col,
                  key: col,
                  ellipsis: true,
                })).concat([
                  {
                    title: '状态',
                    key: 'status',
                    width: 120,
                    render: (_: any, _record: any, index: number) =>
                      renderErrorTag(previewData.validation_errors, index),
                  } as any,
                ])}
              />

              {previewData.validation_errors.length > 0 && (
                <>
                  <Divider orientation="left">错误详情</Divider>
                  <Table
                    size="small"
                    dataSource={previewData.validation_errors}
                    pagination={{ pageSize: 5 }}
                    columns={errorColumns}
                  />
                </>
              )}

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                  <Button onClick={onClose}>取消</Button>
                  <Button
                    type="primary"
                    icon={<ImportOutlined />}
                    onClick={handleImport}
                    loading={importing}
                    disabled={previewData.validation_errors.some((e) => e.field === 'title')}
                  >
                    开始导入
                  </Button>
                </Space>
              </div>
            </>
          )}

          {importResult && (
            <>
              <Divider orientation="left">导入结果</Divider>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="成功"
                    value={importResult.success}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="失败"
                    value={importResult.failed}
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="重复跳过"
                    value={importResult.duplicates}
                    prefix={<InfoCircleOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="总计" value={importResult.total} />
                </Col>
              </Row>

              {importResult.errors.length > 0 && (
                <>
                  <Divider orientation="left">错误详情</Divider>
                  <Table
                    size="small"
                    dataSource={importResult.errors}
                    pagination={{ pageSize: 5 }}
                    columns={errorColumns}
                  />
                </>
              )}

              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Button type="primary" onClick={onClose}>
                  完成
                </Button>
              </div>
            </>
          )}
        </TabPane>

        <TabPane
          tab={
            <span>
              <LinkOutlined />
              网址导入
            </span>
          }
          key="url"
        >
          <Alert
            message="支持的网站"
            description="目前支持从下厨房(xiachufang.com)、美食杰(meishij.net)一键导入食谱。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form
            form={urlForm}
            layout="vertical"
            onFinish={handleUrlImport}
            initialValues={{ url: '' }}
          >
            <Form.Item
              label="食谱网址"
              name="url"
              rules={[{ required: true, message: '请输入食谱网址' }]}
            >
              <Input
                placeholder="例如：https://www.xiachufang.com/recipe/1000000/"
                size="large"
                addonBefore={<LinkOutlined />}
              />
            </Form.Item>

            <Form.Item style={{ textAlign: 'right' }}>
              <Button type="primary" htmlType="submit" loading={urlLoading} size="large">
                导入食谱
              </Button>
            </Form.Item>
          </Form>

          {urlResult && (
            <>
              <Divider orientation="left">导入结果</Divider>
              <Alert
                message={urlResult.message}
                type={urlResult.success ? 'success' : 'error'}
                showIcon
              />
              {urlResult.recipe && (
                <div style={{ marginTop: 16, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{urlResult.recipe.name}</h4>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>{urlResult.recipe.description}</p>
                  <Space wrap>
                    <Tag color="blue">{urlResult.recipe.category}</Tag>
                    <Tag>{urlResult.recipe.cook_time} 分钟</Tag>
                    <Tag>{urlResult.recipe.servings} 人份</Tag>
                    <Tag>{urlResult.recipe.ingredients.length} 种食材</Tag>
                    <Tag>{urlResult.recipe.steps.length} 个步骤</Tag>
                    <Tag color="purple">来源：{urlResult.source}</Tag>
                  </Space>
                </div>
              )}
            </>
          )}
        </TabPane>

        <TabPane
          tab={
            <span>
              <ExportOutlined />
              导出
            </span>
          }
          key="export"
        >
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span>导出格式：</span>
              <Select value={exportFormat} onChange={setExportFormat} style={{ width: 120 }}>
                <Option value="xlsx">Excel (.xlsx)</Option>
                <Option value="csv">CSV (.csv)</Option>
              </Select>
            </Space>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button onClick={handleExportAll} loading={exporting} icon={<ExportOutlined />}>
                导出全部食谱
              </Button>
              <span style={{ color: '#999' }}>或选择下方要导出的食谱：</span>
            </Space>
          </div>

          <Table
            rowKey="id"
            loading={loadingRecipes}
            dataSource={recipes}
            columns={exportColumns}
            rowSelection={{
              selectedRowKeys: selectedRecipeIds,
              onChange: (keys) => setSelectedRecipeIds(keys as number[]),
            }}
            pagination={{ pageSize: 5 }}
          />

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <span style={{ color: '#666' }}>已选择 {selectedRecipeIds.length} 项</span>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExport}
                loading={exporting}
                disabled={selectedRecipeIds.length === 0}
              >
                导出选中
              </Button>
            </Space>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default RecipeImportExport;
