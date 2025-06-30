const srvinfo = require("@sap/cds/lib/compile/to/srvinfo");

var $;

sap.ui.define([
    "sap/ui/core/Lib",
    "sap/m/MessageBox",
], function (Lib, MessageBox) {
    "use strict";

    var thisLib = Lib.init({
        name: "modules",
        apiVersion: 2,
        version: "0.0.1",
        dependencies: [
            // ui5.yaml, .library 파일과 동기화 유지
            "sap.m",
            "sap.ui.core",
        ],
        types: [],
        interfaces: [],
        controls: [
            // "modules.fragment.orgSingleSelect",
        ],
        elements: [],
        noLibraryCSS: false
    })

    // 환경 변수 동결 함수
    var fnDeepFreeze = function (object) {
        if (typeof object !== "object" || object === null || Object.isFrozen(object)) {
            return object;
        }

        // 객체의 속성들을 동결
        Object.keys(object).forEach((sProperty) => {
            if (typeof object[sProperty] === "object" && object[sProperty] !== null) {
                fnDeepFreeze(object[sProperty]);
            }
        })

        // 객체 자체 동결
        return Object.freeze(object);
    }

    // 환경 변수 동결
    // thisLib.env = fnDeepFreeze({});

    thisLib.test = function () {
        return "Module OK!"
    }

    return thisLib;
});