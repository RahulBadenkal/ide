import { Request } from 'express';
import WebSocket from "ws";
import { startProcess, stopProcess } from './lsp';


export const room = async (ws: WebSocket, req: Request<{}, {}, {}, {documentId?: string, roomId?: string}>) => {
  console.log('New Client connected');
  
  const proc = startProcess()
  
  proc.reader.listen((message: any) => {
    console.log('message from server:', JSON.stringify(message));
    ws.send(JSON.stringify(message))
  });

  ws.on('message', (event) => {
    console.log('message from client:', event.toString())
    proc.writer.write(JSON.parse(event.toString()));
  });

  ws.on('error', (error) => {
    console.error(error)
  })

  ws.on("close", (event) => {
    console.log('socket closed', event)
    stopProcess(proc.process)
  })
}

