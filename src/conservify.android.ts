import { Common } from "./conservify.common";

import * as applicationModule from "tns-core-modules/application";
import { android as androidApp } from "tns-core-modules/application";
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

function toJsHeaders(headers) {
    const jsHeaders = {};
    const iter = headers.entrySet().iterator();
    while (iter.hasNext()) {
        const entry = iter.next();
        const key = entry.getKey();
        jsHeaders[key.toLowerCase()] = entry.getValue();
    }
    return jsHeaders;
}

export class Conservify extends Common {
    logger: any;
    discoveryEvents: any;
    active: { [key: string]: any };
    scan: any;
    started: any;
    connected: any;
    networkStatus: any;

    networkingListener: org.conservify.networking.NetworkingListener;
    downloadListener: org.conservify.networking.WebTransferListener;
    uploadListener: org.conservify.networking.WebTransferListener;
    networking: org.conservify.networking.Networking;
    dataListener: org.conservify.data.DataListener;
    fileSystem: org.conservify.data.FileSystem;

    constructor(discoveryEvents, logger) {
        super();
        this.logger = logger || console.log;
        this.active = {};
        this.networkStatus = null;
        this.started = null;
        this.discoveryEvents = discoveryEvents;
    }

    public start(serviceType: string) {
        this.logger("initialize");

        const owner = this;
        const active = this.active;

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onStarted() {
                owner.started.resolve();
            },

            onDiscoveryFailed() {
                owner.started.reject();
            },

            onFoundService(service: any) {
                owner.logger("onFoundService", service.getName(), service.getType(), service.getAddress(), service.getPort());
                owner.discoveryEvents.onFoundService({
                    name: service.getName(),
                    type: service.getType(),
                    host: service.getAddress(),
                    port: service.getPort(),
                });
            },

            onLostService(service: any) {
                owner.logger("onLostService", service.getName(), service.getType());
                owner.discoveryEvents.onLostService({
                    name: service.getName(),
                    type: service.getType(),
                    host: service.getAddress(), // Probably missing.
                    port: service.getPort(), // Probably missing.
                });
            },

            onNetworkStatus(status: any) {
                // owner.logger("onNetworkStatus");

                if (owner.networkStatus) {
                    function getConnectedWifi() {
                        if (status.getConnectedWifi() == null || status.getConnectedWifi().getSsid() == null) {
                            return null;
                        }

                        return {
                            ssid: status
                                .getConnectedWifi()
                                .getSsid()
                                .replace(/"/g, ""),
                        };
                    }

                    function getWifiNetworks() {
                        if (status.getWifiNetworks() == null) {
                            return null;
                        }

                        const found: { ssid: string }[] = [];
                        const networksArray = status.getWifiNetworks().getNetworks();

                        if (networksArray != null) {
                            for (let i = 0; i < networksArray.size(); ++i) {
                                const n = networksArray[i];
                                found.push({
                                    ssid: n.getSsid(),
                                });
                            }
                        }

                        return found;
                    }

                    const jsObject = {
                        connected: status.getConnected(),
                        connectedWifi: getConnectedWifi(),
                        wifiNetworks: getWifiNetworks(),
                    };

                    owner.networkStatus.resolve(jsObject);
                    owner.networkStatus = null;
                } else {
                    owner.logger("onNetworkStatus: no promise!");
                }
            },
        });

        this.uploadListener = new org.conservify.networking.WebTransferListener({
            onProgress(taskId: string, headers: any, bytes: number, total: number) {
                owner.logger("upload:onProgress", taskId, bytes, total);

                if (active[taskId]) {
                    const { info } = active[taskId];
                    const { progress } = info;

                    if (progress) {
                        progress(total, bytes, info);
                    }
                } else {
                    this.logger("upload:onProgress orphaned", taskId, bytes, total);
                }
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                const jsHeaders = toJsHeaders(headers);

                owner.logger("upload:onComplete", taskId, jsHeaders, contentType, statusCode);

                const task = active[taskId];
                if (task) {
                    const { info, transfer } = task;

                    function getBody() {
                        if (body) {
                            if (contentType.indexOf("application/json") >= 0) {
                                return JSON.parse(body);
                            } else {
                                if (transfer.isBase64EncodeResponseBody()) {
                                    return Buffer.from(body, "base64");
                                }
                                return body;
                            }
                        }
                        return null;
                    }

                    delete active[taskId];

                    task.resolve({
                        info,
                        headers: jsHeaders,
                        statusCode,
                        body: getBody(),
                    });
                } else {
                    owner.logger("upload:onComplete (orphaned)", taskId, jsHeaders, contentType, statusCode);
                }
            },

            onError(taskId: string, message: string) {
                owner.logger("upload:onError", taskId, message);

                const task = active[taskId];
                if (task) {
                    const { info } = task;

                    delete active[taskId];

                    task.reject({
                        info,
                        message,
                    });
                } else {
                    owner.logger("upload:onError (orphaned)", taskId, message);
                }
            },
        });

        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onProgress(taskId: string, headers: any, bytes: number, total: number) {
                owner.logger("download:onProgress", taskId, bytes, total);

                if (active[taskId]) {
                    const { info } = active[taskId];
                    const { progress } = info;

                    if (progress) {
                        progress(total, bytes, info);
                    }
                } else {
                    owner.logger("download:onProgress (orphaned)", taskId, bytes, total);
                }
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                const jsHeaders = toJsHeaders(headers);

                owner.logger("download:onComplete", taskId, jsHeaders, contentType, statusCode);

                const task = active[taskId];
                if (task) {
                    const { info, transfer } = task;

                    function getBody() {
                        if (body) {
                            if (contentType.indexOf("application/json") >= 0) {
                                return JSON.parse(body);
                            } else {
                                if (transfer.isBase64EncodeResponseBody()) {
                                    return Buffer.from(body, "base64");
                                }
                                return body;
                            }
                        }
                        return null;
                    }

                    delete active[taskId];

                    task.resolve({
                        info,
                        headers: jsHeaders,
                        statusCode,
                        body: getBody(),
                    });
                } else {
                    owner.logger("download:onComplete (orphaned)", taskId, jsHeaders, contentType, statusCode);
                }
            },

            onError(taskId: string, message: string) {
                owner.logger("download:onError", taskId, message);

                const task = active[taskId];
                if (task) {
                    const { info } = task;

                    delete active[taskId];

                    task.reject({
                        info,
                        message,
                    });
                } else {
                    owner.logger("download:onError (orphaned)", taskId, message);
                }
            },
        });

        this.dataListener = new org.conservify.data.DataListener({
            onFileInfo(path: string, info: any) {
                owner.logger("fs:onFileInfo", path, info);
            },

            onFileRecords(path: string, records: any) {
                owner.logger("fs:onFileRecords", path, records);
            },

            onFileAnalysis(path: string, analysis: any) {
                owner.logger("fs:onFileAnalysis", path, analysis);
            },
        });

        this.fileSystem = new org.conservify.data.FileSystem(androidApp.context, this.dataListener);

        this.networking = new org.conservify.networking.Networking(
            androidApp.context,
            this.networkingListener,
            this.uploadListener,
            this.downloadListener
        );

        return new Promise((resolve, reject) => {
            this.started = {
                resolve,
                reject,
            };

            this.networking.getServiceDiscovery().start(serviceType);

            owner.logger("starting...");
        });
    }

    public text(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setBody(info.body);

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.getWeb().binary(transfer);
        });
    }

    public json(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setBody(info.body);

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.getWeb().json(transfer);
        });
    }

    public protobuf(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setBase64EncodeResponseBody(true);

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        if (info.body) {
            const requestBody = Buffer.from(info.body).toString("base64");
            transfer.setBody(requestBody);
            transfer.setBase64DecodeRequestBody(true);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.getWeb().binary(transfer);
        });
    }

    public download(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.getWeb().download(transfer);
        });
    }

    public upload(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.getWeb().upload(transfer);
        });
    }

    public findConnectedNetwork() {
        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.getWifi().findConnectedNetwork();
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.getWifi().scan();
        });
    }
}
