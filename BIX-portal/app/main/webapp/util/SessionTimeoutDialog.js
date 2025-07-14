sap.ui.define(
    [
        "sap/ui/core/Element",
        "sap/m/IllustrationPool",
        "sap/ui/core/Fragment",
        "sap/ui/model/json/JSONModel"
    ],
    function (Element, IllustrationPool, Fragment, JSONModel) {
        const oTntSet = {
            setFamily: "tnt",
            setURI: sap.ui.require.toUrl("sap/tnt/themes/base/illustrations")
        };

        IllustrationPool.registerIllustrationSet(oTntSet, false);

        const SessionTimeoutDialog = Element.extend("bix.main.view.SessionTimeoutDialog", {
            metadata: {
                properties: {
                    /**
                     * If set to true, the timeout dialog always stays in "expired" state and does not show a countdown.
                     */
                    expired: { type: "boolean", defaultValue: false },
                    /**
                     * Countdown duration for the session dialog; by default 2 min.
                     */
                    timeoutNoticeDuration: { type: "int", defaultValue: 2 * 60 * 1000 }
                },
                events: {
                    continueWorkingPressed: {},
                    signInPressed: {}
                }
            }
        });

        SessionTimeoutDialog.INTERNAL_MODEL = "_internal";

        SessionTimeoutDialog.prototype.init = function () {
            this.setModel(
                new JSONModel({
                    expired: this.getExpired(),
                    timeLeft: this.getTimeoutNoticeDuration()
                }),
                SessionTimeoutDialog.INTERNAL_MODEL
            );

            this._oLoadDialogPromise = Fragment.load({
                name: "bix.main.view.SessionTimeoutDialog",
                controller: this,
                id: this.getId() + "-content"
            }).then(dialog => {
                this._oDialog = dialog;
                this.addDependent(dialog);

                return dialog;
            });
        };

        SessionTimeoutDialog.prototype.exit = async function () {
            const oDialog = await this._oLoadDialogPromise;
            oDialog.destroy();

            Element.prototype.exit.call(this);
        };

        SessionTimeoutDialog.prototype.setExpired = function (expired) {
            this._getModel().setProperty("/expired", expired);

            if (expired) {
                this._getModel().setProperty("/timeLeft", 0);
            }

            return this.setProperty("expired", expired, false);
        };

        SessionTimeoutDialog.prototype._getModel = function () {
            return this.getModel(SessionTimeoutDialog.INTERNAL_MODEL);
        };

        SessionTimeoutDialog.prototype._startCountdown = function () {
            this._cleanUpTimer();

            this.setExpired(false);
            this._getModel().setProperty("/timeLeft", this.getTimeoutNoticeDuration());

            this._oTimeoutDate = new Date(Date.now() + this.getTimeoutNoticeDuration());
            this._iCountdownIntervalHandle = window.setInterval(this._updateTimeLeft.bind(this), 100);
        };

        SessionTimeoutDialog.prototype._stopCountdown = function () {
            this._cleanUpTimer();

            this.setExpired(true);
        };

        SessionTimeoutDialog.prototype._cleanUpTimer = function () {
            window.clearInterval(this._iCountdownIntervalHandle);
            this._iCountdownIntervalHandle = null;
            this._oTimeoutDate = null;
        };

        SessionTimeoutDialog.prototype._updateTimeLeft = function () {
            const iTimeLeft = this._oTimeoutDate - new Date();

            this._getModel().setProperty("/timeLeft", iTimeLeft);

            if (iTimeLeft <= 0) {
                this._stopCountdown();
            }
        };

        SessionTimeoutDialog.prototype.open = async function () {
            const oDialog = await this._oLoadDialogPromise;

            if (oDialog.isOpen()) {
                return;
            }

            if (!this.getExpired()) {
                this._startCountdown();
            }

            oDialog.open();
        };

        SessionTimeoutDialog.prototype.close = function () {
            // Clear timeout first so no UI updates are done while closing.
            // Cleanup is done after the dialog is closed.
            window.clearInterval(this._iCountdownIntervalHandle);

            this._oDialog.close();
        };

        SessionTimeoutDialog.prototype.onAfterClose = function () {
            this._stopCountdown();
        };

        SessionTimeoutDialog.prototype._formatDescription = function (timeLeft) {
            const iSecondsLeft = Math.ceil(Math.max(0, timeLeft) / 1000);

            if (iSecondsLeft > 0) {
                return "세션 만료 예정 : " + iSecondsLeft + " 초 후"
            }

            return "다시 로그인 해주세요";
        };

        SessionTimeoutDialog.prototype._onContinueWorking = function () {
            this.close();
            this.fireContinueWorkingPressed();
        };

        SessionTimeoutDialog.prototype._onDialogClose = function () {
            this.close();
        };

        SessionTimeoutDialog.prototype._onSignIn = function () {
            this.fireSignInPressed();
        };

        return SessionTimeoutDialog;
    }
);