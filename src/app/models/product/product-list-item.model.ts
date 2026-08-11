export interface ProductListOptions {
  includeDeleted?: boolean;
  fetchAllPages?: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  isDeleted: boolean;
  primaryImageUrl: string;
  hoverImageUrl: string;
  primaryImageAlt: string;
  hoverImageAlt: string;
  coverImageUrl?: string;
  cornerImageUrl?: string;
}
