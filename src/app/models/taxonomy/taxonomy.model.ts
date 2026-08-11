export interface TaxonomyApiCategory {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  subcategories?: TaxonomyApiSubcategory[];
}

export interface TaxonomyApiSubcategory {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  category?: string;
}

export interface NavLinkItem {
  id: string;
  label: string;
  slug: string;
  route: string;
  children: NavLinkItem[];
}
