import type { Knex } from 'knex';

const config: Record<string, Knex.Config> = {
  development: {
    client: 'pg',
    connection: {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432', 10),
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || '',
      database: process.env['DB_NAME'] || 'edge_substrate',
      ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432', 10),
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || '',
      database: process.env['DB_NAME'] || 'edge_substrate_staging',
      ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : true,
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env['DB_HOST'],
      port: parseInt(process.env['DB_PORT'] || '5432', 10),
      user: process.env['DB_USER'],
      password: process.env['DB_PASSWORD'],
      database: process.env['DB_NAME'],
      ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : true,
    },
    pool: { min: 5, max: 20 },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  },
};

export default config[process.env['NODE_ENV'] || 'development'];
