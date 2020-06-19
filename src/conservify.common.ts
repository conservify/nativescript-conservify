import { Observable } from "tns-core-modules/data/observable";

export class Common extends Observable {
    constructor() {
        super();
    }
}

export class FileSystemError extends Error {
    constructor(message, path) {
        super(message);
        this.path = path;
    }
}

export class ConnectionError extends Error {
    constructor(message, info) {
        super(message);
        this.info = info;
    }
}
