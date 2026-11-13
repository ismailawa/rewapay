/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';
import { FieldEncryptionUtil } from '../modules/cray/utils/field-encryption.util';

export class CrayV2SecurityRemediation1794489600000 implements MigrationInterface {
  name = 'CrayV2SecurityRemediation1794489600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const secret = this.encryptionKey();
    await this.encryptAccountColumns(queryRunner, secret);
    await this.migrateWebhookPayloads(queryRunner);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cray_refunds" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reference" varchar(64) NOT NULL UNIQUE,
        "provider_reference" varchar(128),
        "amount" numeric(18,2),
        "status" varchar(32) NOT NULL DEFAULT 'PENDING',
        "provider_status" varchar(64),
        "failure_reason" varchar(255),
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cray_refunds_provider_reference" ON "cray_refunds" ("provider_reference")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cray_refunds_status" ON "cray_refunds" ("status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const secret = this.encryptionKey();
    await queryRunner.query(`DROP TABLE IF EXISTS "cray_refunds"`);
    if (await queryRunner.hasTable('cray_webhook_events')) {
      await queryRunner.query(
        `ALTER TABLE "cray_webhook_events" ADD COLUMN IF NOT EXISTS "raw_payload" text`,
      );
      const events: Array<{ id: string; sanitized_payload: unknown }> =
        await queryRunner.query(
          `SELECT "id", "sanitized_payload" FROM "cray_webhook_events"`,
        );
      for (const event of events)
        await queryRunner.query(
          `UPDATE "cray_webhook_events" SET "raw_payload" = $1 WHERE "id" = $2`,
          [JSON.stringify(event.sanitized_payload), event.id],
        );
      await queryRunner.query(
        `ALTER TABLE "cray_webhook_events" DROP COLUMN IF EXISTS "fingerprint", DROP COLUMN IF EXISTS "sanitized_payload"`,
      );
      await queryRunner.query(
        `ALTER TABLE "cray_webhook_events" ALTER COLUMN "raw_payload" SET NOT NULL`,
      );
    }
    await this.decryptAccountColumns(queryRunner, secret);
  }

  private async encryptAccountColumns(
    queryRunner: QueryRunner,
    secret: string,
  ): Promise<void> {
    const definitions = [
      { table: 'cray_virtual_accounts', hash: false },
      { table: 'cray_beneficiaries', hash: true },
      { table: 'cray_transfers', hash: false },
    ];
    for (const definition of definitions) {
      if (!(await queryRunner.hasTable(definition.table))) continue;
      await queryRunner.query(
        `ALTER TABLE "${definition.table}" ADD COLUMN IF NOT EXISTS "account_number_encrypted" text, ADD COLUMN IF NOT EXISTS "account_number_last4" varchar(4)`,
      );
      if (definition.hash)
        await queryRunner.query(
          `ALTER TABLE "${definition.table}" ADD COLUMN IF NOT EXISTS "account_number_hash" varchar(64)`,
        );
      const rows: Array<{ id: string; account_number: string }> =
        await queryRunner.query(
          `SELECT "id", "account_number" FROM "${definition.table}" WHERE "account_number" IS NOT NULL`,
        );
      for (const row of rows) {
        const encrypted = FieldEncryptionUtil.encrypt(
          row.account_number,
          secret,
        );
        const last4 = row.account_number.slice(-4);
        if (definition.hash) {
          await queryRunner.query(
            `UPDATE "${definition.table}" SET "account_number_encrypted"=$1, "account_number_last4"=$2, "account_number_hash"=$3 WHERE "id"=$4`,
            [
              encrypted,
              last4,
              FieldEncryptionUtil.lookupHash(row.account_number, secret),
              row.id,
            ],
          );
        } else {
          await queryRunner.query(
            `UPDATE "${definition.table}" SET "account_number_encrypted"=$1, "account_number_last4"=$2 WHERE "id"=$3`,
            [encrypted, last4, row.id],
          );
        }
      }
      await queryRunner.query(
        `ALTER TABLE "${definition.table}" DROP COLUMN "account_number", ALTER COLUMN "account_number_encrypted" SET NOT NULL, ALTER COLUMN "account_number_last4" SET NOT NULL`,
      );
      if (definition.hash) {
        await queryRunner.query(
          `ALTER TABLE "${definition.table}" ALTER COLUMN "account_number_hash" SET NOT NULL`,
        );
        await queryRunner.query(
          `CREATE INDEX IF NOT EXISTS "IDX_${definition.table}_account_hash" ON "${definition.table}" ("account_number_hash")`,
        );
      }
    }
  }

  private async decryptAccountColumns(
    queryRunner: QueryRunner,
    secret: string,
  ): Promise<void> {
    for (const table of [
      'cray_virtual_accounts',
      'cray_beneficiaries',
      'cray_transfers',
    ]) {
      if (!(await queryRunner.hasTable(table))) continue;
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "account_number" varchar(32)`,
      );
      const rows: Array<{ id: string; account_number_encrypted: string }> =
        await queryRunner.query(
          `SELECT "id", "account_number_encrypted" FROM "${table}"`,
        );
      for (const row of rows)
        await queryRunner.query(
          `UPDATE "${table}" SET "account_number"=$1 WHERE "id"=$2`,
          [
            FieldEncryptionUtil.decrypt(row.account_number_encrypted, secret),
            row.id,
          ],
        );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "account_number" SET NOT NULL, DROP COLUMN "account_number_encrypted", DROP COLUMN "account_number_last4"`,
      );
      if (table === 'cray_beneficiaries')
        await queryRunner.query(
          `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "account_number_hash"`,
        );
    }
  }

  private async migrateWebhookPayloads(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (!(await queryRunner.hasTable('cray_webhook_events'))) return;
    await queryRunner.query(
      `ALTER TABLE "cray_webhook_events" ADD COLUMN IF NOT EXISTS "fingerprint" varchar(64), ADD COLUMN IF NOT EXISTS "sanitized_payload" jsonb`,
    );
    const rows: Array<{ id: string; event_type: string; raw_payload: string }> =
      await queryRunner.query(
        `SELECT "id", "event_type", "raw_payload" FROM "cray_webhook_events"`,
      );
    for (const row of rows) {
      let payload: unknown = {};
      try {
        payload = JSON.parse(row.raw_payload);
      } catch {
        payload = { legacyPayload: '[unparseable]' };
      }
      const fingerprint = crypto
        .createHash('sha256')
        .update(`${row.id}\n${row.event_type}\n${row.raw_payload}`)
        .digest('hex');
      await queryRunner.query(
        `UPDATE "cray_webhook_events" SET "fingerprint"=$1, "sanitized_payload"=$2::jsonb WHERE "id"=$3`,
        [fingerprint, JSON.stringify(this.redact(payload)), row.id],
      );
    }
    await queryRunner.query(
      `ALTER TABLE "cray_webhook_events" DROP COLUMN "raw_payload", ALTER COLUMN "fingerprint" SET NOT NULL, ALTER COLUMN "sanitized_payload" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cray_webhook_events_fingerprint" ON "cray_webhook_events" ("fingerprint")`,
    );
  }

  private redact(value: unknown, key = ''): unknown {
    if (/bvn|nin|otp|account.?number|card|cvv|secret/i.test(key)) {
      const text = String(value || '');
      return text.length >= 4 ? `***${text.slice(-4)}` : '****';
    }
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([childKey, child]) => [childKey, this.redact(child, childKey)],
        ),
      );
    return value;
  }

  private encryptionKey(): string {
    const key = process.env.CRAY_DATA_ENCRYPTION_KEY;
    if (!key)
      throw new Error(
        'CRAY_DATA_ENCRYPTION_KEY is required to migrate sensitive account data',
      );
    return key;
  }
}
