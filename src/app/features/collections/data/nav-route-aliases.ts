import { LocalCollectionPageConfig, LOCAL_COLLECTIONS } from './local-collection-data';

const aliasEntries: Array<[string, LocalCollectionPageConfig]> = [
  [
    'art-of-detecation-perfumes',
    {
      title: 'The Art of Dedication',
      folder: 'The-Art-Dedication',
      imageFiles: ['image1.webp'],
      products: [],
    },
  ],
  [
    'dokhur-collection',
    {
      title: 'Dokhur Collection',
      folder: 'Dokhur-collection',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['image1.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'high-constdiration-collection',
    {
      title: 'High constdiration collection',
      folder: 'high-constdiration-collection',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'new-collection',
    {
      title: 'New Collection',
      folder: 'new-collection',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'special-offers',
    {
      title: 'Special Offers',
      folder: 'special-offers',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'perfumers-choices',
    {
      title: "Perfumers' Choices",
      folder: 'perfumers-choices',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'the-new-covenant-2026',
    {
      title: 'The New Covenant-2026',
      folder: 'the-new-covenant-2026',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
  [
    'winter-collection',
    {
      title: 'Winter Collection',
      folder: 'winter-collection',
      heroImageFile: '/perfumes-head.webp',
      imageFiles: ['images01.png'],
      products: [],
      includeDeletedProducts: true,
      fetchAllPages: true,
      minimumLoadingMs: 650,
    },
  ],
];

export const NAV_LOCAL_COLLECTIONS: Record<string, LocalCollectionPageConfig> = {
  ...LOCAL_COLLECTIONS,
  ...Object.fromEntries(aliasEntries),
};
