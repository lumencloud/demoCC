// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define(["sap/ushell/utils/type"], function(e) {
    "use strict";
    var t = {
        "sap-navigation-scope": {
            injectFrom: "inboundParameter",
            sticky: true,
            stickyName: "sap-navigation-scope-filter",
            isIntentParameter: true,
            getValue: function(e, t, r, a) {
                return new Promise(function(u, s) {
                    if (a === "UI5") {
                        u(n(e, t))
                    } else {
                        u(i(e, r))
                    }
                }
                )
            }
        },
        "sap-fiori-id": {
            injectFrom: "startupParameter",
            isIntentParameter: true,
            getValue: function(e, t, r, u) {
                return new Promise(function(s, o) {
                    if (u === "UI5") {
                        s(n(e, t) || a("/sap.fiori/registrationIds", t))
                    } else {
                        s(i(e, r))
                    }
                }
                )
            }
        },
        "sap-ui-fl-max-layer": {
            injectFrom: "startupParameter",
            isIntentParameter: true,
            getValue: function(e, t) {
                return Promise.resolve().then(n.bind(null, e, t))
            }
        },
        "sap-ui-fl-control-variant-id": {
            injectFrom: "startupParameter",
            isIntentParameter: false,
            getValue: function(e, t) {
                return Promise.resolve().then(n.bind(null, e, t))
            }
        },
        "sap-ui-fl-version": {
            injectFrom: "startupParameter",
            isIntentParameter: true,
            getValue: function(e, t) {
                return Promise.resolve().then(n.bind(null, e, t))
            }
        },
        "sap-ui-app-id-hint": {
            injectFrom: "startupParameter",
            isIntentParameter: true,
            getValue: r
        },
        "sap-ach": {
            injectFrom: "startupParameter",
            isIntentParameter: true,
            getValue: function(e, t, r, u) {
                return new Promise(function(s, o) {
                    if (u === "UI5") {
                        s(n(e, t) || a("/sap.app/ach", t))
                    } else {
                        s(i(e, r))
                    }
                }
                )
            }
        },
        "sap-prelaunch-operations": {
            injectFrom: "inboundParameter",
            isIntentParameter: true,
            getValue: r
        },
        "sap-app-origin-hint": {
            injectFrom: "startupParameter",
            isIntentParameter: false,
            getValue: r
        },
        "sap-app-origin": {
            injectFrom: "startupParameter",
            isIntentParameter: false,
            getValue: r
        }
    };
    function r(e) {
        return Promise.reject(e + " is reserved for shell internal usage only")
    }
    function n(e, t) {
        if (t) {
            var r = t.getComponentData() || {};
            var n = r.technicalParameters || {};
            return n[e]
        }
        return undefined
    }
    function a(t, r) {
        var n = r.getManifestEntry(t);
        if (n && !e.isArray(n)) {
            n = [n]
        }
        return n
    }
    function i(e, t) {
        var r = t.getReservedParameters();
        return r && r[e]
    }
    function u(e, r, n, a) {
        if (!t[e]) {
            return Promise.reject(e + " is not a known technical parameter")
        }
        return t[e].getValue(e, r, n, a)
    }
    function s(e) {
        if (!e) {
            e = {}
        }
        return Object.keys(t).filter(function(r) {
            var n = t[r];
            return Object.keys(e).every(function(t) {
                var r = e[t];
                var a = n.hasOwnProperty(t);
                if (a) {
                    return n[t] === r
                }
                return false
            })
        }).map(function(e) {
            return Object.keys(t[e]).reduce(function(r, n) {
                r[n] = t[e][n];
                return r
            }, {
                name: e
            })
        })
    }
    function o() {
        return Object.keys(t)
    }
    function c(e) {
        return t.hasOwnProperty(e)
    }
    function m(e, t, r, a) {
        if (a === "UI5") {
            return n(e, t)
        }
        return i(e, r)
    }
    return {
        getParameterValue: u,
        getParameterValueSync: m,
        getParameters: s,
        getParameterNames: o,
        isTechnicalParameter: c
    }
}, false);
//# sourceMappingURL=TechnicalParameters.js.map
