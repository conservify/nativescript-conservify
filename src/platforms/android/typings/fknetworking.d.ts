declare namespace org {
    declare namespace conservify {
        declare namespace data {
            export class ReadOptions {
                setBatchSize(size: number);
                getBatchSize(): number;
            }

            export class FileSystem {
                constructor(androidContext: any, fileSystemListener: FileSystemListener);

                open(path: string): any;
            }

            export class FileSystemListener {
                constructor(members: any);
            }

            export class SampleData {
                write(): string;
            }
        }

        declare namespace networking {
            export class NetworkingListener {
                constructor(members: any);
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

                setBody(body: string);
                getBody(): string;

                setBase64DecodeRequestBody(value: boolean);
                setBase64EncodeResponseBody(value: boolean);

                header(key: string, value: string): WebTransfer;
            }

            export class Web {
                json(info: WebTransfer): string;
                binary(info: WebTransfer): string;
                download(info: WebTransfer): string;
                upload(info: WebTransfer): string;
            }

            export class ServiceDiscovery {
                start(serviceType: string): void;
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
            }
        }
    }
}
