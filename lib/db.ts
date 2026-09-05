import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || '';

export const sql = databaseUrl
  ? neon(databaseUrl)
  : ((query: any) => {
      console.warn('DATABASE_URL not set; database query skipped during build/static evaluation.');
      return Promise.resolve([]);
    }) as any;

export const db = sql;
export default sql;
