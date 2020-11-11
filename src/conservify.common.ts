export class FileSystemError extends Error {
    constructor(message: string, public readonly path: string) {
        super(message);
    }
}

export class ConnectionError extends Error {
    constructor(message: string, public readonly info: string) {
        super(message);
    }
}

export interface PromiseCallbacks {
    resolve(value: any): void;
    reject(error: Error): void;
}

export interface TransferInfo {
    url: string;
    method?: string;
    body?: Uint8Array | string;
    path?: string;
    uploadCopy?: boolean;
    connectionTimeout?: number;
    defaultTimeout?: number;
    headers?: { [index: string]: string };
}

export interface HttpResponse {
    statusCode: number;
    headers: { [index: string]: string };
    body: string;
}

export function encodeBody(body: Uint8Array | string): string {
    if (Buffer.isBuffer(body)) {
        return body.toString("base64");
    }
    return Buffer.from(body as string).toString("base64");
}
