export const PRODUCT_SORT_OPTIONS = ['Our Suggestions', 'Newest', 'Price: Low to High', 'Price: High to Low'] as const;

export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export interface SortableProduct {
  id: string;
  price: number;
}

export function sortProducts<T extends SortableProduct>(products: T[], selectedSort: string): T[] {
  const sortedProducts = [...products];

  switch (selectedSort) {
    case 'Newest':
      return sortedProducts.sort((left, right) => right.id.localeCompare(left.id));
    case 'Price: Low to High':
      return sortedProducts.sort((left, right) => left.price - right.price);
    case 'Price: High to Low':
      return sortedProducts.sort((left, right) => right.price - left.price);
    default:
      return sortedProducts.sort((left, right) => left.id.localeCompare(right.id));
  }
}

export function waitForButtonFeedback(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 240));
}
