import type { ImageSourcePropType } from 'react-native';

/** Banner and hero images, in one place so artwork can be swapped without touching screens. */
export const BANNERS = {
  loginCustomer: require('../../assets/banners/login-customer.jpg') as ImageSourcePropType,
  loginPartner: require('../../assets/banners/login-partner.jpg') as ImageSourcePropType,
  homeServices: require('../../assets/banners/home-services.jpg') as ImageSourcePropType,
  buildHome: require('../../assets/banners/build-home.jpg') as ImageSourcePropType,
  renovation: require('../../assets/banners/renovation.jpg') as ImageSourcePropType,
};

/** Category photos for the home shortcuts (generated with Canva). */
export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  plumbing: require('../../assets/categories/plumbing.jpg') as ImageSourcePropType,
  electrical: require('../../assets/categories/electrical.jpg') as ImageSourcePropType,
  'ac-repair': require('../../assets/categories/ac-repair.jpg') as ImageSourcePropType,
  carpentry: require('../../assets/categories/carpentry.jpg') as ImageSourcePropType,
  painting: require('../../assets/categories/painting.jpg') as ImageSourcePropType,
};
