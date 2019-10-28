"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var conservify_common_1 = require("./conservify.common");
var application_1 = require("tns-core-modules/application");
var Conservify = (function (_super) {
    __extends(Conservify, _super);
    function Conservify() {
        var _this = _super.call(this) || this;
        _this.active = {};
        _this.scan = null;
        return _this;
    }
    Conservify.prototype.start = function (serviceType) {
        console.log("initialize");
        var active = this.active;
        this.networkingListener = new org.conservify.networking.NetworkingListener({
            onFoundService: function (service) {
                console.log("onFoundService", service);
            },
            onLostService: function (service) {
                console.log("onLostService", service);
            },
            onConnectionInfo: function (connected) {
                console.log("onConnectionInfo", connected);
            },
            onConnectedNetwork: function (network) {
                console.log("onConnectedNetwork", network.getSsid());
            },
            onNetworksFound: function (networks) {
                console.log("onNetworksFound", networks, networks.getNetworks());
                var found = [];
                for (var i = 0; i < networks.getNetworks().size(); ++i) {
                    var n = network.getNetworks()[i];
                    found.append({
                        ssid: n.getSsid()
                    });
                }
                if (this.scan) {
                    this.scan.resolve(found);
                    this.scan = null;
                }
            },
            onNetworkScanError: function () {
                console.log("onNetworkScanError");
                if (this.scan) {
                    this.scan.reject();
                    this.scan = null;
                }
            },
        });
        this.uploadListener = new org.conservify.networking.WebTransferListener({
            onStarted: function (task, headers) {
                console.log("upload:onStarted", task, headers);
            },
            onProgress: function (task, bytes, total) {
                console.log("upload:onProgress", task, bytes, total);
            },
            onComplete: function (task, headers, body, statusCode) {
                console.log("upload:onComplete", task, headers, body, statusCode);
            },
            onError: function (task) {
                console.log("upload:onError", task);
            },
        });
        this.downloadListener = new org.conservify.networking.WebTransferListener({
            onStarted: function (taskId, headers) {
                console.log("download:onStarted", taskId, headers);
                var task = active[taskId];
            },
            onProgress: function (taskId, bytes, total) {
                console.log("download:onProgress", taskId, bytes, total);
                var task = active[taskId];
            },
            onComplete: function (taskId, headers, contentType, body, statusCode) {
                console.log("download:onComplete", taskId, headers, body, statusCode);
                function getBody() {
                    if (body) {
                        console.log(contentType);
                        if (contentType == "application/json") {
                            return JSON.parse(body);
                        }
                        else {
                            return Buffer.from(body, "hex");
                        }
                    }
                    return null;
                }
                var task = active[taskId];
                delete active[taskId];
                task.resolve({
                    headers: headers,
                    statusCode: statusCode,
                    body: getBody(),
                });
            },
            onError: function (taskId) {
                console.log("download:onError", taskId);
                var task = active[taskId];
                delete active[taskId];
                task.reject({});
            },
        });
        this.dataListener = new org.conservify.data.DataListener({
            onFileInfo: function (path, info) {
                console.log("fs:onFileInfo", path, info);
            },
            onFileRecords: function (path, records) {
                console.log("fs:onFileRecords", path, records);
            },
            onFileAnalysis: function (path, analysis) {
                console.log("fs:onFileAnalysis", path, analysis);
            },
        });
        this.fileSystem = new org.conservify.data.FileSystem(application_1.android.context, this.dataListener);
        this.networking = new org.conservify.networking.Networking(application_1.android.context, this.networkingListener, this.uploadListener, this.downloadListener);
        this.networking.getServiceDiscovery().start(serviceType);
        console.log("ready");
        return Promise.resolve({});
    };
    Conservify.prototype.json = function (info) {
        var _this = this;
        var transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);
        for (var _i = 0, _a = Object.entries(info.headers || {}); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            transfer.header(key, value);
        }
        var id = this.networking.getWeb().json(transfer);
        return new Promise(function (resolve, reject) {
            _this.active[id] = {
                id: id,
                info: info,
                resolve: resolve,
                reject: reject,
            };
        });
    };
    Conservify.prototype.protobuf = function (info) {
        var _this = this;
        var transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);
        if (info.body) {
            var requestBody = new Buffer.from(info.body).toString("hex");
            transfer.setBody(requestBody);
        }
        transfer.header("Content-Type", "text/plain");
        var id = this.networking.getWeb().binary(transfer);
        return new Promise(function (resolve, reject) {
            _this.active[id] = {
                id: id,
                info: info,
                resolve: resolve,
                reject: reject,
            };
        });
    };
    Conservify.prototype.download = function (info) {
        var _this = this;
        var transfer = new org.conservify.networking.WebTransfer();
        transfer.setUrl(info.url);
        transfer.setPath(info.path);
        var id = this.networking.getWeb().download(transfer);
        return new Promise(function (resolve, reject) {
            _this.active[id] = {
                id: id,
                info: info,
                resolve: resolve,
                reject: reject,
            };
        });
    };
    Conservify.prototype.scanNetworks = function () {
        var _this = this;
        this.networking.getWifi().findConnectedNetwork();
        this.networking.getWifi().scan();
        return new Promise(function (resolve, reject) {
            _this.scan = {
                resolve: resolve,
                reject: reject
            };
        });
    };
    return Conservify;
}(conservify_common_1.Common));
exports.Conservify = Conservify;
//# sourceMappingURL=conservify.android.js.map