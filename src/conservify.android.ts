import { ConnectionError, FileSystemError, TransferInfo, HttpResponse, encodeBody } from "./conservify.common";

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

interface JavaServiceInfo {
    getName(): string;
    getType(): string;
    getAddress(): string; // Probably missing.
    getPort(): string; // Probably missing.
}

interface JavaUdpMessage {
    getAddress(): string;
    getData(): string;
}

class OpenedFile {
    cfy: Conservify;
    fs: any;
    file: any;

    public constructor(cfy: Conservify, file: any) {
        this.cfy = cfy;
        this.fs = cfy.fileSystem;
        this.file = file;
    }

    public info() {
        return new Promise((resolve, reject) => {
            const token = this.fs.newToken();
            this.file.readInfo(token);

            this.cfy.active[token] = {
                resolve,
                reject,
            };
        });
    }

    /*
    public records(listener) {
        return new Promise((resolve, reject) => {
            const token = this.fs.newToken();
            const options = new org.conservify.data.ReadOptions();
            options.setBatchSize(10);
            this.file.readDataRecords(token, options);

            this.cfy.active[token] = {
                listener,
                resolve,
                reject,
            };
        });
    }
	*/

    public delimited(listener) {
        return new Promise((resolve, reject) => {
            const token = this.fs.newToken();
            const options = new org.conservify.data.ReadOptions();
            options.setBatchSize(10);
            this.file.readDelimited(token, options);

            this.cfy.active[token] = {
                listener,
                resolve,
                reject,
            };
        });
    }
}

export class Conservify {
    logger: any;
    discoveryEvents: any;
    active: { [key: string]: any };
    scan: any;
    started: any;
    stopped: any;
    connected: any;
    networkStatus: any;

    networkingListener: org.conservify.networking.NetworkingListener;
    downloadListener: org.conservify.networking.WebTransferListener;
    uploadListener: org.conservify.networking.WebTransferListener;
    fsListener: org.conservify.data.FileSystemListener;
    networking: org.conservify.networking.Networking;
    fileSystem: org.conservify.data.FileSystem;

    constructor(discoveryEvents, logger) {
        this.logger = logger || console.log;
        this.active = {};
        this.networkStatus = null;
        this.started = null;
        this.stopped = null;
        this.discoveryEvents = discoveryEvents;

        const owner = this;
        const active = this.active;

        const getAndroidContext = () => {
            if (!androidApp.context) {
                const cc = new org.conservify.ContextContainer(null);
                if (!cc.getContext()) {
                    throw new Error("No androidApp.context? Are we being called before application.start?");
                }
                return cc.getContext();
            } else {
                const cc = new org.conservify.ContextContainer(androidApp.context);
                return cc.getContext();
            }
        };

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onStarted() {
                owner.started.resolve();
            },

            onStopped() {
                owner.stopped.resolve();
            },

            onDiscoveryFailed() {
                owner.started.reject(new Error("discovery failed"));
            },

            onFoundService(service: JavaServiceInfo) {
                owner.logger("onFoundService", service.getName(), service.getType(), service.getAddress(), service.getPort());
                owner.discoveryEvents.onFoundService({
                    name: service.getName(),
                    type: service.getType(),
                    host: service.getAddress(),
                    port: service.getPort(),
                });
            },

            onLostService(service: JavaServiceInfo) {
                owner.logger("onLostService", service.getName(), service.getType());
                owner.discoveryEvents.onLostService({
                    name: service.getName(),
                    type: service.getType(),
                    host: service.getAddress(), // Probably missing.
                    port: service.getPort(), // Probably missing.
                });
            },

            onUdpMessage(message: JavaUdpMessage) {
                owner.logger("onUdpMessage", message);
                owner.discoveryEvents.onUdpMessage({
                    address: message.getAddress(),
                    data: message.getData(),
                });
            },

            onNetworkStatus(status: any) {
                // owner.logger("onNetworkStatus");

                if (owner.networkStatus) {
                    const getConnectedWifi = () => {
                        if (status.getConnectedWifi() == null || status.getConnectedWifi().getSsid() == null) {
                            return null;
                        }

                        return {
                            ssid: status.getConnectedWifi().getSsid().replace(/"/g, ""),
                        };
                    };

                    const getWifiNetworks = () => {
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
                    };

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

                    const getBody = () => {
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
                    };

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

                    task.reject(new ConnectionError(message, info));
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

                    const getBody = () => {
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
                    };

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

                    task.reject(new ConnectionError(message, info));
                } else {
                    owner.logger("download:onError (orphaned)", taskId, message);
                }
            },
        });

        this.fsListener = new org.conservify.data.FileSystemListener({
            onFileInfo(path: string, token: string, info: any) {
                owner.logger("fs:onFileInfo", path, token, info);

                const task = active[token];
                if (task) {
                    task.resolve({
                        path: info.getFile(),
                        size: info.getSize(),
                    });
                }
            },

            onFileRecords(path: string, token: string, position: Number, size: Number, records: any) {
                owner.logger("fs:onFileRecords", path, token, position, size, records != null ? records.size() : "");

                const task = active[token];
                if (task) {
                    if (records) {
                        task.listener(position, size, records);
                    } else {
                        task.resolve();
                    }
                }
            },

            onFileError(path: string, token: string, message: string) {
                owner.logger("fs:onFileError", path, token, message);

                const task = active[token];
                if (task) {
                    task.reject(new FileSystemError(message, path));
                }
            },
        });

        const androidContext = getAndroidContext();
        this.fileSystem = new org.conservify.data.FileSystem(androidContext, this.fsListener);

        this.networking = new org.conservify.networking.Networking(
            androidContext,
            this.networkingListener,
            this.uploadListener,
            this.downloadListener
        );
    }

    public start(
        serviceTypeSearch: string | null = null,
        serviceNameSelf: string | null = null,
        serviceTypeSelf: string | null = null
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.started = {
                resolve,
                reject,
            };

            this.logger("starting:", serviceTypeSearch, serviceNameSelf, serviceTypeSelf);

            this.networking.getServiceDiscovery().start(serviceTypeSearch, serviceNameSelf, serviceTypeSelf);
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.stopped = {
                resolve,
                reject,
            };

            this.logger("stopping...");

            this.networking.getServiceDiscovery().stop();
        });
    }

    public async writeSampleData(): Promise<void> {
        const sampleData = new org.conservify.data.SampleData();
        await sampleData.write();
    }

    public open(path: string): Promise<OpenedFile> {
        if (!this.fileSystem) throw new Error("use before initialize");

        return Promise.resolve(new OpenedFile(this, this.fileSystem.open(path)));
    }

    public text(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);

        if (info.connectionTimeout) {
            transfer.setConnectionTimeout(info.connectionTimeout);
        }
        if (info.defaultTimeout) {
            transfer.setDefaultTimeout(info.defaultTimeout);
        }
        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }
        if (info.body) {
            if (ArrayBuffer.isView(info.body)) {
                throw new Error("unsupported");
            } else {
                transfer.setBody(info.body);
            }
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

    public json(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);

        if (info.connectionTimeout) {
            transfer.setConnectionTimeout(info.connectionTimeout);
        }
        if (info.defaultTimeout) {
            transfer.setDefaultTimeout(info.defaultTimeout);
        }

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }
        if (info.body) {
            if (ArrayBuffer.isView(info.body)) {
                throw new Error("unsupported");
            } else {
                transfer.setBody(info.body);
            }
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

    public protobuf(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setBase64EncodeResponseBody(true);

        if (info.connectionTimeout) {
            transfer.setConnectionTimeout(info.connectionTimeout);
        }
        if (info.defaultTimeout) {
            transfer.setDefaultTimeout(info.defaultTimeout);
        }

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.header(key, value as string);
        }

        if (info.body) {
            transfer.setBody(encodeBody(info.body));
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

    public download(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        if (info.connectionTimeout) {
            transfer.setConnectionTimeout(info.connectionTimeout);
        }
        if (info.defaultTimeout) {
            transfer.setDefaultTimeout(info.defaultTimeout);
        }

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

    public upload(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        if (info.connectionTimeout) {
            transfer.setConnectionTimeout(info.connectionTimeout);
        }
        if (info.defaultTimeout) {
            transfer.setDefaultTimeout(info.defaultTimeout);
        }

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

    public findConnectedNetwork(): Promise<any> {
        if (!this.networking) throw new Error("use before initialize");

        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.getWifi().findConnectedNetwork();
        });
    }

    public scanNetworks(): Promise<any> {
        if (!this.networking) throw new Error("use before initialize");

        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.getWifi().scan();
        });
    }
}
