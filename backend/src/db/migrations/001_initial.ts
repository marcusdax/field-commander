import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agents', (t) => {
    t.string('id', 42).primary();                 // Ethereum address
    t.string('name').notNullable().defaultTo('');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('registered_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('recoveries', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('plate_hash', 66).notNullable();
    t.string('agent_id', 42).references('id').inTable('agents').onDelete('SET NULL');
    t.integer('confidence').notNullable();
    t.string('evidence_hash', 66);
    t.string('anchor_tx_hash', 66);
    t.string('dta_tx_hash', 66);
    t.decimal('payout_eth', 20, 8);
    t.decimal('tcr_reward', 20, 8);
    t.string('status', 16).notNullable().defaultTo('PENDING');  // PENDING|VERIFIED|PAID|FAILED
    t.jsonb('kda_output');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('verified_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('hotlist_audit', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('plate_hash', 66).notNullable().index();
    t.boolean('hit').notNullable();
    t.string('agent_id', 42).nullable();
    t.string('session_id', 64).nullable();
    t.decimal('lat', 10, 7).nullable();
    t.decimal('lon', 10, 7).nullable();
    t.float('confidence').nullable();
    t.string('recommended_action', 32).nullable();
    t.timestamp('scanned_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('hotlist_audit');
  await knex.schema.dropTableIfExists('recoveries');
  await knex.schema.dropTableIfExists('agents');
}
