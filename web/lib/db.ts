export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface DbAdapter {
  driver: 'sqlite' | 'mysql';
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DbAdapter) => Promise<T>): Promise<T>;
}

import { config } from './config';

let adapterPromise: Promise<DbAdapter> | null = null;

export async function db(): Promise<DbAdapter> {
  if (!adapterPromise) {
    adapterPromise =
      config.database.driver === 'mysql'
        ? import('./db.mysql').then((m) => m.createMysqlAdapter())
        : import('./db.sqlite').then((m) => m.createSqliteAdapter());
  }
  return adapterPromise;
}
