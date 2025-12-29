
export enum Role {
  ADMIN = 'ADMIN',
  SALESMAN = 'SALESMAN'
}

export interface Product {
  id?: number;
  name: string;
  price1kg: number;
  price05kg: number;
  stockLevel: number;
  isDeleted: number; // 0 for active, 1 for deleted
}

export interface Customer {
  id?: number;
  code: string;
  name: string;
  address: string;
  mobile: string;
}

export interface SaleItem {
  productId: number;
  productName: string;
  type: '1kg' | '0.5kg';
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id?: number;
  invoiceNumber: string;
  customerCode: string;
  customerName: string;
  salesmanId: string;
  date: Date;
  items: SaleItem[];
  totalAmount: number;
  discount: number; // Applied discount in ₹
  synced: boolean;
  syncId?: string;
}

export interface StockLog {
  id?: number;
  productId: number;
  productName: string;
  change: number;
  date: Date;
  reason: string;
}

export interface AppSettings {
  id?: number;
  adminPassword?: string;
  maintenanceKey?: string;
  salesmanPrefix?: Record<string, number>;
}
