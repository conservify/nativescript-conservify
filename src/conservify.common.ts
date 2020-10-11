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
    body?: string;
    path?: string;
    connectionTimeout?: number;
    defaultTimeout?: number;
    headers?: { [index: string]: string };
}
