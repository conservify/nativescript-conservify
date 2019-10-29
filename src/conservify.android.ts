import { Common } from './conservify.common';

import * as applicationModule from 'tns-core-modules/application';
import { android as androidApp } from "tns-core-modules/application";
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

export class Conservify extends Common {
    active: { [key: string]: any; };
    scan: any;
    networkingListener: org.conservify.networking.NetworkingListener;
    downloadListener: org.conservify.networking.WebTransferListener;
    uploadListener: org.conservify.networking.WebTransferListener;
    networking: org.conservify.networking.Networking;
    dataListener: org.conservify.data.DataListener;
    fileSystem: org.conservify.data.FileSystem;

    constructor() {
        super();
        this.active = {};
        this.scan = null;
    }

    public start(serviceType: string) {
        console.log("initialize");

        const active = this.active;

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onFoundService(service: any) {
                console.log("onFoundService", service);
            },

            onLostService(service: any) {
                console.log("onLostService", service);
            },

            onConnectionInfo(connected: any) {
                console.log("onConnectionInfo", connected);
            },

            onConnectedNetwork(network: any) {
                console.log("onConnectedNetwork", network.getSsid());
            },

            onNetworksFound(networks: any) {
                console.log("onNetworksFound", networks, networks.getNetworks());

                const found: { ssid: string }[] = [];
                for (let i = 0; i < networks.getNetworks().size(); ++i) {
                    const n = networks.getNetworks()[i];
                    found.push({
                        ssid: n.getSsid()
                    });
                }

                if (this.scan) {
                    this.scan.resolve(found);
                    this.scan = null;
                }
            },

            onNetworkScanError() {
                console.log("onNetworkScanError");

                if (this.scan) {
                    this.scan.reject();
                    this.scan = null;
                }
            },
        });

        this.uploadListener = new org.conservify.networking.WebTransferListener({
            onStarted(taskId: string, headers: any) {
                console.log("upload:onStarted", taskId, headers);
            },

            onProgress(taskId: string, bytes: number, total: number) {
                console.log("upload:onProgress", taskId, bytes, total);
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                console.log("upload:onComplete", taskId, headers, contentType, body, statusCode);
            },

            onError(taskId: string) {
                console.log("upload:onError", taskId);
            },
        });

        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onStarted(taskId: string, headers: any) {
                console.log("download:onStarted", taskId, headers);

                const task = active[taskId];
            },

            onProgress(taskId: string, bytes: number, total: number) {
                console.log("download:onProgress", taskId, bytes, total);

                const task = active[taskId];
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                console.log("download:onComplete", taskId, headers, contentType, body, statusCode);

                function getBody() {
                    if (body) {
                        console.log(contentType);
                        if (contentType == "application/json") {
                            return JSON.parse(body);
                        }
                        else {
                            return Buffer.from(body, "hex");
                        }
                    }
                    return null;
                }

                const task = active[taskId];

                delete active[taskId];

                task.resolve({
                    headers: headers,
                    statusCode: statusCode,
                    body: getBody(),
                });
            },

            onError(taskId: string) {
                console.log("download:onError", taskId);

                const task = active[taskId];

                delete active[taskId];

                task.reject({});
            },
        });

        this.dataListener = new org.conservify.data.DataListener({
            onFileInfo(path: string, info: any) {
                console.log("fs:onFileInfo", path, info);
            },

            onFileRecords(path: string, records: any) {
                console.log("fs:onFileRecords", path, records);
            },

            onFileAnalysis(path: string, analysis: any) {
                console.log("fs:onFileAnalysis", path, analysis);
            },
        });

        this.fileSystem = new org.conservify.data.FileSystem(androidApp.context, this.dataListener);

        this.networking = new org.conservify.networking.Networking(androidApp.context, this.networkingListener, this.uploadListener, this.downloadListener);

        this.networking.getServiceDiscovery().start(serviceType);

        console.log("ready");

        return Promise.resolve({ });
    }

    public json(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
        }

        const id = this.networking.getWeb().json(transfer);

        return new Promise((resolve, reject) => {
            this.active[id] = {
                id,
                info,
                resolve,
                reject,
            };
        });
    }

    public protobuf(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);

        if (info.body) {
            const requestBody = Buffer.from(info.body).toString("hex");
            transfer.setBody(requestBody);
        }

        transfer.header("Content-Type", "text/plain");

        const id = this.networking.getWeb().binary(transfer);

        return new Promise((resolve, reject) => {
            this.active[id] = {
                id,
                info,
                resolve,
                reject,
            };
        });
    }

    public download(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        const id = this.networking.getWeb().download(transfer);

        return new Promise((resolve, reject) => {
            this.active[id] = {
                id,
                info,
                resolve,
                reject,
            };
        });
    }

    public scanNetworks() {
        this.networking.getWifi().findConnectedNetwork();

        this.networking.getWifi().scan();

        return new Promise((resolve, reject) => {
            this.scan = {
                resolve,
                reject
            };
        });
    }
}
