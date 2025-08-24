export interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price?: number;
  priceUnit?: string;
  surfaceFinish?: string;
  shape?: string;
  material?: string;
  dimensions?: { [key: string]: string };
}