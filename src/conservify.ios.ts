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
    public jsonWithInfo(info: WebTransfer): string;
    public binaryWithInfo(info: WebTransfer): string;
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

class MyNetworkingListener extends NSObject implements NetworkingListener {
    public static ObjCProtocols = [NetworkingListener];

	  static alloc(): MyNetworkingListener {
        return <MyNetworkingListener>super.new();
    }

    public initMine(): MyNetworkingListener {
        return <MyNetworkingListener>this;
    }

    public onStarted() {
        console.log("onStarted");
    }

    public onFoundServiceWithService(service: ServiceInfo) {
        console.log("onFoundServiceWithService", service.type, service.name, service.host, service.port);
    }

    public onLostServiceWithService(service: ServiceInfo) {
        console.log("onLostServiceWithService", service.type, service.name);
    }

    public onConnectionInfoWithConnected(connected: boolean) {
        console.log("onConnectionInfoWithConnected", connected);
    }

    public onConnectedNetworkWithNetwork(network: WifiNetwork) {
        console.log("onConnectedNetworkWithNetwork", network);
    }

    public onNetworksFoundWithNetworks(networks: WifiNetworks) {
        console.log("onNetworksFoundWithNetworks", networks);
    }

    public onNetworkScanError() {
        console.log("onNetworkScanError");
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
        console.log("upload:onStarted", taskId, headers);
    }

    public onProgressWithTaskIdBytesTotal(taskId: string, bytes: number, total: number) {
        console.log("upload:onProgress", taskId, bytes, total);
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        console.log("upload:onComplete", taskId, headers, contentType, body, statusCode);

        const task = this.tasks.getTask(taskId);

        this.tasks.removeTask(taskId);

        task.resolve({
            headers: headers,
            statusCode: statusCode,
            body: getBody(),
        });
    }

    public onErrorWithTaskId(taskId: string) {
        console.log("upload:onError", taskId);
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
        console.log("download:onStarted", taskId, headers);
    }

    public onProgressWithTaskIdBytesTotal(taskId: string, bytes: number, total: number) {
        console.log("download:onProgress", taskId, bytes, total);
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        console.log("download:onComplete", taskId, headers, contentType, body, statusCode);

        const task = this.tasks.getTask(taskId);

        this.tasks.removeTask(taskId);

        function getBody() {
            if (body) {
                console.log(contentType);
                if (contentType == "application/json") {
                    return JSON.parse(body);
                }
                else {
                    return body; // Buffer.from(body, "hex");
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
        console.log("download:onError", taskId);
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
        console.log("initialize, ok");

        this.networkingListener = MyNetworkingListener.alloc().initMine();
        this.uploadListener = UploadListener.alloc().initWithTasks(this);
        this.downloadListener = DownloadListener.alloc().initWithTasks(this);

        this.networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(this.networkingListener, this.uploadListener, this.downloadListener);
        this.networking.serviceDiscovery.startWithServiceType(serviceType);

        console.log("done, ready");

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
                resolve,
                reject,
            };

            console.log("ID", transfer.id);

            this.networking.web.jsonWithInfo(transfer);
        });
    }

    public protobuf(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;

        if (info.body) {
            const requestBody = Buffer.from(info.body).toString("hex");
            transfer.body = requestBody;
        }

        transfer.headerWithKeyValue("Content-Type", "text/plain");

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                resolve,
                reject,
            };

            this.networking.web.binaryWithInfo(transfer);
        });
    }

    public download(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;
        transfer.path = info.path;

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                resolve,
                reject,
            };

            console.log("ID", transfer.id);

            this.networking.web.downloadWithInfo(transfer);
        });
    }

    public scanNetworks() {
        this.networking.wifi.findConnectedNetwork();

        this.networking.wifi.scan();

        return new Promise((resolve, reject) => {
            this.scan = {
                resolve,
                reject
            };
        });
    }
}
