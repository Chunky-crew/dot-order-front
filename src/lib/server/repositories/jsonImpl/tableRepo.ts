import type { TableRepository } from '../types';
import { db } from './persistence';

export class JsonTableRepository implements TableRepository {
  getTableCount(): number {
    return db.state.tableCount;
  }

  setTableCount(count: number): number {
    db.mutate((s) => {
      s.tableCount = count;
    });
    return db.state.tableCount;
  }
}
