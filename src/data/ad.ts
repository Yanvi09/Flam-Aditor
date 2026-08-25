import { adSpec } from '../engine/spec';
import logoImage from '../assets/logo.png';
import productLarge from '../assets/product.png';
import productMedium from '../assets/product-medium.png';
import productSmall from '../assets/product-small.png';

export const adData = {
  spec: adSpec,
  assets: {
    'logo': logoImage,
    'product-image': productLarge,
    'product-image-large': productLarge,
    'product-image-medium': productMedium,
    'product-image-small': productSmall,
  },
};

export function selectProductAsset(width: number, height: number): string {
  const area = width * height;
  // Large: > 50,000 pixels² (e.g., 200x250 or larger)
  if (area > 50000) {
    return productLarge;
  }
  // Medium: 15,000 - 50,000 pixels² (e.g., 100x150 to 200x250)
  if (area > 15000) {
    return productMedium;
  }
  // Small: <= 15,000 pixels² (e.g., 100x150 or smaller)
  return productSmall;
}