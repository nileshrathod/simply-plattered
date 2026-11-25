import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { PlatterProduct } from '../types/simplyPlattered';

export const POSTER_IMAGE_PATH = `${import.meta.env.BASE_URL}assets/aistudio/image_e19b6e2d.png`;

interface PlatterImageProps {
  product: PlatterProduct;
  className?: string;
}

/**
 * Displays either a custom uploaded platter photo, an exact clean crop from the supplied
 * Simply Plattered festive poster, or a styled editorial fallback if an image fails to load.
 */
export function PlatterImage({ product, className = '' }: PlatterImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden bg-[#ECEAE4] dark:bg-[#23221F] flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <UtensilsCrossed className="w-7 h-7 text-[#164E37]/60 dark:text-[#5ED09E]/70 mb-2" aria-hidden="true" />
        <p className="font-display text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0]">{product.name}</p>
        <p className="text-xs text-[#64605A] dark:text-[#A8A29E] mt-1">{product.servesText}</p>
      </div>
    );
  }

  if (product.customImageDataUrl) {
    return (
      <div className={`relative aspect-[4/3] w-full overflow-hidden bg-[#1C1917] ${className}`}>
        <img
          src={product.customImageDataUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (product.posterCrop) {
    const { widthPercent, translateXPercent, translateYPercent } = product.posterCrop;
    return (
      <div className={`relative aspect-[4/3] w-full overflow-hidden bg-[#231914] ${className}`}>
        <img
          src={POSTER_IMAGE_PATH}
          alt={`${product.name} — Simply Plattered`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{
            width: `${widthPercent}%`,
            maxWidth: 'none',
            height: 'auto',
            transform: `translate(${translateXPercent}%, ${translateYPercent}%)`,
          }}
          className="absolute top-0 left-0 select-none pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden bg-[#ECEAE4] dark:bg-[#23221F] flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <UtensilsCrossed className="w-7 h-7 text-[#164E37]/60 dark:text-[#5ED09E]/70 mb-2" aria-hidden="true" />
      <p className="font-display text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0]">{product.name}</p>
      <p className="text-xs text-[#64605A] dark:text-[#A8A29E] mt-1">{product.servesText}</p>
    </div>
  );
}
