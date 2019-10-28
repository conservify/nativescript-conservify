import { Common } from './conservify.common';

interface NetworkingListener {
    onStarted(): void
}

declare var NetworkingListener: {
	  prototype: NetworkingListener;
}

interface WebTransferListener {
}

declare var WebTransferListener: {
	  prototype: WebTransferListener;
}

declare class WebTransfer extends NSObject {
}

declare class ServiceDiscovery extends NSObject {
    startWithServiceType(serviceType: string): void
}

declare class Web extends NSObject {
    test(): void
}

declare class Networking extends NSObject {
	  static alloc(): Networking; // inherited from NSObject

	  static new(): Networking; // inherited from NSObject

	  constructor(o: { networkingListener: NetworkingListener; uploadListener: WebTransferListener; downloadListener: WebTransferListener; });

    getServiceDiscovery(): ServiceDiscovery
    getWeb(): Web
    start(): void
    test(): void
}

class MyNetworkingListener extends NSObject implements NetworkingListener {
    public static ObjCProtocols = [NetworkingListener];

    static new(): MyNetworkingListener {
        return <MyNetworkingListener>super.new();
    }

    public init(): MyNetworkingListener {
        return <MyNetworkingListener>this;
    }

    public onStarted() {
        console.log("onStarted");
    }
}

export class Conservify extends Common {
    constructor() {
        super();
    }

    public start(serviceType) {
        console.log("initialize, ok");

        const networkingListener = MyNetworkingListener.alloc().init();

        console.log("networkingListener", networkingListener);

        const networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(networkingListener, null, null);
        const web = networking.getWeb();
        const serviceDiscovery = networking.getServiceDiscovery();

        console.log("web", web);
        console.log("web instanceof Web", web instanceof Web);
        console.log("typeof web", typeof web);

        console.log("serviceDiscovery", serviceDiscovery);
        console.log("serviceDiscovery instanceof ServiceDiscovery", serviceDiscovery instanceof ServiceDiscovery);
        console.log("typeof serviceDiscovery", typeof serviceDiscovery);

        try {
            console.log("web.test", web.test);
            console.log("serviceDiscovery.start", serviceDiscovery.startWithServiceType);
        }
        catch (e) {
            console.log("error", e);
        }

        networking.startWithServiceType(serviceType);

        return Promise.resolve({ });
    }

    public json(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public protobuf(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public download(info) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }

    public scanNetworks() {
        return new Promise((resolve, reject) => {
            reject();
        });
    }
}
