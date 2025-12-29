
// Fix: Use named import for Dexie to ensure proper class inheritance in TypeScript
import { Dexie, Table } from 'dexie';
import { Product, Customer, Sale, StockLog, AppSettings } from './types';

export class ERPDatabase extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  sales!: Table<Sale>;
  stockLogs!: Table<StockLog>;
  settings!: Table<AppSettings>;

  constructor() {
    super('AVFinal001DB');
    // Fix: Explicitly cast to any to ensure the 'version' method is correctly identified during construction
    (this as any).version(2).stores({
      products: '++id, name, isDeleted',
      customers: '++id, code, name, mobile',
      sales: '++id, invoiceNumber, customerCode, salesmanId, date, synced, syncId',
      stockLogs: '++id, productId, date',
      settings: '++id'
    });
  }

  // Transaction-safe write with error reporting
  async safeWrite<T>(table: Table<T>, data: any, mode: 'add' | 'put' | 'update' = 'add') {
    try {
      if (mode === 'add') return await table.add(data);
      if (mode === 'put') return await table.put(data);
      if (typeof data === 'object' && 'id' in data) {
        return await table.update(data.id, data);
      }
    } catch (error) {
      console.error(`DB Write Error [${table.name}]:`, error);
      throw error;
    }
  }
}

export const db = new ERPDatabase();

export async function ensurePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }
}

export async function getDatabaseSize() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}
