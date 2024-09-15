import { appUser } from '@/db';
import { DB } from '@/db/db';
import { HttpError } from '@ide/ts-utils/src/lib/http';
import { getTableName } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';
import {WebSocket} from "ws";

const attachUserInfo = async (req: Request) => {
  req.requestId = crypto.randomUUID();
  const userId = req.query['x-user-id'] as string | undefined;
  if (!userId) {
    throw new HttpError({
      status: 401,
      code: "unauthorized",
      message: "User info not passed",
    })
  }
  const pool = await DB.getPool()
  const sqlQuery = sql.unsafe`
    WITH new_user AS (
      INSERT INTO app_user (id)
      VALUES (${userId})
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    ), 
    existing_user AS (
      SELECT * FROM app_user WHERE id = ${userId}
    )
    SELECT * FROM new_user
    UNION ALL
    SELECT * FROM existing_user;
  `
  const user = (await pool.query(sqlQuery, [userId])).rows[0]
  req.user = user
}

export const wsAttachUserInfo = async (ws: WebSocket, req: Request, next: NextFunction) => {
  await attachUserInfo(req)
  return next();
}

export const httpAttachUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  await attachUserInfo(req)
  return next();
}