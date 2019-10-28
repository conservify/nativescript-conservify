"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var conservify_common_1 = require("./conservify.common");
var MyNetworkingListener = (function (_super) {
    __extends(MyNetworkingListener, _super);
    function MyNetworkingListener() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MyNetworkingListener.new = function () {
        return _super.new.call(this);
    };
    MyNetworkingListener.prototype.init = function () {
        return this;
    };
    MyNetworkingListener.prototype.onStarted = function () {
        console.log("onStarted");
    };
    MyNetworkingListener.ObjCProtocols = [NetworkingListener];
    return MyNetworkingListener;
}(NSObject));
var Conservify = (function (_super) {
    __extends(Conservify, _super);
    function Conservify() {
        return _super.call(this) || this;
    }
    Conservify.prototype.start = function (serviceType) {
        console.log("initialize, ok");
        var networkingListener = MyNetworkingListener.alloc().init();
        console.log("networkingListener", networkingListener);
        var networking = Networking.alloc().initWithNetworkingListenerUploadListenerDownloadListener(networkingListener, null, null);
        var web = networking.getWeb();
        console.log("web", web);
        console.log("web instanceof Web", web instanceof Web);
        console.log("typeof web", typeof web);
        try {
            console.log("web.test", web.test);
            console.log("networking.getWeb().test", networking.getWeb().test);
        }
        catch (e) {
            console.log("error", e);
        }
        networking.startWithServiceType(serviceType);
        return Promise.resolve({});
    };
    Conservify.prototype.json = function (info) {
        return new Promise(function (resolve, reject) {
            reject();
        });
    };
    Conservify.prototype.protobuf = function (info) {
        return new Promise(function (resolve, reject) {
            reject();
        });
    };
    Conservify.prototype.download = function (info) {
        return new Promise(function (resolve, reject) {
            reject();
        });
    };
    Conservify.prototype.scanNetworks = function () {
        return new Promise(function (resolve, reject) {
            reject();
        });
    };
    return Conservify;
}(conservify_common_1.Common));
//# sourceMappingURL=conservify.ios.js.map