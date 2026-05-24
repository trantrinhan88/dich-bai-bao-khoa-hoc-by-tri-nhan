// types/magazine.ts

export interface IArticleItem {
  id: string;
  title: string;
  subtitle?: string;
  contentSnippet?: string;
  pageNumber?: number;
  badge?: string; // Dùng cho các thẻ phân loại như "Physics", "Health", "Tech"
}

export interface IMagazineColumn {
  columnId: 'left' | 'center' | 'right';
  columnHeader: string;
  articles: IArticleItem[];
}

export interface IMagazineData {
  volumeInfo: string;
  publishDate: string;
  layoutColumns: IMagazineColumn[];
}
