"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBody = exports.ConnectionError = exports.FileSystemError = void 0;
var buffer_1 = require("buffer");
var FileSystemError = (function (_super) {
    __extends(FileSystemError, _super);
    function FileSystemError(message, path) {
        var _this = _super.call(this, message) || this;
        _this.path = path;
        return _this;
    }
    return FileSystemError;
}(Error));
exports.FileSystemError = FileSystemError;
var ConnectionError = (function (_super) {
    __extends(ConnectionError, _super);
    function ConnectionError(message, info) {
        var _this = _super.call(this, message) || this;
        _this.info = info;
        return _this;
    }
    return ConnectionError;
}(Error));
exports.ConnectionError = ConnectionError;
function encodeBody(body) {
    if (buffer_1.Buffer.isBuffer(body)) {
        return body.toString("base64");
    }
    return buffer_1.Buffer.from(body).toString("base64");
}
exports.encodeBody = encodeBody;
//# sourceMappingURL=conservify.common.js.map