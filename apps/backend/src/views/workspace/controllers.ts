import { appUser } from "@/db";
import { DB } from "@/db/db";
import { errorToWsErrorPayload, SocketError } from "@ide/ts-utils/src/lib/http";
import { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';
import * as ws from "ws";
import * as Y from 'yjs'
import { Role, Doc, Awareness, Language } from "@ide/shared/src/lib/types"
import { fromBase64ToUint8Array, fromUint8ArrayToBase64 } from "@ide/shared/src/lib/helpers"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { isNullOrUndefined, sleep } from "@ide/ts-utils/src/lib/utils";


const getUserRole = (userId: string, document: {owner: string, sharing: boolean}): Role => {
  if (document.owner === userId) return Role.OWNER
  if (document.sharing) return Role.WRITE
  return Role.NO_ACCESS
}

type Room = {doc: Y.Doc, awareness: Y.Doc, userIdSocketMap: {[userId: string]: ws.WebSocket}, updateDocNameState: ApiState, updateShareInfoState: ApiState}

const newDoc = (document: any) => {
  const doc = new Y.Doc()

  // Create the root map
  const rootMap = doc.getMap<any>();

  rootMap.set('id', document.id);
  rootMap.set('name', document.name);
  rootMap.set('owner', document.owner);
  rootMap.set('sharing', document.sharing);
  rootMap.set('roomId', document.room_id);

  rootMap.set('activeLanguage', Language.PYTHON_3_12);
  const languageCodeMap = new Y.Map();
  languageCodeMap.set(Language.PYTHON_3_12, new Y.Text(""))
  rootMap.set('languageCodeMap', languageCodeMap);

  const whiteboard = new Y.Array();
  rootMap.set('whiteboard', whiteboard);
 
  return doc
}

const docToJson = (doc: Y.Doc): Doc => {
  return doc.getMap().toJSON() as any
}

const awarenessToJson = (awareness: Y.Doc): Awareness => {
  return awareness.getMap().toJSON() as any
}

const newAwareness = () => {
  const doc = new Y.Doc()

  // Create the root map
  const rootMap = doc.getMap<any>();

  const collaborators = new Y.Map();
  rootMap.set('collaborators', collaborators);

  return doc
}

const newRoom = (document): Room => {
  return {
    doc: newDoc(document),
    awareness: newAwareness(),
    userIdSocketMap: {},
    updateDocNameState: ApiState.NOT_LOADED,
    updateShareInfoState: ApiState.NOT_LOADED
  }
}

const updateDocName = async (docId: string) => {
  const pool = await DB.getPool();
  const room = rooms[docId]
  if (room.updateDocNameState === ApiState.LOADING) {
    return
  }
  let name = room.doc.getMap().get("name") as string
  room.updateDocNameState = ApiState.LOADING
  const query = sql.unsafe`
    UPDATE document 
    SET name = ${name} 
    WHERE id::VARCHAR = ${docId}
  `;
  try {
    await pool.query(query)
    room.updateDocNameState = ApiState.LOADED
  }
  catch (error) {
    room.updateDocNameState = ApiState.ERROR
    console.error(`Failed to update doc name for doc: ${docId}`)
    console.error(error)
  }

  let newName = room.doc.getMap().get("name") as string
  if (newName !== name) {
    updateDocName(docId)
  }
}

const updateShareInfo = async (docId: string) => {
  const pool = await DB.getPool();
  const room = rooms[docId]
  if (room.updateShareInfoState === ApiState.LOADING) {
    return
  }
  let [sharing, roomId] = [room.doc.getMap().get("sharing") as boolean, room.doc.getMap().get("roomId") as string]
  room.updateShareInfoState = ApiState.LOADING
  const query = sql.unsafe`
    UPDATE document 
    SET sharing = ${sharing}, room_id = ${roomId} 
    WHERE id::VARCHAR = ${docId}
  `;
  try {
    await pool.query(query)
    room.updateShareInfoState = ApiState.LOADED
  }
  catch (error) {
    room.updateShareInfoState = ApiState.ERROR
    console.error(`Failed to update share info for doc: ${docId}`)
    console.error(error)
  }

  let [newSharing, newRoomId] = [room.doc.getMap().get("sharing") as boolean, room.doc.getMap().get("roomId") as string]
  if (newSharing !== sharing || newRoomId !== roomId) {
    updateShareInfo(docId)
  }
}

const getDocumentByDocIdOrRoomId = async (documentId?: string, roomId?: string) => {
  const pool = await DB.getPool();
  const query = documentId ? sql.unsafe`
    SELECT * FROM document
    WHERE id::VARCHAR = ${documentId}
  ` : sql.unsafe`SELECT * FROM document WHERE room_id::VARCHAR = ${roomId}` ;
  const document = await pool.maybeOne(query)
  return document
}

const getUserLastOpenedDocWithAccess = async (userId: string) => {
  const pool = await DB.getPool();
  const query = sql.unsafe`
    SELECT document.* FROM document
    LEFT JOIN document_usage
    ON document.id = document_usage.document_id
    WHERE
      document_usage.user_id = ${userId} AND
      (document.owner = ${userId} OR (document.sharing AND document.room_id = document_usage.last_known_room_id))  -- access check
    ORDER BY document_usage.last_opened_on DESC
    LIMIT 1;
  `;
  const document = await pool.maybeOne(query)
  return document
}

const addNewDocToDb = async (owner: string) => {
  const pool = await DB.getPool();
  return pool.transaction(async (t) => {
    let query = sql.unsafe`
      INSERT INTO document (owner)
      VALUES (${owner})
      RETURNING *
    `;
    const document = await t.one(query)

    query = sql.unsafe`
      INSERT INTO document_usage (user_id, document_id, last_opened_on)
      VALUES (${owner}, ${document.id}, NOW())
      ON CONFLICT (user_id, document_id)
      DO UPDATE SET 
        last_opened_on = EXCLUDED.last_opened_on
    `
    await t.query(query)

    return document
  })
}

const updateLastOpenedOn = async (userId: string, documentId: string, roomId: string) => {
  const pool = await DB.getPool()
  const query = sql.unsafe`
    INSERT INTO document_usage (user_id, document_id, last_known_room_id, last_opened_on)
    VALUES (${userId}, ${documentId}, ${roomId}, NOW())
    ON CONFLICT (user_id, document_id)
    DO UPDATE SET 
      last_known_room_id = EXCLUDED.last_known_room_id,
      last_opened_on = EXCLUDED.last_opened_on
  `
  await pool.query(query)
}

const addNewRoom = (document) => {
  const room = newRoom(document)
  rooms[document.id] = room

  const {doc, awareness, userIdSocketMap} = room

  doc.on("update", (update, _, __, tr) => {
    console.log('onDocUpdate', tr.local, tr.origin, docToJson(doc))
    const {author = null, type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}

    const collaborators = awarenessToJson(awareness).collaborators
    for (let collaboratorId of Object.keys(collaborators)) {
      if (tr.local || author !== collaboratorId) {
        // send to peers
        const base64Update = fromUint8ArrayToBase64(update)
        const message = {type, data, docDelta: base64Update}
        const clientWs = userIdSocketMap[collaboratorId]
        clientWs.send(JSON.stringify(message))
      }
    }  
  })

  awareness.on("update", (update, _, __, tr) => {
    console.log('onAwarenessUpdate', tr.local, tr.origin)
    const {author = null, type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}

    const collaborators = awarenessToJson(awareness).collaborators
    for (let collaboratorId of Object.keys(collaborators)) {
      if (tr.local || author !== collaboratorId) {
        // send to peers
        const base64Update = fromUint8ArrayToBase64(update)
        const message = {type, data, awarenessDelta: base64Update}
        const clientWs = userIdSocketMap[collaboratorId]
        clientWs.send(JSON.stringify(message))
      }
    }  
  })
}

const rooms: {[docId: string]: Room} = {}

export const room = async (ws: ws.WebSocket, req: Request<{}, {}, {}, {documentId?: string, roomId?: string}>) => {
  console.log('New Client connected');

  let {documentId, roomId} = req.query
  const pool = await DB.getPool()
  const user = req.user
  let updateUserNameState: ApiState = ApiState.NOT_LOADED

  if (documentId || roomId) {
    documentId = documentId || Object.keys(rooms).find((x) => rooms[x].doc.getMap().get("roomId") === roomId)
    const room = rooms[documentId]
    if (room) {
      if (getUserRole(user.id, docToJson(room.doc)) <= Role.NO_ACCESS) {
        throw new SocketError({
          status: 403,
          code: 'forbidden',
          message: `You don't have access to the document`,
          closeSocket: true
        })
      }
      await updateLastOpenedOn(user.id, documentId, docToJson(room.doc).roomId)
    }
    else {
      const document = await getDocumentByDocIdOrRoomId(documentId, roomId)
      if (!document || (getUserRole(user.id, document) <= Role.NO_ACCESS)) {
        throw new SocketError({
          status: 403,
          code: 'forbidden',
          message: `You don't have access to the document`,
          closeSocket: true
        })
      }
      documentId = document.id
      if (!rooms[documentId]) {
        // checking again, as things might have changes since last await
        addNewRoom(document)
      }
      await updateLastOpenedOn(user.id, documentId, document.room_id)
    }
  }
  else {
    let document = await getUserLastOpenedDocWithAccess(user.id)
    if (!document) {
      document = await addNewDocToDb(user.id)
    }
    documentId = document.id
    if (!rooms[documentId]) {
      // checking again, as things might have changes since last await
      addNewRoom(document)
    }
    await updateLastOpenedOn(user.id, documentId, document.room_id)
  }

  // Session specific variables
  const room = rooms[documentId]
  const {doc, awareness, userIdSocketMap} = room;
  const role = getUserRole(user.id, docToJson(room.doc));
  ws.send(JSON.stringify({type: 'init', data: {user, role, doc: fromUint8ArrayToBase64(Y.encodeStateAsUpdate(room.doc)), awareness: fromUint8ArrayToBase64(Y.encodeStateAsUpdate(room.awareness))}}))

  userIdSocketMap[user.id] = ws

  const collaborator = new Y.Map()
  collaborator.set("id", user.id)
  collaborator.set("name", user.name);
  (awareness.getMap().get("collaborators") as any).set(user.id, collaborator)

  const _updateUserName = async () => {
    if (updateUserNameState === ApiState.LOADING) {
      return
    }
    let name = (awareness.getMap().get("collaborators") as any).get(user.id).get("name")
    updateUserNameState = ApiState.LOADING
    const query = sql.unsafe`
      UPDATE app_user 
      SET name = ${name} 
      WHERE id::VARCHAR = ${user.id}
    `;
    try {
      await pool.query(query)
      updateUserNameState = ApiState.LOADED
    }
    catch (error) {
      updateUserNameState = ApiState.ERROR
      console.error(`Failed to update user name for user: ${user.id}`)
      console.error(error)
    }

    const x = (awareness.getMap().get("collaborators") as any).get(user.id)
    if (x && x.get("name") !== name) {
      _updateUserName()
    }
  }

  ws.on('message', (event) => {
    const message = JSON.parse(event.toString())
    const {type, data, docDelta, awarenessDelta} = message

    if (docDelta) {
      Y.applyUpdate(doc, fromBase64ToUint8Array(docDelta), {author: user.id, type, data})
    }
    if (awarenessDelta) {
      Y.applyUpdate(awareness, fromBase64ToUint8Array(awarenessDelta), {author: user.id, type, data})
    }

    switch (type) {
      case "updateDocName": {
        updateDocName(documentId)
        break
      }
      case "toggleSharing":
      case "changeRoomLink": {
        updateShareInfo(documentId)
        const docJson = docToJson(doc)
        if (!docJson.sharing || type === "changeRoomLink") {
          // Sharing stopped, Kick every one out who is not the owner
          const collaborators = awarenessToJson(awareness).collaborators
          const owner = docToJson(doc).owner
          const error = new SocketError({status: 403, code: "forbidden", message: 'You have been kicked out', closeSocket: true})
          const message = {type: "error", data: error.payload}
          for (let collaboratorId of Object.keys(collaborators)) {
            if (collaboratorId !== owner) {
              userIdSocketMap[collaboratorId]?.send(JSON.stringify(message))  
              userIdSocketMap[collaboratorId]?.close(error.payload.wsStatus, error.payload.message)  
            }
          }  
        }
        break
      }
      case "updateUserName": {
        _updateUserName()
        break
      }
    }
  });

  ws.on("close", () => {
    if (awareness) {
      (awareness.getMap().get("collaborators") as any).delete(user.id)
      delete userIdSocketMap[user.id]
    }
  })
}

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  const {user} = req
  const pool = await DB.getPool()

  const query = sql.unsafe`
    SELECT document.*, app_user.name AS owner_name FROM document
    LEFT JOIN document_usage
    ON document.id = document_usage.document_id
    LEFT JOIN app_user
    ON app_user.id = document.owner
    WHERE
      document_usage.user_id = ${user.id} AND
      (document.owner = ${user.id} OR (document.sharing AND document.room_id = document_usage.last_known_room_id))  -- access check
    ORDER BY document_usage.last_opened_on DESC
  `
  const documents =  await pool.any(query)
  return res.status(200).jsonp({documents})
    
}