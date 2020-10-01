"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=conservify.common.js.map