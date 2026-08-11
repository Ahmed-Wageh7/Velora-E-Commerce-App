export interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  collectionLabel: string;
  imageUrl: string;
  route: (string | number)[];
}
