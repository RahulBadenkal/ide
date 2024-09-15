export type HttpErrorPayload<T=any> = {
  status: 400 | 401 | 404 | 500;  // http status code
  code: string;  // app specific error code
  message: string;  // user friendly message
  stackTrace?: string  // complete stack trace (for dev use)
  data?: T  // any data
}

export class HttpError extends Error {
  payload: HttpErrorPayload

  constructor(payload: HttpErrorPayload) {
    super(payload.message)
    this.payload = payload
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
      code: 'server_error',
      message: error.message,
      stackTrace: error.stack,
    }
    return paylod
  }
  else {
    const paylod: HttpErrorPayload = {
      status: 500,
      code: 'server_error',
      message: 'Something went wrong',
      stackTrace: typeof error === "string" ? error : JSON.stringify(error),
    }
    return paylod
  }
}