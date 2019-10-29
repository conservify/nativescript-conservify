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
    onStarted(taskId: string, headers: any): void;
    onProgress(taskId: string, bytes: number, total: number): void;
    onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number): void;
    onError(taskId: string): void;
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

    public header(key: string, value: string): WebTransfer;
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

class UploadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

	  static alloc(): UploadListener {
        return <UploadListener>super.new();
    }

    public initMine(): UploadListener {
        return <UploadListener>this;
    }

    public onStarted(taskId: string, headers: any) {
        console.log("upload:onStarted", taskId, headers);
    }

    public onProgress(taskId: string, bytes: number, total: number) {
        console.log("upload:onProgress", taskId, bytes, total);
    }

    public onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        console.log("upload:onStarted", taskId, headers, contentType, body, statusCode);
    }

    public onError(taskId: string) {
        console.log("upload:onError", taskId);
    }
}

class DownloadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

	  static alloc(): DownloadListener {
        return <DownloadListener>super.new();
    }

    public initMine(): DownloadListener {
        return <DownloadListener>this;
    }

    public onStarted(taskId: string, headers: any) {
        console.log("download:onStarted", taskId, headers);
    }

    public onProgress(taskId: string, bytes: number, total: number) {
        console.log("download:onProgress", taskId, bytes, total);
    }

    public onComplete(taskId: string, headers: any, contentType: string, body: any, statusCode: number) {
        console.log("download:onStarted", taskId, headers, contentType, body, statusCode);
    }

    public onError(taskId: string) {
        console.log("upload:onError", taskId);
    }
}

export class Conservify extends Common {
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

    public start(serviceType: string) {
        console.log("initialize, ok");

        this.networkingListener = MyNetworkingListener.alloc().initMine();
        this.uploadListener = UploadListener.alloc().initMine();
        this.downloadListener = DownloadListener.alloc().initMine();

        this.networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(this.networkingListener, this.uploadListener, this.downloadListener);
        this.networking.serviceDiscovery.startWithServiceType(serviceType);

        console.log("done, ready");

        return Promise.resolve({ });
    }

    public json(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;

        for (let [key, value] of Object.entries(info.headers || { })) {
            transfer.header(key, (value as string));
        }

        const id = this.networking.web.jsonWithInfo(transfer);

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
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;

        if (info.body) {
            const requestBody = Buffer.from(info.body).toString("hex");
            transfer.body = requestBody;
        }

        transfer.header("Content-Type", "text/plain");

        const id = this.networking.web.binaryWithInfo(transfer);

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
        const transfer = WebTransfer.alloc().init();
        transfer.url = info.url;
        transfer.path = info.path;

        const id = this.networking.web.downloadWithInfo(transfer);

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
