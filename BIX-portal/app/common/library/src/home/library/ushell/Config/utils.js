// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define([], function() {
    "use strict";
    function t(t, r) {
        var n = [];
        var e = [];
        var o = r;
        var a = false;
        var i = t.split("/");
        i.shift();
        i.forEach(function(t) {
            if (!a && o.hasOwnProperty(t)) {
                o = o[t];
                n.push(t);
                return
            }
            a = true;
            e.push(t)
        });
        return {
            contractPart: "/" + n.join("/"),
            nonContractPart: e
        }
    }
    function r(t) {
        return t && t.isA && t.isA("sap.ui.model.Context")
    }
    function n(t, r, n, e) {
        var o = n;
        r.forEach(function(n, a) {
            if (a === r.length - 1) {
                o[n] = e;
                return
            }
            if (!o.hasOwnProperty(n)) {
                throw new Error("Cannot find " + n + " inside " + t)
            }
            o = o[n]
        })
    }
    function e(t) {
        var r = function(r) {
            return t + r
        };
        if (typeof t === "object") {
            var n = "/";
            r = function(r) {
                var e = r.split(n);
                e.shift();
                var o = e.shift();
                return t[o] + (e.length > 0 ? n + e.join(n) : "")
            }
        }
        return r
    }
    function o(t, n, o) {
        var a = e(o);
        var i = a(t);
        if (r(n) && t.charAt(0) !== "/") {
            var c = n.getPath() + "/" + t;
            i = a(c)
        }
        return i
    }
    function a(r, e, a, i) {
        a.setData = function(t, r) {
            throw new Error("not yet implemented")
        }
        ;
        a.setProperty = function(a, c, u) {
            var f = o(a, u, i);
            var s = t(f, e);
            if (s.nonContractPart.length === 0) {
                r.emit(s.contractPart, c);
                return
            }
            var p = r.last(s.contractPart);
            n(s.contractPart, s.nonContractPart, p, c);
            r.emit(s.contractPart, p)
        }
        ;
        a.getProperty = function(n, a) {
            const c = o(n, a, i);
            const u = t(c, e);
            return r.last(u.contractPart)
        }
        ;
        a.getData = function(t) {
            if (typeof i === "string") {
                return a.getProperty("/", t)
            }
            return Object.keys(i).reduce( (r, n) => {
                r[n] = this.getProperty(`/${n}`, t);
                return r
            }
            , {})
        }
        ;
        return a
    }
    function i(t, r, n, e) {
        var o, i, c, u;
        if (typeof n === "string") {
            var f = n;
            u = f;
            var s = t.last(f);
            if (Object.prototype.toString.apply(s) !== "[object Object]") {
                throw new Error("Cannot bind on leaf property of Configuration: '" + f + "'")
            }
            o = new e(s);
            c = o.setData.bind(o);
            t.on(f).do(function(t) {
                c(t)
            });
            return a(t, r, o, u)
        }
        if (Object.prototype.toString.apply(n) === "[object Object]") {
            var p = n;
            var v = Object.keys(p).reduce(function(r, n) {
                var e = p[n];
                r[n] = t.last(e);
                t.on(e).do(function(t, r) {
                    i("/" + t, r)
                }
                .bind(null, n));
                return r
            }, {});
            o = new e(v);
            i = o.setProperty.bind(o);
            return a(t, r, o, p)
        }
        throw new Error("Invalid parameter provided to createModel. Must be an object or a string.")
    }
    return {
        createModel: i
    }
}, false);
//# sourceMappingURL=utils.js.map
