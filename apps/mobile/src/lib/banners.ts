import type { ImageSourcePropType } from 'react-native';

/** Banner and hero images, in one place so artwork can be swapped without touching screens. */
export const BANNERS = {
  loginCustomer: require('../../assets/banners/login-customer.jpg') as ImageSourcePropType,
  loginPartner: require('../../assets/banners/login-partner.jpg') as ImageSourcePropType,
  homeServices: require('../../assets/banners/home-services.jpg') as ImageSourcePropType,
  buildHome: require('../../assets/banners/build-home.jpg') as ImageSourcePropType,
  renovation: require('../../assets/banners/renovation.jpg') as ImageSourcePropType,
};
