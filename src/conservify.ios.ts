import { Common, ConnectionError } from "./conservify.common";

interface NetworkingListener {
    onStarted(): void;
    onDiscoveryFailed(): void;
    onFoundServiceWithService(service: ServiceInfo): void;
    onLostServiceWithService(service: ServiceInfo): void;
    onNetworkStatusWithStatus(status: NetworkingStatus): void;
}

declare var NetworkingListener: {
    prototype: NetworkingListener;
};

interface WebTransferListener {
    onProgressWithTaskIdHeadersBytesTotal(taskId: string, headers: any, bytes: number, total: number): void;
    onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(
        taskId: string,
        headers: any,
        contentType: string,
        body: any,
        statusCode: number
    ): void;
    onErrorWithTaskIdMessage(taskId: string, message: string): void;
}

declare var WebTransferListener: {
    prototype: WebTransferListener;
};

declare class WifiNetwork extends NSObject {
    public ssid: string;
}

declare class WifiNetworks extends NSObject {
    networks: WifiNetwork[];
}

declare class NetworkingStatus extends NSObject {
    connected: boolean;
    connectedWifi: WifiNetwork;
    wifiNetworks: WifiNetworks;
    scanError: boolean;
}

declare class WebTransfer extends NSObject {
    static alloc(): WebTransfer;

    static new(): WebTransfer;

    public id: string;
    public method: string;
    public url: string;
    public path: string;
    public body: any;
    public base64EncodeResponseBody: boolean;
    public base64DecodeRequestBody: boolean;

    public headerWithKeyValue(key: string, value: string): WebTransfer;
}

declare class ServiceInfo extends NSObject {
    public type: string;
    public name: string;
    public host: string;
    public port: number;
}

declare class ReadOptions extends NSObject {
    static alloc(): ReadOptions;

    static new(): ReadOptions;

    public batchSize: number;
}

declare class PbFile {
    readInfoWithToken(token: string): boolean;
    readDelimitedWithTokenOptions(token: string, options: ReadOptions): boolean;
}

interface FileSystemListener {
    onFileInfoWithPathTokenInfo(path: string, token: string, info: any): void;
    onFileRecordsWithPathTokenPositionSizeRecords(path: string, token: string, position: number, size: number, records: any): void;
    onFileErrorWithPathTokenError(path: string, token: string, error: string): void;
}

declare var FileSystemListener: {
    prototype: FileSystemListener;
};

declare class FileSystem extends NSObject {
    static alloc(): FileSystem; // inherited from NSObject

    static new(): FileSystem; // inherited from NSObject

    initWithListener(listener: FileSystemListener): FileSystem;

    openWithPath(path: string): PbFile;

    newToken(): String;
}

declare class SampleData extends NSObject {
    static alloc(): SampleData; // inherited from NSObject

    static new(): SampleData; // inherited from NSObject

    init(): SampleData;

    write(): String;
}

declare class ServiceDiscovery extends NSObject {
    startWithServiceType(serviceType: string): void;
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

    initWithNetworkingListenerUploadListenerDownloadListener(
        networkingListener: NetworkingListener,
        uploadListener: WebTransferListener,
        downloadListener: WebTransferListener
    ): Networking;

    serviceDiscovery: ServiceDiscovery;
    web: Web;
    wifi: WifiNetworksManager;
}

interface OtherPromises {
    getStartedPromise(): Promise;
    getNetworkStatusPromise(): Promise;
    getDiscoveryEvents(): any;
}

class MyNetworkingListener extends NSObject implements NetworkingListener {
    public static ObjCProtocols = [NetworkingListener];

    promises: OtherPromises;
    logger: any;

    static alloc(): MyNetworkingListener {
        return <MyNetworkingListener>super.new();
    }

    public initWithPromises(promises: OtherPromises, logger: any): MyNetworkingListener {
        this.promises = promises;
        this.logger = logger;
        return <MyNetworkingListener>this;
    }

    public onStarted() {
        this.logger("onStarted");

        this.promises.getStartedPromise().resolve();
    }

    public onDiscoveryFailed() {
        this.promises.getStartedPromise().reject(new Error("discovery failed"));
    }

    public onFoundServiceWithService(service: ServiceInfo) {
        this.logger("onFoundServiceWithService", service.type, service.name, service.host, service.port);

        this.promises.getDiscoveryEvents().onFoundService({
            name: service.name,
            type: service.type,
            host: service.host,
            port: service.port,
        });
    }

    public onLostServiceWithService(service: ServiceInfo) {
        this.logger("onLostServiceWithService", service.type, service.name);

        this.promises.getDiscoveryEvents().onLostService({
            name: service.name,
            type: service.type,
            host: service.host, // Probably missing.
            port: service.port, // Probably missing.
        });
    }

    public onNetworkStatusWithStatus(status: NetworkingStatus) {
        this.promises.getNetworkStatusPromise().resolve(status);
    }
}

interface ActiveTasks {
    getTask(id: string): any;
    removeTask(id: string): void;
}

function toJsHeaders(headers) {
    const jsHeaders = {};
    for (let i = 0; i < headers.allKeys.count; ++i) {
        const key = headers.allKeys[i];
        jsHeaders[key.toLowerCase()] = headers.valueForKey(key);
    }
    return jsHeaders;
}

class UploadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

    logger: any;

    static alloc(): UploadListener {
        return <UploadListener>super.new();
    }

    public initWithTasks(tasks: ActiveTasks, logger: any): UploadListener {
        this.tasks = tasks;
        this.logger = logger;
        return <UploadListener>this;
    }

    public onProgressWithTaskIdHeadersBytesTotal(taskId: string, headers: any, bytes: number, total: number) {
        this.logger("upload:onProgress", taskId, bytes, total);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info } = task;
            const { progress } = info;

            if (progress) {
                progress(total, bytes, info);
            }
        } else {
            this.logger("upload:onProgress (orphaned)", taskId, bytes, total);
        }
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(
        taskId: string,
        headers: any,
        contentType: string,
        body: any,
        statusCode: number
    ) {
        const jsHeaders = toJsHeaders(headers);

        this.logger("upload:onComplete", taskId, jsHeaders, contentType, statusCode);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info, transfer } = task;

            this.tasks.removeTask(taskId);

            function getBody() {
                if (body) {
                    if (contentType.indexOf("application/json") >= 0) {
                        return JSON.parse(body);
                    } else {
                        if (transfer.base64EncodeResponseBody) {
                            return Buffer.from(body, "base64");
                        }
                        return body;
                    }
                }
                return null;
            }

            task.resolve({
                info,
                headers: jsHeaders,
                statusCode,
                body: getBody(),
            });
        } else {
            this.logger("upload:onComplete (orphaned)", taskId, jsHeaders, contentType, statusCode);
        }
    }

    public onErrorWithTaskIdMessage(taskId: string, message: string) {
        this.logger("upload:onError", taskId);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info } = task;

            this.tasks.removeTask(taskId, message);

            task.reject(new ConnectionError(message, info));
        } else {
            this.logger("upload:onError (orphaned)", taskId);
        }
    }
}

class DownloadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

    logger: any;

    static alloc(): DownloadListener {
        return <DownloadListener>super.new();
    }

    public initWithTasks(tasks: ActiveTasks, logger: any): DownloadListener {
        this.tasks = tasks;
        this.logger = logger;
        return <DownloadListener>this;
    }

    public onProgressWithTaskIdHeadersBytesTotal(taskId: string, headers: any, bytes: number, total: number) {
        this.logger("download:onProgress", taskId, bytes, total);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info } = task;
            const { progress } = info;

            if (progress) {
                progress(total, bytes, info);
            }
        } else {
            this.logger("download:onProgress (orphaned)", taskId, bytes, total);
        }
    }

    public onCompleteWithTaskIdHeadersContentTypeBodyStatusCode(
        taskId: string,
        headers: any,
        contentType: string,
        body: any,
        statusCode: number
    ) {
        const jsHeaders = toJsHeaders(headers);

        this.logger("download:onComplete", taskId, jsHeaders, contentType, statusCode);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info, transfer } = task;

            this.tasks.removeTask(taskId);

            function getBody() {
                if (body) {
                    if (contentType.indexOf("application/json") >= 0) {
                        return JSON.parse(body);
                    } else {
                        if (transfer.base64EncodeResponseBody) {
                            return Buffer.from(body, "base64");
                        }
                        return body;
                    }
                }
                return null;
            }

            task.resolve({
                info,
                headers: jsHeaders,
                statusCode,
                body: getBody(),
            });
        } else {
            this.logger("download:onComplete (orphaned)", taskId, jsHeaders, contentType, statusCode);
        }
    }

    public onErrorWithTaskIdMessage(taskId: string, message: string) {
        this.logger("download:onError", taskId, message);

        const task = this.tasks.getTask(taskId);
        if (task) {
            const { info } = task;

            this.tasks.removeTask(taskId);

            task.reject(new ConnectionError(message, info));
        } else {
            this.logger("download:onError (orphaned)", taskId, message);
        }
    }
}

class MyFileSystemListener extends NSObject implements FileSystemListener {
    public static ObjCProtocols = [FileSystemListener];

    logger: any;

    static alloc(): MyFileSystemListener {
        return <MyFileSystemListener>super.new();
    }

    public initWithTasks(tasks: ActiveTasks, logger: any): MyFileSystemListener {
        this.tasks = tasks;
        this.logger = logger;
        return <MyFileSystemListener>this;
    }

    public onFileInfoWithPathTokenInfo(path: string, token: string, info: any): void {
        console.log("fs:onFileInfo", path, token, info);

        const task = this.tasks.getTask(token);
        if (task) {
            const { resolve } = task;
            resolve(info);
        }
    }

    public onFileRecordsWithPathTokenPositionSizeRecords(path: string, token: string, position: number, size: number, records: any): void {
        console.log("fs:onFileRecords", path, token, position, size, records != null ? records.count : "");

        const task = this.tasks.getTask(token);
        if (task) {
            const { resolve, listener } = task;
            if (records) {
                listener(position, size, records);
            } else {
                resolve();
            }
        }
    }

    public onFileErrorWithPathTokenError(path: string, token: string, error: string): void {
        console.log("fs:onFileError", path, token, error);

        const task = this.tasks.getTask(token);
        if (task) {
            const { reject } = task;
            reject(error);
        }
    }
}

class OpenedFile {
    cfy: Conservify;
    fs: FileSystem;
    file: PbFile;

    public constructor(cfy: Conservify, file: PbFile) {
        this.cfy = cfy;
        this.fs = cfy.fileSystem;
        this.file = file;
    }

    public info() {
        return new Promise((resolve, reject) => {
            const token = this.fs.newToken();
            this.file.readInfoWithToken(token);

            this.cfy.active[token] = {
                resolve,
                reject,
            };
        });
    }

    public delimited(listener) {
        return new Promise((resolve, reject) => {
            const token = this.fs.newToken();
            const options = new ReadOptions();
            options.batchSize = 10;
            this.file.readDelimitedWithTokenOptions(token, options);

            this.cfy.active[token] = {
                listener,
                resolve,
                reject,
            };
        });
    }
}

const NetworkingProto = global.Networking;
const ServiceDiscoveryProto = global.ServiceDiscovery;
const WebProto = global.Web;
const NetworkingListenerProto = global.NetworkingListener;
const WebTransferListenerProto = global.WebTransferListener;
const ServiceInfoProto = global.ServiceInfo;
const WebTransferProto = global.WebTransfer;
const WifiNetworkProto = global.WifiNetwork;
const WifiManagerProto = global.WifiManager;
const FileSystemListenerProto = global.FileSystemListener;
const FileSystemProto = global.FileSystem;
const PbFileProto = global.PbFile;
const SampleDataProto = global.SampleData;

export class Conservify extends Common implements ActiveTasks, OtherPromises {
    logger: any;
    active: { [key: string]: any };
    networkStatus: any;
    started: any;

    networking: Networking;
    fileSystem: FileSystem;
    networkingListener: MyNetworkingListener;
    uploadListener: WebTransferListener;
    downloadListener: WebTransferListener;
    discoveryEvents: any;

    constructor(discoveryEvents, logger) {
        super();
        this.logger = logger || console.log;
        this.active = {};
        this.scan = null;
        this.started = null;
        this.discoveryEvents = discoveryEvents;
    }

    public getTask(id: string): any {
        return this.active[id];
    }

    public removeTask(id: string) {
        delete this.active[id];
    }

    public start(serviceType: string) {
        this.networkingListener = MyNetworkingListener.alloc().initWithPromises(this, this.logger);
        this.uploadListener = UploadListener.alloc().initWithTasks(this, this.logger);
        this.downloadListener = DownloadListener.alloc().initWithTasks(this, this.logger);
        this.networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(
            this.networkingListener,
            this.uploadListener,
            this.downloadListener
        );

        this.fsListener = MyFileSystemListener.alloc().initWithTasks(this, this.logger);
        this.fileSystem = FileSystem.alloc().initWithListener(this.fsListener);

        return new Promise((resolve, reject) => {
            this.logger("initialize, ok");

            this.started = {
                resolve,
                reject,
            };

            this.networking.serviceDiscovery.startWithServiceType(serviceType);

            this.logger("starting...");
        });
    }

    public writeSampleData() {
        const sampleData: SampleData = SampleData.alloc().init();
        return Promise.resolve(sampleData.write());
    }

    public open(path) {
        return Promise.resolve(new OpenedFile(this, this.fileSystem.openWithPath(path)));
    }

    public json(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.body = info.body;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
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

    public text(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.body = info.body;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
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
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.base64EncodeResponseBody = true;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
        }

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
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.path = info.path;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
        }

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

    public upload(info) {
        const transfer = WebTransfer.alloc().init();
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.path = info.path;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
        }

        return new Promise((resolve, reject) => {
            this.active[transfer.id] = {
                info,
                transfer,
                resolve,
                reject,
            };

            this.networking.web.uploadWithInfo(transfer);
        });
    }

    public getDiscoveryEvents(): any {
        return this.discoveryEvents;
    }

    public getStartedPromise(): Promise<any> {
        return this.started;
    }

    public getNetworkStatusPromise(): Promise<any> {
        return this.networkStatus;
    }

    public findConnectedNetwork() {
        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.wifi.findConnectedNetwork();
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.wifi.scan();
        });
    }
}
