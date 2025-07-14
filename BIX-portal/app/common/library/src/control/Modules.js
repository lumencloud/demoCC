sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    'sap/m/MessageToast',
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "sap/ui/core/EventBus",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/routing/HashChanger",
], function (Control, Fragment, MessageBox, MessageToast, JSONModel, Spreadsheet, EventBus, NumberFormat, HashChanger) {
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

    Modules.getSalesThis = function () {
        return Modules.oSalesThis;
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

    let oComponent
    Modules.init = function (component) {
        oComponent = component
    }
    //해쉬값을 통한 상단 , 사이드 탭 설정 고정
    Modules.setIconTab = function (oEvent) {
        const oData = oComponent.getData();
        const aHash = oEvent.getParameter("config")['path'].split(".").filter(Boolean).splice(1, 2);
        const sRoute = oEvent.getParameter("name");
        const oInfo = oData.filter(item => item.category === aHash[0] && item.code === aHash[1] )

        let result = []
        if (oInfo.length < 1) {
            oData.forEach(parent => {
                if (parent.Child && parent.Child.length > 0) {
                    parent.Child.forEach(child => {
                        if (child.category === aHash[0] && child.code === aHash[1]) {
                            result.push(child);
                        }
                    })
                }
            })
        } else {
            result.push(oInfo[0])
        }
        const [id, parentId] = [result[0].ID, result[0].Parent_ID]

        EventBus.getInstance().publish("main", "routeHash", [id, parentId]);
    };

    /**
     * @param {String} sType 매출, 마진, 마진율,....percent(진척률)
     * @param {Number} iValue1 
     * @param {Number} iValue2 gap일경우
     * @param {String} tooltipType tooltip, targetTooltip
     * @returns 
     */
    Modules.valueFormat = function (sType, iValue1, iValue2, tooltipType) {
        // 값이 없을 때 return
        // infoLabel로 텍스트 커스텀할 경우 emptyIndicatroMode "–"표시용으로 tooltipType 응용
        if (!iValue1 && tooltipType === "infoLabel") return "–";
        if (!iValue1) return;

        // iValue2가 있을 때 iValue2 - iValue1
        let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;
        if (tooltipType === "infoLabel") {
            iNewValue = Math.abs(iNewValue);
        }
        if (sType === "마진율" || sType === "영업이익률" || sType === "BR" || sType === "percent") {
            if (!iNewValue) {
                return '0%'
            }
            if (tooltipType === "tooltip" || tooltipType === "targetTooltip") {
                var oNumberFormat = NumberFormat.getPercentInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3
                });
                if ((0 < iNewValue && iNewValue < 0.0001) || (-0.0001 < iNewValue && iNewValue < 0)) {
                    iNewValue = iNewValue.toPrecision(2)
                    return oNumberFormat.format(iNewValue);
                }
                iNewValue = Math.floor(iNewValue * 1000000) / 1000000

                return oNumberFormat.format(iNewValue);
            } else {
                if (0 < iNewValue && iNewValue < 0.0001) {
                    iNewValue = 0.0001
                }
                if (-0.0001 < iNewValue && iNewValue < 0) {
                    iNewValue = -0.0001
                }
                var oNumberFormat = NumberFormat.getPercentInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });

                return oNumberFormat.format(iNewValue);
            }
        } else if (sType === "RoHC") {
            if (tooltipType === 'tooltip') {
                if ((0 < iNewValue && iNewValue < 0.01) || (-0.01 < iNewValue && iNewValue < 0)) {
                    return iNewValue.toPrecision(2)
                }
                iNewValue = Math.floor(iNewValue * 10000) / 10000
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iNewValue);
            } else {
                if (0 < iNewValue && iNewValue < 0.01) {
                    iNewValue = 0.01
                }
                if (-0.01 < iNewValue && iNewValue < 0) {
                    iNewValue = -0.01
                }
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iNewValue);
            }
        } else if (sType === "건수") {
            var oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });
            return oNumberFormat.format(iNewValue);
        } else if (tooltipType === "tooltip") {
            var oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });
            return oNumberFormat.format(iNewValue);
        } else if (tooltipType === "targetTooltip") {
            var oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });

            return oNumberFormat.format(iNewValue * 100000000);
        } else if (tooltipType === "target") {
            var oNumberFormat = NumberFormat.getIntegerInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
            });
            return oNumberFormat.format(iNewValue);
        } else {
            if (0 < iNewValue && iNewValue < 100000000) {
                iNewValue = 100000000
            }
            if (-100000000 < iNewValue && iNewValue < 0) {
                iNewValue = -100000000
            }
            var oNumberFormat = NumberFormat.getFloatInstance({
                groupingEnabled: true,
                groupingSeparator: ',',
                groupingSize: 3,
                decimals: 0
            });
            return oNumberFormat.format(iNewValue / 100000000);
        }
    };

    Modules.infoLabelFormat= function (iValue1, iValue2, sType) {
        if (!iValue1 && sType === "icon") return "";
        if (!iValue1) return 1;

        let iNewValue = (iValue2 && !isNaN(iValue2)) ? (iValue1 - iValue2) : iValue1;

        if (sType === "icon") {
            if (iNewValue < 0) {
                return "sap-icon://up";
            } else {
                return "";
            }
        } else {
            if (iNewValue === 0) {
                return 1
            } else if (iNewValue > 0){
                return 8
            } else {
                return 2
            }
        }
    }

    /**
     * 현재 URL을 기준으로 해시 배열을 반환
     * @returns {Array}
     */
    Modules.getHashArray = function () {
        let sCurrHash = HashChanger.getInstance().getHash();
        let aHash = sCurrHash.split("#")[1]?.split("/");
        if (aHash.length > 0) {
            aHash.shift();
        }

        return aHash;
    };
    // 테이블인 경우 해당 테이블의 객체 ex) this.byId(tableID)
    // 카드인 경우 해당 카드의 객체
    Modules.displayStatus = function (oApplyContent,sStatus,oThis) {
        // let sCallStatus = oResult["status"]; // rejected or fulfilled
        if (oApplyContent.isA("sap.ui.table.Table")) {
            if (sStatus.startsWith("2")) {
                if (sStatus === "204") {
                    oApplyContent.setNoData("데이터가 없습니다")
                } else {
                    oApplyContent.setNoData(` `)
                }
            } else {
                oApplyContent.setNoData(`${sStatus} ERROR\n 관리자에게 문의해 주세요`)
                oThis.setBusy(false);
                return false
            }
            return true
        } else if (oApplyContent.isA("sap.ui.integration.widgets.Card")) {
            if (sStatus.startsWith("2")) {
                if (sStatus === "204") {
                    if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                        oThis.addContent(new sap.m.Text({
                            text: "데이터가 없습니다",
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    } else {
                        oThis.addItem(new sap.m.Text({
                            text: "데이터가 없습니다",
                            textAlign: "Center",
                        }).addStyleClass("custom-card-status"))
                    }
                }
            } else {
                if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                    oThis.addContent(new sap.m.Text({
                        text: `${sStatus} ERROR\n 관리자에게 문의해 주세요`,
                        textAlign: "Center",
                    }).addStyleClass("custom-card-status"))
                } else {
                    oThis.addItem(new sap.m.Text({
                        text: `${sStatus} ERROR\n 관리자에게 문의해 주세요`,
                        textAlign: "Center",
                    }).addStyleClass("custom-card-status"))
                }
                oThis.setBusy(false);
                return false;
            }
            return true;
        }
    };

    // 200, 204 로만 구분
    // oData = 해당 데이터
    // 현재는 테이블에만 적용 
    Modules.displayStatusForEmpty = function (oApplyContent,oData,oThis) {
        // let sCallStatus = oResult["status"]; // rejected or fulfilled
        if (oApplyContent.isA("sap.ui.table.Table")) {
            if (oData.length <= 0) {
                oApplyContent.setNoData("데이터가 없습니다")
            } else {
                oApplyContent.setNoData(` `)
            }
        } else if (oApplyContent.isA("sap.ui.integration.widgets.Card")) {
            if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                let aContent = oThis.getContent();
                aContent.forEach((oContent) => {
                    if (oContent.hasStyleClass("custom-card-status")) {
                        oThis.removeContent(oContent);
                    }
                })
            } else {
                let aItems = oThis.getItems();
                aItems.forEach((oItem) => {
                    if (oItem.hasStyleClass("custom-card-status")) {
                        oThis.removeItem(oItem);
                    }
                })
            }
            if (oData.length <= 0) {
                if (oThis.isA("sap.m.Panel") || oThis.isA("sap.ui.layout.form.SimpleForm")) {
                    oThis.addContent(new sap.m.Text({
                        text: "데이터가 없습니다",
                        textAlign: "Center",
                    }).addStyleClass("custom-card-status"))
                } else {
                    oThis.addItem(new sap.m.Text({
                        text: "데이터가 없습니다",
                        textAlign: "Center",
                    }).addStyleClass("custom-card-status"))
                }
            }
        }
    };
    return Modules;
})