import { ApiProductRecord } from './product-api.model';

export type CareProductApiRecord = ApiProductRecord;

export interface ArtDedicationApiRecord extends ApiProductRecord {
  subtitle?: string;
}

export interface FragranceApiRecord extends ApiProductRecord {
  title?: string;
  badge?: string;
  detail?: string;
}

export interface PromiseHomeProductApiRecord extends ApiProductRecord {
  title?: string;
  badge?: string;
  detail?: string;
}

export interface CareProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  primaryImageUrl: string;
  hoverImageUrl: string;
  primaryImageAlt: string;
  hoverImageAlt: string;
  coverImageUrl?: string;
  cornerImageUrl?: string;
}

export interface ArtDedicationProduct {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
  coverImageUrl?: string;
  hoverImageAlt: string;
}

export interface FragranceProduct {
  id: string;
  title: string;
  badge: string;
  name: string;
  detail: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
}

export interface PromiseHomeProduct {
  id: string;
  title: string;
  badge: string;
  name: string;
  detail: string;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
}
