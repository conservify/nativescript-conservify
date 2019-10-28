declare namespace org {
    declare namespace conservify {
        declare namespace data {
            export class DataListener {
            }

            export class FileSystem {
            }
        }
        declare namespace networking {
            export class NetworkingListener {
            }

            export class WebTransferListener {
            }

            export class WebTransfer {
                setUrl(url: string)
                setPath(url: string)
                setBody(body: string)

                header(key: string, value: string): WebTransfer
            }

            export class Web {
                json(info: WebTransfer): string
                binary(info: WebTransfer): string
                download(info: WebTransfer): string
                upload(info: WebTransfer): string
            }

            export class ServiceDiscovery {
                start(): void
            }

            export class WifiNetworksManager {
                findConnectedNetwork(): void
                scan(): void
            }

            export class Networking {
                getWeb(): Web
                getWifi(): WifiNetworksManager
                getServiceDiscovery(): ServiceDiscovery

                start(): void
            }
        }
    }
}
