import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL environment variable is not defined.');
}

export const sql = neon(databaseUrl || '');
export const db = sql;
export default sql;
