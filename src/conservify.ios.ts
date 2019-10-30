import { Common } from './conservify.common';

interface NetworkingListener {
    onStarted(): void
    onFoundServiceWithService(service: ServiceInfo): void;
    onLostServiceWithService(service: ServiceInfo): void;
    onConnectionInfoWithConnected(connected: boolean): void;
    onConnectedNetworkWithNetwork(network: WifiNetwork): void;
    onNetworksFoundWithNetworks(networks: WifiNetworks): void;
    onNetworkScanError(): void;
}

declare var NetworkingListener: {
	  prototype: NetworkingListener;
}

interface WebTransferListener {
    onStartedWithTaskIdHeaders(taskId: string, headers: any): void;
    onProgressWithTaskIdBytesTotal(taskId: string, bytes: number, total: number): void;
    onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(taskId: string, headers: any, contentType: string, body: any, statusCode: number): void;
    onErrorWithTaskId(taskId: string): void;
}

declare var WebTransferListener: {
	  prototype: WebTransferListener;
}

declare class WifiNetwork extends NSObject {
    public ssid: string;
}

declare class WifiNetworks extends NSObject {
    networks: WifiNetwork[];
}

declare class WebTransfer extends NSObject {
	  static alloc(): WebTransfer;

	  static new(): WebTransfer;

    public url: string;
    public path: string;
    public body: any;

    public headerWithKeyValue(key: string, value: string): WebTransfer;
}

declare class ServiceInfo extends NSObject {
    public type: string;
    public name: string;
    public host: string;
    public port: number;
}

declare class ServiceDiscovery extends NSObject {
    startWithServiceType(serviceType: string): void
}

declare class Web extends NSObject {
    public simpleWithInfo(info: WebTransfer): string;
    public downloadWithInfo(info: WebTransfer): string;
    public uploadWithInfo(info: WebTransfer): string;
}

declare class WifiNetworksManager extends NSObject {
    public findConnectedNetwork(): void;
    public scan(): void;
}

declare class Networking extends NSObject {
	  static alloc(): Networking; // inherited from NSObject

	  static new(): Networking; // inherited from NSObject

    initWithNetworkingListenerUploadListenerDownloadListener(networkingListener: NetworkingListener, uploadListener: WebTransferListener, downloadListener: WebTransferListener): Networking;

    serviceDiscovery: ServiceDiscovery;
    web: Web;
    wifi: WifiNetworksManager;
}

const NetworkingProto = global.Networking;
const ServiceDiscoveryProto = global.ServiceDiscovery;
const WebProto = global.Web;
const NetworkingListenerProto = global.NetworkingListener;
const WebTransferListenerProto = global.WebTransferListener;
const ServiceInfoProto = global.ServiceInfo;
const WebTransferProto = global.WebTransfer;
const WifiNetworkProto = global.WifiNetwork;

const debug = console.log;

class MyNetworkingListener extends NSObject implements NetworkingListener {
    public static ObjCProtocols = [NetworkingListener];

	  static alloc(): MyNetworkingListener {
        return <MyNetworkingListener>super.new();
    }

    public initMine(): MyNetworkingListener {
        return <MyNetworkingListener>this;
    }

    public onStarted() {
        debug("onStarted");
    }

    public onFoundServiceWithService(service: ServiceInfo) {
        debug("onFoundServiceWithService", service.type, service.name, service.host, service.port);
    }

    public onLostServiceWithService(service: ServiceInfo) {
        debug("onLostServiceWithService", service.type, service.name);
    }

    public onConnectionInfoWithConnected(connected: boolean) {
        debug("onConnectionInfoWithConnected", connected);
    }

    public onConnectedNetworkWithNetwork(network: WifiNetwork) {
        debug("onConnectedNetworkWithNetwork", network);
    }

    public onNetworksFoundWithNetworks(networks: WifiNetworks) {
        debug("onNetworksFoundWithNetworks", networks);
    }

    public onNetworkScanError() {
        debug("onNetworkScanError");
    }
}

interface ActiveTasks {
    getTask(id: string): any;
    removeTask(id: string): void;
}

class UploadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

	  static alloc(): UploadListener {
        return <UploadListener>super.new();
    }

    public initWithTasks(tasks: ActiveTasks): UploadListener {
        this.tasks = tasks;
        return <UploadListener>this;
    }

    public onStartedWithTaskIdHeaders(taskId: string, headers: any) {
        debug("upload:onStarted", taskId, headers);
    }

    public onProgressWithTaskIdBytesTotal(taskId: string, bytes: number, total: number) {
        debug("upload:onProgress", taskId, bytes, total);
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        debug("upload:onComplete", taskId, headers, contentType, body, statusCode);

        const task = this.tasks.getTask(taskId);

        this.tasks.removeTask(taskId);

        task.resolve({
            headers: headers,
            statusCode: statusCode,
            body: getBody(),
        });
    }

    public onErrorWithTaskId(taskId: string) {
        debug("upload:onError", taskId);
    }
}

class DownloadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

	  static alloc(): DownloadListener {
        return <DownloadListener>super.new();
    }

    public initWithTasks(tasks: ActiveTasks): DownloadListener {
        this.tasks = tasks;
        return <DownloadListener>this;
    }

    public onStartedWithTaskIdHeaders(taskId: string, headers: any) {
        debug("download:onStarted", taskId, headers);
    }

    public onProgressWithTaskIdBytesTotal(taskId: string, bytes: number, total: number) {
        debug("download:onProgress", taskId, bytes, total);

        const { progress } = this.tasks.getTask(taskId);

        if (progress) {
            progress(bytes, total);
        }
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        debug("download:onComplete", taskId, headers, contentType, statusCode);

        const task = this.tasks.getTask(taskId);
        const { transfer } = task;

        this.tasks.removeTask(taskId);

        function getBody() {
            if (body) {
                if (contentType.indexOf("application/json") >= 0) {
                    return JSON.parse(body);
                }
                else {
                    if (transfer.base64EncodeResponseBody) {
                        console.log("decoding", body.length);
                        const b = Buffer.from(body, "base64");
                        console.log(b.length);
                        return b;
                    }
                    return body;
                }
            }
            return null;
        }

        task.resolve({
            headers: headers,
            statusCode: statusCode,
            body: getBody(),
        });
    }

    public onErrorWithTaskId(taskId: string) {
        debug("download:onError", taskId);
    }
}

export class Conservify extends Common implements ActiveTasks {
    active: { [key: string]: any; };
    scan: any;

    networking: Networking;
    networkingListener: MyNetworkingListener;
    uploadListener: WebTransferListener;
    downloadListener: WebTransferListener;

    constructor() {
        super();
        this.active = {};
        this.scan = null;
    }

    public getTask(id: string): any {
        return this.active[id];
    }

    public removeTask(id: string) {
        delete this.active[id];
    }

    public start(serviceType: string) {
        debug("initialize, ok");

        this.networkingListener = MyNetworkingListener.alloc().initMine();
        this.uploadListener = UploadListener.alloc().initWithTasks(this);
        this.downloadListener = DownloadListener.alloc().initWithTasks(this);

        this.networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(this.networkingListener, this.uploadListener, this.downloadListener);
        this.networking.serviceDiscovery.startWithServiceType(serviceType);

        debug("done, ready");

        return Promise.resolve({ });
    }

    public json(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.headerWithKeyValue(key, (value as string));
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.web.simpleWithInfo(transfer);
        });
    }

    public protobuf(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;
        transfer.base64EncodeResponseBody = true;

        if (info.body) {
            const requestBody = Buffer.from(info.body).toString("base64");
            transfer.body = requestBody;
            transfer.base64DecodeRequestBody = true;
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.web.simpleWithInfo(transfer);
        });
    }

    public download(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;
        transfer.path = info.path;

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.web.downloadWithInfo(transfer);
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            this.scan = {
                resolve,
                reject
            };

            console.log("A");

            this.networking.wifi.findConnectedNetwork();

            console.log("B");

            this.networking.wifi.scan();
        });
    }
}
