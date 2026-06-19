import React from 'react';

interface KitchenDecorProps {
  size?: number;
  color?: string;
}

export const ForkIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#8BC34A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v5m0 0c0 1.5 1 3 2.5 3S9 8.5 9 7V2m-5 5l5 0M6.5 10v12" />
  </svg>
);

export const SpoonIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#FF8A65' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2C5 2 3 4.5 3 7.5C3 11 6 13 9 13L9 22M11 13L11 22M11 13C14 13 17 11 17 7.5C17 4.5 15 2 12 2C10.5 2 9.5 3 9 4" />
  </svg>
);

export const KnifeIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#78909C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21L21 3L17 7C15 9 14 12 14 14C14 17 16 19 16 19L12 15L8 19L3 21Z" />
  </svg>
);

export const PlateIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#BDBDBD' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="6" ry="2.5" strokeDasharray="2 2" />
    <path d="M2 12v4c0 2.2 4.5 4 10 4s10-1.8 10-4v-4" />
  </svg>
);

export const LeafIcon: React.FC<KitchenDecorProps> = ({ size = 28, color = '#66BB6A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.2 21 6.5 21 13c0 4-2.5 7-7 7" />
    <path d="M2 21c0-6 5-11 11-11" />
  </svg>
);

export const TomatoIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#EF5350' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 5C10 3 8 4 8 4M12 5C14 3 16 4 16 4M12 5L12 7M10 6L8 8M14 6L16 8" stroke="#66BB6A" />
  </svg>
);

export const CarrotIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#FF8A65' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22L9 4L13 2L15 4L13 6L17 8L15 22Z" />
    <path d="M13 2C15 4 14 6 13 6M10 4C8 5 7 7 8 7" stroke="#66BB6A" />
    <path d="M11 9L10 10M13 13L12 14M14 17L13 18" strokeWidth="1.5" />
  </svg>
);

export const BroccoliIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#66BB6A' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="7" r="3.5" />
    <circle cx="16" cy="7" r="3.5" />
    <circle cx="12" cy="11" r="3" />
    <path d="M10 14L14 14L14 20L10 20Z" />
    <path d="M9 18L7 20M15 18L17 20" />
  </svg>
);

export const AppleIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#EF5350' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6C10 4 7 5 7 8C5 8 3 10 3 13C3 18 7 21 11 21C11.5 21 12 20.8 12 20.5C12 20.8 12.5 21 13 21C17 21 21 18 21 13C21 10 19 8 17 8C17 5 14 4 12 6Z" />
    <path d="M12 6C12 4 14 2 16 3" stroke="#66BB6A" />
  </svg>
);

export const BreadIcon: React.FC<KitchenDecorProps> = ({ size = 32, color = '#FFD54F' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10C4 7 6 5 9 5C10 5 11 5.5 12 6C13 5.5 14 5 15 5C18 5 20 7 20 10L20 20L4 20Z" />
    <path d="M7 13L7 17M12 12L12 18M17 13L17 17" strokeWidth="1.5" />
  </svg>
);

export const KitchenDecorSet: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
    <ForkIcon size={28} />
    <SpoonIcon size={28} />
    <LeafIcon size={24} />
    <TomatoIcon size={26} />
    <BreadIcon size={26} />
  </div>
);

export const KitchenLogo: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" fill="#DCEDC8" />
    <circle cx="24" cy="24" r="18" fill="#FFFDF8" />
    <path d="M14 12L14 22C14 24 15.5 25 17 25S20 24 20 22L20 12" stroke="#689F38" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 13L17 17M14 15L20 15" stroke="#689F38" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M34 12L34 36" stroke="#FF8A65" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="34" cy="15" rx="5" ry="3" stroke="#FF8A65" strokeWidth="2.5" fill="#FFCCBC" />
    <path d="M24 14C22 12 20 13 20 13M24 14C26 12 28 13 28 13" stroke="#66BB6A" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 25L17 29M34 25L34 36" strokeOpacity="0.3" />
  </svg>
);

type KitchenDecorType = 'fork' | 'spoon' | 'knife' | 'plate' | 'leaf' | 'tomato' | 'carrot' | 'broccoli' | 'apple' | 'bread' | 'set' | 'logo';

interface KitchenDecorAllProps {
  type?: KitchenDecorType;
  width?: number;
  height?: number;
  size?: number;
  className?: string;
}

export const KitchenDecor: React.FC<KitchenDecorAllProps> = ({
  type = 'plate',
  width,
  height,
  size,
}) => {
  const w = width || size || 40;
  const h = height || size || 40;
  switch (type) {
    case 'fork': return <ForkIcon size={w} />;
    case 'spoon': return <SpoonIcon size={w} />;
    case 'knife': return <KnifeIcon size={w} />;
    case 'plate': return <PlateIcon size={w} />;
    case 'leaf': return <LeafIcon size={w} />;
    case 'tomato': return <TomatoIcon size={w} />;
    case 'carrot': return <CarrotIcon size={w} />;
    case 'broccoli': return <BroccoliIcon size={w} />;
    case 'apple': return <AppleIcon size={w} />;
    case 'bread': return <BreadIcon size={w} />;
    case 'set': return <KitchenDecorSet />;
    case 'logo': return <KitchenLogo />;
    default: return <PlateIcon size={w} />;
  }
};

export default KitchenDecorSet;
