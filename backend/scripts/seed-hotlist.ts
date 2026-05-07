/**
 * Seed Redis hotlist for local dev and integration testing.
 * Run: ts-node backend/scripts/seed-hotlist.ts
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const HOTLIST = [
  'ABC1234', 'XYZ7891', 'MTEST01', 'DEF4567',
  'GHI8902', 'TEST0001', 'TEST0002', 'TEST0003',
];

const GEO_HOTZONES = [
  { name: 'downtown_la',    lon: -118.2437, lat:  34.0522 },
  { name: 'south_chicago',  lon:  -87.6298, lat:  41.8336 },
  { name: 'east_detroit',   lon:  -83.0458, lat:  42.3314 },
  { name: 'north_houston',  lon:  -95.3698, lat:  29.7604 },
  { name: 'miami_beach',    lon:  -80.1300, lat:  25.7906 },
];

async function main() {
  const redis = new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'],
  });

  console.log('[Seed] Seeding Redis hotlist...');
  const pipe = redis.pipeline();
  for (const plate of HOTLIST) {
    const hash = crypto.createHash('sha256').update(plate).digest('hex');
    pipe.sadd('hotlist:plates', hash);
    console.log(`  ${plate} → ${hash.slice(0, 16)}...`);
  }
  await pipe.exec();
  console.log(`[Seed] Hotlist size: ${await redis.scard('hotlist:plates')} plates`);

  console.log('\n[Seed] Seeding geo hotzones...');
  for (const z of GEO_HOTZONES) {
    await redis.geoadd('geo:hotzones', z.lon, z.lat, z.name);
    console.log(`  ${z.name} @ ${z.lat},${z.lon}`);
  }

  // Verify
  const testHash = crypto.createHash('sha256').update('ABC1234').digest('hex');
  const hit = await redis.sismember('hotlist:plates', testHash);
  console.log(`\n[Seed] Verify ABC1234: ${hit === 1 ? '✓ HIT' : '✗ MISS'}`);

  await redis.quit();
  console.log('[Seed] Done.');
}

main().catch(console.error);
