import { InferSelectModel, sql } from "drizzle-orm";
import { pgTable, varchar, uuid, timestamp } from 'drizzle-orm/pg-core';


export const appUser = pgTable('app_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name'),
  createdOn: timestamp('created_on', {withTimezone: true}).notNull().default(sql`NOW()`),
  updatedOn: timestamp('updated_on', {withTimezone: true}).notNull().default(sql`NOW()`)  
});

export type AppUser = InferSelectModel<typeof appUser>;  // For `SELECT *`
