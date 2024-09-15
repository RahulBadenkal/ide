export type HttpErrorPayload<T=any> = {
  status: number;  // http status code
  wsStatus: number  // ws status code
  code: string;  // app specific error code
  message: string;  // user friendly message
  stackTrace?: string  // complete stack trace (for dev use)
  data?: T  // any data
}

export class HttpError extends Error {
  payload: HttpErrorPayload

  constructor(payload: Omit<HttpErrorPayload, "wsStatus"> & {wsStatus?: number}) {
    super(payload.message)
    if (!payload.wsStatus) {
      this.payload = {
        wsStatus: httpErrorCodeToWsErrorCode(payload.status),
        ...payload
      }
    }
    else {
      this.payload = payload as HttpErrorPayload
    }
  }
}

export const errorToHttpErrorPayload = (error: any): HttpErrorPayload => {
  // In javascript you can throw anything and not just Error class object
  if (error instanceof HttpError) {
    return error.payload
  }
  else if (error instanceof Error) {
    const paylod: HttpErrorPayload = {
      status: 500,
      wsStatus: httpErrorCodeToWsErrorCode(500),
      code: 'server_error',
      message: error.message,
      stackTrace: error.stack,
    }
    return paylod
  }
  else {
    const paylod: HttpErrorPayload = {
      status: 500,
      wsStatus: httpErrorCodeToWsErrorCode(500),
      code: 'server_error',
      message: 'Something went wrong',
      stackTrace: typeof error === "string" ? error : JSON.stringify(error),
    }
    return paylod
  }
}

export const httpErrorCodeToWsErrorCode = (httpErrorCode: number): number => {
  // https://github.com/Luka967/websocket-close-codes
  const mapper = new Map([
    [400, 4000],
    [401, 3000],
    [403, 3003],
    [500, 1011]
  ])
  return mapper.get(httpErrorCode) || 1011
}