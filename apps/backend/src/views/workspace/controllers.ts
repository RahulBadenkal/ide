import { appUser } from "@/db";
import { DB } from "@/db/db";
import { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';
import * as ws from "ws";


export const room = async (ws: ws.WebSocket, req: Request<{}, {}, {}, {documentId?: string, roomId?: string}>) => {
  console.log('New Client connected');

  const {documentId, roomId} = req.query
  const user = req.user
  console.log(user)
  // const pool = await DB.getPool()
  // await pool.query(sql.unsafe`
  //   SELECT * FROM ${appUser.id.name} WHERE 
  // `);

  // if (documentId) {
  //   /* query the doc from db
  //   if doc exists
  //     if user has access to it
  //       make sure to add it to the user doc list
  //       return doc
  //     else
  //       return error
  //   else:
  //     return error
  //   */
  // }
  // else if (roomId) {
  //   /* query the doc from db corresponding to the room
  //   if document exists
  //     if user has access to the doc
  //       make sure to add it to the user doc list
  //       return doc
  //     else
  //       return error
  //   else:
  //     return error
  //   */
  // }
  // else {
  //   /* query the latest created doc for the user 
  //     and return it
  //   */
  // }
  

  
  // ws.on('message', (msg) => {
  //   console.log(msg)
  // });
}