sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    'sap/m/MessageToast',
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet"

], function (Control, Fragment, MessageBox, MessageToast, JSONModel, Spreadsheet) {
    "use strict";

    let Modules = {};

    Modules.tempInactiveFields = [];



    Modules.get = function (url, bPromise) {
        let oSettings = {
            type: "get",
            async: true,
            url: url,
            dataType: "JSON"
        };
        return new Promise((resolve) => {
            $.ajax(oSettings)
                .done((result) => {
                    resolve(result);
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });
    };
    Modules.getSeq = function (table) {
        let url = "/odata/v4/function/GetNewSeq(v_table='" + table + "')"
        let settings = {
            type: "get",
            async: false,
            url: url,
        };
        return new Promise((resolve) => {
            $.ajax(settings)
                .done((result, textStatus, request) => {
                    let new_seq = result.value;
                    resolve(new_seq);
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    Modules._xhrErrorMessage(xhr)
                    ModusPsPles.getSalesThis().onBusyIndicatorHide();
                })
        });
    };
    Modules.getTree = function (url, bPromise) {
        let settings = {
            type: "get",
            async: false,
            url: url,
        };
        return new Promise((resolve) => {
            $.ajax(settings)
                .done((result, textStatus, request) => {
                    let data = result.value;
                    let flat = {};
                    let send_data = [];
                    send_data.push(data.length);
                    for (const oRow of data) {
                        let sKeyField = oRow.seq ? "seq" : oRow.code ? "code" : "menuSeq";
                        let key = oRow[sKeyField];
                        flat[key] = oRow;
                        flat[key].__metadata = '';
                    }

                    // child container array to each node
                    for (let i in flat) {
                        flat[i].children = []; // add children container
                    }

                    // populate the child container arrays
                    for (let i in flat) {
                        let parentkey = flat[i]?.parentSeq || flat[i]?.parentCode;
                        if (flat[parentkey]) {
                            flat[parentkey].children.push(flat[i]);
                        }
                    }

                    // find the root nodes (no parent found) and create the hierarchy tree from them
                    let root = [];
                    for (let i in flat) {
                        let parentkey = flat[i].parentSeq || flat[i]?.parentCode;
                        if (!flat[parentkey]) {
                            root.push(flat[i]);
                        }
                    }

                    send_data.push(root);
                    //[0] = data.length
                    //[1] = tree table data
                    resolve(send_data);
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });
    };

    /**
    * ajax "post"
    **/
    Modules.post = function (url, data, bPromise) {
        return new Promise((resolve) => {
            // $.ajax({
            //     url: "/skportal/index.html",
            //     type: "HEAD",
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader('X-CSRF-Token', "Fetch");
            //     },
            // })
            //     .done((result, textStatus, xhr) => {
            // let token = xhr.getResponseHeader("X-CSRF-Token");
            $.ajax({
                type: 'post',
                async: false,
                data: JSON.stringify(data),
                contentType: "application/json",
                url: url
                // ,
                // beforeSend: function (xhr) {
                //     xhr.setRequestHeader('X-CSRF-Token', token);
                //     xhr.setRequestHeader('Content-type', 'application/json');
                // }
            })
                .done(function (status) {
                    resolve(status);
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
            // })
            // .fail(function (xhr) {
            //     resolve(xhr);
            //     Modules._xhrErrorMessage(xhr)
            //     // Modules.getSalesThis().onBusyIndicatorHide();
            // })
        });
    };

    Modules.notOdataPost = function (url, data) {
        return new Promise((resolve) => {
            $.ajax({
                url: url, // 임시 토큰 url
                type: "HEAD",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', "Fetch");
                },
            })
                .done((result, textStatus, xhr) => {
                    let token = xhr.getResponseHeader("X-CSRF-Token");
                    $.ajax({
                        type: 'post',
                        async: false,
                        data: JSON.stringify(data),
                        url: url,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-CSRF-Token', token);
                            xhr.setRequestHeader('Content-type', 'application/json');
                        }
                    })
                        .done(function (status) {
                            resolve(status);
                        })
                        .fail(function (xhr) {
                            resolve(xhr);
                            Modules._xhrErrorMessage(xhr)
                            // Modules.getSalesThis().onBusyIndicatorHide();
                        })
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    Modules._xhrErrorMessage(xhr)
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });
    };

    /**
     * 카드 컨텐츠의 _bindingPath 반환
     * @param {sap.ui.integration.widgets.Card} oCard 
     * @returns {Array}
     */
    Modules.getCardContent = function (oCard) {
        // 카드 View 반환
        const oCardComponent = oCard.getCardContent()._oComponent;
        const oCardView = oCardComponent.getAggregation("rootControl");

        // 현재 화면에 보여지는 컨텐츠만 반환
        const aCardContent = oCardView.getControlsByFieldGroupId("content").filter((object) => {
            return object.getFieldGroupIds().length > 0 && object?.getDomRef();
        });

        // 컨텐츠의 _bindingPath 속성들을 배열로 Return
        return aCardContent;
    };

    // Modules.requestBatch = function (method, url, data) {
    //     let request = {
    //         method: method,
    //         url: url,
    //         headers: { "Content-Type": "application/json" },
    //         data: JSON.stringify(data)
    //     };
    //     return request;
    // }

    /**
   * ajax "patch"
   **/
    Modules.patch = function (url, data, bPromise) {
        return new Promise((resolve) => {
            // $.ajax({
            //     url: "/skportal/index.html", // 임시 토큰 url
            //     type: "HEAD",
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader('X-CSRF-Token', "Fetch");
            //     },
            // })
            //     .done((result, textStatus, xhr) => {
            // let token = xhr.getResponseHeader("X-CSRF-Token");
            $.ajax({
                type: 'PATCH',
                async: false,
                data: JSON.stringify(data),
                contentType: "application/json",
                url: url
                // ,
                // beforeSend: function (xhr) {
                //     xhr.setRequestHeader('X-CSRF-Token', token);
                //     xhr.setRequestHeader('Content-type', 'application/json');
                // },
            })
                .done(function (status) {
                    resolve({ error: 'success' });
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
            // })
        })
    };

    Modules.patchETag = function (url, data, previousETag, bPromise) {
        return new Promise((resolve) => {
            // $.ajax({
            //     url: "/skportal/index.html", // 임시 토큰 url
            //     type: "HEAD",
            //     beforeSend: function (xhr) {
            //         xhr.setRequestHeader('X-CSRF-Token', "Fetch");
            //     },
            // }).done((result, textStatus, xhr) => {
            //     let token = xhr.getResponseHeader("X-CSRF-Token");
            $.ajax({
                type: 'PATCH',
                async: false,
                data: JSON.stringify(data),
                contentType: "application/json",
                url: url
                //,
                // beforeSend: function (xhr) {
                //     resolve(xhr);
                //     xhr.setRequestHeader('X-CSRF-Token', token);
                //     xhr.setRequestHeader('Content-type', 'application/json');
                //     xhr.setRequestHeader('If-Match', previousETag);
                // },

            })
                .done(function (status) {
                    resolve({ error: 'success' });
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
            // })
        })
    };


    /**
    * ajax "delete"
    **/
    Modules.delete = function (url, bPromise) {
        return new Promise((resolve) => {
            $.ajax({
                url: "/skportal/index.html", // 임시 토큰 url
                type: "HEAD",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', "Fetch");
                },
            })
                .done((result, textStatus, xhr) => {
                    let token = xhr.getResponseHeader("X-CSRF-Token");
                    $.ajax({
                        type: 'delete',
                        async: false,
                        url: url,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-CSRF-Token', token);
                        },
                    })
                        .done(function (status) {
                            resolve(status);
                        })
                        .fail(function (xhr) {
                            resolve(xhr);
                            if (!bPromise) {
                                Modules._xhrErrorMessage(xhr)
                            }
                            // Modules.getSalesThis().onBusyIndicatorHide();
                        })
                })
        });
    };

    Modules.deleteETag = function (url, previousETag, bPromise) {
        return new Promise((resolve) => {
            $.ajax({
                url: "/skportal/index.html", // 임시 토큰 url
                type: "HEAD",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', "Fetch");
                },
            }).done((result, textStatus, xhr) => {
                let token = xhr.getResponseHeader("X-CSRF-Token");
                $.ajax({
                    type: 'delete',
                    async: false,
                    url: url,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('X-CSRF-Token', token);
                        xhr.setRequestHeader('If-Match', previousETag);
                    },
                })
                    .done(function (status) {
                        resolve(status);
                    })
                    .fail(function (xhr) {
                        resolve(xhr);
                        if (!bPromise) {
                            Modules._xhrErrorMessage(xhr)
                        }
                        // Modules.getSalesThis().onBusyIndicatorHide();
                    })
            })
        });
    };

    Modules.v4ODataCreate = function (ODataModel, entity, data) {
        let odataBinding = ODataModel.bindList(entity);
        odataBinding.create(data);
    }

    Modules.downloadImageFile = function (url) {
        let oSettings = {
            url: url,
            method: "GET",
            xhrFields: {
                responseType: "blob"
            }
        };

        return new Promise((resolve) => {
            $.ajax(oSettings)
                .done((result) => {
                    resolve(result);
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    MessageBox.error(Modules.oI18n.getText("download_failed"))
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });
    };

    /**
    * @ param status (confirm, alert, error, information, warning, success)
    * @ param message  (text of MessageBox)
    * @ param title(optional) (title of MessageBox)
    * 
    * (Example)
    * MessageBox("error", "Error Text");
    * 
    * MessageBoxConfirm("confirm", "message", "title").then((check) => {
    *    console.log(check);  // true or false
    * });
    **/
    Modules.messageBox = function (status, message, title) {
        return new Promise((resolve) => {
            MessageBox[status](message, {
                title: title,
                actions: [MessageBox.Action.OK],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction === "OK") {
                        resolve(true);
                    }
                }
            })
        });
    };

    Modules.messageBoxConfirm = function (status, message, title) {
        return new Promise((resolve) => {
            MessageBox[status](message, {
                title: title,
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction === "OK") {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            })
        });
    };

    Modules.MessageToast = function (message) {
        MessageToast.show(message, {
            closeOnBrowserNavigation: false
        });

    };

    /**
    * Open Dialog (Fragment)
    * @ param _this
    * @ param path (fragment path)
    * @ param id (fragment id)
    **/
    //Modules.openDialog, Modules.openPopover
    Modules.openFragment = async function (_this, path, id, object) {
        if (!_this.byId(id)) {
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oFragement) {
                    _this.getView().addDependent(oFragement);
                    if (!object) {
                        oFragement.open(oFragement);
                    } else {
                        oFragement.openBy(object);
                    }
                }.bind(_this)
            );
        } else {
            _this.byId(id).destroy();
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oFragement) {
                    _this.getView().addDependent(oFragement);
                    if (!object) {
                        oFragement.open(oFragement);
                    } else {
                        oFragement.openBy(object);
                    }
                }.bind(_this)
            );
        }
    };

    Modules.DialogSet = function (_this, path, id) {
        let that = _this;

        return new Promise(function (resolve) {
            if (!that.byId(id)) {
                Fragment.load({
                    id: that.getView().getId(),
                    name: path,
                    controller: that,
                }).then(function (oDialog) {
                    that.getView().addDependent(oDialog);
                    oDialog.open(oDialog);
                    resolve(oDialog); // Resolve the promise with oDialog
                });
            } else {
                let dialog = that.byId(id);
                dialog.open(id);
                resolve(dialog); // Resolve the promise with dialog
            }
        });
    };

    /**
    * Close Dialog
    * @ param _this
    * @ param id (fragment id)
    **/
    Modules.closeDialog = function (_this, fragment_id) {
        if (
            _this.byId(fragment_id) != null
        ) {
            try {
                if (_this._beforeSDialogId) { _this._sDialogId = _this._beforeSDialogId };
                _this.byId(fragment_id).close();
                _this.byId(fragment_id).destroy();
            } catch (error) {
                _this.byId(fragment_id).destroy();
            }
        }
    };

    // fieldGroupId를 기반으로 유효성 검사
    Modules.globalCheck = function (fieldGroupId, _this) {
        let that = this;
        let aCheckList = [];
        let aGrouparray = fieldGroupId.split(",");
        for (const oGroup of aGrouparray) {
            _this.getView().getControlsByFieldGroupId(oGroup).forEach(function (object) {
                aCheckList.push(that.fieldCheck(object));
            })
        }

        for (const oCheck of aCheckList) {
            if (!oCheck) {
                return false;
            }
        }
        return true;
    };

    // fieldGroupId를 기반으로 유효성 검사
    Modules.getToday = function () {
        let dToday = new Date;
        let sYear = dToday.getFullYear();
        let sMonth = String(dToday.getMonth() + 1).padStart(2, "0");
        let sDay = String(dToday.getDate()).padStart(2, "0");
        let sFulltoday = sYear + sMonth + sDay;
        return sFulltoday;
    };

    // 각 필드의 유효성 검사
    Modules.fieldCheck = function (object) {
        let bCheck = false;
        if (object.isA("sap.m.MultiInput")) {
            if (!object.getTokens().length) {
                bCheck = this._requiredcheck(object);
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.m.TextArea")) {
            if (!object.getValue().length) {
                bCheck = this._requiredcheck(object);
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA(["sap.m.Input"])) {
            if (object.getValue().trim().length === 0) {
                if (object.mProperties.visible === 'undefined' || object.mProperties.visible === null || !!object.mProperties.visible) {
                    bCheck = this._requiredcheck(object);
                }
            } else if (object.getFieldGroupIds().includes("Title")) {
                if (object.getValue().length > 50) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("enter_a_value_with_no_more_than_50_characters"));
                } else if (object.getValue().length < 1) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("enter_a_value_with_at_least_1_characters"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Quantity")) {
                if (object.getValue() <= 0) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("please_enter_an_integer_greater_than_0"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Quantity2")) {
                if (object.getValue() < 0) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("please_enter_an_integer_greater_than_0"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Email")) {
                let oEmailExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
                if (object.getValue().match(oEmailExp) == null) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("invalid_email_format"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Url")) {
                let oUrlRegExp = /^(ftp|http|https):\/\/[^ "]+$/;
                if (object.getValue().match(oUrlRegExp) == null) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("invalid_url_format"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Integer")) {
                let numbersOnly = object.getFieldGroupIds().filter(item => /^\d+$/.test(item));
                let oIntegerExp = /^[0-9]*$/;
                if (object.getValue().match(oIntegerExp) == null || object.getValue().length > parseInt(numbersOnly)) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("invalid_number_format"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("VIN")) {
                let oVinRegex = /^[A-Z0-9]{17}$/;
                if (object.getValue().trim().match(oVinRegex) == null) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("the_vin_number_can_only_be_entered_as_a_17_digit_code"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else if (object.getFieldGroupIds().includes("Special")) {
                let specialCharOrSpaceExp = /[0-9!@#$%^&*(),.?":{}|<>_\-+=~`[\]\\;'/\\]/;
                if (object.getValue().match(specialCharOrSpaceExp) !== null) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("special_characters_or_spaces_are_not_allowed"));
                } else {
                    object.setValueState("None");
                    bCheck = true
                }
            } else if (object.getFieldGroupIds().includes("Length10")) {
                if (object.getValue().length != 10) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("enter_a_value_10_characters"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }

            } else if (object.getFieldGroupIds().includes("Phone")) {
                let numbersOnly = object.getFieldGroupIds().filter(item => /^\d+$/.test(item));
                let oIntegerExp = /^[0-9]*$/;
                if (object.getValue().match(oIntegerExp) == null || object.getValue().length > parseInt(numbersOnly)) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("invalid_number_format"));
                } else {
                    if (object.getValue().length != 10) {
                        object.setValueState("Error");
                        object.setValueStateText(Modules.oI18n.getText("enter_a_value_10_characters"));
                    } else {
                        object.setValueState("None");
                        bCheck = true;
                    }
                }
            } else if (object.getFieldGroupIds().includes("CAPostal")) {
                let oPostalExp = /^[A-Za-z]\d[A-Za-z]\s\d[A-Za-z]\d$/;
                if (object.getValue().match(oPostalExp) == null) {
                    object.setValueState("Error");
                    object.setValueStateText(Modules.oI18n.getText("invalid_postal_code"));
                } else {
                    object.setValueState("None");
                    bCheck = true;
                }
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.m.ComboBox") || object.isA("sap.m.TimePicker") || object.isA("sap.ui.unified.FileUploader")) {
            if (object.getValue().length == 0) {
                bCheck = this._requiredcheck(object);
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.m.DatePicker")) {
            let dataValid = object.isValidValue();
            if (object.getValue().length === 0) {
                bCheck = this._requiredcheck(object);
            } else if (!dataValid) {
                object.setValueState("Error");
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.m.Select")) {
            if (object.getSelectedKey() === 'select' || !object.getSelectedKey()) {
                bCheck = this._requiredcheck(object);
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.ui.richtexteditor.RichTextEditor")) {
            if (!!object.getValue().length) {
                bCheck = true;
            }
        } else if (object.isA("sap.m.MultiComboBox")) {
            if (!object.getSelectedKeys().length) {
                bCheck = this._requiredcheck(object);
            } else {
                object.setValueState("None");
                bCheck = true;
            }
        } else if (object.isA("sap.m.RadioButtonGroup")) {
            if (object.getSelectedIndex() === 0 || object.getSelectedIndex() === 1) {
                object.setValueState("None");
                bCheck = true;
            } else {
                bCheck = this._requiredcheck(object);
            }
        }
        else {
            bCheck = true;
        }

        return bCheck;
    };

    // fieldGroupId에 Required가 포함되어 있는지 체크
    Modules._requiredcheck = function (object) {
        if (object.getFieldGroupIds().includes("Required")) {
            object.setValueState("Error");
            return false;
        } else {
            object.setValueState("None");
            return true;
        }
    };

    // fieldGroupId를 기반으로 필드 초기화
    Modules.globalClear = function (fieldGroupId, _this) {
        let that = this;
        let aGrouparray = fieldGroupId.split(",");
        for (const oGroup of aGrouparray) {
            _this.getView().getControlsByFieldGroupId(oGroup).forEach(function (object) {
                that.fieldClear(object);
            })
        }
    };

    // 각 필드의 초기화
    Modules.fieldClear = function (object) {
        if (object.isA("sap.m.MultiInput")) {
            object.removeAllTokens();
            object.setValue(null);
            object.setValueState("None");
        } else if (object.isA(["sap.m.Input", "sap.m.DatePicker", "sap.m.TimePicker", "sap.m.TextArea"])) {
            if (object.isA("sap.m.DatePicker")) {
                object.setMaxDate(null);
                object.setMinDate(null);
            }
            object.setValue(null);
            object.setValueState("None");
        } else if (object.isA("sap.m.Select")) {
            object.setSelectedKey(null);
            object.setValueState("None");
        } else if (object.isA("sap.ui.richtexteditor.RichTextEditor")) {
            object.setValue(null);
        } else if (object.isA("sap.m.upload.UploadSet")) {
            object.removeAllItems();
            object.setUploadEnabled(true);
        } else if (object.isA("sap.m.CheckBox")) {
            object.setSelected(false);
        } else if (object.isA("sap.m.ComboBox")) {
            object.setValue(null);
            object.setValueState("None");
            object.setSelectedKey(null);
        } else if (object.isA("sap.m.MultiComboBox")) {
            object.removeAllSelectedItems();
            object.setValueState("None");
        } else if (object.isA("sap.ui.unified.FileUploader")) {
            object.clear();
            object.setValue(null);
            object.setValueState("None");
        }
    };

    // expand, snapped가 없는 경우
    Modules.setMinMaxDate2 = function (oEvent, _this, oStartDate, oEndDate) {
        let iIndex;
        for (let i = 0; i < oEvent.getSource().getParent().getItems().length; i++) {
            if (oEvent.getSource().getId() === oEvent.getSource().getParent().getItems()[i].getId()) {
                iIndex = i;
                break;
            }
        }
        let bValid = oEvent.getParameter("valid");
        if (bValid === undefined) {
            oEvent.getSource().getParent().getItems()[2].setMinDate(oStartDate);
            oEvent.getSource().getParent().getItems()[2].setDateValue(oEndDate);
            oEvent.getSource().getParent().getItems()[0].setMaxDate(oEndDate);
            oEvent.getSource().getParent().getItems()[0].setDateValue(oStartDate);
        } else {
            if (!oEvent.getSource().getValue()) {
                bValid = false;
            }
            if (iIndex === 0) {
                if (!bValid) {
                    oEvent.getSource().getParent().getItems()[2].setMinDate(null);
                    oEvent.getSource().setValue(null);
                    return;
                }
                oEvent.getSource().getParent().getItems()[2].setMinDate(new Date(oEvent.getSource().getDateValue()));
            } else if (iIndex === 2) {
                if (!bValid) {
                    oEvent.getSource().getParent().getItems()[0].setMaxDate(null);
                    oEvent.getSource().setValue(null);
                    return;
                }
                oEvent.getSource().getParent().getItems()[0].setMaxDate(new Date(oEvent.getSource().getDateValue()));
            }
        }
    };

    // ui table filter value, filter, sort icon 초기화
    Modules.tableReset = function (oTable) {
        for (const oColumn of oTable.getColumns()) {
            oColumn.setFilterValue(null);
            oColumn.setFiltered(false);
            oColumn.setSorted(false);
        }
    };



    Modules.getYearMonth = function (oDate, iMonth) {
        let sDate = new Date(oDate);
        let sCompleteDate = new Date(sDate.setMonth(sDate.getMonth() + iMonth));
        let sMonth = sCompleteDate.toLocaleString('en-US', { month: 'short' });
        let iYear = sCompleteDate.getFullYear();
        return sMonth + " " + iYear;
    };
    Modules.dateChange = function (oEvent, _this, oI18n) {
        let sStartId = _this.byId('startDate')
        let sEndId = _this.byId('endDate')
        let bValid = oEvent.getParameter("valid");
        if (!oEvent.getSource().getValue()) {
            bValid = false;
        }
        if (oEvent.getSource().getId().includes("startDate")) {
            if (!bValid) {
                sEndId.setMinDate(null);
                oEvent.getSource().setValue(null);
                if (oI18n) {
                    Modules.messageBox("warning", Modules.oI18n.getText("please_enter_the_correct_date_format"), "warning");
                }
                return;

            }
            sEndId.setMinDate(new Date(oEvent.getSource().getDateValue()));

        } else if (oEvent.getSource().getId().includes("endDate")) {
            if (!bValid) {
                sStartId.setMaxDate(null);
                oEvent.getSource().setValue(null);
                if (oI18n) {
                    Modules.messageBox("warning", Modules.oI18n.getText("please_enter_the_correct_date_format"), "warning");
                }
                return;
            }
            sStartId.setMaxDate(new Date(oEvent.getSource().getDateValue()));
        }
    };

    // Excel 버튼 클릭시 호출 함수 ui.table 용
    Modules.onUiExcelDownload = async function (table, data, noDataText, excel_name) {
        if (data.length == 0) {
            MessageBox.alert(noDataText);
            return;
        }

        let aProducts = [];
        for (const oRow of data) {
            let product = new Object();

            let tableColumn = table.getColumns();
            for (const oColumn of tableColumn) {
                if (oColumn.mAggregations.template.mBindingInfos.text !== undefined) {
                    let path = oColumn.mAggregations.template.mBindingInfos.text.parts[0].path;
                    product[path] = oRow[path];
                } else if (oColumn.mAggregations.template.mBindingInfos.state !== undefined) {
                    let path = oColumn.mAggregations.template.mBindingInfos.state.parts[0].path;
                    product[path] = (oRow[path]) ? "On" : "Off";
                } else if (oColumn.mAggregations.template.mBindingInfos.value !== undefined) {
                    let path = oColumn.mAggregations.template.mBindingInfos.value.parts[0].path;
                    product[path] = oRow[path];
                }
            }

            aProducts.push(product);
        }

        let aCols = this.createUiColumnConfig(table);
        let oSettings = {
            workbook: { columns: aCols },
            fileName: excel_name + ".xlsx",
            dataSource: aProducts
        };

        let oSheet = await new Spreadsheet(oSettings);
        oSheet.build().finally(function () {
            oSheet.destroy();
        });
    }

    Modules.onUiExcelDownload2 = async function (table, data, noDataText, excel_name) {
        if (data.length == 0) {
            MessageBox.alert(noDataText);
            return;
        }

        let aProducts = [];
        for (const oRow of data) {
            let product = new Object();

            let tableColumn = table.getColumns();
            for (const oColumn of tableColumn) {
                if (oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.text !== undefined) {
                    let path = oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.text.parts[0].path;
                    product[path] = oRow[path];
                } else if (oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.state !== undefined) {
                    let path = oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.state.parts[0].path;
                    product[path] = (oRow[path]) ? "On" : "Off";
                } else if (oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.value !== undefined) {
                    let path = oColumn.mAggregations.template.mAggregations.items[0].mBindingInfos.value.parts[0].path;
                    product[path] = oRow[path];
                }
            }

            aProducts.push(product);
        }

        let aCols = this.createUiColumnConfig2(table);
        let oSettings = {
            workbook: { columns: aCols },
            fileName: excel_name + ".xlsx",
            dataSource: aProducts
        };

        let oSheet = await new Spreadsheet(oSettings);
        oSheet.build().finally(function () {
            oSheet.destroy();
        });
    }


    // Excel Download Button Pressed  m.table 용
    Modules.onExcelDownload = async function (table, data, noDataText, excel_name) {
        if (data.length == 0) {
            MessageBox.alert(noDataText);
            return;
        }

        let aProducts = [];
        let tableColumn = table.mBindingInfos.items.template.getCells();
        let aVisibleCols = [];
        table.getColumns().forEach((col, idx) => {
            if (col.getVisible()) {
                aVisibleCols.push(idx);
            }
        })
        for (const oRow of data) {
            let product = new Object();

            for (const oVisibleCol of aVisibleCols) {
                if (tableColumn[oVisibleCol].mBindingInfos.text !== undefined) {
                    let path = tableColumn[oVisibleCol].mBindingInfos.text.parts[0].path;

                    if (typeof oRow[path] == 'boolean' && oRow[path]) {
                        product[path] = 'Y';
                    } else if (typeof oRow[path] == 'boolean' && !oRow[path]) {
                        product[path] = 'N';
                    } else {
                        product[path] = oRow[path];
                    }
                } else if (tableColumn[oVisibleCol].mBindingInfos.state !== undefined) {
                    let path = tableColumn[oVisibleCol].mBindingInfos.state.parts[0].path;
                    product[path] = (oRow[path]) ? "On" : "Off";
                } else if (tableColumn[oVisibleCol].mAggregations.items != undefined && tableColumn[oVisibleCol].mAggregations.items.length !== 0) {
                    if (tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.visible !== undefined) {
                        let path = tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.visible.parts[tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.visible.parts.length - 1].path;
                        if (oRow[path]) {
                            product['notice'] = '통보 완료';
                        } else {
                            product['notice'] = null;
                        }
                    } else {
                        let path = tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts[tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts.length - 1].path;
                        product[path] = oRow[path];
                    }
                } else {
                    continue;
                }
            }

            aProducts.push(product);
        }
        let aCols = this.createColumnConfig(table);
        let oSettings = {
            workbook: { columns: aCols },
            fileName: excel_name + ".xlsx",
            dataSource: aProducts
        };

        let oSheet = await new Spreadsheet(oSettings);
        oSheet.build().finally(function () {
            oSheet.destroy();
        });
    }

    Modules.onExcelDownload2 = async function (table, data, noDataText, excel_name) {
        if (data.length == 0) {
            MessageBox.alert(noDataText);
            return;
        }

        let aProducts = [];
        let tableColumn = table.mBindingInfos.items.template.getCells();
        let aVisibleCols = [];
        table.getColumns().forEach((col, idx) => {
            if (col.getVisible()) {
                aVisibleCols.push(idx);
            }
        })
        for (const oRow of data) {
            let product = new Object();

            for (const oVisibleCol of aVisibleCols) {
                if (tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.text) {
                    let path = tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts[0].path;
                    product[path] = oRow[path];
                }
                if (tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.state) {
                    let path = tableColumn[oVisibleCol].mAggregations.items[0].mBindingInfos.state.parts[0].path;
                    product[path] = (oRow[path]) ? "On" : "Off";
                }
            }

            aProducts.push(product);
        }
        let aCols = this.createColumnConfig2(table);
        let oSettings = {
            workbook: { columns: aCols },
            fileName: excel_name + ".xlsx",
            dataSource: aProducts
        };

        let oSheet = await new Spreadsheet(oSettings);
        oSheet.build().finally(function () {
            oSheet.destroy();
        });
    }

    // excel download
    /*
    * @ param iHeaderHeight ex. 20
    * @ param aExcelWidth(array) ex. [{ width: 6.62 },{ width: 7 }]
    * @ param aDataList 엑셀에 입력될 데이터
    * @ param sExcelName 엑셀 이름
    * @ param oTable multiLabel 일 시 해당 테이블 (this.byId(테이블) .. multi가 아니라면 입력 안해도 무방)
    * @ param bMulti multiLabel 사용 유무 (true 일 시 true 아니라면 입력 안해도 무방)
    */
    Modules.onExcel = function (iHeaderHeight, aExcelWidth, aDataList, sExcelName, oTable, bMulti) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        if (bMulti) {
            const aColumns = oTable.getColumns();
            let multiLabelHeaders = aColumns.map(col => col.getMultiLabels().map(label => label.getText()));

            multiLabelHeaders = multiLabelHeaders.filter(labels => labels.some(label => label !== ''));
            const aHeaderRows = [];
            const maxLevel = Math.max(...multiLabelHeaders.map(labels => labels.length));
            for (let i = 0; i < maxLevel; i++) {
                aHeaderRows.push(worksheet.addRow([]));
            }
            const mergeRegions = [];
            multiLabelHeaders.forEach((labels, colIndex) => {
                labels.forEach((label, rowIndex) => {
                    const cell = aHeaderRows[rowIndex].getCell(colIndex + 1);
                    cell.value = label || '';
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: '999999' }
                    };
                })
                for (let rowIndex = 0; rowIndex < maxLevel; rowIndex++) {
                    const cell = aHeaderRows[rowIndex].getCell(colIndex + 1);
                    if (!cell.value) {
                        let mergeStartRow = rowIndex;
                        while (mergeStartRow > 0 && !aHeaderRows[mergeStartRow - 1].getCell(colIndex + 1).value) {
                            mergeStartRow--;
                        }
                        mergeRegions.push({
                            startRow: mergeStartRow,
                            endRow: rowIndex + 1,
                            col: colIndex + 1
                        });
                    }
                }
            });
            const optimizeMergeRegion = optimizeMergeRegions(mergeRegions);
            optimizeMergeRegion.forEach(region => {
                worksheet.mergeCells(region.startRow, region.col, region.endRow, region.col)
            })

            function optimizeMergeRegions(mergeRegions) {
                mergeRegions.sort((a, b) => {
                    if (a.col !== b.col) return a.col - b.col;
                    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
                    return a.endRow - b.endRow;
                })
                const uniqueRegions = [];
                let currentRegions = mergeRegions[0];
                for (let i = 1; i < mergeRegions.length; i++) {
                    const region = mergeRegions[i];
                    if (region.col === currentRegions.col && region.startRow <= currentRegions.endRow + 1) {
                        currentRegions.endRow = Math.max(currentRegions.endRow, region.endRow);
                    } else {
                        uniqueRegions.push(currentRegions);
                        currentRegions = region;
                    }
                }
                uniqueRegions.push(currentRegions);

                return uniqueRegions;
            }

            aHeaderRows.forEach(row => mergeSameValuesInRow(row, worksheet));

            function mergeSameValuesInRow(row, worksheet) {
                let startCol = 1;
                for (let col = 2; col <= row.cellCount; col++) {
                    if (row.getCell(col).value !== row.getCell(startCol).value) {
                        if (col - 1 > startCol) {
                            worksheet.mergeCells(row.number, startCol, row.number, col - 1);
                        }
                        startCol = col;
                    }
                }
                if (startCol < row.cellCount) {
                    worksheet.mergeCells(row.number, startCol, row.number, row.cellCount);
                }
            }
            aHeaderRows.forEach(row => row.height = iHeaderHeight);
        } else {
            const headerRow = worksheet.getRow(1);
            const aColumns = oTable.getColumns();
            const LabelHeaders = aColumns.map(col => col.getLabel());
            let aHeaders = [];
            for (const oHead of LabelHeaders) {
                if (oHead.getText()) {
                    aHeaders.push(oHead.getText())
                }
            }

            headerRow.values = aHeaders;
            function mergeCellsIfSame(sheet, rowNumber, headers) {
                let startCol = 1;

                while (startCol <= headers.length) {
                    let endCol = startCol;

                    while (endCol <= headers.length && headers[startCol - 1] === headers[endCol - 1]) {
                        endCol++;
                    }

                    if (endCol - startCol > 1) {
                        sheet.mergeCells(rowNumber, startCol, rowNumber, endCol - 1);
                    }
                    startCol = endCol;
                }
            }

            mergeCellsIfSame(worksheet, 1, aHeaders);

            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '999999' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
            headerRow.height = iHeaderHeight;
        }
        worksheet.columns = aExcelWidth;
        if (aDataList.length > 0) {
            for (const oRow of aDataList) {
                const row = worksheet.addRow(oRow);
                row.alignment = { vertical: 'middle', wrapText: true };
            };
        } else {
            worksheet.addRow(['No Data']).font = { italic: true };
        }

        const excelName = sExcelName;
        const fileName = excelName + '.xlsx';
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const borderStyle = {
            style: 'thin',
            color: { argb: '00000000' } // Black color for borders
        };
        worksheet.eachRow((row) => {
            // Iterate over each cell in the row
            row.eachCell((cell) => {
                cell.border = {
                    top: borderStyle,
                    left: borderStyle,
                    bottom: borderStyle,
                    right: borderStyle
                };
            });
        });
        workbook.xlsx.writeBuffer().then((buffer) => {
            const data = new Blob([buffer], { type: mimeType });
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // For IE browser
                window.navigator.msSaveOrOpenBlob(data, fileName);
            } else {
                // For other browsers
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.target = '_blank';
                link.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 100);
            }
        });
    }

    Modules.getMakeCustomExcelData = function (_this, tableIds, options) {
        let excelData = options.excelData ? options.excelData : [];
        let titles = options.titles ? options.titles : {};
        let format = options.format ? options.format : {};
        let changeMappingKeys = options.changeMappingKeys ? options.changeMappingKeys : {};
        let excludeItems = options.excludeItems;
        let data = [];
        let width = [];

        // table id를 기준으로 view.xml 에서 정보 활용(view.xml에 정보 없을 시 오작동 가능)
        tableIds.every(id => {
            const table = _this.byId(id);
            const oData = _this.getView().getModel(table.mBindingInfos.rows.model).getData();

            if (!oData || oData.length == 0) return true; // odata가 없으면 패스

            if (titles && titles[id]) data.push(titles[id]); // 테이블 위에 title 필요 시

            const columns = table.getColumns();
            const headers = columns.map((obj, idx) => {
                if (!obj.mAggregations.template.mBindingInfos.icon && obj.getLabel().getText()) { // icon을 사용하는 컬럼은 제거한다
                    width[idx] = obj.getWidth(); // view.xml의 width정보를 가져온다
                    return { type: "header", align: obj.getHAlign(), value: obj.getLabel().getText() }
                }
            });

            data.push(headers.filter(header => header));

            let keyInfos = columns.map(obj => {
                let returnVal = undefined;
                if (obj.mAggregations.template.mBindingInfos.text) {
                    returnVal = obj.mAggregations.template.mBindingInfos.text.parts[0].path // Text
                } else if (obj.mAggregations.template.mBindingInfos.value) {
                    returnVal = obj.mAggregations.template.mBindingInfos.value.parts[0].path // Input
                } else if (obj.mAggregations.template.mBindingInfos.selectedKey) {
                    returnVal = obj.mAggregations.template.mBindingInfos.selectedKey.parts[0].path // Select                     
                } else if (obj.mAggregations.template.mAggregations.items) {
                    let multiLabel = [];
                    obj.mAggregations.template.mAggregations.items.forEach(o => {
                        if (o.mBindingInfos.text) {
                            multiLabel.push(o.mBindingInfos.text.parts[0].path);
                        } else if (o.mBindingInfos.value) {
                            multiLabel.push(o.mBindingInfos.value.parts[0].path);
                        } else if (o.mBindingInfos.selectedKey) {
                            multiLabel.push(o.mBindingInfos.selectedKey.parts[0].path)
                        }

                        if (excludeItems && excludeItems.length > 0) {
                            excludeItems.forEach(item => {
                                if (o.mBindingInfos[item.type]?.parts[0].path == item.name) {
                                    multiLabel.pop();
                                };
                            });
                        }
                    });
                    returnVal = multiLabel;

                }
                if (changeMappingKeys && changeMappingKeys[returnVal]) {
                    returnVal = changeMappingKeys[returnVal];
                }

                let align = "center";
                if (obj.mAggregations.template.aCustomStyleClasses) {
                    if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableStart")) {
                        align = "left";
                    } else if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableEnd")) {
                        align = "right";
                    }
                } else if (obj.mAggregations.template.mAggregations.items) {
                    obj.mAggregations.template.mAggregations.items.forEach(a => {
                        if (a.aCustomStyleClasses) {
                            if (a.aCustomStyleClasses.find(c => c == "tableStart")) {
                                align = "left";
                            } else if (a.aCustomStyleClasses.find(c => c == "tableEnd")) {
                                align = "right";
                            }
                        }
                    })
                }

                return { key: returnVal, align: align };

            }); // oData에서 매핑된 키값을 가져온다

            keyInfos = keyInfos.filter(obj => obj.key && obj.key.length > 0);

            // oData에서 key로 값을 생성한다. excel출력에 맞게 array 형태로
            oData.forEach(obj => {
                data.push(keyInfos.map(info => {
                    let val = "";
                    if (Array.isArray(info.key)) {
                        info.key.forEach((item, idx) => {
                            let subVal = obj[item];
                            if (format && format[item] && typeof format[item] === "function") subVal = format[item].call(null, subVal); // format 적용
                            if (idx > 0) {
                                val += "\n";
                            }
                            val += subVal;
                        });
                    } else {
                        val = obj[info.key];
                        if (format && format[info.key] && typeof format[info.key] === "function") val = format[info.key].call(null, val); // format 적용
                    }
                    return { value: val ? val : "", align: info.align };
                }));
            });
            return true;
        })

        if (options.width) {
            width = options.width;
        } else {
            width = width.map(a => {
                if (/\d{1,2}[%|rem]/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,2}/)[0] * 1.4, 10) + 10 };
                } else if (/\d{1,3}px/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,3}/)[0] / 5, 10) };
                }
                return { width: 20 };
            }); // view.xml의 width의 %또는 rem을 제거 하고 길이를 늘려준다 없는 경우 20
        }

        width = width.filter(o => o);

        const mergeExcelData = [...excelData, ...data]; // 세팅 정보와 table정보를 합친다

        return { data: mergeExcelData, width };
    }

    Modules.customExcelDownload = function (_this, excelName = "noName", tableIds = [], options = {}) {
        const { data, width } = Modules.getMakeCustomExcelData(_this, tableIds, options);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        data.forEach(rows => {
            const row = worksheet.addRow(rows.map(obj => obj.value));
            row.alignment = { vertical: 'middle', wrapText: true };
            row.height = 30;
        });

        data.forEach((rows, rowIdx) => {
            rows.forEach((cells, cellIdx) => {
                const cell = worksheet.getRow(rowIdx + 1).getCell(cellIdx + 1);
                if (cells.type === "header") {
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: '999999' }
                    };
                }
                else {
                    if (cells.align) cell.alignment = { vertical: 'middle', horizontal: cells.align, wrapText: true };
                }
            })
        });

        worksheet.columns = width;
        const fileName = excelName + '.xlsx';
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const borderStyle = {
            style: 'thin',
            color: { argb: '00000000' } // Black color for borders
        };

        worksheet.eachRow((row) => {
            // Iterate over each cell in the row
            row.eachCell((cell) => {
                cell.border = {
                    top: borderStyle,
                    left: borderStyle,
                    bottom: borderStyle,
                    right: borderStyle
                };
            });
        });

        workbook.xlsx.writeBuffer().then((buffer) => {
            const data = new Blob([buffer], { type: mimeType });
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // For IE browser
                window.navigator.msSaveOrOpenBlob(data, fileName);
            } else {
                // For other browsers
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.target = '_blank';
                link.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 100);
            }
        });
    };

    Modules.getMakeCommonExcelData = function (_this, tableIds, options) {
        let excelData = options.excelData ? options.excelData : [];
        let titles = options.titles ? options.titles : {};
        let format = options.format ? options.format : {};
        let changeMappingKeys = options.changeMappingKeys ? options.changeMappingKeys : {};
        let excludeItems = options.excludeItems;
        let data = [];
        let width = [];
        let formatter = {};

        let height = 30;

        // table id를 기준으로 view.xml 에서 정보 활용(view.xml에 정보 없을 시 오작동 가능)
        tableIds.every(id => {
            const table = _this.byId(id);
            const oData = _this.getView().getModel(table.mBindingInfos.rows.model).getData();

            if (!oData || oData.length == 0) return true; // odata가 없으면 패스

            formatter = {};

            if (titles && titles[id]) data.push(titles[id]); // 테이블 위에 title 필요 시

            const columns = table.getColumns();
            const headers = columns.map((obj, idx) => {
                if (!obj.mAggregations.template.mBindingInfos.icon && obj.getLabel().getText()) { // icon을 사용하는 컬럼은 제거한다
                    width[idx] = obj.getWidth(); // view.xml의 width정보를 가져온다
                    return { type: "header", align: obj.getHAlign(), value: obj.getLabel().getText() }
                }
            });

            data.push(headers.filter(header => header));

            let keyInfos = columns.map(obj => {
                let returnVal = undefined;
                if (obj.mAggregations.template.mBindingInfos.text) {
                    //returnVal = obj.mAggregations.template.mBindingInfos.text.parts[0].path // Text
                    returnVal = obj.mAggregations.template.mBindingInfos.text.parts.map(part => {
                        if (obj.mAggregations.template.mBindingInfos.text.formatter) formatter[part.path] = obj.mAggregations.template.mBindingInfos.text.formatter;
                        return part.path;
                    });
                } else if (obj.mAggregations.template.mBindingInfos.value) {
                    //returnVal = obj.mAggregations.template.mBindingInfos.value.parts[0].path // Input
                    returnVal = obj.mAggregations.template.mBindingInfos.value.partsmap(part => {
                        if (obj.mAggregations.template.mBindingInfos.value.formatter) formatter[part.path] = obj.mAggregations.template.mBindingInfos.value.formatter;
                        return part.path;
                    });
                } else if (obj.mAggregations.template.mBindingInfos.selectedKey) {
                    //returnVal = obj.mAggregations.template.mBindingInfos.selectedKey.parts[0].path // Select                     
                    returnVal = obj.mAggregations.template.mBindingInfos.selectedKey.parts.map(part => {
                        if (obj.mAggregations.template.mBindingInfos.selectedKey.formatter) formatter[part.path] = obj.mAggregations.template.mBindingInfos.selectedKey.formatter;
                        return part.path;
                    });
                } else if (obj.mAggregations.template.mAggregations.items) {
                    let multiLabel = [];
                    obj.mAggregations.template.mAggregations.items.forEach(o => {
                        let pathArr = undefined;
                        if (o.mBindingInfos.text) {
                            pathArr = o.mBindingInfos.text.parts.map(part => {
                                if (o.mBindingInfos.text.formatter) formatter[part.path] = o.mBindingInfos.text.formatter;
                                return part.path;
                            });
                        } else if (o.mBindingInfos.value) {
                            pathArr = o.mBindingInfos.value.parts.map(part => {
                                if (o.mBindingInfos.value.formatter) formatter[part.path] = o.mBindingInfos.value.formatter;
                                return part.path;
                            });
                        } else if (o.mBindingInfos.selectedKey) {
                            pathArr = o.mBindingInfos.selectedKey.parts.map(part => {
                                if (o.mBindingInfos.selectedKey.formatter) formatter[part.path] = o.mBindingInfos.selectedKey.formatter;
                                return part.path;
                            });
                        }

                        if (pathArr) {
                            if (pathArr.length == 1) {
                                multiLabel.push(pathArr[0]);
                            } else {
                                multiLabel.push(pathArr);
                            }
                        }

                        if (excludeItems && excludeItems.length > 0) {
                            excludeItems.forEach(item => {
                                if (o.mBindingInfos[item.type]?.parts[0].path == item.name) {
                                    multiLabel.pop();
                                };
                            });
                        }
                    });
                    returnVal = multiLabel;
                }

                if (Array.isArray(returnVal)) {
                    returnVal = returnVal.map(val => {
                        if (changeMappingKeys && changeMappingKeys[val]) return changeMappingKeys[val];
                        else return val;
                    })

                    const set = new Set(returnVal); // 중복 제거
                    returnVal = [...set];
                } else {
                    if (changeMappingKeys && changeMappingKeys[returnVal]) {
                        returnVal = changeMappingKeys[returnVal];
                    }
                }

                let align = "center";
                if (obj.mAggregations.template.aCustomStyleClasses) {
                    if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableStart")) {
                        align = "left";
                    } else if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableEnd")) {
                        align = "right";
                    }
                } else if (obj.mAggregations.template.mAggregations.items) {
                    obj.mAggregations.template.mAggregations.items.forEach(a => {
                        if (a.aCustomStyleClasses) {
                            if (a.aCustomStyleClasses.find(c => c == "tableStart")) {
                                align = "left";
                            } else if (a.aCustomStyleClasses.find(c => c == "tableEnd")) {
                                align = "right";
                            }
                        }
                    })
                }

                return { key: returnVal, align: align };

            }); // oData에서 매핑된 키값을 가져온다

            keyInfos = keyInfos.filter(obj => obj.key && obj.key.length > 0);

            // oData에서 key로 값을 생성한다. excel출력에 맞게 array 형태로
            oData.forEach(obj => {
                data.push(keyInfos.map(info => {
                    let val = "";
                    if (Array.isArray(info.key)) {
                        if (height < (Number.parseInt(info.key.length, 10) * 25)) {
                            height = Number.parseInt(info.key.length, 10) * 25;
                        }
                        info.key.forEach((item, idx) => {
                            if (Array.isArray(item)) {
                                if (formatter[item[0]]?.textFragments) {
                                    let subVal = "";
                                    formatter[item[0]]?.textFragments.forEach(i => {
                                        if (Number.isInteger(i)) {
                                            subVal += obj[item[i]];
                                        } else {
                                            subVal += i;
                                        }
                                    });
                                    val += subVal != undefined ? subVal : '';
                                }
                            } else {
                                let subVal = obj[item];
                                if (format && format[item] && typeof format[item] === "function") subVal = format[item].call(null, subVal); // format 적용
                                if (formatter && formatter[item] && typeof formatter[item] === "function") subVal = formatter[item].call(null, subVal); // format 적용
                                if (idx > 0) {
                                    val += "\n";
                                }
                                val += subVal != undefined ? subVal : '';
                            }
                        });
                    } else {
                        val = obj[info.key] != undefined ? obj[info.key] : '';
                        if (format && format[info.key] && typeof format[info.key] === "function") val = format[info.key].call(null, val); // format 적용
                        if (formatter && formatter[info.key] && typeof formatter[info.key] === "function") subVal = formatter[info.key].call(null, val); // format 적용
                    }
                    return { value: val ? val : "", align: info.align };
                }));
            });
            return true;
        });

        if (options.width) {
            width = options.width;
        } else {
            width = width.map(a => {
                if (/\d{1,2}[%|rem]/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,2}/)[0] * 1.4, 10) + 10 };
                } else if (/\d{1,3}px/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,3}/)[0] / 5, 10) };
                }
                return { width: 20 };
            }); // view.xml의 width의 %또는 rem을 제거 하고 길이를 늘려준다 없는 경우 20
        }

        width = width.filter(o => o);

        const mergeExcelData = [...excelData, ...data]; // 세팅 정보와 table정보를 합친다

        if (options.height) height = options.height;

        return { data: mergeExcelData, width, height };
    }

    Modules.getMakeCommonExcelDataV1 = function (_this, tableIds, options = {}) {
        let excelData = options.excelData ? options.excelData : [];
        let titles = options.titles ? options.titles : {};
        let changeMappingKeys = options.changeMappingKeys ? options.changeMappingKeys : {};
        let excludeItems = options.excludeItems;
        let data = [];
        let width = [];
        let tempObjkeyIdx = 1;

        let height = 30;

        // table id를 기준으로 view.xml 에서 정보 활용(view.xml에 정보 없을 시 오작동 가능)
        tableIds.every(id => {
            const table = _this.byId(id);
            const oData = _this.getView().getModel(table.mBindingInfos.rows.model).getData();

            if (!oData || oData.length == 0) return true; // odata가 없으면 패스

            if (titles && titles[id]) data.push(titles[id]); // 테이블 위에 title 필요 시

            const columns = table.getColumns();
            const headers = columns.map((obj, idx) => {
                if (!obj.mAggregations.template.mBindingInfos.icon && obj.getLabel().getText()) { // icon을 사용하는 컬럼은 제거한다
                    width[idx] = obj.getWidth(); // view.xml의 width정보를 가져온다
                    return { type: "header", align: obj.getHAlign(), value: obj.getLabel().getText() }
                }
            });

            let newHeaders = headers.filter(header => header);
            if (options.appendColumnInfo?.headers) {
                newHeaders = [...newHeaders, ...options.appendColumnInfo?.headers];
            }

            data.push(newHeaders);

            let keyInfos = columns.map(obj => {
                let returnVal = undefined;
                if (obj.mAggregations.template.mBindingInfos.text) {
                    returnVal = obj.mAggregations.template.mBindingInfos.text.parts.map(part => {
                        return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                    });
                    returnVal = [{ arr: returnVal, textFragments: obj.mAggregations.template.mBindingInfos.text.formatter?.textFragments, formatter: obj.mAggregations.template.mBindingInfos.text.formatter?.name?.indexOf("bound ") > -1 ? obj.mAggregations.template.mBindingInfos.text.formatter : undefined }];
                } else if (obj.mAggregations.template.mBindingInfos.value) {
                    returnVal = obj.mAggregations.template.mBindingInfos.value.parts.map(part => {
                        return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                    });
                    returnVal = [{ arr: returnVal, textFragments: obj.mAggregations.template.mBindingInfos.value.formatter?.textFragments, formatter: obj.mAggregations.template.mBindingInfos.value.formatter?.name?.indexOf("bound ") > -1 ? obj.mAggregations.template.mBindingInfos.value.formatter : undefined }];
                } else if (obj.mAggregations.template.mBindingInfos.selectedKey) {
                    returnVal = obj.mAggregations.template.mBindingInfos.selectedKey.parts.map(part => {
                        return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                    });
                    returnVal = [{ arr: returnVal, textFragments: obj.mAggregations.template.mBindingInfos.selectedKey.formatter?.textFragments, formatter: obj.mAggregations.template.mBindingInfos.selectedKey?.formatter.name?.indexOf("bound ") > -1 ? obj.mAggregations.template.mBindingInfos.selectedKey.formatter : undefined }];
                } else if (obj.mAggregations.template.mAggregations.items) {
                    let multiLabel = [];
                    obj.mAggregations.template.mAggregations.items.forEach(o => {
                        let pathArr = undefined;
                        if (o.mBindingInfos.text) {
                            pathArr = o.mBindingInfos.text.parts.map(part => {
                                return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                            });
                            pathArr = { arr: pathArr, textFragments: o.mBindingInfos.text.formatter?.textFragments, formatter: o.mBindingInfos.text.formatter?.name?.indexOf("bound ") > -1 ? o.mBindingInfos.text.formatter : undefined };
                        } else if (o.mBindingInfos.value) {
                            pathArr = o.mBindingInfos.value.parts.map(part => {
                                return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                            });
                            pathArr = { arr: pathArr, textFragments: o.mBindingInfos.value.formatter?.textFragments, formatter: o.mBindingInfos.value.formatter?.name?.indexOf("bound ") > -1 ? o.mBindingInfos.value.formatter : undefined };
                        } else if (o.mBindingInfos.selectedKey) {
                            pathArr = o.mBindingInfos.selectedKey.parts.map(part => {
                                return { key: part.path ? part.path : 'tempObjkeyIdx' + (tempObjkeyIdx++), formatter: part.formatter ? part.formatter : undefined };
                            });
                            pathArr = { arr: pathArr, textFragments: o.mBindingInfos.selectedKey.formatter?.textFragments, formatter: o.mBindingInfos.selectedKey.formatter?.name?.indexOf("bound ") > -1 ? o.mBindingInfos.selectedKey.formatter : undefined };
                        }

                        if (pathArr) multiLabel.push(pathArr);

                        if (excludeItems && excludeItems.length > 0) {
                            excludeItems.forEach(item => {
                                if (o.mBindingInfos[item.type]?.parts[0].path == item.name) {
                                    multiLabel.pop();
                                };
                            });
                        }
                    });
                    returnVal = multiLabel;
                }

                if (returnVal) {
                    const newReturnVal = [];
                    returnVal.forEach(val => {
                        if (newReturnVal.findIndex(n => JSON.stringify(val) === JSON.stringify(n)) === -1) newReturnVal.push(val);
                    });
                    returnVal = newReturnVal; // 중복 제거
                    returnVal = returnVal.map(o => {
                        if (changeMappingKeys && changeMappingKeys[o.key]) return o.key = changeMappingKeys[o.key];
                        else return o;
                    });
                }

                let align = "center";
                if (obj.mAggregations.template.aCustomStyleClasses) {
                    if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableStart")) {
                        align = "left";
                    } else if (obj.mAggregations.template.aCustomStyleClasses.find(c => c == "tableEnd")) {
                        align = "right";
                    }
                } else if (obj.mAggregations.template.mAggregations.items) {
                    obj.mAggregations.template.mAggregations.items.forEach(a => {
                        if (a.aCustomStyleClasses) {
                            if (a.aCustomStyleClasses.find(c => c == "tableStart")) {
                                align = "left";
                            } else if (a.aCustomStyleClasses.find(c => c == "tableEnd")) {
                                align = "right";
                            }
                        }
                    })
                }

                return { key: returnVal, align: align };

            }); // oData에서 매핑된 키값을 가져온다

            keyInfos = keyInfos.filter(obj => obj.key && obj.key.length > 0);

            if (options.appendColumnInfo?.keyInfos) {
                keyInfos = [...keyInfos, ...options.appendColumnInfo?.keyInfos];
            }

            if (options.appendColumnInfo?.width) {
                width = [...width, ...options.appendColumnInfo?.width]
            }

            // oData에서 key로 값을 생성한다. excel출력에 맞게 array 형태로
            oData.forEach(obj => {
                data.push(keyInfos.map(info => {
                    let val = "";
                    if (height < (Number.parseInt(info.key.length, 10) * 25)) {
                        height = Number.parseInt(info.key.length, 10) * 25;
                    }
                    info.key.forEach((item, idx) => {
                        let subVal = "";
                        if (item.textFragments) {
                            item.textFragments.forEach(i => {
                                if (Number.isInteger(i)) {
                                    if (item.arr[i].formatter) {
                                        subVal += item.arr[i].formatter.call(null, obj[item.arr[i].key]);
                                    } else {
                                        subVal += obj[item.arr[i].key];
                                    }
                                    if (item.arr[i].key.indexOf("tempObjkeyIdx") > -1 && item.arr[i].formatter) {
                                        subVal += item.arr[i].formatter.call(null, obj);
                                    }
                                } else {
                                    subVal += i;
                                }
                            })
                            val = subVal != undefined ? subVal : '';
                        } else {
                            item.arr.forEach((o) => {
                                let subVal = obj[o.key] ? obj[o.key] : '';
                                if (o.formatter) subVal = o.formatter.call(null, subVal);
                                else if (item.formatter) subVal = item.formatter.call(null, subVal);
                                if (o.key.indexOf("tempObjkeyIdx") > -1) {
                                    if (o.formatter) subVal = o.formatter.call(null, obj);
                                    else if (item.formatter) subVal = item.formatter.call(null, obj);
                                }
                                if (idx > 0) {
                                    subVal = "\n" + subVal;
                                }
                                val += subVal;
                            })
                        }
                    });
                    return { value: val ? val : "", align: info.align };
                }));
            });
            return true;
        });

        if (options.width) {
            width = options.width;
        } else {
            width = width.map(a => {
                if (/\d{1,2}[%|rem]/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,2}/)[0] * 1.4, 10) + 10 };
                } else if (/\d{1,3}px/.test(a)) {
                    return { width: parseInt(a.match(/\d{1,3}/)[0] / 5, 10) };
                }
                return { width: 20 };
            }); // view.xml의 width의 %또는 rem을 제거 하고 길이를 늘려준다 없는 경우 20
        }

        width = width.filter(o => o);

        const mergeExcelData = [...excelData, ...data]; // 세팅 정보와 table정보를 합친다

        if (options.height) height = options.height;

        return { data: mergeExcelData, width, height };
    };

    Modules.commonExcelDownloadV1 = function (_this, excelName = "noName", tableIds = [], options = {}) {
        options.version = "V1";
        Modules.commonExcelDownload(_this, excelName, tableIds, options)
    }

    Modules.commonExcelDownload = function (_this, excelName = "noName", tableIds = [], options = {}) {
        let callFunc = Modules.getMakeCommonExcelData;
        if (options?.version == "V1") {
            callFunc = Modules.getMakeCommonExcelDataV1;
        }
        let { data, width, height } = callFunc.call(null, _this, tableIds, options);
        //Modules.getMakeCommonExcelData(_this, tableIds, options);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        data.forEach(rows => {
            const row = worksheet.addRow(rows.map(obj => obj.value));
            row.alignment = { vertical: 'middle', wrapText: true };
            row.height = height;
        });

        data.forEach((rows, rowIdx) => {
            rows.forEach((cells, cellIdx) => {
                const cell = worksheet.getRow(rowIdx + 1).getCell(cellIdx + 1);
                if (cells.type === "header") {
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: '999999' }
                    };
                }
                else {
                    if (cells.align) cell.alignment = { vertical: 'middle', horizontal: cells.align, wrapText: true };
                }
            })
        });

        worksheet.columns = width;
        const fileName = excelName + '.xlsx';
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const borderStyle = {
            style: 'thin',
            color: { argb: '00000000' } // Black color for borders
        };

        worksheet.eachRow((row) => {
            // Iterate over each cell in the row
            row.eachCell((cell) => {
                cell.border = {
                    top: borderStyle,
                    left: borderStyle,
                    bottom: borderStyle,
                    right: borderStyle
                };
            });
        });

        workbook.xlsx.writeBuffer().then((buffer) => {
            const data = new Blob([buffer], { type: mimeType });
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // For IE browser
                window.navigator.msSaveOrOpenBlob(data, fileName);
            } else {
                // For other browsers
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.target = '_blank';
                link.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 100);
            }
        });
    };

    Modules.setSalesThis = function (_this) {
        Modules.oSalesThis = _this;
    };
    Modules.getSalesThis = function () {
        return Modules.oSalesThis;
    };
    Modules.setI18n = function (oI18n) {
        sap.ui.require(["sap/base/i18n/ResourceBundle"], function (ResourceBundle) {
            ResourceBundle.create({
                url: "../../skportal/common/i18n/i18n.properties",
                async: true,
                supportedLocales: ["en", "es", "fr", "ko"],
                fallbackLocale: "en"
            }).then(function (oResourceBundle) {
                Modules.oI18n = oResourceBundle
            });
        });
    };
    Modules.getI18n = function () {
        return Modules.oI18n;
    };
    Modules.setUiInit = function () {
        if (Modules.oSalesThis.getView().getModel('ui').getProperty("/width")) {
            Modules.oSalesThis.getView().getModel('ui').setProperty("/width", false);
            Modules.oSalesThis.getView().getModel('ui').setProperty("/width", true);
        }
        else {
            Modules.oSalesThis.getView().getModel('ui').setProperty("/width", true);
            Modules.oSalesThis.getView().getModel('ui').setProperty("/width", false);
        }
    };

    ///파일 이름 패턴
    Modules.getUniqueFileName = function (fileName) {
        // 정규표현식을 사용하여 파일명에서 _(숫자) 패턴을 찾기
        const baseNamePattern = /^(.*?)(?:_\((\d+)\))?(\.[^.]*)?$/;
        const match = fileName.match(baseNamePattern);

        // 파일명에서 기본 이름, 숫자, 확장자 분리
        const baseName = match[1];
        const existingNumber = match[2] ? parseInt(match[2], 10) : 0;
        const extension = match[3] || '';

        let counter = existingNumber;

        // 파일명이 기존 파일 리스트에 있는 동안 반복
        counter += 1;
        let newFileName = `${baseName}_(${counter})${extension}`;

        return newFileName;
    }
    Modules.deletedms = function (dmsurl, item, bPromise) {
        let oForm = new FormData();
        oForm.append("cmisaction", "delete");
        oForm.append("objectId", item.dmsFileId);
        oForm.append("allVersions", "true");
        //
        return new Promise((resolve) => {
            $.ajax({
                url: dmsurl, // 임시 토큰 url
                type: "HEAD",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', "Fetch");
                },
            })
                .done((result, textStatus, xhr) => {
                    let token = xhr.getResponseHeader("X-CSRF-Token");
                    let oSettings = {
                        "url": dmsurl,
                        "method": "POST",
                        "timeout": 0,
                        "processData": false,
                        "mimeType": "multipart/form-data",
                        "contentType": false,
                        "data": oForm,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-CSRF-Token', token);
                        }
                    };

                    $.ajax(oSettings)
                        .done((result) => {
                            resolve(result);
                        })
                        .fail(function (xhr) {
                            if (!bPromise) {
                                Modules._xhrErrorMessage(xhr)
                            }
                            // Modules.getSalesThis().onBusyIndicatorHide();
                        })
                });
        });
    };

    /**
     * 
     * @param {object} oView this.getView()
     */
    Modules.setLayoutJSON = function (oView) {
        oView.setModel(
            new JSONModel({
                layoutSpanDefault: "XL2 L2 M2 S12",
                layoutSpanHalf: "XL1 L1 M1 S6",
                layoutSpanDateRange: "XL4 L4 M4 S12",
                layoutSpanBtn: "XL12 L12 M12 S12",
                bLabel: true
            }), "layoutJSON");
    };

    Modules.setFieldBtnLayout = function (oView, init) {

        let oDynamicPage = oView.getContent()[0].getTitle() ? oView.getContent()[0].getTitle() : oView.getContent()[0].getHeader();
        let oSearchForm = oDynamicPage.getContent()[0],
            aSearchFormContents = oSearchForm.getContent(),
            iCountXL = 0,
            iCountL = 0,
            iCountM = 0,
            iResultXL = 12,
            iResultL = 12,
            iResultM = 12,
            sValue = '',
            iSpan = 0;

        /** 모든 필드 제거 */
        oSearchForm.removeAllContent();

        if (Modules.tempInactiveFields.length > 0) {
            for (const oAcitveField of Modules.tempInactiveFields) {
                aSearchFormContents.splice((aSearchFormContents.length - 1), 0, oAcitveField);
            }
        }

        for (let i = 0; i < aSearchFormContents.length; i++) {
            if (aSearchFormContents[i].getVisible()) {
                oSearchForm.addContent(aSearchFormContents[i]);

                /** 맨 마지막 인덱스인 버튼은 계산에서 제외 */
                if (i < aSearchFormContents.length - 1) {

                    let aSpanData = aSearchFormContents[i].getLayoutData().getSpan().split(" "),
                        iXL = parseInt(aSpanData[0].substring(2)),
                        iL = parseInt(aSpanData[1].substring(1)),
                        iM = parseInt(aSpanData[2].substring(1));

                    iCountXL = iCountXL + iXL;
                    iCountL = iCountL + iL;
                    iCountM = iCountM + iM;

                    iSpan += iXL;
                }
            } else if (init) {
                Modules.tempInactiveFields.push(aSearchFormContents[i]);
            }
        };

        if (iSpan > 22) {
            sValue = "XL" + (12 - (iSpan % 12)) + " L" + (12 - (iSpan % 12)) + " M" + (12 - (iSpan % 12)) + " S12";

        } else {
            if ((iCountXL % 12) >= 2) iResultXL = 12 - (iCountXL % 12);
            if ((iCountL % 12) >= 2) iResultL = 12 - (iCountL % 12);
            if ((iCountM % 12) >= 3) iResultM = 12 - (iCountM % 12);

            sValue = "XL" + iResultXL + " L" + iResultL + " M" + iResultM + " S12";
        };

        if (sValue === "XL12 L12 M12 S12") {
            oView.getModel("layoutJSON").setProperty("/bLabel", false);
        } else {
            oView.getModel("layoutJSON").setProperty("/bLabel", true);
        }

        aSearchFormContents[aSearchFormContents.length - 1].setLayoutData(
            new sap.ui.layout.GridData({
                span: sValue
            }))


    };

    /**
     * 모듈화 대상 - rfc odata 메타데이터 추출하여 rfc name 정보 출력용
     * @param {*} oEntityList 
     * @param {*} oComponent 
     */
    Modules.setRfcODataInfo = function (oEntityList, oComponent) {
        let aInfo = [];

        let _makeInfo = function (oInfo) {
            let oDataSourceInfo = oComponent.getMetadata().getManifest()["sap.app"].dataSources[oInfo.name], // manifest.json 등록정보 추출
                sUri = oDataSourceInfo.uri,
                sEntitySetName = sUri.split("/")[sUri.split("/").length - 2],
                oSrvMetadata = oComponent.getModel(oInfo.name).getServiceMetadata();
            if (oSrvMetadata === undefined) return;
            let oEntitySets = oSrvMetadata.dataServices.schema
                .find((e) => e.namespace === sUri.split("/")[sUri.split("/").length - 2]).entityContainer
                .find((e2) => e2.name.includes(sEntitySetName)).entitySet;

            for (const oSet of oEntitySets) {
                for (const [, sEntityName] of Object.entries(oInfo.services)) {
                    if (oSet.name === sEntityName.substring(1)) {
                        let oLabel = oSet.extensions.find((e) => e.name === "label");
                        aInfo.push({
                            "entitySet": oSet.name,
                            "RFC": oLabel ? oLabel.value : null
                        });
                    };
                }
            }
        }

        if (oEntityList["commonList"]) {
            let _oInfo = oEntityList["commonList"];
            _makeInfo(_oInfo);
        }

        if (oEntityList["individualList"]) {
            let _oInfo = oEntityList["individualList"];
            _makeInfo(_oInfo);
        }

        return aInfo;
    };
    //home ui
    Modules.cardSetting = function (card) {
        let oWidgetJson = {
            id: card.ID,
            type: "sap.card",
            descriptor: {
                value: {
                    "sap.app": {
                        "id": "bix.card." + card.cardFolder,
                        "type": "card",
                        "title": card.name,
                        "applicationVersion": {
                            "version": "1.0.0"
                        },
                        "info": card.category,
                        "tags": {
                            "keywords": [
                                "card"
                            ]
                        },
                        "richText": card.richText
                    },
                    "sap.ui": {
                        "technology": "UI5"
                    },
                    "sap.ui5": {
                        "rootView": {
                            "viewName": "bix.card." + card.cardFolder + ".card",
                            "type": "XML",
                            "async": true,
                            "id": "app"
                        },
                        "dependencies": {
                            "minUI5Version": "1.38",
                            "libs": {
                                "sap.m": {},
                                "sap.ui.core": {}
                            }
                        }
                    },
                    "sap.card": {
                        "type": "Component",
                        "header": {
                            "title": card.name
                        }
                    }
                }
            },
            descriptorResources: {
                baseUrl: "../",
                descriptorPath: card.cardComponent + "/" + card.cardFolder
            }
        }
        if (card.category === 'gallery') {
            oWidgetJson['descriptor']['value']['sap.app']['id'] = 'cardcomponent.photo';
            oWidgetJson['descriptor']['value']['sap.app']['title'] = card.name;;
            oWidgetJson['descriptor']['value']['sap.card']['header'] = null;
            oWidgetJson['descriptor']['value']['sap.app']['tags']['keywords'] = [];
            if (card.image.length > 0) {
                oWidgetJson['descriptor']['value']['sap.app']['tags']['keywords'].push(card.image[0].dmsFileId);
            }
            oWidgetJson['descriptor']['value']['sap.ui5']['rootView']['viewName'] = 'cardcomponent.photo.card';
            oWidgetJson['descriptorResources']['descriptorPath'] = 'cardcomponent/photo';
        }
        else if (card.category === 'banner') {
            oWidgetJson['descriptor']['value']['sap.app']['tags']['data'] = card;
            oWidgetJson['descriptor']['value']['sap.app']['id'] = 'cardcomponent.banner';
            oWidgetJson['descriptor']['value']['sap.app']['title'] = card.name;
            oWidgetJson['descriptor']['value']['sap.card']['header'] = null;
            oWidgetJson['descriptor']['value']['sap.app']['tags']['keywords'] = [];
            for (const cardImg of card.image) {
                oWidgetJson['descriptor']['value']['sap.app']['tags']['keywords'].push(cardImg.dmsFileId);
            }
            oWidgetJson['descriptor']['value']['sap.ui5']['rootView']['viewName'] = 'cardcomponent.banner.card';
            oWidgetJson['descriptorResources']['descriptorPath'] = 'cardcomponent/banner';
        }
        return oWidgetJson;
    };

    Modules.tileSetting = function (tile) {
        let oWidgetJson = {
            id: tile.seq,
            type: "sap.ushell.StaticAppLauncher",
            descriptor: {
                value: {
                    "sap.app": {
                        id: tile.menuSeq,
                        title: tile.name,
                        info: tile.uriPattern
                    },
                    "sap.ui": {
                        icons: {
                            icon: tile.iconSrc,
                        },
                    },
                    "sap.flp": {
                        type: "tile",
                        vizOptions: {
                            displayFormats: {
                                supported: [
                                    "standard",
                                    "standardWide",
                                    "flat",
                                    "flatWide",
                                    "compact",
                                ],
                                default: "standard",
                            },
                        },
                        target: {
                            semanticObject: "Action",
                            action: "ontest",
                        }
                    },
                }
            }
        }
        return oWidgetJson;
    };


    /**
     * 
     * @returns Language Code ex) "EN"
     */
    Modules.getRFCLangCode = function () {
        let sReturnCode = sessionStorage.getItem("userlanguage") ? sessionStorage.getItem("userlanguage").toUpperCase() : "EN";
        return sReturnCode;
    };

    /**
     * 
     * @param {string} param LoginName or email or id 
     */
    Modules.requestPasswordReset = function (param) {

        let oBody = { "identifier": param };

        return new Promise((resolve) => {
            $.ajax({
                type: "post",
                async: false,
                data: JSON.stringify(oBody),
                url: "/ias/service/users/forgotPassword",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Content-type", "application/json");
                },
            })
                .done(function (data) {
                    Modules.MessageToast(Modules.oI18n.getText("reset_request_sent"))
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    MessageBox.error(Modules.oI18n.getText("please_check_account_status"))
                    Modules._xhrErrorMessage(xhr)
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });

    };

    Modules.setInitialPassword = function (param, newPassword) {
        let sStandardPwStatus = "enabled";
        let oBody = {
            "id": param,
            "password": newPassword,
            "passwordStatus": sStandardPwStatus
        };

        return new Promise((resolve) => {
            $.ajax({
                type: "put",
                async: false,
                data: JSON.stringify(oBody),
                url: "/ias/service/scim/Users/" + param,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Content-type", "application/scim+json");
                },
            })
                .done(function (data) {
                    MessageBox.information(Modules.oI18n.getText("it_has_been_set_as_the_initial_password"))
                })
                .fail(function (xhr) {
                    resolve(xhr);
                    MessageBox.error(Modules.oI18n.getText("initial_password_setting_was_incorrect"))
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        });

    };



    Modules.onGetUserIasId = async function (iasID, bPromise) {
        let userId = "";
        $.ajax({
            type: 'get',
            async: false,
            url: '/ias/scim/Users?filter=userName eq "' + iasID + '"',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
                if (status.totalResults > 0) {
                    userId = status.Resources[0].id
                }
            })
            .fail(function (xhr) {
                resolve(xhr);
                if (!bPromise) {
                    Modules._xhrErrorMessage(xhr)
                }
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
        return userId;
    }

    Modules.onGetIasUserInfo = async function (iasID, bPromise) {
        let oUserInfo = null;
        $.ajax({
            type: 'get',
            async: false,
            url: '/ias/scim/Users?filter=userName eq "' + iasID + '"',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
                if (status.totalResults > 0) {
                    oUserInfo = status.Resources[0];
                }
            })
            .fail(function (xhr) {
                resolve(xhr);
                if (!bPromise) {
                    Modules._xhrErrorMessage(xhr)
                }
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
        return oUserInfo;
    }

    Modules.onActiveChangeIas = async function (sId, sFlag, bPromise) {
        let iasID;
        await Modules.onGetUserIasId(sId, bPromise).then((result) => {
            iasID = result
        });
        let actionTemp = {
            "schemas": [
                "urn:ietf:params:scim:api:messages:2.0:PatchOp"
            ],
            "Operations": [
                {
                    "op": "replace",
                    "path": "active",
                    "value": sFlag
                }
            ]
        }
        await $.ajax({
            type: 'patch',
            async: false,
            data: JSON.stringify(actionTemp),
            url: '/ias/scim/Users/' + iasID,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
            })
            .fail(function (xhr) {
                resolve(xhr);
                if (!bPromise) {
                    Modules._xhrErrorMessage(xhr)
                }
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
    }

    Modules.tableUpdate = function (oTable, iLength, bBoolean) {
        let oTableColumns = oTable.mAggregations.columns;
        if (iLength === 0) {
            if (bBoolean) {
                for (let i = 1; i < oTableColumns.length; i++) {
                    oTableColumns[i].setWidth('10rem');
                }
            } else {
                for (let i = 1; i < oTableColumns.length; i++) {
                    oTableColumns[i].setWidth('10rem');
                }
            }
        } else {
            if (bBoolean) {
                for (let i = 1; i < oTableColumns.length; i++) {
                    oTable.autoResizeColumn(i);
                }
            } else {
                for (let i = 1; i < oTableColumns.length; i++) {
                    oTable.autoResizeColumn(i);
                }
            }
            oTable.getColumns()[0].focus();
        }
    }
    // Create Excel Column
    Modules.createColumnConfig = function (table) {
        let aCols = [];
        let aVisibleCols = [];
        table.getColumns().forEach((col, idx) => {
            if (col.getVisible()) {
                aVisibleCols.push(idx);
            }
        })
        for (const oVisibleCol of aVisibleCols) {
            let property;
            if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mBindingInfos.text !== undefined) {
                property = table.mBindingInfos.items.template.getCells()[oVisibleCol].mBindingInfos.text.parts[0].path
            } else if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mBindingInfos.state !== undefined) {
                property = table.mBindingInfos.items.template.getCells()[oVisibleCol].mBindingInfos.state.parts[0].path
            } else if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items != undefined && table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items.length !== 0) {
                if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.visible !== undefined) {
                    property = 'notice';
                } else {
                    property = table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts[table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts.length - 1].path;
                }
            } else {
                continue;
            }

            let object = {
                label: table.getColumns()[oVisibleCol].getHeader().getText(),
                property: property,
            }
            aCols.push(object);
        }

        return aCols;
    }

    Modules.createColumnConfig2 = function (table) {
        let aCols = [];
        let aVisibleCols = [];
        table.getColumns().forEach((col, idx) => {
            if (col.getVisible()) {
                aVisibleCols.push(idx);
            }
        })
        aVisibleCols.forEach(oVisibleCol => {
            let property;
            if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.text) {
                property = table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.text.parts[0].path;
            }
            if (table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.state) {
                property = table.mBindingInfos.items.template.getCells()[oVisibleCol].mAggregations.items[0].mBindingInfos.state.parts[0].path;
            }
            let object = {
                label: table.getColumns()[oVisibleCol].getHeader().getText(),
                property: property,
            }
            aCols.push(object);
        });
        return aCols;
    }

    Modules.createUiColumnConfig = function (table) {
        let aCols = [];
        for (const oTableCol of table.getColumns()) {
            let property;
            if (oTableCol.mAggregations.template.mBindingInfos.text !== undefined) {
                property = oTableCol.mAggregations.template.mBindingInfos.text.parts[0].path
            } else if (oTableCol.mAggregations.template.mBindingInfos.state !== undefined) {
                property = oTableCol.mAggregations.template.mBindingInfos.state.parts[0].path
            } else if (oTableCol.mAggregations.template.mBindingInfos.value !== undefined) {
                property = oTableCol.mAggregations.template.mBindingInfos.value.parts[0].path
            }
            let object = {
                label: oTableCol.mAggregations.label.mProperties.text,
                property: property,
            }
            aCols.push(object);
        }
        return aCols;
    }

    Modules.createUiColumnConfig2 = function (table) {
        let aCols = [];
        for (const oTableCol of table.getColumns()) {
            let property;
            if (oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.text !== undefined) {
                property = oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.text.parts[0].path
            } else if (oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.state !== undefined) {
                property = oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.state.parts[0].path
            } else if (oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.value !== undefined) {
                property = oTableCol.mAggregations.template.mAggregations.items[0].mBindingInfos.value.parts[0].path
            }
            let object = {
                label: oTableCol.mAggregations.label.mProperties.text,
                property: property,
            }
            aCols.push(object);
        }
        return aCols;
    }

    Modules.uploadSetErrorHandle = function (oEvent, path) {
        let UploadSet = oEvent.getSource();
        let status = oEvent.getParameters("response").status;
        let file_seq = oEvent.getParameters("response").item.newFileSeq;
        let item = oEvent.getParameters("response").item;
        if (status !== 200 && status !== 204 && status !== 201) {
            MessageBox.error(Modules.oI18n.getText("upload_failed"));
            let deletePath = path + "',file_seq='" + file_seq + "')"
            this.delete(deletePath).then((data) => {
                UploadSet.removeItem(item)
            });
        }
    }

    // email 유효성 검사
    Modules.checkEmail = function (oEmail, sEmail) {
        let oRegExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
        if (sEmail.match(oRegExp) == null) {
            oEmail.setValueState("Error");
        } else {
            oEmail.setValueState("None");
        }
    }
    // Wizard 콘솔 에러 지우기 (Step 3 ~ 8)
    Modules.deleteWizardConsoleError = function (_this, sPath, sId) {
        let that = _this;
        if (!that.byId(sId)) {
            Fragment.load({
                id: that.getView().getId(),
                name: sPath,
                controller: that,
            }).then(
                function (oDialog) {
                    that.getView().addDependent(oDialog);
                    that._oWizard = this.byId('Wizard');
                    that._oWizard.constructor.CONSTANTS.MINIMUM_STEPS = 1;
                }.bind(that)
            );
        }
    }
    Modules.myWorkMaking = async function (userId, bPromise) {
        let homeMenuSeq = await this.getSeq('WM');
        let homeMenuTemp = {
            seq: homeMenuSeq,
            name: "My Work",
            type: "user",
            target: [{
                menu_seq: homeMenuSeq,
                targetSeq: userId,
            }]
        }
        await this.post("/odata/v4/home/Menu", homeMenuTemp, bPromise);
    }

    Modules._xhrErrorMessage = function (xhr, special) {
        MessageBox.error("통신 에러"); return;
        let sStatus = xhr.status;
        if (special) {
            if (sStatus === 400) {
                return Modules.oI18n.getText("the_request_could_not_be_understood");
            } else if (sStatus === 401) {
                return Modules.oI18n.getText("authentication_is_invalid");
            } else if (sStatus === 403) {
                return Modules.oI18n.getText("insufficient_permissions");
            } else if (sStatus === 404) {
                return Modules.oI18n.getText("the_requested_content_could_not_be_found");
            } else if (sStatus === 408) {
                return Modules.oI18n.getText("the_request_timed_out");
            } else if (sStatus === 409) {
                return Modules.oI18n.getText("already_registered");
            } else if (sStatus === 412) {
                return Modules.oI18n.getText("required_conditions_were_not_met");
            } else if (sStatus === 428) {
                return Modules.oI18n.getText("another_user_completed_the_task_please_proceed_with_the_current_task_again");
            } else if (sStatus === 500) {
                return Modules.oI18n.getText("there_was_a_problem_on_the_server");
            } else if (sStatus === 501) {
                return Modules.oI18n.getText("the_request_is_not_supported");
            } else if (sStatus === 502) {
                return Modules.oI18n.getText("bad_response_received");
            } else if (sStatus === 503) {
                return Modules.oI18n.getText("temporary_error_please_try_again_later");
            } else if (sStatus === 504) {
                return Modules.oI18n.getText("communication_timed_out");
            } else {
                return Modules.oI18n.getText("an_unknown_error_occurred");
            }
        } else {
            let errMsg;
            if (sStatus === 400) {
                errMsg = Modules.oI18n.getText("the_request_could_not_be_understood");
            } else if (sStatus === 401) {
                errMsg = Modules.oI18n.getText("authentication_is_invalid");
            } else if (sStatus === 403) {
                errMsg = Modules.oI18n.getText("insufficient_permissions");
            } else if (sStatus === 404) {
                errMsg = Modules.oI18n.getText("the_requested_content_could_not_be_found");
            } else if (sStatus === 408) {
                errMsg = Modules.oI18n.getText("the_request_timed_out");
            } else if (sStatus === 409) {
                errMsg = Modules.oI18n.getText("already_registered");
            } else if (sStatus === 412) {
                errMsg = Modules.oI18n.getText("required_conditions_were_not_met");
            } else if (sStatus === 428) {
                errMsg = Modules.oI18n.getText("another_user_completed_the_task_please_proceed_with_the_current_task_again");
            } else if (sStatus === 500) {
                errMsg = Modules.oI18n.getText("there_was_a_problem_on_the_server");
            } else if (sStatus === 501) {
                errMsg = Modules.oI18n.getText("the_request_is_not_supported");
            } else if (sStatus === 502) {
                errMsg = Modules.oI18n.getText("bad_response_received");
            } else if (sStatus === 503) {
                errMsg = Modules.oI18n.getText("temporary_error_please_try_again_later");
            } else if (sStatus === 504) {
                errMsg = Modules.oI18n.getText("communication_timed_out");
            } else {
                errMsg = Modules.oI18n.getText("an_unknown_error_occurred");
            }

            MessageBox.error(errMsg, {
                actions: [Modules.oI18n.getText("refresh"), Modules.oI18n.getText("close")],
                emphasizedAction: Modules.oI18n.getText("refresh"),
                onClose: event => {
                    if (event === Modules.oI18n.getText("refresh")) {
                        window.location.reload();
                    }
                }
            });
        }
    }

    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // //////////////////////////////////////////////////////        합쳐짐        ////////////////////////////////////////////////////
    // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    Modules.openDialog = async function (_this, path, id) {
        // if(_this._sDialogId)                
        //     {_this._beforeSDialogId = _this._sDialogId};
        // _this._sDialogId = id; 

        if (!_this.byId(id)) {
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oDialog) {
                    _this.getView().addDependent(oDialog);
                    oDialog.open(oDialog);
                }.bind(_this)
            );
        } else {
            _this.byId(id).destroy();
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oDialog) {
                    _this.getView().addDependent(oDialog);
                    oDialog.open(oDialog);
                }.bind(_this)
            );
        }
    };

    // //합쳐짐
    Modules.openPopover = async function (_this, path, id, object) {
        if (!_this.byId(id)) {
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oPopover) {
                    _this.getView().addDependent(oPopover);
                    oPopover.openBy(object);
                }.bind(_this)
            );
        } else {
            _this.byId(id).destroy();
            await Fragment.load({
                id: _this.getView().getId(),
                name: path,
                controller: _this,
            }).then(
                async function (oPopover) {
                    _this.getView().addDependent(oPopover);
                    oPopover.openBy(object);
                }.bind(_this)
            );
        }
    };

    Modules.onDateChange = async function (_this) {
        let sStartDate = _this.getView().byId("startDateHistory").getValue();
        let sEndDate = _this.getView().byId("endDateHistory").getValue();

        // 두 날짜 값이 모두 존재하는지 확인
        if (sStartDate && sEndDate) {
            // 날짜 값을 Date 객체로 변환
            let oStartDate = new Date(sStartDate);
            let oEndDate = new Date(sEndDate);

            // startDate가 endDate 이후일 경우 처리
            if (oEndDate < oStartDate) {
                // 오류 메시지 출력 (Dialog, MessageToast 등을 사용할 수 있습니다)
                sap.m.MessageToast.show(Modules.oI18n.getText("end_date_must_be_after_start_date"));

                // endDate를 초기화 또는 startDate 이후로 자동 설정할 수도 있음
                _this.getView().byId("endDateHistory").setValue("");
            }
        }
    }

    Modules.sendDms = async function (dmsurl, file) {
        file = await Modules._sendDmsFilename(dmsurl, file);
        let oResult;
        let oForm = new FormData();
        oForm.append("cmisaction", "createDocument");
        oForm.append("propertyId[0]", "cmis:name");
        oForm.append("propertyValue[0]", file.name);
        oForm.append("propertyId[1]", "cmis:objectTypeId");
        oForm.append("propertyValue[1]", "cmis:document");
        oForm.append("succinct", "true");
        oForm.append("filename", file);
        oForm.append("media", "binary");

        return new Promise((resolve) => {
            $.ajax({
                url: dmsurl, // 임시 토큰 url
                type: "HEAD",
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('X-CSRF-Token', "Fetch");
                },
            })
                .done((result, textStatus, xhr) => {
                    let token = xhr.getResponseHeader("X-CSRF-Token");
                    let oSettings = {
                        "url": dmsurl,
                        "method": "POST",
                        "timeout": 0,
                        "processData": false,
                        "mimeType": "multipart/form-data",
                        "contentType": false,
                        "data": oForm,
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('X-CSRF-Token', token);
                        },
                    };

                    $.ajax(oSettings)
                        .done((result) => {
                            oResult = JSON.parse(result);
                            resolve(oResult);
                        })
                        .fail(function (xhr) {
                            Modules._xhrErrorMessage(xhr)
                            // Modules.getSalesThis().onBusyIndicatorHide();
                        })
                })
        });
    };

    //해당 fileName 중복여부 확인 후 filename수정
    Modules._sendDmsFilename = async function (dmsurl, file) {
        let oForm = new FormData();
        oForm.append("cmisaction", "createDocument");
        oForm.append("propertyId[0]", "cmis:name");
        oForm.append("propertyValue[0]", file.name);
        oForm.append("propertyId[1]", "cmis:objectTypeId");
        oForm.append("propertyValue[1]", "cmis:document");
        oForm.append("succinct", "true");
        oForm.append("filename", file);
        oForm.append("media", "binary");

        let oGetSettings = {
            "url": dmsurl,
            "method": "GET",
            "timeout": 0,
            "processData": false,
            "mimeType": "multipart/form-data",
            "contentType": false
        };
        return new Promise(async (resolve, reject) => {
            await $.ajax(oGetSettings)
                .done((data) => {
                    if (data.includes(file.name)) {
                        let fileName = file.name;
                        let baseNamePattern = /^(.*?)(?:_\((\d+)\))?(\.[^.]*)?$/;
                        let match = fileName.match(baseNamePattern);
                        let baseName = match[1];
                        let existingNumber = match[2] ? parseInt(match[2], 10) : 0;
                        let extension = match[3] || '';

                        let newName = "";
                        if (/^.+_\(\d+\)\.[^.]+$/.test(fileName)) {
                            newName = `${baseName}_(${existingNumber + 1})${extension}`;
                        } else {
                            newName = baseName + "_(1)" + extension;
                        }
                        let newFile = new File([file], newName, {
                            type: file.type,
                            lastModified: file.lastModified,
                        });
                        resolve(Modules._sendDmsFilename(dmsurl, newFile));
                    } else {
                        resolve(file);
                    }
                }).fail((xhr) => {
                    resolve(xhr);
                    Modules._xhrErrorMessage(xhr)
                    // Modules.getSalesThis().onBusyIndicatorHide();
                });
        })
    };

    Modules.convertSapFileInfo = function (file, callBackFunction) {
        let reader = new FileReader();
        //바이너리 tostring
        reader.onload = function (e) {
            // The file content is now available as ArrayBuffer
            let arrayBuffer = e.target.result;
            // Convert ArrayBuffer to binary data
            let binaryData = Modules._convertArrayBufferToBinary(arrayBuffer);
            // Do something with the binary data
            callBackFunction(binaryData);
        }.bind(this);
        reader.readAsArrayBuffer(file);
    };

    Modules._convertArrayBufferToBinary = function (arrayBuffer) {
        let bytes = new Uint8Array(arrayBuffer);
        let binaryString = '';
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binaryString); // Base64 인코딩
    };

    // oThis : 호출하는 controller this, sModelName : table에 binding된 Model Name, 
    // sCheck : 점검해야되는 칼럼 네임, 여러 개일 경우 "column1,column2" 쉼표로 구분해서 string으로 넘김
    Modules.tableCheck = function (oThis, sModelName, sCheck, aSelectedIdx) {
        let bValidationCheck = false;
        let oCheck = sCheck.split(',');
        let oModel = oThis.getView().getModel(sModelName).getData();
        for (let i = 0; i < oModel.length; i++) {
            if (!aSelectedIdx || (aSelectedIdx && aSelectedIdx.includes(i))) {
                for (const checkElement of oCheck) {
                    let sCheckColumn = oThis.getView().getModel(sModelName).getProperty('/' + i + '/' + checkElement);
                    if (sCheckColumn === null || sCheckColumn === '' || sCheckColumn === undefined) {
                        oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + checkElement + '_validation', 'Error');
                        bValidationCheck = true;
                    } else {
                        oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + checkElement + '_validation', 'None');
                    }
                }
            }
        }
        return bValidationCheck;
    };
    Modules.tableCheckAllNone = function (oThis, sModelName, sCheck, aSelectedIdx) {
        let bValidationCheck = false;
        let oCheck = sCheck.split(',');
        let oModel = oThis.getView().getModel(sModelName).getData();
        for (let i = 0; i < oModel.length; i++) {
            if (!aSelectedIdx || (aSelectedIdx && aSelectedIdx.includes(i))) {
                for (const checkElement of oCheck) {
                    oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + checkElement + '_validation', 'None');

                }
            }
        }
        return bValidationCheck;
    };
    Modules.treeTableCheck = function (oThis, sModelName, sCheck) {
        let bValidationCheck = false;
        let oCheck = sCheck.split(',');
        let aModel = oThis.getView().getModel(sModelName).getData();

        for (let i = 0; i < aModel.length; i++) {
            bValidationCheck = Modules.treeTableChildCheck(oThis, sModelName, oCheck, bValidationCheck, aModel[i], "/" + i);
        }
        console.log("final" + " : " + bValidationCheck);
        return bValidationCheck;
    };
    Modules.treeTableChildCheck = function (oThis, sModelName, oCheck, bValidationCheck, oModel, sPath) {
        for (const checkElement of oCheck) {
            let sCheckColumn = oThis.getView().getModel(sModelName).getProperty(sPath + '/' + checkElement);
            if (sCheckColumn === null || sCheckColumn === '' || sCheckColumn === undefined) {
                oThis.getView().getModel(sModelName).setProperty(sPath + '/' + checkElement + '_validation', 'Error');
                bValidationCheck = true;
            } else {
                oThis.getView().getModel(sModelName).setProperty(sPath + '/' + checkElement + '_validation', 'None');
            }
            console.log(sPath + " : " + bValidationCheck);
        }

        if (oModel.children.length > 0) {
            for (let i = 0; i < oModel.children.length; i++) {
                bValidationCheck = Modules.treeTableChildCheck(oThis, sModelName, oCheck, bValidationCheck, oModel.children[i], sPath + '/children/' + i);
            }
        }

        return bValidationCheck;
    }
    Modules.tableCheckForUser = function (oThis, sModelName, sCheck, sChildCheck) {
        let bValidationCheck = false;
        let oCheck = sCheck.split(',');
        let aChildCheck = sChildCheck.split(',');
        let oModel = oThis.getView().getModel(sModelName).getData();
        for (let i = 0; i < oModel.length; i++) {
            for (const checkElement of oCheck) {
                let sCheckColumn = oThis.getView().getModel(sModelName).getProperty('/' + i + '/' + checkElement);
                if (sCheckColumn === null || sCheckColumn === '' || sCheckColumn === undefined) {
                    oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + checkElement + '_validation', 'Error');
                    bValidationCheck = true;
                }
                else {
                    oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + checkElement + '_validation', 'None');
                }
            }
            if (oModel[i].type === 'select') {
                for (let j = 0; j < oModel[i].children.length; j++) {
                    for (const childCheckElement of aChildCheck) {
                        let sCheckChildColumn = oThis.getView().getModel(sModelName).getProperty('/' + i + '/' + 'children' + '/' + j + '/' + childCheckElement);
                        if (sCheckChildColumn === null || sCheckChildColumn === '' || sCheckChildColumn === undefined) {
                            oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + 'children' + '/' + j + '/' + childCheckElement + '_validation', 'Error');
                            bValidationCheck = true;
                        }
                        else {
                            oThis.getView().getModel(sModelName).setProperty('/' + i + '/' + 'children' + '/' + j + '/' + childCheckElement + '_validation', 'None');
                        }
                    }
                }
            }
        }
        return bValidationCheck;
    };
    // oThis : 호출하는 controller this, sModelName : table에 binding된 Model Name, 
    // sCheck : 점검해야되는 칼럼 네임, 여러 개일 경우 "column1,column2" 쉼표로 구분해서 string으로 넘김
    Modules.deleteValidationColumn = function (oThis, sModelName, sCheck, aSelect) {
        let oModel = oThis.getView().getModel(sModelName).getData();
        let oCheck = sCheck.split(',');
        for (let i = 0; i < oModel.length; i++) {
            if (!aSelect || (aSelect && !aSelect.includes(i))) {
                for (const checkelement of oCheck) {
                    let sValidateColumn = checkelement + '_validation';
                    delete oModel[i][sValidateColumn];
                }
            }
        }
        oThis.getView().getModel(sModelName).refresh();
        return oModel;
    };
    Modules.changeStateValidationColumn = function (oThis, sModelName, sCheck, aSelect) {
        let oModel = oThis.getView().getModel(sModelName).getData();
        let oCheck = sCheck.split(',');
        for (let i = 0; i < oModel.length; i++) {
            if (!aSelect || (aSelect && !aSelect.includes(i))) {
                for (const checkelement of oCheck) {
                    let sValidateColumn = checkelement + '_validation';
                    oModel[i][sValidateColumn] = 'None';
                }
            }
        }
        return oModel;
    };
    Modules.deleteValidationColumnForUser = function (oThis, sModelName, sCheck, sChildCheck) {
        let oModel = oThis.getView().getModel(sModelName).getData();
        let oCheck = sCheck.split(',');
        let aChildCheck = sChildCheck.split(',');
        for (const modelElement of oModel) {
            for (const checkelement of oCheck) {
                let sValidateColumn = checkelement + '_validation';
                delete modelElement[sValidateColumn];
            }
            if (modelElement.type === "select") {
                for (const modelChildElement of modelElement.children) {
                    for (const childCheckelement of aChildCheck) {
                        let sValidateColumn = childCheckelement + '_validation';
                        delete modelChildElement[sValidateColumn];
                    }
                }
            }
        }
        return oModel;
    };

    Modules.onRequestSSOUserCreate = function (_this, bEdit, bDelete, bReinstate) {
        return new Promise((resolve) => {
            let oSsoData = _this.getView().getModel("ssoModel").getData();
            let oCopySsoData = _this.getView().getModel("copySsoModel").getData();
            let oData = _this.getView().getModel("oEmployeeModel").getData();
            let ssoId = oData.id.length > 10 ? oData.id.substring(3) : oData.id
            const DealerCode = oData.dealerCode ? oData.dealerCode.substring(5) : ""; // 현재 KMX 기준 B20VA + 5자리 조합으로 화면에 뿌리고 있음 앞 5자 삭제
            // KMX fixed value
            const DistCode = "B20VA";
            const skportalID = "KMM_skportal";

            let GswUrl = "/EAI/GSWTI/COM_USER";
            // if(window.location.href.toLowerCase().includes("dev") || window.location.href.toLowerCase().includes("qa")) GswUrl = "/EAI_PRD/GSWTI/COM_USER";
            const KddmsUrl = "/EAI/KDDMS/KEWB_DDMSSTAF_INF_KMM";
            const AmosUrl = "/EAI/AMOS/PFCSLSSO";
            let sToday = new Date();
            let sYear = sToday.getFullYear();
            let sMonth = String(sToday.getMonth() + 1).padStart(2, "0");
            let sDay = String(sToday.getDate()).padStart(2, "0");
            let date = sYear + sMonth + sDay;
            let endDate = sYear + 1 + sMonth + sDay;
            let AMOS = {
                "Request": [
                    {
                        "STAF_USER_ID": ssoId,  // 10자리 초과 앞 KMM / KMX 자르기
                        "OLD_STAF_ID": ssoId,
                        "STAF_ORG_CD": DistCode,
                        "STAF_ADLR_CD": oData.userType === "usertype_03" ? DealerCode : "",
                        "STAF_USER_NM": oData.firstName,
                        "STAF_USER_LNM": oData.lastName,
                        "STAF_TEL_NO": oData.officeTel ? oData.officeTel : "",
                        "STAF_HP_NO": oData.contact ? oData.contact : "",
                        "STAF_FAX_NO": oData.officeFax ? oData.officeFax : "",
                        "STAF_EML": oData.email,
                        "STAF_EFFECT_FROM": endDate,
                        "STAF_EFFECT_TO": "99991231", //fixed
                        "STAF_USE_ST": bReinstate ? oCopySsoData.amosStatus ? "A" : "I" : bDelete ? "I" : !bEdit ? oSsoData.amosStatus ? "A" : "I" : _this.byId("SSOamosdcs").getSelected() ? "A" : "I",
                        "STAF_CRE_YMD": bEdit ? oSsoData.amosCreateDate ? oSsoData.amosCreateDate : date : date,
                        "STAF_CRE_ID": skportalID,
                        "STAF_MDFY_YMD": date,
                        "STAF_MDFY_ID": skportalID,
                        "STAF_USER_TYPE": oData.userType === "usertype_03" ? "D" : "I",
                        "SSO_UPD_FLAG": bReinstate ? "U" : bDelete ? "U" : bEdit ? oSsoData.amosCreateDate ? "U" : "A" : "A"
                    }
                ]
            };
            let KDDMS = {
                "Request": [
                    {
                        "UserAccount": ssoId.toUpperCase(),   // 10자리 초과 앞 KMM / KMX 자르기 + 대문자
                        "OldUserAccount": ssoId,
                        "DistributorCode": DistCode,
                        "DealerCode": oData.userType === "usertype_03" ? DealerCode : "",
                        "UserName": oData.lastName,
                        "Email": oData.email,
                        "MobilePhone": oData.contact ? oData.contact : "",
                        "AccountStatus": bReinstate ? oSsoData.kddmsStatus ? "AT" : "IA" : bDelete ? "AT" : !bEdit ? oSsoData.kddmsStatus ? "AT" : "IA" : _this.byId("SSOddms").getSelected() ? "AT" : "IA",
                        "CeateDate": bEdit ? oSsoData.kddmsCreateDate ? oSsoData.kddmsCreateDate : date : date,
                        "Role": oSsoData.gswAuthorityCode ? oSsoData.kddmsAuthorityCode : !bEdit ? oSsoData.kddmsAuthorityCode ? oSsoData.kddmsAuthorityCode : "" : _this.byId('SSOddms').getSelected() ? oSsoData.kddmsAuthorityCode : oCopySsoData.amosUser ? oCopySsoData.kddmsAuthorityCode : "",
                        "UserType": oData.userType === "usertype_03" ? "D" : "O", // !!!!인터널유저 코드 미확정!!!!
                        "Region": "B2",
                        "Language": "ESP"
                    }
                ]
            };
            let GSW = {
                "Request": [
                    {
                        "USER_ID": oData.id,
                        "USER_NM": oData.firstName + "" + oData.lastName,
                        "AUTH_CD": bReinstate ? oSsoData.gswAuthorityCode : !bEdit ? oSsoData.gswAuthorityCode ? oSsoData.gswAuthorityCode : "" : _this.byId('SSOgswti').getSelected() ? oSsoData.gswAuthorityCode : oCopySsoData.amosUser ? oCopySsoData.gswAuthorityCode : "",
                        "DLR_CD": oData.userType === "usertype_03" ? DealerCode : "",
                        "EML_ADR": oData.email,
                        "USR_OLD_ID": oData.id,
                        "DIST_SN": "499",
                        "CRER_ID": skportalID,
                        "EML_YN": "Y",
                        "LANG_CD": "ES",
                        "USE_FNH_DT": "99991231", // fixed
                        "USE_STRT_DT": date,
                        "USE_YN": bReinstate ? oSsoData.gswStatus ? "Y" : "N" : bDelete ? "N" : !bEdit ? oSsoData.gswStatus ? "Y" : "N" : _this.byId("SSOgswti").getSelected() ? "Y" : "N",
                        "UPD_DTM": date,
                        "CRE_DTM": bEdit ? oSsoData.gswCreateDate ? oSsoData.gswCreateDate : date : date,
                        "NEW_YN": bReinstate ? "N" : bDelete ? "N" : bEdit ? oSsoData.gswCreateDate ? "N" : "Y" : "Y",
                        "DEL_YN": "N"
                    }
                ]
            };
            let aReturn = [];
            if ((!bEdit && oSsoData.kddmsStatus) || (bEdit && _this.byId("SSOddms").getSelected() !== oCopySsoData.kddmsStatus) || (bEdit && oSsoData.kddmsAuthorityCode !== oCopySsoData.kddmsAuthorityCode) || (bDelete && oCopySsoData.kddmsStatus) || (bReinstate && oSsoData.kddmsStatus)) {
                aReturn.push(Modules.SsoPost(KddmsUrl, KDDMS, "KDDMS", true));
            }
            if ((!bEdit && oSsoData.gswStatus) || (bEdit && _this.byId("SSOgswti").getSelected() !== oCopySsoData.gswStatus) || (bEdit && oSsoData.gswAuthorityCode !== oCopySsoData.gswAuthorityCode) || (bDelete && oCopySsoData.gswStatus) || (bReinstate && oSsoData.gswStatus)) {
                aReturn.push(Modules.SsoPost(GswUrl, GSW, "GSW", true));
            }
            if ((!bEdit && oSsoData.amosStatus) || (bEdit && _this.byId("SSOamosdcs").getSelected() !== oCopySsoData.amosStatus) || (bDelete && oCopySsoData.amosStatus) || (bReinstate && oSsoData.amosStatus)) {
                aReturn.push(Modules.SsoPost(AmosUrl, AMOS, "AMOS", true));
            }
            resolve(aReturn);
        })
    };

    Modules.SsoPost = function (url, data, sTarget, bPromise) {
        return new Promise((resolve) => {
            $.ajax({
                type: "POST",
                url: url,
                data: JSON.stringify(data),
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                // beforeSend: function (xhr) {
                //     xhr.setRequestHeader('X-CSRF-Token', token);
                //     xhr.setRequestHeader('Content-type', 'application/json');
                // }
            }).done((res) => {
                if (sTarget === "AMOS") {
                    resolve(res.E_IFFAILMSG)
                } else {
                    resolve(res.MESSAGE)
                }
            })
                .fail(function (xhr) {
                    resolve(xhr);
                    if (!bPromise) {
                        Modules._xhrErrorMessage(xhr)
                    }
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        })
        // .success(res => {
        // if (sTarget === "AMOS") {
        //   if (res.E_IFRESULT === "S") {
        //     MessageBox.information(res.E_IFFAILMSG);
        //   } else {
        //     MessageBox.error(res.E_IFFAILMSG);
        //   }
        // } else {
        //   if (res.RESULT_TYPE === "S") {
        //     MessageBox.information(res.MESSAGE);
        //   } else {
        //     MessageBox.error(res.MESSAGE);
        //   }
        // }
        // }).error(e => {
        // MessageBox.error(
        //   JSON.stringify(e)
        // );
        // console.log(e);
        // })
    };
    Modules.onGetDbIdNumbering = async function (oData, servicePath) {
        let iasID;

        let CpCode = sessionStorage.getItem("CompanyCode");
        let dealerCode = oData.dealerCode || "";
        let frontStandard = CpCode + dealerCode.substring(5);

        await Modules.get("/odata/v4/" + servicePath + "/GetAllUserList?$filter=1 eq 1 and startswith(id,'" + frontStandard + "')").then((result) => {
            let CpGroupUsers = result.value;
            let standardCodes, numbers, maxNumberPlus
            standardCodes = CpGroupUsers.filter((user) => user.id.startsWith(frontStandard) && user.id.length === frontStandard.length + 4);
            if (standardCodes.length > 0) {
                numbers = standardCodes.map(x => parseInt(x.id.substring(frontStandard.length)));
                maxNumberPlus = Math.max.apply(Math, numbers) + 1;
                iasID = frontStandard + (maxNumberPlus.length > 3 ? maxNumberPlus : maxNumberPlus.toString().padStart(4, "0"));
            } else {
                iasID = frontStandard + "0001";
            }
        });
        return iasID;
    }

    Modules.onGetIasIdNumbering = async function (oData) {
        if (!oData.userType || oData.userType !== "usertype_03" || (oData.userType && oData.userType === "usertype_03" && !oData.dealerCode)) {
            return;
        }
        let iasID;
        let CpCode = sessionStorage.getItem("CompanyCode");
        let dealerCode = oData.dealerCode || "";
        let frontStandard = CpCode + dealerCode.substring(5);

        $.ajax({
            type: 'get',
            async: false,
            url: '/ias/scim/Users?filter=userName sw "' + frontStandard + '"',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
                if (status.totalResults === 0) {
                    iasID = frontStandard + "0001";
                } else {
                    let CpGroupUsers = status.Resources;
                    let standardCodes, numbers, maxNumberPlus
                    standardCodes = CpGroupUsers.filter((user) => user.userName.startsWith(frontStandard) && user.userName.length === frontStandard.length + 4);
                    if (standardCodes.length > 0) {
                        numbers = standardCodes.map(x => parseInt(x.userName.substring(frontStandard.length)));
                        maxNumberPlus = Math.max.apply(Math, numbers) + 1;
                        iasID = frontStandard + (maxNumberPlus.length > 3 ? maxNumberPlus : maxNumberPlus.toString().padStart(4, "0"));
                    } else {
                        iasID = frontStandard + "0001";
                    }
                }
            })
            .fail(function (xhr) {
                Modules._xhrErrorMessage(xhr)
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
        return iasID;
    }

    Modules.onCheckIasId = async function (oData) {
        await Modules.onGetUserIasId(oData.id).then(async (result) => {
            if (result != null && result != "") {
                await $.ajax({
                    type: 'delete',
                    async: false,
                    url: '/ias/scim/Users/' + result,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('Content-type', 'application/scim+json');
                    }
                })
                    .done(function (status) {
                    })
                    .fail(function (xhr) {
                        Modules._xhrErrorMessage(xhr)
                        // Modules.getSalesThis().onBusyIndicatorHide();
                    })
            }
        });
    }


    Modules.onCheckDbId = async function (oData, servicePath) {
        let newIasID;
        await Modules.get("/odata/v4/" + servicePath + "/GetAllUserList?$filter=id eq '" + oData.id + "'").then(async (result) => {
            if (oData.userType === "usertype_03") {
                if (result.value.length > 0) {
                    newIasID = await Modules.onGetDbIdNumbering(oData, servicePath);
                } else {
                    newIasID = oData.id;
                }
            } else {
                if (result.value.length > 0) {
                    newIasID = null;
                } else {
                    newIasID = oData.id;
                }
            }
        })
        return newIasID;
    }

    Modules.onIasDelete = async function (userId) {
        let iasID;
        await Modules.onGetUserIasId(userId).then((result) => {
            iasID = result
        });

        await $.ajax({
            type: 'delete',
            async: false,
            url: '/ias/scim/Users/' + iasID,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
            })
            .fail(function (xhr) {
                Modules._xhrErrorMessage(xhr)
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
    },

        Modules.makingVersion = function (currentVersion) {
            let dToday = new Date;
            let sYear = dToday.getUTCFullYear();
            let sMonth = String(dToday.getUTCMonth() + 1).padStart(2, "0");
            let sDay = String(dToday.getUTCDate()).padStart(2, "0");
            let sFulltoday = sYear + sMonth + sDay;

            let sVersion;
            if (currentVersion != null && sFulltoday == currentVersion.split("-")[0]) {
                let ver = Number(currentVersion.split("-")[1]) + 1;
                sVersion = sFulltoday + '-' + String(ver).padStart(2, "0");
            } else {
                sVersion = sFulltoday + '-01';
            }
            return sVersion
        }
    Modules.onIasUserPost = async function (userInfo) {
        let targetUrl = window.location.origin;
        let userData = {
            "schemas": [
                "urn:ietf:params:scim:schemas:core:2.0:User",
                "urn:sap:cloud:scim:schemas:extension:custom:2.0:User",
                "urn:ietf:params:scim:schemas:extension:sap:2.0:User"
            ],
            "active": true,
            "userName": userInfo.id,
            "name": {
                "familyName": userInfo.lastName,
                "givenName": userInfo.firstName
            },
            "emails": [
                {
                    "type": "work",
                    "value": userInfo.email,
                    "primary": true
                }
            ],
            "userType": "public",
            "urn:ietf:params:scim:schemas:extension:sap:2.0:User": {
                "applicationId": "*",//fb44c6c6-7a8f-455e-9510-0f1efbcc18ac
                "sendMail": true,
                "targetUrl": targetUrl
            }
        }

        await $.ajax({
            type: 'post',
            async: false,
            url: '/ias/scim/Users',
            data: JSON.stringify(userData),
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .fail(function (xhr) {
                Modules._xhrErrorMessage(xhr)
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
    }

    Modules.onIasUserPatch = async function (oData) {
        let iasInfo;
        await Modules.onGetIasUserInfo(oData.id).then((result) => {
            iasInfo = result;
        });
        let patchTemp = {
            "schemas": [
                "urn:ietf:params:scim:api:messages:2.0:PatchOp"
            ],
            "Operations": []
        };
        if (oData.firstName) {
            let oTemp = {
                "op": "replace",
                "path": "name.givenName",
                "value": oData.firstName
            }
            patchTemp.Operations.push(oTemp);
        }
        if (oData.lastName) {
            let oTemp = {
                "op": "replace",
                "path": "name.familyName",
                "value": oData.lastName
            }
            patchTemp.Operations.push(oTemp);
        }
        if (patchTemp.Operations.length > 0) {
            await $.ajax({
                type: 'patch',
                async: false,
                data: JSON.stringify(patchTemp),
                url: '/ias/scim/Users/' + iasInfo.id,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Content-type', 'application/scim+json');
                }
            })
                .done(function (status) {
                })
                .fail(function (xhr) {
                    Modules._xhrErrorMessage(xhr)
                    // Modules.getSalesThis().onBusyIndicatorHide();
                })
        }
    }

    Modules.MessageToastCUDMsg = function (msgCode) {
        // let message;
        // switch (msgCode) {
        //     case "C": message = Modules.oI18n.getText("create_success");
        //         break;
        //     case "U": message = Modules.oI18n.getText("update_success");
        //         break;
        //     case "D": message = Modules.oI18n.getText("delete_success");
        //         break;
        //     default: message = Modules.oI18n.getText("please_setting_msgcode")
        //         break;
        // }
        // MessageToast.show(message, {
        //     closeOnBrowserNavigation: false
        // });
    };

    Modules.OAuthDataPreventMenu = function (_this, sNavRoute, sCrud) {
        if (!_this.getOwnerComponent().getModel("oAuthData").getProperty("/" + sCrud)) {
            // Modules.getSalesThis().onBusyIndicatorShow();
            _this.getOwnerComponent().getRouter().navTo(sNavRoute);
            // Modules.getSalesThis().onBusyIndicatorHide();
        }
    };


    Modules.onGetIasGroup = async function (group, bPromise) {
        let oGroupInfo = null;
        $.ajax({
            type: 'get',
            async: false,
            url: '/ias/scim/Groups?filter=displayName eq "' + group + '"',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Content-type', 'application/scim+json');
            }
        })
            .done(function (status) {
                if (status.totalResults > 0) {
                    oGroupInfo = status.Resources[0];
                }
            })
            .fail(function (xhr) {
                resolve(xhr);
                if (!bPromise) {
                    Modules._xhrErrorMessage(xhr)
                }
                // Modules.getSalesThis().onBusyIndicatorHide();
            })
        return oGroupInfo;
    },
        Modules.onPostIasUserInGroup = async function (id, group) {
            let oUserInfo = await Modules.onGetIasUserInfo(id);
            if (group) {
                let oGroupId = await this.onGetIasGroup(group);
                let patchTemp = {
                    "schemas": [
                        "urn:ietf:params:scim:api:messages:2.0:PatchOp"
                    ],
                    "Operations": [
                        {
                            "op": "add",
                            "path": "members",
                            "value": [
                                {
                                    "value": oUserInfo.id
                                }
                            ]
                        }
                    ]
                }
                await $.ajax({
                    type: 'patch',
                    async: false,
                    data: JSON.stringify(patchTemp),
                    url: '/ias/scim/Groups/' + oGroupId.id,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('Content-type', 'application/scim+json');
                    }
                })
                    .done(function (status) {
                    })
                    .fail(function (xhr) {
                        Modules._xhrErrorMessage(xhr)
                        // Modules.getSalesThis().onBusyIndicatorHide();
                    })
            }
        },
        Modules.onDeleteIasUserInGroup = async function (id, group) {
            let oUserInfo = await Modules.onGetIasUserInfo(id);
            if (group) {
                let oGroupId = await this.onGetIasGroup(group);
                let patchTemp = {
                    "schemas": [
                        "urn:ietf:params:scim:api:messages:2.0:PatchOp"
                    ],
                    "Operations": [
                        {
                            "op": "remove",
                            "path": "members[value eq \"" + oUserInfo.id + "\"]"
                        }
                    ]
                }
                await $.ajax({
                    type: 'patch',
                    async: false,
                    data: JSON.stringify(patchTemp),
                    url: '/ias/scim/Groups/' + oGroupId.id,
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader('Content-type', 'application/scim+json');
                    }
                })
                    .done(function (status) {
                    })
                    .fail(function (xhr) {
                        Modules._xhrErrorMessage(xhr)
                        // Modules.getSalesThis().onBusyIndicatorHide();
                    })
            }
        }

    Modules._getExcelTemplate = function (oTable, filename, oType) {
        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet('sheet1');
        let aColumns = oTable.getColumns();
        let startRow = 0;
        let oColumns = [[], []]; // 첫 번째 배열은 첫 번째 줄 (헤더), 두 번째 배열은 두 번째 줄 (서브 헤더)
        let margeCount = 0;
        let bMargeFlag = false;
        let aMargeArea = [];

        let bMulti = false;

        // 첫 번째 열에서 "multiLabels"가 존재하는지 확인해서 멀티헤더 여부를 판단
        for (let i = 0; i < aColumns.length; i++) {
            const Column = aColumns[i];

            if (Column.getAggregation("multiLabels") && Column.getAggregation("multiLabels").length > 1) {
                bMulti = true;
                break;
            }
        }

        let aTableData = oTable.getBinding("rows") ? oTable.getBinding("rows").getContexts() : [];

        if (bMulti) {
            // multiLabels와 label을 기준으로 컬럼 구성
            for (let i = 0; i < aColumns.length; i++) {
                const Column = aColumns[i];

                if (Column.getAggregation("label") !== null) {
                    // 첫 번째 줄에 헤더 추가
                    oColumns[0].push(Column.getAggregation("label").getText());
                    // 두 번째 줄은 빈 칸 (서브 컬럼이 없으므로)
                    oColumns[1].push('');
                } else if (Column.getAggregation("multiLabels") !== null) {
                    // 첫 번째 줄에 첫 번째 서브 헤더 추가
                    oColumns[0].push(Column.getAggregation("multiLabels")[0].getText());
                    // 두 번째 줄에 두 번째 서브 헤더 추가
                    oColumns[1].push(Column.getAggregation("multiLabels")[1].getText());
                }
            }

            // 첫 번째 줄과 두 번째 줄의 값을 엑셀에 입력
            for (let colIndex = 0; colIndex < oColumns[0].length; colIndex++) {
                // 첫 번째 줄 (헤더) 출력
                worksheet.getCell(1, colIndex + 1).value = oColumns[0][colIndex];
                // 두 번째 줄 (서브 헤더) 출력
                worksheet.getCell(2, colIndex + 1).value = oColumns[1][colIndex];

                // 서브 컬럼이 없는 경우, 위아래 셀을 병합
                if (oColumns[1][colIndex] === '') {
                    startRow += 1;
                    worksheet.mergeCells(1, colIndex + 1, 2, colIndex + 1);

                    worksheet.getCell(1, colIndex + 1).alignment = {
                        vertical: 'middle', // 세로 중앙 정렬
                        horizontal: 'center' // 가로 중앙 정렬
                    };

                    if (bMargeFlag) {
                        bMargeFlag = false;
                        let aTemp = {
                            startRow: startRow,
                            margeCount: margeCount,
                        };

                        aMargeArea.push(aTemp);
                        startRow += margeCount;
                        margeCount = 0;
                    };

                } else {
                    bMargeFlag = true;
                    margeCount += 1;
                }
            };

            aMargeArea.forEach((area) => {
                worksheet.mergeCells(1, area.startRow, 1, area.startRow + area.margeCount - 1);
                // 병합된 셀의 텍스트를 정중앙에 배치 (가로만 중앙 정렬)
                worksheet.getCell(1, area.startRow).alignment = {
                    vertical: 'middle', // 세로 중앙 정렬
                    horizontal: 'center' // 가로 중앙 정렬
                };

                for (let i = 0; i < area.margeCount; i++) {
                    worksheet.getCell(2, area.startRow + i).alignment = {
                        vertical: 'middle', // 세로 중앙 정렬
                        horizontal: 'center' // 가로 중앙 정렬
                    };
                }
            });

            const firstRow = worksheet.getRow(1);
            const secondRow = worksheet.getRow(2);
            for (let colIndex = 1; colIndex <= oColumns[0].length; colIndex++) {
                firstRow.getCell(colIndex).border = {
                    top: { style: 'thin' },  // 첫 번째 줄에 윗선 추가
                };
            }

            for (let colIndex = 1; colIndex <= oColumns[0].length; colIndex++) {
                secondRow.getCell(colIndex).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' }, // 왼쪽선 추가
                    bottom: { style: 'thin' }, // 아랫선 추가
                    right: { style: 'thin' }  // 오른쪽선 추가
                };
            }

            for (let colIndex = 0; colIndex < oColumns[0].length; colIndex++) {
                let maxLength = 0;
                // 각 셀의 최대 길이를 계산하여 열 너비 설정
                for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
                    const cellValue = oColumns[rowIndex][colIndex] || '';
                    const cellLength = cellValue.length;
                    if (cellLength > maxLength) {
                        maxLength = cellLength;
                    }
                }

                // 열 너비는 최대 길이에 약간의 여유를 둔 값으로 설정 (여기서는 2를 더함)
                worksheet.getColumn(colIndex + 1).width = maxLength + 10;

                if (aTableData.length > 0) {
                    let rowIndex = 3; // 데이터는 3번째 줄부터 시작
                    aTableData.forEach((dataContext) => {
                        const rowData = dataContext.getObject(); // 모델 데이터를 가져옴
                        for (let colIndex = 0; colIndex < aColumns.length; colIndex++) {
                            const Column = aColumns[colIndex];
                            let bindingPath = "";

                            const template = Column.getAggregation("template");

                            // HBox를 포함하는 경우
                            if (template && template.getAggregation && template.getAggregation("items")) {
                                const items = template.getAggregation("items");
                                if (items && items.length > 0) {
                                    items.forEach(item => {
                                        bindingPath = this._setBindingPath(item);
                                    });
                                }
                            } else {
                                bindingPath = this._setBindingPath(template);
                            }

                            // 모델에서 데이터 가져오기 (빈 값인 경우 공백 처리)
                            const cellValue = bindingPath ? (rowData[bindingPath] || '') : '';

                            worksheet.getCell(rowIndex, colIndex + 1).value = cellValue;
                        }
                        rowIndex += 1;
                    });
                }
            };
        } else {
            for (let colIndex = 0; colIndex < aColumns.length; colIndex++) {
                const Column = aColumns[colIndex];
                const header = Column.getAggregation("label") ? Column.getAggregation("label").getText() : '';

                // 첫 번째 줄에 헤더 추가
                worksheet.getCell(1, colIndex + 1).value = header;
                worksheet.getCell(1, colIndex + 1).alignment = {
                    vertical: 'middle', // 세로 중앙 정렬
                    horizontal: 'center' // 가로 중앙 정렬
                };

                // 테두리 추가
                worksheet.getCell(1, colIndex + 1).border = {
                    top: { style: 'thin' }, // 윗선 추가
                    left: { style: 'thin' }, // 왼쪽선 추가
                    bottom: { style: 'thin' }, // 아랫선 추가
                    right: { style: 'thin' }  // 오른쪽선 추가
                };

                // 열 너비 설정 (내용에 맞게 자동으로 조정)
                const cellValue = header || '';
                const maxLength = cellValue.length;
                worksheet.getColumn(colIndex + 1).width = maxLength + 10;
            };

            if (aTableData.length > 0) {
                let rowIndex = 2; // 데이터는 2번째 줄부터 시작
                aTableData.forEach((dataContext) => {
                    const rowData = dataContext.getObject(); // 모델 데이터를 가져옴
                    for (let colIndex = 0; colIndex < aColumns.length; colIndex++) {
                        const Column = aColumns[colIndex];
                        let bindingPath = "";

                        const template = Column.getAggregation("template");

                        // HBox를 포함하는 경우
                        if (template && template.getAggregation && template.getAggregation("items")) {
                            const items = template.getAggregation("items");
                            if (items && items.length > 0) {
                                items.forEach(item => {
                                    bindingPath = this._setBindingPath(item);
                                });
                            }
                        } else {
                            bindingPath = this._setBindingPath(template);
                        }

                        // 모델에서 데이터 가져오기 (빈 값인 경우 공백 처리)
                        let sValue = bindingPath ? (rowData[bindingPath] || '') : '';
                        let sType = oType[colIndex];

                        if (sType.includes("date")) {
                            let dateParts = sValue.split('-'); // yyyy-MM-dd를 분리
                            let formattedDate = dateParts.join('');

                            sValue = Number(formattedDate);
                        } else if (sType.includes("number")) {
                            sValue = Number(sValue);
                        } else {
                            if (!isNaN(sValue)) {
                                sValue = Number(sValue);  // 숫자로 처리
                            }
                        }

                        worksheet.getCell(rowIndex, colIndex + 1).value = sValue;
                    }
                    rowIndex += 1;
                });
            }
        };

        // 엑셀 파일을 Buffer로 변환하여 다운로드
        let mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        workbook.xlsx.writeBuffer().then((buffer) => {
            let data = new Blob([buffer], { type: mimeType });
            let url = window.URL.createObjectURL(data);
            let link = document.createElement('a');

            link.href = url;
            // 파일 확장자를 .xlsx로 설정
            link.download = filename + ".xlsx";
            link.target = '_blank';
            link.click();

            // 다운로드 후 URL 객체를 정리
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        });
    };

    Modules._setBindingPath = function (oItem) {
        let bindingPath;
        if (oItem.getBindingInfo && oItem.getBindingInfo("text")) {
            bindingPath = oItem.getBindingInfo("text").parts[0].path;
        } else if (oItem.getBindingInfo && oItem.getBindingInfo("selectedKey")) {
            bindingPath = oItem.getBindingInfo("selectedKey").parts[0].path; // Select의 경우
        } else if (oItem.getBindingInfo && oItem.getBindingInfo("value")) {
            bindingPath = oItem.getBindingInfo("value").parts[0].path; // Input의 경우
        }

        return bindingPath;
    },

        Modules.onUpdateTable = function (data, oTable, oType, bMulti, columnKeys, Seq) {
            return new Promise((resolve, reject) => {
                if (data === undefined || data === null) {
                    sap.m.MessageBox.error("엑셀 파일이 선택되지 않았습니다.");

                    return false;
                };

                let aData = [];
                let errorCount = 0;
                let nSeq = Number(Seq);
                let index = bMulti ? 2 : 1;

                for (let i = index; i < data.length; i++) { // 첫 번째 행(헤더) 제외
                    let rowData = data[i] || '';
                    let row = [];

                    for (let j = 0; j < oTable.getColumns().length; j++) {
                        row[j] = rowData[j] === undefined ? '' : rowData[j];
                    };

                    let oData = {};
                    let isValid = true; // 유효성 검사 플래그

                    row.forEach((value, index) => {
                        let types = oType[index];
                        let columnKey = columnKeys[index];
                        let valueIsValid = true;

                        types.forEach(type => {
                            if (type === "seq") {
                                nSeq += 1;
                                oData[columnKey] = String(nSeq);
                                return;
                            } else if (type === "skip") {
                                oData[columnKey] = "";
                                return;
                            } else if (type === "number") {
                                value = value.replace(/,/g, "");

                                if (isNaN(value)) {
                                    valueIsValid = false;
                                } else if (value === "") {
                                    oData[columnKey] = 0;
                                } else {
                                    oData[columnKey] = Number(value);
                                }
                            } else if (type === "text") {
                                if (typeof value !== "string" || !isNaN(value)) {
                                    valueIsValid = false;
                                } else {
                                    oData[columnKey] = value;
                                }
                            } else if (type === "required") {
                                if (value === "" || value === null) {
                                    valueIsValid = false;
                                } else {
                                    oData[columnKey] = value;
                                }
                            } else if (type === "none") {
                                oData[columnKey] = value;
                            } else if (type === "date") {
                                let numericPattern = /^\d{8}$/; // 8자리 숫자 패턴

                                if (numericPattern.test(value)) {
                                    let year = parseInt(value.substring(0, 4), 10);
                                    let month = parseInt(value.substring(4, 6), 10);
                                    let day = parseInt(value.substring(6, 8), 10);

                                    let dateObj = new Date(year, month - 1, day); // JS에서 month는 0부터 시작

                                    let isValidDate = (dateObj.getFullYear() === year &&
                                        (dateObj.getMonth() + 1) === month &&
                                        dateObj.getDate() === day);

                                    if (isValidDate) {
                                        let formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                                        oData[columnKey] = formattedDate;
                                    } else {
                                        valueIsValid = false;
                                    }
                                } else {
                                    valueIsValid = false;
                                }
                            }
                        });

                        if (!valueIsValid) {
                            isValid = false;
                        }
                    });

                    if (isValid) {
                        aData.push(oData);
                    } else {
                        errorCount++;
                    }
                };

                if (errorCount > 0) {
                    sap.m.MessageBox.error(`${errorCount}개의 행이 유효하지 않아 제외되었습니다.`);
                };

                let tableData = oTable.getBinding("rows").getModel().getData();
                oTable.getBinding("rows").getModel().setData(tableData.concat(aData));

                return true;
            });
        };

    Modules.onFileChange = function (oEvent, oTable, oFileUploader, bMulti) {
        return new Promise((resolve, reject) => {
            var oFile = oEvent.getParameter("files")[0]; // 선택한 파일

            // 파일이 없으면 reject
            if (!oFile) {
                reject("파일이 선택되지 않았습니다.");
                return;
            };


            var reader = new FileReader();

            reader.onload = function (e) {
                var data = e.target.result;
                var workbook = XLSX.read(data, { type: "binary" });
                var sheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[sheetName];
                let jsonData;

                if (!bMulti) {
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData === undefined || jsonData.length === 0) {
                        oFileUploader.clear();
                        sap.m.MessageBox.error("처리할 수 없는 데이터가 입력되어있습니다.");

                        return;
                    };

                    var aColumns = oTable.getColumns();
                    var aTableHeaders = aColumns.map(column => column.getAggregation("label")?.getText().trim());
                    var aExcelHeaders = jsonData[0].map(header => header.trim());

                    var isHeadersMatched = aTableHeaders.every(header => aExcelHeaders.includes(header));

                    if (!isHeadersMatched) {
                        oFileUploader.clear();
                        sap.m.MessageBox.error("해당 테이블의 엑셀양식을 받아서 사용하세요.");
                        reject("엑셀 헤더가 일치하지 않음");
                        return;
                    }
                } else {
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData === undefined || jsonData.length === 0) {
                        oFileUploader.clear();
                        sap.m.MessageBox.error("처리할 수 없는 데이터가 입력되어있습니다.");

                        return;
                    };

                    let aColumns = oTable.getColumns();
                    let aExcelHeaders = jsonData[0].map(header => header ? header.trim() : "");
                    let aExcelSecondHeaders = jsonData[1].map(header => header ? header.trim() : "");

                    let firstHeaders = [];
                    let secondHeaders = [];

                    aColumns.forEach(column => {
                        if (column.getAggregation("multiLabels") && column.getAggregation("multiLabels").length > 0) {
                            firstHeaders.push(column.getAggregation("multiLabels")[0].getText().trim());
                            secondHeaders.push(column.getAggregation("multiLabels")[1]?.getText().trim() || "");
                        } else {
                            firstHeaders.push(column.getAggregation("label").getText().trim());
                            secondHeaders.push("");
                        }
                    });

                    let isFirstHeadersMatched = firstHeaders.every((header, index) => {
                        if (aExcelHeaders[index] !== undefined) {
                            return header === (aExcelHeaders[index] || "");
                        }
                        return true;
                    });

                    let isSecondHeadersMatched = secondHeaders.every((header, index) => {
                        return header === (aExcelSecondHeaders[index] || "");
                    });

                    if (!isFirstHeadersMatched || !isSecondHeadersMatched) {
                        oFileUploader.clear();
                        sap.m.MessageBox.error("엑셀 파일의 헤더가 테이블 헤더와 일치하지 않습니다. 올바른 양식을 사용하세요.");
                        reject("엑셀 헤더가 일치하지 않음");
                        return;
                    }
                }

                if (jsonData.length === 1) {
                    oFileUploader.clear();
                    sap.m.MessageBox.error("데이터가 입력된 엑셀 파일을 사용해주세요.");

                    return;
                };

                resolve(jsonData);
            };

            reader.readAsBinaryString(oFile);
        });
    };

    // GetCode, use에 따라 필터
    Modules.onCodeFilter = function (aCodeData, sFilterUse) {
        return aCodeData.filter((oCode) => oCode.use === sFilterUse)
    };

    // input 입력불가 valuehelpOnly
    Modules.onNoInput = function (oEvent) {
        let oSource = oEvent.getSource();
        oSource.setValue(oEvent.getSource().getLastValue())
    };

    Modules.setRowNumber = function (aData, sColName) {
        for (let i = 0; i < aData.length; i++) {
            aData[i][sColName] = i + 1;
        }
        return aData;
    };

    Modules.getMonthRange = function (sMonth) {
        let sStartDate = new Date(sMonth + "-01T00:00:00Z")
        let sEndDate = new Date(sStartDate)

        sEndDate.setMonth(sEndDate.getMonth() + 1)
        sEndDate.setDate(1)
        // sEndDate.setDate(sEndDate.getDate() - 1)
        return {
            start: sStartDate.toISOString(),
            end: sEndDate.toISOString()
        }

    },
        Modules._SetSelect = function (_this, sName) {
            let oData = _this.getView().getModel(sName + "MetaData").getData();
            let sKey = oData.sKey + 'Code'
            let oSelectedData
            let oFragData = _this.getView().getModel(sName + "Model").getData();
            if (oData.sModelName) {
                oSelectedData = _this.getView().getModel(sName + "SelectedModel").getData();
            } else if (oData.sTableModelName) {
                oSelectedData = _this.getView().getModel(sName + "SelectedModel").getProperty(oData.sRow)
            }
            oFragData.forEach((item, idx) => {
                if (oSelectedData[sKey] === item[sKey]) {
                    _this.byId(sName + "ValueHelpTable").addSelectionInterval(idx, idx);
                }
            })
            _this.bFragment = true
        };

    Modules._SetMultiSelect = function (_this, sName) {
        let oData = _this.getView().getModel(sName + "MetaData").getData();
        let oSelectedData = _this.getView().getModel(oData.sMultiTable).getData();
        let oFragData = _this.getView().getModel(sName + "Model").getData();
        let sKey = "approvalNumber"
        if (Object.keys(oSelectedData).length) {

            oFragData.forEach((item, idx) => {
                oSelectedData.forEach(selectedItem => {
                    if (selectedItem[sKey] === item[sKey]) {
                        _this.byId(sName + "ValueHelpTable").addSelectionInterval(idx, idx);
                    }
                });
            });
        }
        _this.bFragment = true
    };

    Modules.onDialogRowSelect = function (_this, sName) {
        if (_this.bFragment) {
            let sPath = _this.byId(sName + "ValueHelpTable").getSelectedIndex();
            let oData = _this.getView().getModel(sName + "Model").getProperty("/" + sPath);
            let sMetaData = _this.getView().getModel(sName + "MetaData").getData()
            if (sMetaData.sModelName) {
                _this.getView().setModel(new JSONModel(oData), sName + "SelectedModel");
            } else {
                _this.getView().getModel(sName + "SelectedModel").setProperty(sMetaData.sRow, oData)
            }
        }
    },

        Modules.onlyInteger = function (oEvent) {
            let oSource = oEvent.getSource();

            let value = oSource.getValue();
            let oAlphanumericKoreanExp = /^[0-9]*$/;

            if (value.match(oAlphanumericKoreanExp) === null) {
                oSource.setValue(value.replace(/[^0-9]/g, ''));
            }
            let oInputDomRef = oSource.getDomRef("inner");
            oInputDomRef.addEventListener("keydown", function (event) {
                let key = event.key;
                if (
                    !/^\d$/.test(key) &&
                    key !== "Backspace" &&
                    key !== "Delete" &&
                    key !== "ArrowLeft" &&
                    key !== "ArrowRight" &&
                    key !== "Tab" &&
                    key !== "Enter"
                ) {
                    event.preventDefault();
                }
            });
            if (Number(isNaN(oSource.getValue()))) {
                oSource.setValue(null);
            }
        }

    Modules.onlyDouble = function (oEvent) {
        let oSource = oEvent.getSource();
        let value = oSource.getValue();

        let oNumericExp = /^[0-9]*\.?[0-9]*$/;

        if (value.match(oNumericExp) === null) {
            oSource.setValue(value.replace(/[^0-9.]/g, ''));
        }

        let oInputDomRef = oSource.getDomRef("inner");

        oInputDomRef.addEventListener("keydown", function (event) {
            let key = event.key;

            if (
                !/^\d$/.test(key) &&
                key !== "." &&
                key !== "Backspace" &&
                key !== "Delete" &&
                key !== "ArrowLeft" &&
                key !== "ArrowRight" &&
                key !== "Tab" &&
                key !== "Enter"
            ) {
                event.preventDefault();
            }

            if (key === "." && event.target.value.includes(".")) {
                event.preventDefault();
            }
        });

        if (isNaN(Number(oSource.getValue()))) {
            oSource.setValue(null);
        }
    };

    Modules.onDatePicker = function (oEvent) {
        if (!oEvent.getParameter('valid')) {
            oEvent.getSource().setValue(null);
        }
    };
    //테이블 스크롤 1열로 초기화
    Modules.onScrollTable = function (_this, sName) {
        var oTable = _this.getView().byId(sName);  // 테이블 컨트롤 참조
        var oScrollContainer = oTable.getDomRef().querySelector(".sapUiTableHSb");  // 가로 스크롤바 찾기

        if (oScrollContainer) {
            oScrollContainer.scrollLeft = 0;  // 가로 스크롤을 맨 앞쪽으로 이동
        }
        oTable.setFirstVisibleRow(0);
    }

    //페이지 스크롤 맨 상단으로
    Modules.onScrollPage = function (_this, sName) {
        var oObjectPageLayout = _this.getView().byId(sName);
        var oPageWrapper = oObjectPageLayout.getDomRef().querySelector(".sapUxAPObjectPageWrapper");  // 세로 스크롤바 찾기
        if (oPageWrapper == null) {
            var oPageWrapper = oObjectPageLayout.getDomRef().querySelector(".sapFDynamicPageContentWrapper");  // 세로 스크롤바 찾기
        }
        if (oPageWrapper) {
            // console.log(oPageWrapper.scrollTop);
            oPageWrapper.scrollTop = 0;
        }
    }

    //페이지 색션으로 이동
    Modules.onMoveSection = function (_this, sName, iNum) {
        var oObjectPageLayout = _this.getView().byId(sName);
        let sId = oObjectPageLayout.getSections()[iNum].sId;
        if (oObjectPageLayout) {
            oObjectPageLayout.scrollToSection(sId);
        } else {
            sap.m.MessageToast("컨트롤러 데이터 확인");
        }

    }

    Modules.setTableMerge = function (oTable, sModelId, maxColIndex) {

        oTable.attachEventOnce("rowsUpdated", () => {
            //컬럼 사이즈 변경시 병합초기화 되지않게 방지
            oTable.attachEvent("columnResize", () => {
                setTimeout(() => {
                    oTable.rerender();
                    this.merge(oTable, sModelId, maxColIndex);
                }, 0);
            });
            //스크롤 이동시 병합
            oTable.attachFirstVisibleRowChanged(() => {
                oTable.rerender();
                this.merge(oTable, sModelId, maxColIndex);
            });

            //처음 한번 병합
            oTable.rerender();
            this.merge(oTable, sModelId, maxColIndex);
        });


    }

    //가로 병합후 세로 병합 진행
    Modules.merge = function (oTable, sModelId, Index) {
        var aRows = oTable.getRows()

        //가로병합
        for (let rowIndex = 0; rowIndex < aRows.length; rowIndex++) {
            var iSkipcount = 0;
            let oRow = aRows[rowIndex];
            let oBindingContext = oRow.getBindingContext(sModelId);
            if (!oBindingContext) continue;
            for (let maxIndex = 0; maxIndex < Index; maxIndex++) {
                //iSkipcount 겹치는게 있는 경우 병합을 위해 cell 안의 값 제거
                if (iSkipcount > 0) {
                    const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    oCell.remove();
                    iSkipcount--;
                } else {
                    const oCurrentCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    if (!oCurrentCell || oCurrentCell.rowSpan > 1) continue;
                    const sCurrentText = oCurrentCell.innerText.trim();
                    var iColSpan = 1;

                    for (let j = maxIndex + 1; j < Index; j++) {
                        const oCompareCell = document.getElementById(`${oRow.getId()}-col${j}`);
                        if (!oCompareCell) break;
                        const sCompareText = oCompareCell.innerText.trim();
                        //비교되는 행의 값이 없는 경우도 병합
                        if (sCurrentText !== sCompareText && sCompareText !== "" && sCurrentText !== "") {
                            break;
                        }
                        iColSpan++
                    }
                    const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    oCell.setAttribute("colspan", String(iColSpan));
                    iSkipcount = iColSpan - 1;
                }
            }
        }
        //세로병합
        for (let maxIndex = 0; maxIndex < Index; maxIndex++) {
            var iSkipcount = 0;
            for (let i = 0; i < aRows.length; i++) {
                let oRow = aRows[i];
                let oBindingContext = oRow.getBindingContext(sModelId);
                if (!oBindingContext) continue;
                if (iSkipcount > 0) {
                    const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    oCell?.remove();
                    iSkipcount--;
                } else {
                    const oCurrentCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    if (!oCurrentCell) continue;
                    const sCurrentText = oCurrentCell.innerText.trim();
                    const iCurrentColSpan = oCurrentCell.colSpan;

                    var iRowSpan = 1;
                    for (let j = i + 1; j < aRows.length; j++) {
                        let oCompareRow = aRows[j];
                        let oCompareContext = oCompareRow.getBindingContext(sModelId);
                        if (!oCompareContext) break;

                        const oCompareCell = document.getElementById(`${oCompareRow.getId()}-col${maxIndex}`);
                        if (!oCompareCell) break;
                        const sCompareText = oCompareCell.innerText.trim();
                        const iCompareColSpan = oCompareCell.colSpan;

                        if (sCurrentText !== sCompareText || iCompareColSpan !== iCurrentColSpan) {
                            break;
                        }
                        iRowSpan++

                    }
                    const oCell = document.getElementById(`${oRow.getId()}-col${maxIndex}`);
                    oCell.setAttribute("rowspan", String(iRowSpan));
                    iSkipcount = iRowSpan - 1;
                }
            }
        }
    }


    //Header 추출 및 colspan 체크 가로병합만 체크
    Modules.extractTableHeader= function (oTable) {
        const aColumns = oTable.getColumns();
        const headerRow = [];

        aColumns.forEach((oCol, colIndex) => {

            //header 에서 span 추출
            const span = oCol.getHeaderSpan();
            //기본값인 경우에는 undefined 인 경우 1 
            const nColspan = typeof span === "number" ? span : 1;

            //멀티헤더 값을 가져옴 , 단일헤더는 안됨
            const oMultiLabels = oCol.getMultiLabels?.() || [];

            //단일헤더인지 확인 후 단일헤더인경우 getLabel로 추출
            const aLabels = oMultiLabels.length > 0 ? oMultiLabels : [oCol.getLabel?.()].filter(Boolean);

            aLabels.forEach((oLabel, rowIndex) => {
                const text = oLabel.getText?.() || "";
                //다음 행 없는 경우 행 추가
                if (!headerRow[rowIndex]) {
                    headerRow[rowIndex] = [];
                }

                const row = headerRow[rowIndex];
                const last = row[row.length - 1];

                //이전 내용과 같은경우 병합카운트 추가
                if (last && last.content === text) {
                    last.colSpan += nColspan;
                } else { //다를시 headerRow에 push
                    headerRow[rowIndex].push({
                        colSpan: nColspan,
                        content: text,
                        styles: {
                            lineColor: [0, 0, 0],
                            lineWidth: 0.2
                        }
                    });
                }
            });
        })
        return headerRow;
    }

    //테이블 pdf로 추출 다운로드
    Modules.pdfTableDownload= async function (oTable, pdfName, dom) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("portrait", "mm", "a4");


        //글씨체 등록
        pdf.addFileToVFS(
            window.NanumGothicLightFontData.name,
            window.NanumGothicLightFontData.data,
        );
        pdf.addFont(window.NanumGothicLightFontData.name, "NanumGothicLight", "normal");
        pdf.setFont("NanumGothicLight");

        //pdf내에서 object 위치 Y값 설정
        let currentY = 25;

        //header span값을 포함한 값 추출
        const head = this.extractTableHeader(oTable);

        //body 값 추출
        const oBinding = oTable.getBinding("rows");
        const aColumns = oTable.getColumns();
        const aContexts = oBinding.getContexts(0, oBinding.getLength());
        const aData = aContexts.map(ctx => {
            const rowData = ctx.getObject();
            return aColumns.map(col => {
                const oTemplate = col.getTemplate();
                const sPath = oTemplate?.getBindingPath("text") || oTemplate?.getBindingPath("value");
                return sPath ? rowData[sPath] ?? "" : "";
            })
        });


        //autoTable jspdf를 이용하여 table 생성
        pdf.autoTable({
            head: head,
            body: aData,
            startY: currentY,
            styles: {
                font: "NanumGothicLight",
                fontSize: 10
            }
        });

        //하단에 추가할 dom이 있는 경우 
        if (dom) {
            //위의 테이블의 길이에 +10
            const nextY = pdf.lastAutoTable.finalY + 10;
            const canvas = await html2canvas(dom);
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight= canvas.height * imgWidth/canvas.width;

            pdf.addImage(imgData, "PNG", 0, nextY,imgWidth,imgHeight);

        }
        //pdf 입력받은 이름으로 저장
        pdf.save(pdfName + ".pdf");

    }



    return Modules;
})