import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';


const formatAxiosError = <T=any>(error: Error): HttpErrorPayload<T> => {
    if (!axios.isAxiosError(error)) {
        throw error
    }

    // Check if the error has a response (i.e., it came from the server)
    if (error.response) {
        // Server responded with an error status code
        return error.response.data!
    } else if (error.request) {
        // The request was made but no response was received
        return {
            status: 500,
            code: error.code || 'server_error',
            message: error.message
        };
    } else {
        // Something happened in setting up the request that triggered an Error
       throw error
    }
}

export type HttpErrorPayload<T=any> = {
    status: number;
    code: string;
    message: string;
    stackTrace?: string
    data?: T
}

export class HttpError<T=any> extends Error {
    payload: HttpErrorPayload

    constructor(payload: HttpErrorPayload<T>) {
      super(payload.message);
      this.name = "HttpError";
    
      this.payload = payload
    }

    get status(): HttpErrorPayload["status"] {
        return this.payload.status
    }

    get code(): HttpErrorPayload["code"] {
        return this.payload.data
    }

    get stackTrace(): HttpErrorPayload["stackTrace"] {
        return this.payload.stackTrace
    }

    get data(): HttpErrorPayload["data"] {
        return this.payload.data
    }
  }

export type HTTPResponse<T = any> = AxiosResponse<T>

    
export const makeGetCall = async <R=any, E=any>(
    url: string,
    config?: AxiosRequestConfig
): Promise<
    | { response: HTTPResponse<R>; error?: never }
    | { response?: never; error: HttpErrorPayload<E> }
> => {
    try {
        const response = await axios.get<R>(url, config);
        return { response }; // Returning only data part of the response
    } catch (error: any) {
        return { error: formatAxiosError(error) };
    }
};


export const makePostCall = async <R=any, E=any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<
    | { response: HTTPResponse<R>; error?: never }
    | { response?: never; error: HttpErrorPayload<E> }
> => {
    try {
        const response = await axios.post<R>(url, data, config);
        return { response };
    } catch (error: any) {
        return { error: formatAxiosError<E>(error) };
    }
};

