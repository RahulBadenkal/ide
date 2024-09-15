import {
  createPool,
  DatabasePool,
} from 'slonik';
import { createPostgresDbConnectionUri } from "@ide/ts-utils/src/lib/db-utils";
import { isNullOrUndefined } from "@ide/ts-utils/src/lib/utils";


export class DB {
  private static _pool: DatabasePool

  static async getPool(): Promise<DatabasePool> {
    if (isNullOrUndefined(DB._pool)) {
      await DB.initializePool()
    }
    return DB._pool
  }

  private static async initializePool() {
    const connectionString = createPostgresDbConnectionUri({
      host: process.env.DB_HOST!,
      port: +process.env.DB_PORT!,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      name: process.env.DB_NAME!
    })
    console.log(connectionString)
    DB._pool = await createPool(connectionString, {
      idleInTransactionSessionTimeout: 60000,
      idleTimeout: 5000,
      maximumPoolSize: 10,
      minimumPoolSize: 1,
    });
  }
}