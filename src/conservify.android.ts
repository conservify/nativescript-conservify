import { Common } from './conservify.common';

import * as applicationModule from 'tns-core-modules/application';
import { android as androidApp } from "tns-core-modules/application";
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

export class Conservify extends Common {
    constructor() {
        super();
        this.active = {};
        this.scan = null;
    }

    public start(serviceType) {
        console.log("initialize");

        const active = this.active;

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onFoundService(service) {
                console.log("onFoundService", service);
            },

            onLostService(service) {
                console.log("onLostService", service);
            },

            onConnectionInfo(connected) {
                console.log("onConnectionInfo", connected);
            },

            onConnectedNetwork(network) {
                console.log("onConnectedNetwork", network.getSsid());
            },

            onNetworksFound(networks) {
                console.log("onNetworksFound", networks, networks.getNetworks());

                const found = [];
                for (let i = 0; i < networks.getNetworks().size(); ++i) {
                    const n = network.getNetworks()[i];
                    found.append({
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
            onStarted(task, headers) {
                console.log("upload:onStarted", task, headers);
            },

            onProgress(task, bytes, total) {
                console.log("upload:onProgress", task, bytes, total);
            },

            onComplete(task, headers, body, statusCode) {
                console.log("upload:onComplete", task, headers, body, statusCode);
            },

            onError(task) {
                console.log("upload:onError", task);
            },
        });

        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onStarted(task, headers) {
                console.log("download:onStarted", task, headers);

                const task = active[task];
            },

            onProgress(task, bytes, total) {
                console.log("download:onProgress", task, bytes, total);

                const { info } = active[task];
                const { progress } = info;

                if (progress) {
                    progress(total, bytes);
                }
            },

            onComplete(task, headers, contentType, body, statusCode) {
                console.log("download:onComplete", task, headers, contentType, body, statusCode);

                function getBody() {
                    if (body) {
                        if (contentType == "application/json") {
                            return JSON.parse(body);
                        }
                        else {
                            return Buffer.from(body, "hex");
                        }
                    }
                    return null;
                }

                const task = active[task];

                delete active[task];

                task.resolve({
                    headers: headers,
                    statusCode: statusCode,
                    body: getBody(),
                });
            },

            onError(task) {
                console.log("download:onError", task);

                const task = active[task];

                delete active[task];

                task.reject({});
            },
        });

        this.dataListener = new org.conservify.data.DataListener({
            onFileInfo(path, info) {
                console.log("fs:onFileInfo", path, info);
            }

            onFileRecords(path, records) {
                console.log("fs:onFileRecords", path, records);
            }

            onFileAnalysis(path, analysis) {
                console.log("fs:onFileAnalysis", path, analysis);
            }
        })

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
            transfer.header(key, value);
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
            const requestBody = new Buffer.from(info.body).toString("hex");
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
