import { errorToHttpErrorPayload } from '@ide/ts-utils/src/lib/http';
import { NextFunction, Request, Response } from 'express';
import {WebSocket} from "ws";



export const httpErrorWrapper = (controllerFn: (req: Request, response: Response, next: NextFunction) => any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controllerFn(req, res, next);
    } catch (error) {
      console.error("HTTP Uncaught error!!!")
      const payload = errorToHttpErrorPayload(error)
      console.error(payload.stackTrace || payload.message)
      return res.status(payload.status).jsonp(payload)
    }
  };
};

export const wsErrorWrapper = (controllerFn: (ws: WebSocket, req: Request, next: NextFunction) => void) => {
  return async (ws: WebSocket, req: Request, next: NextFunction) => {
    try {
      await controllerFn(ws, req, next);
    } catch (error) {
      console.error("WS Uncaught error!!!")
      const payload = errorToHttpErrorPayload(error)
      console.error(payload.stackTrace || payload.message)
      ws.send(JSON.stringify(payload))
      return ws.close(payload.wsStatus, payload.status === 500 ? 'Server error': 'App terminated the connection due to some issue' )
    }
  };
};