import React from 'react';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  backgroundImage?: 'innovation' | 'tech-network' | 'hero-bg' | 'none';
  children?: React.ReactNode;
  className?: string;
  /** 
   * Hero section size
   * - normal: 100px/60px padding (default for secondary pages)
   * - large: 200px/120px padding (for important pages)
   * - extra-large: 200px/240px padding (mobile: 200px, desktop: 240px for homepage and special landing pages)
   */
  size?: 'normal' | 'large' | 'extra-large';
}

const backgroundImages = {
  innovation: '/images/hero/innovation-bg.jpg',
  'tech-network': '/images/hero/tech-network-bg.jpg',
  'hero-bg': '/images/hero/hero-bg.jpg',
  none: undefined
};

export default function HeroSection({ 
  title, 
  subtitle, 
  backgroundImage = 'innovation', 
  children, 
  className = '',
  size = 'normal'
}: HeroSectionProps) {
  const bgImage = backgroundImages[backgroundImage];
  
  // Define size classes
  // Mobile-first: mobile values are larger, desktop values are smaller
  const sizeClasses = {
    normal: 'py-[100px] md:py-[60px]',
    large: 'py-[200px] md:py-[120px]',
    'extra-large': 'py-[200px] md:py-[240px]' // Mobile: 200px (half of original 400px), Desktop: 240px (unchanged)
  };
  
  return (
    <section
      className={`hero text-white ${sizeClasses[size]} text-center overflow-x-hidden relative bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center ${className}`}
      aria-label="Hero section"
      style={bgImage ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : undefined}
    >
      {/* Overlay for better text readability */}
      {bgImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/80 via-primary/70 to-primary-light/80"></div>
      )}
      
      <div className="container mx-auto px-5 max-w-[1200px] relative z-10">
        <div className="hero-content max-w-full mx-auto px-[15px] flex flex-col items-center justify-center">
          <h1 className="text-[1.4rem] md:text-[2.5rem] mb-5 md:mb-4 leading-tight font-bold">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[0.9rem] md:text-[1.1rem] mb-[30px] md:mb-6 opacity-90 leading-relaxed max-w-4xl">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}