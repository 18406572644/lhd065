import React, { useState, useCallback, useRef } from 'react';
import { Upload, Modal, Button, message, Image as AntImage } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import Cropper, { Area } from 'react-easy-crop';

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error: Event) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = (rotation * Math.PI) / 180;
  const bBoxWidth =
    Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height);
  const bBoxHeight =
    Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d context');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
    }, 'image/jpeg', 0.9);
  });
};

export interface ImageUploaderProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
  listType?: 'picture-card' | 'picture';
  aspect?: number;
  cropShape?: 'rect' | 'round';
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  listType = 'picture-card',
  aspect = 4 / 3,
  cropShape = 'rect',
  disabled = false,
}) => {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const fileListRef = useRef<UploadFile[]>([]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showPreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewVisible(true);
  };

  const buildFileList = (urls: string[]): UploadFile[] => {
    return urls.map((url, index) => ({
      uid: `-${index}`,
      name: `image-${index}.jpg`,
      status: 'done',
      url,
    }));
  };

  const handleBeforeUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB!');
      return Upload.LIST_IGNORE;
    }

    try {
      const base64 = await getBase64(file);
      setImageToCrop(base64);
      setPendingFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCropModalOpen(true);
      return false;
    } catch (error) {
      message.error('读取图片失败');
      return Upload.LIST_IGNORE;
    }
  };

  const handleCropConfirm = async () => {
    try {
      if (!croppedAreaPixels) {
        message.error('请先选择裁剪区域');
        return;
      }
      const croppedBase64 = await getCroppedImg(imageToCrop, croppedAreaPixels, rotation);
      const newUrls = [...value, croppedBase64];
      onChange?.(newUrls);
      setCropModalOpen(false);
      setImageToCrop('');
      setPendingFile(null);
      message.success('图片上传成功');
    } catch (error) {
      message.error('裁剪图片失败');
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setImageToCrop('');
    setPendingFile(null);
  };

  const handleRemove = (file: UploadFile) => {
    const newUrls = value.filter((url) => url !== file.url);
    onChange?.(newUrls);
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  );

  const fileList = buildFileList(value);
  fileListRef.current = fileList;

  const uploadProps: UploadProps = {
    listType,
    fileList,
    beforeUpload: handleBeforeUpload,
    onRemove: handleRemove,
    onPreview: showPreview,
    multiple: true,
    disabled,
    accept: 'image/*',
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
    },
  };

  return (
    <>
      <Upload {...uploadProps}>
        {value.length >= maxCount ? null : uploadButton}
      </Upload>

      <Modal
        title="裁剪图片"
        open={cropModalOpen}
        onOk={handleCropConfirm}
        onCancel={handleCropCancel}
        okText="确认裁剪"
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 400,
            background: '#333',
            marginBottom: 16,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {imageToCrop && (
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            />
            <span style={{ minWidth: 60, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              icon={<RotateLeftOutlined />}
              onClick={() => setRotation((r) => r - 90)}
            />
            <span style={{ minWidth: 60, textAlign: 'center' }}>{rotation}°</span>
            <Button
              icon={<RotateRightOutlined />}
              onClick={() => setRotation((r) => r + 90)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={previewVisible}
        title="图片预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <AntImage
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
          preview={false}
        />
      </Modal>
    </>
  );
};

export default ImageUploader;
