sap.ui.define(
	[
		"bix/main/util/SessionTimeout",
		"bix/main/util/SessionTimeoutDialog"
	],
	function(SessionTimeout, SessionTimeoutDialog, Core) {
		return {
			_bSessionExpired: false,
			async init(oThis) {
				this.oComponent = oThis;
				
				await $.ajax({
					url: '/sessionCheck',
					type: 'get',
					success: (res)=> {
						localStorage.setItem("sessionTimeout" , res.sessionTimeout);
					}
				});

				this._oSessionTimeout = new SessionTimeout();
				this._bSessionExpired = false;

				this._oSessionTimeout.attachEvent("sessionExpired", this.onSessionExpired, this);
				this._oSessionTimeout.attachEvent("sessionExpiring", this.onSessionAboutToExpire, this);

				this._userAction();
			},

			_userAction() {
				let lastPing = 0;
				const minGap = 1 * 60 * 1000;
				const ping = () => {
					const now = Date.now();
					if(now - lastPing < minGap) return;
					lastPing = now;
					this.renewSession();
				};

				["click", "keydown", "mousedown", "scroll"].forEach(event=>{
					window.addEventListener(event, ping, true);
				});
			},

			exit() {
				this._oSessionTimeout.destroy();
			},

			onAjaxComplete(event, jqXHR, options) {
				if (!options.url.startsWith("/ajax")) {
					return;
				}

				if (jqXHR.status === 403 && jqXHR.getResponseHeader("X-ClientSession-Id-Valid") === "false") {
					this.onSessionExpired();
					this.exit();
				} else {
					this._oSessionTimeout.reset();
				}
			},

			onSessionExpired() {
				const oSessionDialog = this.getSessionTimeoutDialog();
				oSessionDialog.setExpired(true);
				oSessionDialog.open();
				this._bSessionExpired = true;
			},

			getSessionExpired() {
				return this._bSessionExpired;
			},

			getSessionTimeoutDialog() {
				if (!this._oSessionTimeoutDialog) {
					this._oSessionTimeoutDialog = new SessionTimeoutDialog({
						continueWorkingPressed: this.renewSession,
						signInPressed: ()=> {window.location.reload(true)}
					});
					this.oComponent.byId("toolPage").addDependent(this._oSessionTimeoutDialog);
				}
				return this._oSessionTimeoutDialog;
			},

			onSessionAboutToExpire(event) {
				const oSessionDialog = this.getSessionTimeoutDialog();
				oSessionDialog.setTimeoutNoticeDuration(event.getParameter("sessionTimeoutNoticeDuration"));
				oSessionDialog.open();
			},

			renewSession() {
				$.ajax({
					url: '/sessionCheck',
					type: 'HEAD',
					success: ()=> {
						this._oSessionTimeout?.reset();
					},
					error: (err) => {
						// if(err === '403'){}
						this.onSessionExpired();
						this.exit();
					}
				});
			}
					
		};
	},
	true
);