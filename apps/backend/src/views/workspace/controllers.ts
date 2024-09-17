import { appUser } from "@/db";
import { DB } from "@/db/db";
import { SocketError } from "@ide/ts-utils/src/lib/http";
import { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';
import * as ws from "ws";
import * as Y from 'yjs'

enum Role {
  OWNER = 3,
  WRITE = 2,
  READ = 1,
  NO_ACCESS = 0
}

const getUserRole = (userId: string, document: any): Role => {
  if (document.owner === userId) return Role.OWNER 
  return document.isSharing ? (
    document.room_write_access ? Role.WRITE : Role.READ 
  ) : Role.NO_ACCESS
}

const updateLastOpenedOn = async (userId: string, documentId: string) => {
  const pool = await DB.getPool()
  const query = sql.unsafe`
    INSERT INTO document_usage (user_id, document_id, last_opened_on)
    VALUES (${userId}, ${documentId}, NOW())
    ON CONFLICT (user_id, document_id)
    DO UPDATE SET 
      last_opened_on = EXCLUDED.last_opened_on
  `
  await pool.query(query, [userId, documentId])
}

const fetchUserDocuments = async (userId: string) => {
  const pool = await DB.getPool()
  const query = sql.unsafe`
    SELECT * FROM document_usage
    LEFT JOIN document
    ON document_usage.document_id = document.id
    WHERE user_id = ${userId} AND (document.owner = ${userId} OR document.is_sharing)
    ORDER BY last_opened_on DESC
  `
  const documents = (await pool.query(query, [userId])).rows
  for (let document of documents) {
    document.role = getUserRole(userId, document)
  }
  return documents
}

// This is persisted doc
const newDoc = () => {
  return {
    // room related variables
    isSharing: false,
    roomId: "",

    // code editor variables
    activeLanguage: '',
    languageCodeMap: {},
    
    // whiteboard variables
    whiteboard: '',
  }
}

const newSessionDoc = () => {
  return {
    
  }
}

const yDocs = {}

export const room = async (ws: ws.WebSocket, req: Request<{}, {}, {}, {documentId?: string, roomId?: string}>) => {
  console.log('New Client connected');

  const {documentId, roomId} = req.query
  const user = req.user
  const pool = await DB.getPool()

  if (documentId || roomId) {
    let query = documentId ? sql.unsafe`
      SELECT * FROM document
      WHERE id::TEXT = ${documentId}
    ` : sql.unsafe`
      SELECT * FROM document
      WHERE room_id::TEXT = ${roomId}
    `
    const document = (await pool.query(query, [documentId || roomId])).rows[0]
    const role = document ? getUserRole(user.id, document) : Role.NO_ACCESS
    if (role <= Role.NO_ACCESS) {
      throw new SocketError({
        status: 403,
        code: 'forbidden',
        message: `You don't have access to the document`,
        closeSocket: true
      })
    }
    document.role = role
    await updateLastOpenedOn(user.id, document.id)
    const documents = await fetchUserDocuments(user.id)
    yDocs[documentId] = yDocs[documentId] || new Y.Doc()
    ws.send(JSON.stringify({type: 'init', data: {user, document, documents}}))
  }
  else {
    let query = sql.unsafe`
      SELECT document.* FROM document
      LEFT JOIN document_usage
      ON document.id = document_usage.document_id
      ORDER BY document_usage.last_opened_on DESC
      LIMIT 1;
    `
    let document = (await pool.query(query)).rows[0]
    if (!document) {
      query = sql.unsafe`
        INSERT INTO document (owner)
        VALUES (${user.id})
        RETURNING *
      `
      document = (await pool.query(query, [user.id])).rows[0]
    }
    document.role = getUserRole(user.id, document)
    await updateLastOpenedOn(user.id, document.id)
    const documents = await fetchUserDocuments(user.id)
    ws.send(JSON.stringify({type: 'init', data: {user, document, documents}}))
  }
  
  // ws.on('message', (msg) => {
  //   console.log(msg)
  // });
}