import { appUser } from "@/db";
import { DB } from "@/db/db";
import { errorToWsErrorPayload, httpErrorCodeToWsErrorCode, SocketError } from "@ide/ts-utils/src/lib/http";
import e, { NextFunction, Request, Response } from 'express';
import { sql } from 'slonik';
import WebSocket from "ws";
import * as Y from 'yjs'
import { Role, Doc, Awareness, Language } from "@ide/shared/src/lib/types"
import { fromBase64ToUint8Array, fromUint8ArrayToBase64, LangToPistonLangMap } from "@ide/shared/src/lib/helpers"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { isNullOrUndefined, sleep } from "@ide/ts-utils/src/lib/utils";
import * as awarenessProtocol from 'y-protocols/awareness.js'


const getUserRole = (userId: string, document: {owner: string, sharing: boolean}): Role => {
  if (document.owner === userId) return Role.OWNER
  if (document.sharing) return Role.WRITE
  return Role.NO_ACCESS
}

type Room = {
  yDoc: Y.Doc,  yAwareness: Y.Doc, newYAwareness: awarenessProtocol.Awareness,
  prevDoc: Doc, doc: Doc, prevAwareness: Awareness, awareness: Awareness, 
  userIdSocketMap: {[userId: string]: WebSocket}, 
  updateDocNameState: ApiState, 
  updateShareInfoState: ApiState,
  codeExecutionSocket?: WebSocket,
  addedOn: string;  // Time at which room was created
  updatedAt: string;  // Time at which any data in room was last updated (doc/awareness)
  docUpdatedAt: string;  // Time at which doc was last updated
  docSyncedId?: string;  // docUpdatedAt value when the doc was last synced to db
}

const newDoc = (document: any) => {
  const yDoc = new Y.Doc()

  // Create the root map
  const rootMap = yDoc.getMap<any>();

  // room info
  rootMap.set('id', document.id);
  rootMap.set('name', document.name);
  rootMap.set('owner', document.owner);
  rootMap.set('sharing', document.sharing);
  rootMap.set('roomId', document.room_id);

  // code editor
  rootMap.set('activeLanguage', Language.PYTHON_3_12);
  const languageCodeMap = new Y.Map();
  languageCodeMap.set(Language.PYTHON_3_12, new Y.Text(""))
  rootMap.set('languageCodeMap', languageCodeMap);

  // whiteboard
  const whiteboard = new Y.Array();
  rootMap.set('whiteboard', whiteboard);
 
  return yDoc
}

const yDocToJson = (yDoc: Y.Doc): Doc => {
  return yDoc.getMap().toJSON() as any
}

const yAwarenessToJson = (yAwareness: Y.Doc): Awareness => {
  return yAwareness.getMap().toJSON() as any
}

const newAwareness = () => {
  const yDoc = new Y.Doc()

  // Create the root map
  const rootMap = yDoc.getMap<any>();

  const collaborators = new Y.Map();
  rootMap.set('collaborators', collaborators);

  return yDoc
}

const newRoom = (document): Room => {
  let yDoc: Y.Doc;
  if (document.y_doc) {
    // initialize from db
    yDoc = new Y.Doc()
    Y.applyUpdate(yDoc, document.y_doc)
  }
  else {
    // initialize an empty doc
    yDoc = newDoc(document)
  }
  const doc = yDoc.getMap().toJSON() as any
  const yAwareness = newAwareness()
  const awareness = yAwareness.getMap().toJSON() as any
  const newYAwareness = new awarenessProtocol.Awareness(yDoc)

  const now = new Date().toISOString();
  return {
    yDoc, yAwareness, newYAwareness,
    prevDoc:  doc, doc, prevAwareness: awareness, awareness,
    userIdSocketMap: {},
    updateDocNameState: ApiState.NOT_LOADED,
    updateShareInfoState: ApiState.NOT_LOADED,
    addedOn: now,
    updatedAt: now,
    docUpdatedAt: now,
    docSyncedId: document.y_doc ? now : null
  }
}

const updateDocName = async (docId: string) => {
  const pool = await DB.getPool();
  const room = rooms[docId]
  if (room.updateDocNameState === ApiState.LOADING) {
    return
  }
  let name = room.yDoc.getMap().get("name") as string
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

  let newName = room.yDoc.getMap().get("name") as string
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
  let [sharing, roomId] = [room.yDoc.getMap().get("sharing") as boolean, room.yDoc.getMap().get("roomId") as string]
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

  let [newSharing, newRoomId] = [room.yDoc.getMap().get("sharing") as boolean, room.yDoc.getMap().get("roomId") as string]
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

const sendMessageToOthers = (room: Room, message: string, author: string) => {
  const {yAwareness, userIdSocketMap} = room
  const collaborators = yAwarenessToJson(yAwareness).collaborators
  for (let collaboratorId of Object.keys(collaborators)) {
    if (author !== collaboratorId) {
      const clientWs = userIdSocketMap[collaboratorId]
      clientWs.send(message)
    }
  }
}

const addNewRoom = (document) => {
  const room = newRoom(document)
  rooms[document.id] = room

  const {yDoc, yAwareness, newYAwareness} = room

  yDoc.on("update", (update, _, __, tr) => {
    const {author = null, type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}
    console.log('onDocUpdate', tr.local, author, type)  // , tr.origin, docToJson(doc))

    const base64Update = fromUint8ArrayToBase64(update)
    const message = {type, data, docDelta: base64Update}
    
    sendMessageToOthers(room, JSON.stringify(message), author)

    const now = new Date().toISOString()
    room.prevDoc = room.doc
    room.doc = yDoc.getMap().toJSON() as any;
    room.docUpdatedAt = now  // TODO: Should we use a counter instead as there is a possibility that two updates have same timestamp?
    room.updatedAt = now
  })

  yAwareness.on("update", (update, _, __, tr) => {
    console.log('onAwarenessUpdate', tr.local, tr.origin)
    const {author = null, type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}

    const base64Update = fromUint8ArrayToBase64(update)
    const message = {type, data, awarenessDelta: base64Update}

    sendMessageToOthers(room, JSON.stringify(message), author)

    room.prevAwareness = room.awareness
    room.awareness = yAwareness.getMap().toJSON() as any
    console.log('awareness update', room.awareness)
    room.updatedAt = new Date().toISOString()
  })

  newYAwareness.on('change', ({ added, updated, removed }, origin, t) => {
    console.log('onNewYjsAwarenessUpdate', {added, updated, removed}, origin)
    const {author = null, type = null, ...data} = !isNullOrUndefined(origin) && typeof origin === "object" ? origin : {}

    const changedClients: number[] = added.concat(updated)
      .filter((x) => x !== newYAwareness.clientID)  // Ignore changes by server
      .concat(removed)
    const base64Update = fromUint8ArrayToBase64(awarenessProtocol.encodeAwarenessUpdate(newYAwareness, changedClients))
    const message = {type, data, newAwarenessDelta: base64Update}
    sendMessageToOthers(room, JSON.stringify(message), author)
  
    room.updatedAt = new Date().toISOString()
  })
}

const DOC_TO_DB_INTERVAL = 2 * 60 * 1000
const CLEAR_ROOM_INTERVAL = 2 * 60 * 1000
const ROOM_IDLE_TIME_WITHOUT_PEOPLE = 10 * 60 * 1000
const ROOM_IDLE_TIME_WITH_PEOPLE = 20 * 60 * 1000

// const DOC_TO_DB_INTERVAL = 2 * 60 * 1000
// const CLEAR_ROOM_INTERVAL = 0.1 * 60 * 1000
// const ROOM_IDLE_TIME_WITHOUT_PEOPLE = 0.5 * 60 * 1000
// const ROOM_IDLE_TIME_WITH_PEOPLE = 1 * 60 * 1000

let isDocToDBSaveInProgress = false;
const rooms: {[docId: string]: Room} = {}

export const room = async (ws: WebSocket, req: Request<{}, {}, {}, {documentId?: string, roomId?: string}>) => {
  console.log('New Client connected');

  let {documentId, roomId} = req.query
  const pool = await DB.getPool()
  const user = req.user
  let updateUserNameState: ApiState = ApiState.NOT_LOADED

  if (documentId || roomId) {
    documentId = documentId || Object.keys(rooms).find((x) => rooms[x].yDoc.getMap().get("roomId") === roomId)
    const room = rooms[documentId]
    if (room) {
      if (getUserRole(user.id, yDocToJson(room.yDoc)) <= Role.NO_ACCESS) {
        throw new SocketError({
          status: 403,
          code: 'forbidden',
          message: `You don't have access to the document`,
          closeSocket: true
        })
      }
      await updateLastOpenedOn(user.id, documentId, yDocToJson(room.yDoc).roomId)
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
  const {yDoc, yAwareness, newYAwareness, userIdSocketMap} = room;
  const role = getUserRole(user.id, yDocToJson(room.yDoc));
  ws.send(JSON.stringify({type: 'init', data: {user, role, 
    yDoc: fromUint8ArrayToBase64(Y.encodeStateAsUpdate(yDoc)), 
    yAwareness: fromUint8ArrayToBase64(Y.encodeStateAsUpdate(yAwareness)),
    newYAwareness: fromUint8ArrayToBase64(awarenessProtocol.encodeAwarenessUpdate(
      newYAwareness,
      Array.from(newYAwareness.getStates().keys())
      .filter((x) => x !== newYAwareness.clientID)  // Ignore the server awareness
    ))
  }}))

  userIdSocketMap[user.id] = ws

  const collaborator = new Y.Map()
  collaborator.set("id", user.id)
  collaborator.set("name", user.name);
  collaborator.set("joinedOn", new Date().toISOString());
  (yAwareness.getMap().get("collaborators") as any).set(user.id, collaborator)

  // Add the new collaborator info to yjs awareness also

  const _updateUserName = async () => {
    if (updateUserNameState === ApiState.LOADING) {
      return
    }
    let name = (yAwareness.getMap().get("collaborators") as any).get(user.id).get("name")
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

    const x = (yAwareness.getMap().get("collaborators") as any).get(user.id)
    if (x && x.get("name") !== name) {
      _updateUserName()
    }
  }

  const _closeCodeExecution = () => {
    if (!room.codeExecutionSocket) return
    if (room.codeExecutionSocket.readyState === WebSocket.OPEN) {
      room.codeExecutionSocket.close()
    }
  }

  const _startNewExecution = () => {
    // TODO: Is current socket check needed?
    const _isCurrentSocket = (socket: WebSocket) => {
      return socket === room.codeExecutionSocket
    }

    const _closeSocket = (socket: WebSocket) => {
      console.log("Closing code execution socket...")
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }

    const _addListeners = (socket: WebSocket) => {
      socket.on("open", (event) => {
        console.log('code execution socket opened', event)
        if (!_isCurrentSocket(socket)) {
          return _closeSocket(socket)
        }
        if (room.awareness.console?.runInfo?.state !== ApiState.LOADING) {
          return
        }
        const pistonLang = LangToPistonLangMap[room.doc.activeLanguage]
        const message = {
          "type": "init",
      
          "language": pistonLang.name,
          "version": pistonLang.version,
          "files": [
              {
                  "name": pistonLang.fileName,
                  "content": room.doc.languageCodeMap[room.doc.activeLanguage]
              }
          ]
        }
        const _console = room.yAwareness.getMap().get("console") as any
        const output = _console.get('output')
        room.yAwareness.transact(() => {
          output.push([{stream: 'stdout', data: `Executing ${pistonLang.fileName}...\n`}])
        }, {author: "server", type: "codeExecutionMessage"})

        socket.send(JSON.stringify(message))
      })
      
      socket.on("message", (event) => {
        console.log('on message from code excution server', event)
        if (!_isCurrentSocket(socket)) {
          return _closeSocket(socket)
        }
        if (room.awareness.console?.runInfo?.state !== ApiState.LOADING) {
          return
        }
        const message = JSON.parse(event.toString())
        const _console = room.yAwareness.getMap().get("console") as any
        const output = _console.get('output')
        switch (message.type) {
          case "data": {
            room.yAwareness.transact(() => {
              output.push([{stream: message.stream, data: message.data}])
            }, {author: "server", type: "codeExecutionMessage"})
            break
          }
          case "exit": {
            room.yAwareness.transact(() => {
              output.push([{stream: "stdout", data: `\nProcess finished with exit code ${message.code}`}])
              _console.set("runInfo", {state: message.code === 0 ? ApiState.LOADED : ApiState.ERROR})
            }, {author: "server", type: "codeExecutionEnd"})
            room.yDoc.transact(() => {
              room.yDoc.getMap().set("console", room.awareness.console)
            }, {author: "server", type: "addCodeExecutionToDoc"})
            break
          }       
        }
      })
      
      socket.on('close', function close() {
        console.log('Disconnected from code execution server');
        if (!_isCurrentSocket(socket)) {
          return _closeSocket(socket)
        }
        if (room.awareness.console?.runInfo?.state === ApiState.LOADING) {
          const _console = room.yAwareness.getMap().get("console") as any  
          room.yAwareness.transact(() => {
            _console.set("runInfo", {state: ApiState.ERROR})
          }, {author: "server", type: "codeExecutionEnd"})
          room.yDoc.transact(() => {
            room.yDoc.getMap().set("console", room.awareness.console)
          }, {author: "server", type: "addCodeExecutionToDoc"})
        }   
      });
      
      socket.on("error", (error) => {
        console.error('Code execution websocket error', error)
        // error event is always called before closing the socket
      })
    }

    switch (room.codeExecutionSocket?.readyState) {
      case WebSocket.CONNECTING: {
        // still connecting, will reuse this
        break
      }
      default: {
        if (room.codeExecutionSocket?.readyState === WebSocket.OPEN) {
          // close old connection
          room.codeExecutionSocket.close()
        }
        // start a new connection
        room.codeExecutionSocket = new WebSocket(`wss://piston.rahulbadenkal.com/api/v2/connect`)
        _addListeners(room.codeExecutionSocket!)
        break
      }
    }
  }

  ws.on('message', (event) => {
    const message = JSON.parse(event.toString())
    const {type, data, docDelta, awarenessDelta, newAwarenessDelta} = message

    if (docDelta) {
      Y.applyUpdate(yDoc, fromBase64ToUint8Array(docDelta), {author: user.id, type, data})
    }
    if (awarenessDelta) {
      Y.applyUpdate(yAwareness, fromBase64ToUint8Array(awarenessDelta), {author: user.id, type, data})
    }
    if (newAwarenessDelta) {
      awarenessProtocol.applyAwarenessUpdate(newYAwareness, fromBase64ToUint8Array(newAwarenessDelta), {author: user.id, type, data})
    }

    switch (type) {
      case "updateDocName": {
        updateDocName(documentId)
        break
      }
      case "toggleSharing":
      case "changeRoomLink": {
        updateShareInfo(documentId)
        const docJson = yDocToJson(yDoc)
        if (!docJson.sharing || type === "changeRoomLink") {
          // Sharing stopped, Kick every one out who is not the owner
          const collaborators = yAwarenessToJson(yAwareness).collaborators
          const owner = yDocToJson(yDoc).owner
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
      case "runCode": {
        if (room.prevAwareness.console?.runInfo?.state === ApiState.LOADING) {
          // revert the change
          yAwareness.transact(() => {
            const arr = new Y.Array()
            arr.insert(0, room.prevAwareness.console.output)

            const newMap = new Y.Map()
            newMap.set("runInfo", room.prevAwareness.console.runInfo)
            newMap.set("language", room.prevAwareness.console.language)
            newMap.set("output", arr)

            yAwareness.getMap().set("console", newMap)
          }, {author: "server", type: "revertRunCode"})
        }
        else {
          // start new code execution
          _startNewExecution()
        }
        break;
      }
      case "rerunCode": {
        // start new code execution
        _startNewExecution()
        break
      }
      case "stopCode": {
        _closeCodeExecution()
        break
      }
    }
  });

  ws.on("close", () => {
    if (yAwareness) {
      (yAwareness.getMap().get("collaborators") as any).delete(user.id)
      delete userIdSocketMap[user.id]
    }
    if (newYAwareness) {
      const yjsClientId = Array.from(newYAwareness.getStates().keys()).find((x) => newYAwareness.getStates().get(x).user?.id === user.id)
      if (yjsClientId) {
        awarenessProtocol.removeAwarenessStates(newYAwareness, [+yjsClientId] , {author: user.id})
      }
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

// Sync doc to db
setInterval(async () => {
  if (isDocToDBSaveInProgress) {
    console.log(`[SAVE TO DB SUMMARY] Previous save already in progress, skipping`)
    return
  }
  isDocToDBSaveInProgress = true
  const documentIds = Object.keys(rooms)

  let [total, fail] = [0, 0]
  const pool = await DB.getPool()
  for (let documentId of Object.keys(rooms)) {
    const {yDoc, doc, docUpdatedAt, docSyncedId, userIdSocketMap } = rooms[documentId]
    if (docUpdatedAt === docSyncedId) {
      continue
    }
    total += 1

    const update = Y.encodeStateAsUpdate(yDoc);
    const binaryData = Buffer.from(update);

    const query = sql.unsafe`
      UPDATE document 
      SET 
        y_doc = ${sql.binary(binaryData)}, 
        doc = ${sql.jsonb(doc)},
        updated_on = NOW()
      WHERE id::VARCHAR = ${documentId} 
    `
    try {
      await pool.query(query)
      if (rooms[documentId]) {
        rooms[documentId].docSyncedId = docUpdatedAt
      }
    }
    catch (error) {
      fail += 1
      console.error(`Failed to save doc to db: ${documentId}`)
      console.error(error)
    }
  }

  isDocToDBSaveInProgress = false
  console.log(`[SAVE TO DB SUMMARY] In memory: ${documentIds.length}, To save: ${total}, Success: ${total - fail}, Fail: ${fail}`)
}, DOC_TO_DB_INTERVAL)


// Clear idle rooms
setInterval(async () => {
  const documentIds = Object.keys(rooms)

  let total = 0;
  for (let documentId of Object.keys(rooms)) {
    const {addedOn, updatedAt, docUpdatedAt, docSyncedId, userIdSocketMap } = rooms[documentId]
    if (docUpdatedAt !== docSyncedId) {
      // still needs to be synced
      continue
    }
    const collaboratorIds = Object.keys(userIdSocketMap)
    const maxTime = collaboratorIds.length > 0 ? ROOM_IDLE_TIME_WITH_PEOPLE : ROOM_IDLE_TIME_WITHOUT_PEOPLE
    const diff = new Date().getTime() - new Date(updatedAt).getTime()
    if (diff < maxTime) {
      continue
    }

    total += 1

    // Kick all collaborators out if any
    const error = new SocketError({status: 400, code: "idle", message: 'Room has been closed due to inactivity', closeSocket: true})
    const message = {type: "error", data: error.payload}
    for (let collaboratorId of collaboratorIds) {
      userIdSocketMap[collaboratorId].send(JSON.stringify(message)) 
      userIdSocketMap[collaboratorId].close(error.payload.wsStatus, error.payload.message)  
    }  

    // Delete room from memory
    delete rooms[documentId]
  }

  console.log(`[ROOM CLEANUP SUMMARY] In memory: ${documentIds.length}, Closed: ${total}`)
}, CLEAR_ROOM_INTERVAL)


