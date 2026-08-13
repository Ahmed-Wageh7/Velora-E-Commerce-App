export interface TaxonomyApiCategory {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  subcategories?: TaxonomyApiSubcategory[];
  isDeleted?: boolean;
}

export interface TaxonomyApiSubcategory {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  category?: string;
  isDeleted?: boolean;
}

export interface NavLinkItem {
  id: string;
  label: string;
  slug: string;
  route: string;
  categoryId?: string;
  subcategoryId?: string;
  children: NavLinkItem[];
}
