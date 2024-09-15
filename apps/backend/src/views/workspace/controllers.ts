import { DB } from "@/db/db";
import { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';

export const page = async (req: Request, res: Response, next: NextFunction) => {
  const pool = await DB.getPool()
  const response = await pool.query(sql.unsafe`
    SELECT * FROM app_user  
  `);
  console.log(response)
  res.status(200).jsonp({message: 'Hello World!'});
}
