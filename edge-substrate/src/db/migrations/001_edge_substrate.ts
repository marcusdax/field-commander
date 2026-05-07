import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('devices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('device_id').unique().notNullable();
    t.string('agent_address', 42).nullable();
    t.string('platform', 16).notNullable();
    t.string('status', 16).notNullable().defaultTo('offline');
    t.jsonb('capabilities').defaultTo('{}');
    t.integer('total_jobs_completed').defaultTo(0);
    t.decimal('total_earnings_eth', 20, 8).defaultTo(0);
    t.timestamp('last_heartbeat',  { useTz: true }).nullable();
    t.timestamp('registered_at',   { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('jobs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('job_type', 32).notNullable();
    t.jsonb('payload').notNullable();
    t.string('status', 16).notNullable().defaultTo('pending');
    t.uuid('assigned_device_id').references('id').inTable('devices').nullable();
    t.string('created_by', 64).nullable();
    t.integer('priority').notNullable().defaultTo(5);
    t.jsonb('result').nullable();
    t.text('error').nullable();
    t.timestamp('created_at',   { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('assigned_at',  { useTz: true }).nullable();
    t.timestamp('completed_at', { useTz: true }).nullable();
    t.timestamp('timeout_at',   { useTz: true }).nullable();
  });

  await knex.schema.createTable('task_executions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('job_id').references('id').inTable('jobs').notNullable();
    t.uuid('device_id').references('id').inTable('devices').notNullable();
    t.string('result_hash', 66).nullable();
    t.string('proof_type', 16).defaultTo('hash');
    t.boolean('success').notNullable().defaultTo(false);
    t.timestamp('started_at',   { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('completed_at', { useTz: true }).nullable();
  });

  await knex.schema.createTable('device_earnings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('device_id').references('id').inTable('devices').notNullable();
    t.uuid('job_id').references('id').inTable('jobs').nullable();
    t.decimal('amount_eth', 20, 8).notNullable();
    t.string('tx_hash', 66).nullable();
    t.timestamp('paid_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('device_earnings');
  await knex.schema.dropTableIfExists('task_executions');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('devices');
}
