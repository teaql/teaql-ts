"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Q = void 0;
const PlatformRequest_1 = require("./requests/PlatformRequest");
const SchoolTypeRequest_1 = require("./requests/SchoolTypeRequest");
const SchoolRequest_1 = require("./requests/SchoolRequest");
class Q {
    static platforms() {
        return new PlatformRequest_1.PlatformRequest(false);
    }
    static platformsWithMinimalFields() {
        return new PlatformRequest_1.PlatformRequest(true);
    }
    static schoolTypes() {
        return new SchoolTypeRequest_1.SchoolTypeRequest(false);
    }
    static schoolTypesWithMinimalFields() {
        return new SchoolTypeRequest_1.SchoolTypeRequest(true);
    }
    static schools() {
        return new SchoolRequest_1.SchoolRequest(false);
    }
    static schoolsWithMinimalFields() {
        return new SchoolRequest_1.SchoolRequest(true);
    }
}
exports.Q = Q;
