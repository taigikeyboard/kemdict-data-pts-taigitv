export interface Tag {
  id: number;
  title: string;
}

export interface Word {
  id: number;
  title: string;
  pn: string[];
  zh: string;
  tags: Tag[];
}
