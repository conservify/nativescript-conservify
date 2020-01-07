import { Common } from './conservify.common';

import * as applicationModule from 'tns-core-modules/application';
import { android as androidApp } from "tns-core-modules/application";
import { Folder, path, File, knownFolders } from "tns-core-modules/file-system";

const debug = (() => {
    if (true) {
        return console.log;
    }
    return () => { };
})();

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
    discoveryEvents: any;
    active: { [key: string]: any; };
    scan: any;
    started: any;
    connected: any;

    networkingListener: org.conservify.networking.NetworkingListener;
    downloadListener: org.conservify.networking.WebTransferListener;
    uploadListener: org.conservify.networking.WebTransferListener;
    networking: org.conservify.networking.Networking;
    dataListener: org.conservify.data.DataListener;
    fileSystem: org.conservify.data.FileSystem;

    constructor(discoveryEvents) {
        super();
        this.active = {};
        this.networkStatus = null;
        this.started = null;
        this.discoveryEvents = discoveryEvents;
    }

    public start(serviceType: string) {
        debug("initialize");

        const owner = this;
        const active = this.active;

        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onStarted() {
                owner.started.resolve();
            }

            onDiscoveryFailed() {
                owner.started.reject();
            }

            onFoundService(service: any) {
                debug("onFoundService", service);
                owner.discoveryEvents.onFoundService({
                    name: service.getName(),
                    type: service.getType(),
                    host: service.getAddress(),
                    port: service.getPort(),
                });
            },

            onLostService(service: any) {
                debug("onLostService", service);
                owner.discoveryEvents.onLostService({
                    name: service.getName(),
                    type: service.getType(),
					host: service.getAddress(), // Probably missing.
					port: service.getPort(),    // Probably missing.
				});
			},

			onNetworkStatus(status: any) {
                debug("onNetworkStatus");

				if (owner.networkStatus) {
					function getConnectedWifi() {
						if (status.getConnectedWifi() == null || status.getConnectedWifi().getSsid() == null) {
							return null;
						}

						return {
							ssid: status.getConnectedWifi().getSsid().replace(/"/g, '')
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
									ssid: n.getSsid()
								});
							}
						}

						return found;
					}

					const jsObject = {
						connected: status.getConnected(),
						connectedWifi: getConnectedWifi(),
						wifiNetworks: getWifiNetworks()
					};

                    owner.networkStatus.resolve(jsObject);
                    owner.networkStatus = null;
				}
				else {
					debug("onNetworkStatus: no promise!");
				}
            },
        });

        this.uploadListener = new org.conservify.networking.WebTransferListener({
            onProgress(taskId: string, headers: any, bytes: number, total: number) {
                debug("upload:onProgress", taskId, bytes, total);

                const { info } = active[taskId];
                const { progress } = info;

                if (progress) {
                    progress(total, bytes, info);
                }
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
				const jsHeaders = toJsHeaders(headers);

                debug("upload:onComplete", taskId, jsHeaders, contentType, body, statusCode);

                const task = active[taskId];
                const { info, transfer } = task;

                function getBody() {
                    if (body) {
                        if (contentType.indexOf("application/json") >= 0) {
                            return JSON.parse(body);
                        }
                        else {
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
            },

            onError(taskId: string, message: string) {
                debug("upload:onError", taskId, message);

                const task = active[taskId];
                const { info } = task;

                delete active[taskId];

                task.reject({
                    info,
					message,
                });
            },
        });

        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onProgress(taskId: string, headers: any, bytes: number, total: number) {
                debug("download:onProgress", taskId, bytes, total);

                const { info } = active[taskId];
                const { progress } = info;

                if (progress) {
                    progress(total, bytes, info);
                }
            },

            onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
				const jsHeaders = toJsHeaders(headers);

                debug("download:onComplete", taskId, jsHeaders, contentType, body, statusCode);

                const task = active[taskId];
                const { info, transfer } = task;

                function getBody() {
                    if (body) {
                        if (contentType.indexOf("application/json") >= 0) {
                            return JSON.parse(body);
                        }
                        else {
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
            },

            onError(taskId: string, message: string) {
                debug("download:onError", taskId, message);

                const task = active[taskId];
                const { info } = task;

                delete active[taskId];

                task.reject({
                    info,
					message,
                });
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

        return new Promise((resolve, reject) => {
            this.started = {
                resolve,
                reject
            };

            this.networking.getServiceDiscovery().start(serviceType);

            debug("starting...");
        });
    }

    public json(info) {
        const transfer = new org.conservify.networking.WebTransfer();
        transfer.setMethod(info.method);
        transfer.setUrl(info.url);

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
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

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
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

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
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

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
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
                reject
            };

            this.networking.getWifi().findConnectedNetwork();
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject
            };

            this.networking.getWifi().scan();
        });
    }
}
