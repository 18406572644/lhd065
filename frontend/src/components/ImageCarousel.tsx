import React, { useState, useEffect, useCallback } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

export interface ImageCarouselProps {
  images: string[];
  fallbackIcon?: React.ReactNode;
  height?: number | string;
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  fit?: 'cover' | 'contain' | 'fill';
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  fallbackIcon,
  height = 200,
  autoPlay = true,
  interval = 3000,
  showDots = true,
  showArrows = true,
  fit = 'cover',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const validImages = images?.filter(Boolean) || [];
  const hasImages = validImages.length > 0;

  const goToNext = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const goToPrev = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  useEffect(() => {
    if (!autoPlay || isHovering || validImages.length <= 1) return;
    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, isHovering, interval, goToNext, validImages.length]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [validImages.length]);

  if (!hasImages) {
    return (
      <div
        style={{
          width: '100%',
          height,
          background: 'linear-gradient(135deg, #DCEDC8 0%, #FFCCBC 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          overflow: 'hidden',
        }}
      >
        {fallbackIcon}
      </div>
    );
  }

  if (validImages.length === 1) {
    return (
      <div
        style={{
          width: '100%',
          height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={validImages[0]}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        style={{
          display: 'flex',
          width: `${validImages.length * 100}%`,
          height: '100%',
          transform: `translateX(-${currentIndex * (100 / validImages.length)}%)`,
          transition: 'transform 0.5s ease-in-out',
        }}
      >
        {validImages.map((img, idx) => (
          <div
            key={idx}
            style={{
              width: `${100 / validImages.length}%`,
              height: '100%',
              flexShrink: 0,
            }}
          >
            <img
              src={img}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: fit,
                display: 'block',
              }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isHovering ? 1 : 0,
              transition: 'opacity 0.2s',
              color: '#4A4A4A',
              fontSize: 14,
              padding: 0,
            }}
          >
            <LeftOutlined />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isHovering ? 1 : 0,
              transition: 'opacity 0.2s',
              color: '#4A4A4A',
              fontSize: 14,
              padding: 0,
            }}
          >
            <RightOutlined />
          </button>
        </>
      )}

      {showDots && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            opacity: isHovering ? 1 : 0.8,
            transition: 'opacity 0.2s',
          }}
        >
          {validImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              style={{
                width: idx === currentIndex ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: idx === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
