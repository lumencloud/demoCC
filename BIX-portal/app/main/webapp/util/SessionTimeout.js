sap.ui.define(["sap/ui/base/EventProvider", "sap/base/Log"], function (
    EventProvider,
    Log
) {
    "use strict";

    const SessionTimeout = EventProvider.extend("bix.main.SessionTimeout", {
        constructor: function () {
            EventProvider.call(this);

            this.init();
        }
    });

    SessionTimeout.prototype.destroy = function () {
        EventProvider.prototype.destroy.call(this);
        this.exit();
    };

    SessionTimeout.SESSION_TIMEOUT_NOTICE_DURATION = 2 * 60 * 1000;

    SessionTimeout.prototype.init = async function () {
        Log.debug("Session timeout init", "bix.main.SessionTimeout");

        const sessionTimeout = localStorage.getItem("sessionTimeout");
        let iServerSessionTimeout = Number(sessionTimeout) * 60 * 1000 || 15 * 60 * 1000;

        if (!isNaN(iServerSessionTimeout) && iServerSessionTimeout > 0) {
            const iSessionTimeoutNotice = iServerSessionTimeout - SessionTimeout.SESSION_TIMEOUT_NOTICE_DURATION;
            this._iSessionExpiringTimeoutHandle = window.setTimeout(
                () =>
                    this.fireEvent("sessionExpiring", {
                        timeoutNoticeDuration: SessionTimeout.SESSION_TIMEOUT_NOTICE_DURATION
                    }),
                iSessionTimeoutNotice
            );
            this._iSessionExpiredTimeoutHandle = window.setTimeout(
                () => this.fireEvent("sessionExpired"),
                iServerSessionTimeout
            );
        }
    };

    SessionTimeout.prototype.exit = function () {
        Log.debug("Session timeout cleanup", "bix.main.SessionTimeout");
        window.clearTimeout(this._iSessionExpiredTimeoutHandle);
        window.clearTimeout(this._iSessionExpiringTimeoutHandle);
    };

    SessionTimeout.prototype.reset = function () {
        Log.debug("Session timeout reset", "bix.main.SessionTimeout");
        this.exit();
        this.init();
    };

    return SessionTimeout;
});