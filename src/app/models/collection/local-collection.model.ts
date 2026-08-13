export interface LocalCollectionUiConfig {
  heroImageFile?: string;
  imageFiles?: string[];
  minimumLoadingMs?: number;
  includeDeletedProducts?: boolean;
  fetchAllPages?: boolean;
}

export interface LocalCollectionPageConfig extends LocalCollectionUiConfig {
  title: string;
  folder: string;
  products?: never[];
}
