import React from 'react';
import { Nutrition } from '@/types';
import { FireOutlined, CoffeeOutlined, AppleOutlined, CoffeeOutlined as GrainOutlined, ThunderboltOutlined, GoldOutlined } from '@ant-design/icons';

interface NutritionCardProps {
  nutrition: Nutrition;
  servings?: number;
  showTitle?: boolean;
  compact?: boolean;
}

const NutritionCard: React.FC<NutritionCardProps> = ({ nutrition, servings = 1, showTitle = true, compact = false }) => {
  const multiplier = servings || 1;

  const items = [
    {
      label: '热量',
      value: Math.round(nutrition.calories * multiplier),
      unit: 'kcal',
      icon: <FireOutlined />,
      color: '#FF8A65',
      bg: 'rgba(255, 138, 101, 0.12)',
    },
    {
      label: '蛋白质',
      value: Math.round(nutrition.protein * multiplier),
      unit: 'g',
      icon: <CoffeeOutlined />,
      color: '#8BC34A',
      bg: 'rgba(139, 195, 74, 0.12)',
    },
    {
      label: '脂肪',
      value: Math.round(nutrition.fat * multiplier),
      unit: 'g',
      icon: <AppleOutlined />,
      color: '#FFD54F',
      bg: 'rgba(255, 213, 79, 0.12)',
    },
    {
      label: '碳水',
      value: Math.round(nutrition.carbs * multiplier),
      unit: 'g',
      icon: <GrainOutlined />,
      color: '#BA68C8',
      bg: 'rgba(186, 104, 200, 0.12)',
    },
    {
      label: '纤维',
      value: Math.round(nutrition.fiber * multiplier),
      unit: 'g',
      icon: <ThunderboltOutlined />,
      color: '#4DD0E1',
      bg: 'rgba(77, 208, 225, 0.12)',
    },
    {
      label: '糖分',
      value: Math.round(nutrition.sugar * multiplier),
      unit: 'g',
      icon: <GoldOutlined />,
      color: '#F48FB1',
      bg: 'rgba(244, 143, 177, 0.12)',
    },
  ];

  const iconSize = compact ? 28 : 36;
  const valueFontSize = compact ? 16 : 20;
  const labelFontSize = compact ? 11 : 13;

  return (
    <div>
      {showTitle && (
        <h3 style={{ margin: compact ? '0 0 12px 0' : '0 0 16px 0', fontSize: compact ? 15 : 18, color: '#4A4A4A', fontWeight: 600 }}>
          营养成分{servings > 1 && <span style={{ fontSize: compact ? 12 : 14, color: '#7A7A7A', fontWeight: 400 }}> （{servings}人份）</span>}
        </h3>
      )}
      <div className="nutrition-grid" style={compact ? { gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 } : undefined}>
        {items.map((item, index) => (
          <div key={index} className="nutrition-item" style={compact ? { padding: 8 } : undefined}>
            <div
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: compact ? 8 : 10,
                background: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: compact ? 14 : 18,
              }}
            >
              {item.icon}
            </div>
            <div className="nutrition-item-value" style={{ color: item.color, fontSize: valueFontSize }}>
              {item.value}
              <span style={{ fontSize: compact ? 10 : 12, fontWeight: 400, marginLeft: 2 }}>{item.unit}</span>
            </div>
            <div className="nutrition-item-label" style={{ fontSize: labelFontSize }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NutritionCard;
