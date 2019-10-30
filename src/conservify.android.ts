import { Common } from './conservify.common';

import * as applicationModule from 'tns-core-modules/application';
import { android as androidApp } from "tns-core-modules/application";
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

const debug = (() => {
    if (false) {
        return console.log;
    }
    return () => { };
})();

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
        debug("initialize");

        const owner = this;
        const active = this.active;

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onFoundService(service: any) {
                debug("onFoundService", service);
            },

            onLostService(service: any) {
                debug("onLostService", service);
            },

            onConnectionInfo(connected: any) {
                debug("onConnectionInfo", connected);
            },

            onConnectedNetwork(network: any) {
                debug("onConnectedNetwork", network.getSsid());
            },

            onNetworksFound(networks: any) {
                if (owner.scan) {
                    debug("onNetworksFound", networks, networks.getNetworks());

                    const found: { ssid: string }[] = [];
                    for (let i = 0; i < networks.getNetworks().size(); ++i) {
                        const n = networks.getNetworks()[i];
                        found.push({
                            ssid: n.getSsid()
                        });
                    }

                    owner.scan.resolve(found);
                    owner.scan = null;
                }
                else {
                    console.error("onNetworksFound no promise");
                }
            },

            onNetworkScanError() {
                if (owner.scan) {
                    debug("onNetworkScanError");

                    owner.scan.reject();
                    owner.scan = null;
                }
                else {
                    console.error("onNetworkScanError no promise");
                }
            },
        });

        this.uploadListener = new org.conservify.networking.WebTransferListener({
            onStarted(taskId: string, headers: any) {
                debug("upload:onStarted", taskId, headers);
            },

            onProgress(taskId: string, bytes: number, total: number) {
                debug("upload:onProgress", taskId, bytes, total);
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                debug("upload:onComplete", taskId, headers, contentType, body, statusCode);
            },

            onError(taskId: string) {
                debug("upload:onError", taskId);
            },
        });

        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onStarted(taskId: string, headers: any) {
                debug("download:onStarted", taskId, headers);

                const task = active[taskId];
            },

            onProgress(taskId: string, bytes: number, total: number) {
                debug("download:onProgress", taskId, bytes, total);

                const { info } = active[taskId];
                const { progress } = info;

                if (progress) {
                    progress(total, bytes);
                }
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
                debug("download:onComplete", taskId, headers, contentType, body, statusCode);

                function getBody() {
                    if (body) {
                        if (contentType.indexOf("application/json") >= 0) {
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
                debug("download:onError", taskId);

                const task = active[taskId];

                delete active[taskId];

                task.reject({});
            },
        });

        this.dataListener = new org.conservify.data.DataListener({
            onFileInfo(path: string, info: any) {
                debug("fs:onFileInfo", path, info);
            },

            onFileRecords(path: string, records: any) {
                debug("fs:onFileRecords", path, records);
            },

            onFileAnalysis(path: string, analysis: any) {
                debug("fs:onFileAnalysis", path, analysis);
            },
        });

        this.fileSystem = new org.conservify.data.FileSystem(androidApp.context, this.dataListener);

        this.networking = new org.conservify.networking.Networking(androidApp.context, this.networkingListener, this.uploadListener, this.downloadListener);

        this.networking.getServiceDiscovery().start(serviceType);

        debug("ready");

        return Promise.resolve({ });
    }

    public json(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                resolve,
                reject,
            };

            this.networking.getWeb().json(transfer);
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

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                resolve,
                reject,
            };

            this.networking.getWeb().binary(transfer);
        });
    }

    public download(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);
        transfer.setPath(info.path);

        return new Promise((resolve, reject) => {
            this.active[transfer.getId()] = {
                info,
                resolve,
                reject,
            };

            this.networking.getWeb().download(transfer);
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            this.scan = {
                resolve,
                reject
            };

            // this.networking.getWifi().findConnectedNetwork();

            this.networking.getWifi().scan();
        });
    }
}
