import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { HttpErrorPayload } from './http';


const formatAxiosError = <T=any>(error: any): HttpErrorPayload<T> => {
    if (!axios.isAxiosError(error)) {
        throw error
    }

    // Check if the error has a response (i.e., it came from the server)
    if (error.response) {
        // Server responded with an error status code
        return error.response.data
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

    
export const makeGetCall = async <R=any, E=any>(
    url: string,
    config?: AxiosRequestConfig
): Promise<
    | { response: AxiosResponse<R>; error?: never }
    | { response?: never; error: HttpErrorPayload<E> }
> => {
    try {
        const response = await axios.get<R>(url, config);
        return { response }; // Returning only data part of the response
    } catch (error) {
        return { error: formatAxiosError(error) };
    }
};


export const makePostCall = async <D=any, R=any, E=any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
): Promise<
    | { response: AxiosResponse<R>; error?: never }
    | { response?: never; error: HttpErrorPayload<E> }
> => {
    try {
        const response = await axios.post<R>(url, data, config);
        return { response };
    } catch (error) {
        return { error: formatAxiosError<E>(error) };
    }
};