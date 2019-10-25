import { Common } from './conservify.common';

export class Conservify extends Common {
    constructor() {
        super();
        this.active = {};
    }

    public start(serviceType) {
        console.log("initialize");

        const active = this.active;

        return Promise.resolve({ });
    }

    public json(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public protobuf(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public download(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            reject();
        });
    }
}
