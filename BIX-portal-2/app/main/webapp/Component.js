sap.ui.define([
    "sap/ui/core/UIComponent",
    "bix/main/model/models",
    "sap/ui/core/ControlBehavior",
    "sap/ui/core/AnimationMode",
    "sap/base/i18n/Localization",
    "sap/ui/model/json/JSONModel"
], (UIComponent, models, ControlBehavior, AnimationMode, Localization, JSONModel) => {
    "use strict";

    const sPortalName = "bix";

    return UIComponent.extend("bix.main.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init: function () {
            this.oCompTargetInfo = {};
            Chart.defaults.font.family = '"Montserrat", "Noto Sans KR", sans-serif';
            Chart.defaults.color = "#333";

            // 메뉴관리 JSONModel
            this.oMenu = new JSONModel();
            this.setModel(this.oMenu, "main_menuModel");
            // icontab 메뉴 select Model
            this.setModel(new JSONModel({ selectedTab: "default" }), "tabState");

            // 유저정보 JSONModel
            this.oUser = new JSONModel();
            this.setModel(this.oUser, "main_userModel");
            this.setModel(new JSONModel(this.oCompTargetInfo), "main_subCompTargetInfo");
            const oBundle = this.getModel("i18n").getResourceBundle();

            sap.ui.loader.config({ paths: { [sPortalName]: "../" } });

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            this.getMenuInfo();
            this.getUserInfo();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            this.getRouter().attachTitleChanged(function (oEvent) {
                let sTitle = oEvent.getParameter("title");

                document.title = oBundle.getText("p_t_portal") + ' - ' + sTitle;
                if (window.location.host.includes("-qa-")) document.title = "[QA] " + document.title;

                // aHistory.reverse().forEach(function(oHistory) {});
            });

            // UI5 애니메이션 동작 - 최소화
            ControlBehavior.setAnimationMode(AnimationMode.minimal);

            // i18n 한국어 설정
            Localization.setLanguage("ko");



            /*
            // let oLoadExcel = document.createElement('script');
            // oLoadExcel.setAttribute('src','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.10.0/jszip.js');
            // let oLoadExcel2 = document.createElement('script');
            // oLoadExcel2.setAttribute('src','https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js');
            // let oLoadExcel3 = document.createElement('script');
            // oLoadExcel3.setAttribute('src','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.10.0/xlsx.js');
            // let oLoadPDF = document.createElement('script');
            // oLoadPDF.setAttribute('src','https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            // oLoadPDF.setAttribute('integrity','sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==');
            // oLoadPDF.setAttribute('crossorigin','anonymous');
            // oLoadPDF.setAttribute('referrerpolicy','no-referrer');
            // document.head.appendChild(oLoadExcel);
            // document.head.appendChild(oLoadExcel2);
            // document.head.appendChild(oLoadExcel3);
            // document.head.appendChild(oLoadPDF);
            */
        },

        getUserInfo() {
            const sUrl = "/user-api/currentUser"
            const oSetting = {
                type: "get",
                async: false,
                url: sUrl,
            };
            return new Promise((res) => {
                $.ajax(oSetting)
                    .done((result, test, req) => {
                        this.oUser.setData(result);
                    })
                    .fail(function (xhr) {
                        res(xhr);
                    })
            });
        },

        getMenuInfo() {
            // 메뉴 엔티티 hierachy 구조로 api 요청 url
            const sUrl = "/odata/v4/cm/Menus?$expand=Child($expand=i18nTitle;$orderby=sort_order;$filter=use_yn eq true),i18nTitle&orderby=sort_order&$filter=Parent_ID eq null and use_yn eq true&$orderby=sort_order"
            const oSetting = {
                type: "get",
                async: false,
                url: sUrl,
            };
            return new Promise((res) => {
                $.ajax(oSetting)
                    .done((result, test, req) => {
                        let oRes = result.value;
                        this.oMenu.setData(oRes);
                        this._setRoutingConfig(oRes);
                    })
                    .fail(function (xhr) {
                        res(xhr);
                    })
            });
        },

        _setRoutingConfig(oMenuData) {
            this.aMenuFlatten = [];

            if (Array.isArray(oMenuData)) {
                for (const oMenu of oMenuData) {
                    if (oMenu.ID !== 'home') {
                        this._setManifestInfo(oMenu);
                        for (const oChildMenu of oMenu.Child) {
                            this._setManifestInfo(oChildMenu);
                        }
                    };
                }
            }
        },

        _setManifestInfo(oMenu) {
            let oComponentUsages = this.getManifest()["sap.ui5"].componentUsages;

            let oRouter = this.getRouter();
            const sAppName = oMenu.category + "." + oMenu.code,
                sNestedCompName = sPortalName + "." + sAppName,
                sRouteName = "Route." + sAppName,
                sTargetName = "Target." + sAppName;

            // manifest.json > sap.app > componentUsages 세팅
            oComponentUsages[sNestedCompName] = { "name": sNestedCompName };

            if (oMenu.isApp === "sub") {
                // subMenu componentTargetInfo 세팅
                if (!this.oCompTargetInfo[oMenu.code]) {
                    this.oCompTargetInfo[oMenu.code] = {};
                }
                this.oCompTargetInfo[oMenu.code][oMenu.route] = {
                    [sTargetName]: {
                        route: oMenu.route
                        // ,parameters: {}
                    }
                }
            } else if (oMenu.isApp === "main" && oMenu.category && oMenu.code) {
                // manifest.json > sap.app > routing > [routes] & targets 세팅
                oRouter.addRoute({
                    name: sRouteName,
                    pattern: oMenu.category + "/" + oMenu.code,
                    target: [
                        {
                            "name": sTargetName,
                            "prefix": "#",
                            "propagateTitle": true
                        },
                        {
                            "name": "TargetAI",
                            "prefix": "ai",
                            "propagateTitle": false
                        }
                    ]
                });

                // manifest.json > sap.app > routing > routes & [targets] 세팅
                oRouter.getTargets().addTarget(sTargetName,
                    {
                        "type": "Component",
                        "usage": sNestedCompName,
                        // "title": `{i18n>${oMenu.i18nTitle_i18nKey}}`, // 다국어 코드 방식
                        "title": oMenu.name,
                        "id": sNestedCompName,
                        "controlAggregation": "beginColumnPages"
                    }
                );
            }
        }
    });
});