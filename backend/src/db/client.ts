import knex from 'knex';
import type { Knex } from 'knex';

export const db: Knex = knex({
  client: 'pg',
  connection: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    database: process.env['DB_NAME'] ?? 'field_commander',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? '',
    ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: { min: 2, max: 10 },
});
