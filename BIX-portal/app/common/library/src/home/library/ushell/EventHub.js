// Copyright (c) 2009-2023 SAP SE, All Rights Reserved
sap.ui.define(["sap/base/Log"], function(n) {
    "use strict";
    var e = {
        pendingEvents: {},
        subscribers: {},
        dispatchOperations: {},
        store: r()
    };
    function r() {
        return {
            nextKey: 0,
            objectToKey: new window.WeakMap,
            keyToObject: {}
        }
    }
    function t(e, r, t) {
        n.error(e, r, "sap.ushell.EventHub");
        return
    }
    function i(n) {
        var e = "An exception was raised while executing a registered callback on event '" + n.eventName + "'"
          , r = "Data passed to the event were: '" + n.eventData + "'";
        if (n.error.stack) {
            r += " Error details: " + n.error.stack
        }
        t(e, r, n.fnCausedBy)
    }
    function u(n, e, r) {
        var t;
        try {
            t = e(r)
        } catch (t) {
            i({
                eventName: n,
                eventData: r,
                fnCausedBy: e,
                error: t
            })
        }
        return t
    }
    function o(n) {
        if (typeof arguments[2] === "function") {
            return E(n, arguments[2])
        }
        return arguments[2]
    }
    function a(n) {
        if (typeof arguments[2] === "string" && arguments[2].indexOf("<function") === 0) {
            return k(n, arguments[2])
        }
        return arguments[2]
    }
    function c(n, e, r) {
        if (typeof e === "object" || typeof e === "function") {
            try {
                var i = [e, o.bind(null, n)];
                if (r) {
                    i.push(3)
                }
                return JSON.stringify.apply(JSON, i)
            } catch (n) {
                t("" + n, n.stack, c)
            }
        }
        return e
    }
    function f(n, e) {
        try {
            return JSON.parse(e, a.bind(null, n))
        } catch (n) {
            return e
        }
    }
    function s(n, e, r) {
        if (!n.subscribers[e]) {
            n.subscribers[e] = []
        }
        n.subscribers[e].push(r)
    }
    function l(n, e, r) {
        n.subscribers[e] = (n.subscribers[e] || []).map(function(n) {
            return n.filter(function(n) {
                return n.fn !== r
            })
        }).filter(function(n) {
            return n.length > 0
        })
    }
    function p() {
        var n, e = new Promise(function(e) {
            n = e
        }
        ), r = {
            dispatching: e,
            cancelled: false,
            cancel: function() {
                r.cancelled = true
            },
            complete: function() {
                n()
            }
        };
        return r
    }
    function h(n, e) {
        if (!n.subscribers.hasOwnProperty(e)) {
            return null
        }
        var r = p()
          , t = n.subscribers[e]
          , i = t.map(function(t) {
            return d(n, e, t, r, 0)
        });
        Promise.all(i).then(r.complete, r.complete);
        return r
    }
    function d(n, e, r, t, i) {
        var u = r.length
          , o = r.slice(i);
        return o.reduce(function(i, u) {
            return i.then(function(i) {
                if (t.cancelled) {
                    if (i) {
                        l(n, e, u.fn)
                    }
                    return i
                }
                return v(n, e, u, r).then(function(n) {
                    if (n) {
                        t.cancelled = true
                    }
                    return n
                })
            })
        }, Promise.resolve(false)).then(function(i) {
            if (!i && u < r.length) {
                return d(n, e, r, t, u)
            }
            return i
        })
    }
    function v(n, e, r, t) {
        var i = f(n, n.pendingEvents[e]);
        return Promise.resolve().then(function() {
            if (r.called && t.offed) {
                return false
            }
            r.called = true;
            var o = t.offed;
            u(e, r.fn, i);
            var a = t.offed;
            if (a) {
                l(n, e, r.fn)
            }
            return !o && a
        })
    }
    function b(n, e, r) {
        return function() {
            r.forEach(function(r) {
                if (r.called) {
                    l(n, e, r.fn)
                }
            });
            r.offed = true;
            return {
                off: b(n, e, [])
            }
        }
    }
    function y(n, e, r) {
        return function(t) {
            var i = {
                fn: t,
                called: false
            };
            r.push(i);
            if (n.pendingEvents.hasOwnProperty(e)) {
                var u = n.dispatchOperations[e];
                if (!u) {
                    v(n, e, i, r)
                } else {
                    u.dispatching.then(function() {
                        if (!i.called) {
                            v(n, e, i, r)
                        }
                    })
                }
            }
            return {
                do: y(n, e, r),
                off: b(n, e, r)
            }
        }
    }
    function m(n, e) {
        var r = [];
        s(n, e, r);
        return {
            do: y(n, e, r),
            off: b(n, e, r)
        }
    }
    function g(n, e) {
        var r = m(n, e);
        r.off();
        return r
    }
    function O(n, e, r, t) {
        var i = c(n, r);
        if (!t && n.pendingEvents.hasOwnProperty(e) && n.pendingEvents[e] === i) {
            return this
        }
        n.pendingEvents[e] = i;
        var u = n.dispatchOperations[e];
        if (u) {
            u.cancel()
        }
        var o = h(n, e);
        n.dispatchOperations[e] = o;
        return this
    }
    function w(n, e) {
        return f(n, n.pendingEvents[e])
    }
    function j() {
        var n = Array.prototype.slice.call(arguments);
        n.shift();
        var e = 0
          , r = new Array(n.length).join(",").split(",").map(function() {
            return 1
        })
          , t = []
          , i = {
            do: function(u) {
                n.forEach(function(i, o) {
                    i.do(function(i, o) {
                        t[i] = o;
                        e += r[i];
                        r[i] = 0;
                        if (e === n.length) {
                            u.apply(null, t)
                        }
                    }
                    .bind(null, o))
                });
                return {
                    off: i.off
                }
            },
            off: function() {
                var e = n.reduce(function(n, e) {
                    return e.off()
                }, function() {});
                return {
                    off: e
                }
            }
        };
        return i
    }
    function P(n, e) {
        var r = n.dispatchOperations[e];
        return r ? r.dispatching : Promise.resolve()
    }
    function E(n, e) {
        if (n.store.objectToKey.has(e)) {
            return n.store.objectToKey.get(e)
        }
        n.store.nextKey++;
        var r = "<" + typeof e + ">#" + n.store.nextKey;
        n.store.keyToObject[r] = e;
        n.store.objectToKey.set(e, r);
        return r
    }
    function k(n, e) {
        return n.store.keyToObject[e]
    }
    function x(n) {
        var e = {};
        e.emit = O.bind(e, n);
        e.on = m.bind(null, n);
        e.once = g.bind(null, n);
        e.last = w.bind(null, n);
        e.join = j.bind(null, n);
        e.wait = P.bind(null, n);
        e._reset = function(n) {
            n.pendingEvents = {};
            n.subscribers = {};
            n.dispatchOperations = {};
            n.store = r()
        }
        .bind(null, n);
        return e
    }
    function A(n) {
        var e = {
            pendingEvents: {},
            subscribers: {},
            dispatchOperations: {},
            store: r()
        }
          , t = x(e)
          , i = f(e, c(e, n));
        function u(n) {
            var e = n.charAt(0);
            if (e.match(/[a-zA-Z0-9]/)) {
                throw new Error("Invalid path separator '" + e + "'. Please ensure path starts with a non alphanumeric character")
            }
            var r = n.split(e);
            r.shift();
            return r
        }
        function o(n, e) {
            var r = n
              , t = "";
            if (arguments.length === 2) {
                r = e;
                t = n
            }
            return t + "/" + r.join("/")
        }
        function a(n) {
            return Object.prototype.toString.apply(n) === "[object Array]"
        }
        function s(n) {
            return Object(n) !== n
        }
        function l(n) {
            return (a(n) ? n.length : Object.keys(n).length) === 0
        }
        function p(n, r, t, i) {
            var u = ""
              , f = n
              , l = [];
            t.reduce(function(n, r, p) {
                u = o(u, [r]);
                f = f[r];
                if (p === t.length - 1) {
                    if (!s(i) && !s(f) && Object.keys(f).length > 0) {
                        var h, d = Object.keys(f).reduce(function(n, e) {
                            n[e] = true;
                            return n
                        }, {}), v = Object.keys(i).some(function(n) {
                            h = n;
                            var e = d.hasOwnProperty(n);
                            delete d[n];
                            var r = !s(f[n]) && Object.keys(f[n]).length > 0;
                            return !e || r
                        }), b = Object.keys(d).length > 0, y = v || b;
                        if (y) {
                            var m = v ? "One or more values are not defined in the channel contract or are defined as a non-empty object/array, for example, check '" + h + "'." : "Some keys are missing in the event data: " + Object.keys(d).join(", ") + ".";
                            throw new Error("Cannot write value '" + c(e, i, true) + "' to path '" + u + "'. " + m + " All childrens in the value must appear in the channel contract and must have a simple value or should be defined as an empty complex value")
                        }
                        var g = Object.keys(i).map(function(n) {
                            return {
                                serializedPath: o(u, [n]),
                                value: i[n]
                            }
                        });
                        Array.prototype.push.apply(l, g)
                    }
                    n[r] = i
                } else if (!n.hasOwnProperty(r)) {
                    n[r] = a(f) ? [] : {}
                }
                l.push({
                    serializedPath: u,
                    value: n[r]
                });
                return n[r]
            }, r);
            return l
        }
        function h(n, r) {
            var t = ""
              , i = r.reduce(function(n, r) {
                t += "/" + r;
                if (a(n) && !r.match(/^[0-9]+$/)) {
                    throw new Error("Invalid array index '" + r + "' provided in path '" + t + "'")
                }
                if (!n.hasOwnProperty(r)) {
                    throw new Error("The item '" + r + "' from path " + t + " cannot be accessed in the object: " + c(e, n))
                }
                return n[r]
            }, n);
            return i
        }
        function d(n, e, r) {
            return e.reduce(function(n, t, i) {
                var u = i === e.length - 1;
                if (n.hasOwnProperty(t)) {
                    return n[t]
                }
                return u ? r : {}
            }, n)
        }
        function v(n, e) {
            e.pop();
            var r = n
              , t = [];
            return e.reduce(function(n, e) {
                r = r[e];
                t.push(e);
                n.push({
                    serializedPath: o(t),
                    value: r
                });
                return n
            }, [])
        }
        function b(n) {
            return n.map(function(n) {
                var r = n.serializedPath;
                if (!e.subscribers.hasOwnProperty(r) || e.subscribers[r].length === 0) {
                    return null
                }
                return {
                    path: r,
                    value: n.value
                }
            }).filter(function(n) {
                return !!n
            })
        }
        function y(e, r) {
            var o = u(e);
            h(n, o);
            var a = p(n, i, o, r);
            a.forEach(function(n) {
                t.emit(n.serializedPath, n.value)
            })
        }
        function m(e) {
            var r = u(e)
              , t = h(n, r);
            return d(i, r, t)
        }
        function g(r) {
            var i = u(r)
              , a = o(i)
              , p = t.last(a)
              , d = e.pendingEvents.hasOwnProperty(a);
            if (d) {
                return t.on(a)
            }
            p = h(n, i);
            if (typeof p !== "undefined" && (s(p) || !l(f(t, c(t, p))))) {
                t.emit(a, p)
            }
            return t.on(a)
        }
        function O(n) {
            var e = g(n);
            e.off();
            return e
        }
        function w(n) {
            var e = u(n)
              , r = v(i, e)
              , o = b(r).map(function(n) {
                return t.wait(n.path, n.value)
            });
            return Promise.all(o.concat(t.wait(n)))
        }
        return {
            emit: y,
            on: g,
            once: O,
            last: m,
            wait: w,
            join: j.bind(null, t)
        }
    }
    var T = x(e);
    T.createChannel = A.bind(null);
    return T
});
//# sourceMappingURL=EventHub.js.map
