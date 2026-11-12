import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const projectRoot = process.cwd();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(projectRoot, 'src/modules/cray/entities/*.entity.{ts,js}')],
  migrations: [join(projectRoot, 'src/migrations/*.{ts,js}')],
  synchronize: false,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
});
