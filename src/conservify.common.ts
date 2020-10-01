export class FileSystemError extends Error {
    readonly path: string;

    constructor(message, path) {
        super(message);
        this.path = path;
    }
}

export class ConnectionError extends Error {
    readonly info: string;

    constructor(message, info) {
        super(message);
        this.info = info;
    }
}

export interface PromiseCallbacks {
    resolve(value: any): void;
    reject(error: Error): void;
}
