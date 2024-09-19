import { HttpErrorPayload, SocketErrorPayload } from "./http";

export const enum ApiState {
  NOT_LOADED = "NOT_LOADED",
  LOADING = "LOADING",
  LOADED = "LOADED",
  ERROR = "ERROR"
}

export type ApiLoadInfo = {
  state: ApiState,
  error?: HttpErrorPayload | SocketErrorPayload
}