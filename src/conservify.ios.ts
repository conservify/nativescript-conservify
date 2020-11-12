import { ConnectionError, PromiseCallbacks, TransferInfo, HttpResponse, encodeBody } from "./conservify.common";

interface NetworkingListener {
    onStarted(): void;
    // onStopped(): void;
    onDiscoveryFailed(): void;
    onFoundServiceWithService(service: ServiceInfo): void;
    onLostServiceWithService(service: ServiceInfo): void;
    onNetworkStatusWithStatus(status: NetworkingStatus): void;
    onUdpMessageWithMessage(message: UdpMessage): void;
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
    public uploadCopy: boolean;
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

declare class UdpMessage extends NSObject {
    public address: string;
    public data: string;
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
    copyFileWithSourceDestiny(source: string, destiny: string): boolean;

    newToken(): string;
}

declare class SampleData extends NSObject {
    static alloc(): SampleData; // inherited from NSObject

    static new(): SampleData; // inherited from NSObject

    // init(): SampleData;

    write(): string;
}

declare class ServiceDiscovery extends NSObject {
    startWithServiceTypeSearchServiceNameSelfServiceTypeSelf(
        serviceTypeSearch: string | null,
        serviceNameSelf: string | null,
        serviceTypeSelf: string | null
    ): void;
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
    getStartedPromise(): PromiseCallbacks;
    getNetworkStatusPromise(): PromiseCallbacks;
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

        this.promises.getStartedPromise().resolve(null);
    }

    public onStopped() {
        this.logger("onStopped");
        // this.promises.getStoppedPromise().resolve(null);
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

    public onUdpMessageWithMessage(message: UdpMessage): void {
        this.logger("onUdpMessageWithMessage", message);

        this.promises.getDiscoveryEvents().onUdpMessage({
            address: message.address,
            data: message.data,
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
    tasks: ActiveTasks;

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

            const getBody = () => {
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
            };

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

            this.tasks.removeTask(taskId);

            task.reject(new ConnectionError(message, info));
        } else {
            this.logger("upload:onError (orphaned)", taskId);
        }
    }
}

class DownloadListener extends NSObject implements WebTransferListener {
    public static ObjCProtocols = [WebTransferListener];

    logger: any;
    tasks: ActiveTasks;

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

            const getBody = () => {
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
            };

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
    tasks: ActiveTasks;

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

const globalAny: any = global;
const NetworkingProto = globalAny.Networking;
const ServiceDiscoveryProto = globalAny.ServiceDiscovery;
const WebProto = globalAny.Web;
const NetworkingListenerProto = globalAny.NetworkingListener;
const WebTransferListenerProto = globalAny.WebTransferListener;
const ServiceInfoProto = globalAny.ServiceInfo;
const WebTransferProto = globalAny.WebTransfer;
const WifiNetworkProto = globalAny.WifiNetwork;
const WifiManagerProto = globalAny.WifiManager;
const FileSystemListenerProto = globalAny.FileSystemListener;
const FileSystemProto = globalAny.FileSystem;
const PbFileProto = globalAny.PbFile;
const SampleDataProto = globalAny.SampleData;

export class Conservify implements ActiveTasks, OtherPromises {
    logger: any;
    active: { [key: string]: any };
    networkStatus: any;
    started: any;
    scan: any;

    networking: Networking;
    fileSystem: FileSystem;
    networkingListener: MyNetworkingListener;
    uploadListener: WebTransferListener;
    downloadListener: WebTransferListener;
    fsListener: MyFileSystemListener;
    discoveryEvents: any;

    constructor(discoveryEvents, logger) {
        this.logger = logger || console.log;
        this.active = {};
        this.scan = null;
        this.started = null;
        this.discoveryEvents = discoveryEvents;

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
    }

    public getTask(id: string): any {
        return this.active[id];
    }

    public removeTask(id: string) {
        delete this.active[id];
    }

    public stop(): Promise<void> {
        console.log("stopped (ignored, ios)");
        return Promise.resolve();
    }

    public start(
        serviceTypeSearch: string | null = null,
        serviceNameSelf: string | null = null,
        serviceTypeSelf: string | null = null
    ): Promise<any> {
        if (this.started) {
            return Promise.resolve(true);
        }

        return new Promise((resolve, reject) => {
            this.started = {
                resolve,
                reject,
            };

            this.logger("starting:", serviceTypeSearch, serviceNameSelf, serviceTypeSelf);

            this.networking.serviceDiscovery.startWithServiceTypeSearchServiceNameSelfServiceTypeSelf(
                serviceTypeSearch,
                serviceNameSelf,
                serviceTypeSelf
            );
        });
    }

    public async writeSampleData(): Promise<void> {
        const sampleData: SampleData = SampleData.alloc().init();
        await sampleData.write();
        return Promise.resolve();
    }

    public open(path: string): Promise<OpenedFile> {
        if (!this.fileSystem) throw new Error("use before initialize");

        return Promise.resolve(new OpenedFile(this, this.fileSystem.openWithPath(path)));
    }

    public copyFile(source: string, destiny: string): Promise<boolean> {
        if (!this.fileSystem) throw new Error("use before initialize");

        return Promise.resolve(this.fileSystem.copyFileWithSourceDestiny(source, destiny));
    }

    public json(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

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

    public text(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

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

    public protobuf(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = WebTransfer.alloc().init();
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.base64EncodeResponseBody = true;

        for (let [key, value] of Object.entries(info.headers || {})) {
            transfer.headerWithKeyValue(key, value as string);
        }

        if (info.body) {
            transfer.body = encodeBody(info.body);
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

    public download(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

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

    public upload(info: TransferInfo): Promise<HttpResponse> {
        if (!this.networking) throw new Error("use before initialize");

        const transfer = WebTransfer.alloc().init();
        transfer.method = info.method;
        transfer.url = info.url;
        transfer.path = info.path;
        transfer.uploadCopy = info.uploadCopy;

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

    public getStartedPromise(): PromiseCallbacks {
        return this.started;
    }

    public getNetworkStatusPromise(): PromiseCallbacks {
        return this.networkStatus;
    }

    public findConnectedNetwork(): Promise<any> {
        if (!this.networking) throw new Error("use before initialize");

        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.wifi.findConnectedNetwork();
        });
    }

    public scanNetworks(): Promise<any> {
        if (!this.networking) throw new Error("use before initialize");

        return new Promise((resolve, reject) => {
            this.networkStatus = {
                resolve,
                reject,
            };

            this.networking.wifi.scan();
        });
    }
}
