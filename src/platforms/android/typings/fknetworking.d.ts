declare namespace org {
    declare namespace conservify {
        export class ContextContainer {
            constructor(androidContext: any | null);
            getContext(): any;
        }

        declare namespace data {
            export class ReadOptions {
                setBatchSize(size: number);
                getBatchSize(): number;
            }

            export class FileSystem {
                constructor(androidContext: any, fileSystemListener: FileSystemListener);

                open(path: string): any;

                copyFile(source: string, destiny: string): boolean;
            }

            export class FileSystemListener {
                constructor(members: any);
            }

            export class SampleData {
                write(): string;
            }
        }

        declare namespace networking {
            export interface ServiceInfo {
                getName(): string;
                getType(): string;
                getAddress(): string;
                getPort(): number;
            }

            export interface UdpMessage {
                getAddress(): string;
                getData(): string;
            }

            export class NetworkingListener {
                constructor(members: any);

                onUdpMessage(message: UdpMessage): void;
            }

            export class WebTransferListener {
                constructor(members: any);
            }

            export class WebTransfer {
                getId(): string;

                setMethod(method: string);
                getMethod(): string;

                setUrl(url: string);
                getUrl(): string;

                setPath(url: string);
                getPath(): string;

                setUploadCopy(uploadCopy: boolean);
                isUploadCopy(): boolean;

                setBody(body: string);
                getBody(): string;

                setBase64DecodeRequestBody(value: boolean);
                setBase64EncodeResponseBody(value: boolean);

                setConnectionTimeout(timeout: number);
                getConnectionTimeout(): number;

                setDefaultTimeout(timeout: number);
                getDefaultTimeout(): number;

                header(key: string, value: string): WebTransfer;
            }

            export class StartOptions {
                getServiceTypeSearch(): string;
                setServiceTypeSearch(serviceTypeSearch: string): void;
                getServiceNameSelf(): string;
                setServiceNameSelf(serviceNameSelf: string): void;
                getServiceTypeSelf(): string;
                setServiceTypeSelf(serviceTypeSelf: string): void;
                setDns(value: boolean): void;
                getDns(): boolean;
            }

            export class StopOptions {
                isSuspending(): boolean;
                setSuspending(suspending: boolean): void;
                setDns(value: boolean): void;
                getDns(): boolean;
                setMdns(value: boolean): void;
                getMdns(): boolean;
            }

            export class Web {
                json(info: WebTransfer): string;
                binary(info: WebTransfer): string;
                download(info: WebTransfer): string;
                upload(info: WebTransfer): string;
            }

            export class ServiceDiscovery {
                start(options: StartOptions): void;
                stop(options: StopOptions): void;
            }

            export class WifiNetworksManager {
                findConnectedNetwork(): void;
                scan(): void;
            }

            export class Networking {
                constructor(
                    androidContext: any,
                    networkingListener: NetworkingListener,
                    uploadListener: WebTransferListener,
                    downloadListener: WebTransferListener
                );

                getWeb(): Web;
                getWifi(): WifiNetworksManager;
                getServiceDiscovery(): ServiceDiscovery;

                start(serviceType: string): void;
                stop(): void;
            }
        }
    }
}
