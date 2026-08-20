import type { AdSpecification } from './types';

export const adSpec: AdSpecification = {
  elements: [
    {
      id: 'headline',
      type: 'text',
      role: 'primary',
      priority: 1,
      content: 'Reset Your Skin.',
    },
    {
      id: 'product-image',
      type: 'image',
      role: 'hero',
      priority: 1,
      content: 'NV Daily Reset Gentle Face Cleanser',
    },
    {
      id: 'cta',
      type: 'button',
      role: 'action',
      priority: 2,
      content: 'Shop Now',
    },
    {
      id: 'price',
      type: 'text',
      role: 'secondary',
      priority: 2,
      content: '₹499',
    },
    {
      id: 'logo',
      type: 'image',
      role: 'branding',
      priority: 3,
      content: 'NV SKIN',
    },
  ],
};

export function getAdElementById(id: string) {
  return adSpec.elements.find((el) => el.id === id);
}