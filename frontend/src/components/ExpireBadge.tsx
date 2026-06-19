import React from 'react';
import { getExpireStatus } from '@/utils';
import { WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ExpireBadgeProps {
  expireDate: string;
  showIcon?: boolean;
  size?: 'small' | 'default';
}

const ExpireBadge: React.FC<ExpireBadgeProps> = ({ expireDate, showIcon = true, size = 'default' }) => {
  const { status, text } = getExpireStatus(expireDate);

  const icons: Record<string, React.ReactNode> = {
    expired: <CloseCircleOutlined />,
    warning: <WarningOutlined />,
    normal: <CheckCircleOutlined />,
  };

  const padding = size === 'small' ? '1px 8px' : '2px 10px';
  const fontSize = size === 'small' ? '11px' : '12px';

  return (
    <span
      className={`badge-expire ${status}`}
      style={{ padding, fontSize }}
    >
      {showIcon && <span style={{ marginRight: 4 }}>{icons[status]}</span>}
      {text}
    </span>
  );
};

export default ExpireBadge;
