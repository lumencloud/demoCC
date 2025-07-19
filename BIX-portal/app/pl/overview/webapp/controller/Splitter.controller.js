sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/EventBus",
    "sap/ui/core/routing/HashChanger",
    "bix/common/library/control/Modules",
], (BaseController, EventBus, HashChanger, Modules) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     */
    return BaseController.extend("bix.pl.overview.controller.Splitter", {
        /**
         * EventBus 인스턴스
         */
        _oEventBus: EventBus.getInstance(),

        /**
         * 현재 Arguments
         */
        _oArguments: {},

        /**
         * 현재 루트
         */
        _sRouteName: undefined,

        /**
         * 라우팅 중인지에 대한 여부
         */
        _isRouting: false,

        onInit: function () {
            const oRouteMain = this.getOwnerComponent().getRouter().getRoute("RouteMain");
            oRouteMain.attachPatternMatched(this.onRouteMainPatternMatched, this);

            const oRouteActual = this.getOwnerComponent().getRouter().getRoute("RouteActual");
            oRouteActual.attachPatternMatched(this.onRouteSubPatternMatched, this);

            const oRoutePlan = this.getOwnerComponent().getRouter().getRoute("RoutePlan");
            oRoutePlan.attachPatternMatched(this.onRouteSubPatternMatched, this);

            // detail(메인 에뉴) 변경 시
            this._oEventBus.subscribe("pl", "setHash", this._setHash, this);
            this._oEventBus.subscribe("pl", "setHashModel", this._setHashModel, this);

            // ai전문가활성화시
            this._oEventBus.subscribe("splitter", "chatBotBtn", this._setPlSectionSizing, this);

            // 뒤로가기 및 앞으로가기 감지
            window.addEventListener("popstate", (oEvent, test1, test2) => {
                let state = oEvent.state;
                if (state) {
                    // 뒤로 및 앞으로 가기 시 hashModel의 URL 해시를 기준으로 새로 설정
                    let aHash = Modules.getHashArray();
                    let oHash = {
                        page: aHash[0],
                        pageView: aHash[1],
                        detail: aHash[2],
                        detailType: aHash[3],
                        detailSelect: aHash[4],
                        orgId: aHash[5],
                    }
                    this.getView().getModel("hashModel").setData(oHash);

                    // detailSelect만 바뀌었을 때 카드의 detailSelect 변경
                    this._oEventBus.publish("pl", "detailSelect", oHash);
                }
            })
        },

        /**
         * RouteMain PatterMatched 이벤트
         * @param {Event} oEvent 
         */
        onRouteMainPatternMatched: function (oEvent) {
            // 해시가 없을 때 RouteActual로 이동
            this.getOwnerComponent().getRouter().navTo("RouteActual");
        },

        /**
         * RouteActual, RoutePlan PatterMatched 이벤트
         * @param {Event} oEvent 
         */
        onRouteSubPatternMatched: async function (oEvent) {
            // 유효성 여부 확인 변수 초기화
            this._oArguments = oEvent.getParameters()["arguments"];

            // 해시 모델 page 설정
            this._sRouteName = oEvent.getParameters()["name"];
            let sPage = (this._sRouteName === "RouteActual") ? "actual" : "plan";
            this.getOwnerComponent().getModel("hashModel").setProperty("/page", sPage);

            // 현재 URL을 기반으로 hashModel 업데이트
            await this._setHashModel(oEvent);

            // HashModel 설정 완료 후 visible true로 변경
            this.byId("splitter").setVisible(true);
        },

        /**
         * hashModel을 기반으로 라우팅 (URL Hash 업데이트)
         */
        _setHash: function () {
            // 컴포넌트 경로가 다른 경우 Return
            let sCurrHash = HashChanger.getInstance().getHash();
            if (!sCurrHash.includes("overview")) return;

            let oHashData = this.getOwnerComponent().getModel("hashModel").getData();

            // 초기 URL과 최종 해시모델의 데이터가 다를 시 히스토리 덮어쓰기
            let bReplace =
                (
                    oHashData.pageView !== this._oArguments["pageView"]
                    || oHashData.detail !== this._oArguments["detail"]
                    || oHashData.detailType !== this._oArguments["detailType"]
                    || oHashData.detailSelect !== this._oArguments["detailSelect"]
                    || oHashData.orgId !== this._oArguments["orgId"]
                )
                || oHashData.page !== this._sRouteName; // actual <-> plan 변경된 경우

            // 라우팅
            let sRoute = (oHashData["page"] === "actual" ? "RouteActual" : "RoutePlan");
            this.getOwnerComponent().getRouter().navTo(sRoute, {
                pageView: oHashData["pageView"],
                detail: oHashData["detail"],
                detailType: oHashData["detailType"],
                detailSelect: oHashData["detailSelect"],
                orgId: oHashData["orgId"],
            }, bReplace);

            // 라우팅 후 디테일 카드 경로 다시 설정
            this._oEventBus.publish("pl", "setDetailMenu");
            this._oEventBus.publish("pl", "selectMasterTable", { page: oHashData["page"], detail: oHashData["detail"] });
            // this._oEventBus.publish("pl", "page");

            // 라우팅 완료 후 isRouting 값 초기화
            this._isRouting = false;
        },

        /**
         * 현재 URL을 기반으로 hashModel 업데이트
         */
        _setHashModel: async function (sChannelId, sEventId, oEventData) {
            // 다른 라우팅이 실행 중일 때는 Return
            if (this._isRouting) {
                return;
            } else {
                this._isRouting = true;
            }

            // 컴포넌트 경로가 다른 경우 Return
            let sCurrHash = HashChanger.getInstance().getHash();
            if (!sCurrHash.includes("overview")) return;

            let oSearchModel = this.getOwnerComponent().getModel("searchModel");
            let oHashModel = this.getOwnerComponent().getModel("hashModel");
            let oLastHashData = oHashModel.getData();
            let aHash = Modules.getHashArray();

            // 시스템 내부 라우팅 (해시 모델 기준)
            if (oEventData?.system === true) {
                var sInitPageView = oLastHashData["pageView"] || aHash[1] || "table";
                var sInitDetail = oLastHashData["detail"] || aHash[2] || "";
                var sInitDetailType = oLastHashData["detailType"] || aHash[3] || "";
                var sInitDetailSelect = oLastHashData["detailSelect"] || aHash[4] || "";
                var sInitOrgId = oLastHashData["orgId"] || aHash[5] || "";
            } else {    // 시스템 외부 라우팅 (URL 기준)
                var sInitPageView = aHash[1] || "table";
                var sInitDetail = aHash[2] || "";
                var sInitDetailType = aHash[3] || "";
                var sInitDetailSelect = aHash[4] || "";
                var sInitOrgId = aHash[5] || "";

                // Shell Icon 변경 요청
                this._oEventBus.publish("mainApp", "topIcon");
            }

            // 조직 ID 해시가 있을 때
            let oV2Model = this.getOwnerComponent().getModel("v2");
            let isAvailableOrg;
            if (sInitOrgId) {
                let oOrgFlatData = await new Promise((resolve, reject) => {
                    oV2Model.callFunction("/get_available_org_list", {
                        method: "GET",
                        urlParameters: {
                            isTree: false,
                        },
                        success: function (oData) {
                            let aResults = oData.results;
                            resolve(aResults);
                        },
                        error: function (oError) {
                            console.error(oError);
                            reject();
                        }
                    })
                })

                isAvailableOrg = oOrgFlatData.find(oData => oData.org_id === sInitOrgId);
            }

            // 해시의 조직 ID가 접근 불가능한 조직일 때
            if (!isAvailableOrg) {
                // 사용자가 접근 가능한 조직 데이터 호출
                let oOrgTreeData = await new Promise((resolve, reject) => {
                    oV2Model.callFunction("/get_available_org_list", {
                        method: "GET",
                        urlParameters: {
                            isTree: true,
                        },
                        success: function (oData) {
                            let aResults = oData.results;
                            resolve(aResults);
                        },
                        error: function (oError) {
                            console.error(oError);
                            reject();
                        }
                    })
                })

                isAvailableOrg = oOrgTreeData?.[0];
            }

            // 접근 가능한 조직이 없을 때 Return
            if (!isAvailableOrg) {
                return;
            }

            //version 에서 tag가 C 를 가져와서 year month  가져오기
            const oVersionContext = this.getOwnerComponent().getModel("cm").bindContext("/Version", null, {
                $filter: "tag eq 'C'"
            });

            // pl_content_view에서 position이 master, detail 각각 하나씩 반환해서 해시 초기값 넣음
            let sMenuMasterPath = `/pl_content_view(page_path='${oLastHashData["page"] || ''}',position='master',grid_layout_info='',detail_path='${oLastHashData["page"] || ''}',detail_info='')/Set`;
            const oMenuMasterContext = this.getOwnerComponent().getModel("cm").bindContext(sMenuMasterPath);

            let sMenuDetailPath = `/pl_content_view(page_path='${oLastHashData["page"] || ''}',position='detail',grid_layout_info='',detail_path='',detail_info='')/Set`;
            const oMenuDetailContext = this.getOwnerComponent().getModel("cm").bindContext(sMenuDetailPath, null, { $filter: `length(sub_key) gt 0` });

            // 병렬로 데이터 호출
            let [oVersionData, oMenuMasterData, oMenuDetailData] = await Promise.all([
                oVersionContext.requestObject(),
                oMenuMasterContext.requestObject(),
                oMenuDetailContext.requestObject(),
            ])

            // Delivery, Account 조직 필터링
            // 조직별 org 필터링 (매출/마진 및 DT매출일 때만)
            oMenuDetailData.value = oMenuDetailData.value.filter(oData => {
                // 매출/마진 및 DT 매출인 경우
                if (oData["detail_path"] === "saleMargin" || oData["detail_path"] === "dtSaleMargin") {
                    if (isAvailableOrg.org_level === "lv1" || isAvailableOrg.org_level === "lv2") {
                        return !["org"].includes(oData["sub_key"]);
                    } else if ((isAvailableOrg.org_level === "lv3" && isAvailableOrg.org_tp === "hybrid") || isAvailableOrg.org_tp === "account") {
                        return !["org", "org_delivery"].includes(oData["sub_key"]);
                    } else {
                        return !["org_delivery", "org_account"].includes(oData["sub_key"]);
                    }
                } else {
                    return true;
                }
            })

            // master, detail 초기 데이터
            const oFirstMasterData = oMenuMasterData.value[0];
            let oSameDetailTypeData = oMenuDetailData.value.find(oData => oData.detail_info === sInitDetailType);
            const oFirstDetailData = oSameDetailTypeData ? oSameDetailTypeData.detail_info : oMenuDetailData.value[0];

            // Date형식으로 전환
            const dDate = oSearchModel.getProperty("/yearMonth") || new Date(
                oVersionData.value[0].year, oVersionData.value[0].month - 1
            )

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel",
                JSON.stringify({
                    yearMonth: dDate,
                    orgId: isAvailableOrg?.org_id,
                    orgNm: isAvailableOrg?.org_name,
                    orgType: isAvailableOrg?.org_type,
                    org_tp: isAvailableOrg?.org_tp,
                    org_level: isAvailableOrg?.org_level,
                })
            )

            // 검색 모델에 반영
            let oSearchData = {
                yearMonth: dDate,
                orgId: isAvailableOrg?.org_id,
                orgNm: isAvailableOrg?.org_name
            }
            oSearchModel.setData(oSearchData);

            // URL에 해시가 있는 경우 hashModel에 적용하고, 그렇지 않으면 초기값 적용
            let oHashData = {
                page: oLastHashData["page"] || oFirstDetailData.page_path,
                pageView: oMenuMasterData.value.find(oData => oData.grid_layout_info === sInitPageView) ? sInitPageView : oFirstMasterData.grid_layout_info,
                orgId: isAvailableOrg?.org_id,
            };

            // 허용되지 않은 detail인 경우
            let oValidDetailData = oMenuDetailData.value.find(oData => oData.detail_path === sInitDetail);
            let oValidDetailTypeData = oMenuDetailData.value.find(oData => oData.detail_path === sInitDetail && oData.detail_info === sInitDetailType);

            if (oValidDetailData) { // detail이 유효한 경우
                if (!oValidDetailTypeData) {  // detail은 유효한데, detailType이 유효하지 않은 경우
                    oHashData["detail"] = oValidDetailData.detail_path;
                    oHashData["detailType"] = oValidDetailData.detail_info;
                } else {    // detail, detailType 둘 다 유효한 경우
                    oHashData["detail"] = oValidDetailTypeData.detail_path;
                    oHashData["detailType"] = oValidDetailTypeData.detail_info;
                }
            } else {    // detail이 유효하지 않은 경우
                let oValidTypeData = oMenuDetailData.value.find(oData => oData.detail_info === sInitDetailType);
                if (oValidTypeData) { // detailType이 유효한 경우
                    oHashData["detail"] = oValidTypeData.detail_path;
                    oHashData["detailType"] = oValidTypeData.detail_info;
                } else {    // detail, detailType 둘 다 유효하지 않은 경우
                    oHashData["detail"] = oFirstDetailData.detail_path;
                    oHashData["detailType"] = oFirstDetailData.detail_info;
                }
            }

            // Select 해시는 detailType이 detail인 경우에만 설정
            let isValidDetailSelect = oMenuDetailData.value.find(oData => {
                return oData.page_path === oHashData.page && oData.detail_path === oHashData["detail"] && oData.detail_info === oHashData["detailType"] && oData.sub_key === sInitDetailSelect;
            });

            // 해시에 입력된 detailSelect가 유효할 때
            if (isValidDetailSelect) {
                oHashData["detailSelect"] = sInitDetailSelect;
            } else {
                // 선택된 detail 중 첫 번째 detailSelect
                const oFirstDetailSelectData = oMenuDetailData.value.find(oData => {
                    return oData.page_path === oHashData.page && oData.detail_path === oHashData["detail"] && oData.detail_info === oHashData["detailType"];
                });

                oHashData["detailSelect"] = oFirstDetailSelectData?.sub_key;
            }

            // 해시 모델에 해시 업데이트
            oHashModel.setData(oHashData);

            // 각 해시가 변경되었을 때 EventBus 실행
            // if (oLastHashData["page"] !== oHashData.page && oLastHashData["page"]) {
            //     this._oEventBus.publish("pl", "page");
            // } else if (oLastHashData["pageView"] !== oHashData["pageView"] && oLastHashData["pageView"]) {
            //     this._oEventBus.publish("pl", "page");
            // } else if (oLastHashData["detail"] !== oHashData["detail"] && oLastHashData["detail"]) {
            //     this._oEventBus.publish("pl", "detail");
            // } else if (oLastHashData["detailType"] !== oHashData["detailType"] && oLastHashData["detailType"]) {
            //     this._oEventBus.publish("pl", "detailType");
            // } else if (oLastHashData["orgId"] !== oHashData["orgId"] && oLastHashData["orgId"]) {
            //     this._oEventBus.publish("pl", "search");
            // } else if (oLastHashData["detailSelect"] !== oHashData["detailSelect"] && oLastHashData["detailSelect"]) {

            // }

            // orgId가 변경되었을 때는 검색 실행
            if (oLastHashData["orgId"] !== oHashData["orgId"] && oLastHashData["orgId"]) {
                this._oEventBus.publish("pl", "search");
            }

            // 변경된 해시 모델을 기준으로 라우팅(해시 변경)
            this._setHash();
        },

        _setPlSectionSizing: function () {
            let oSplitPane = this.byId("splitPane1")
            let bSize = oSplitPane.getLayoutData().getSize();

            let bApplySize = bSize === "520px" ? "0px" : "520px";
            oSplitPane.setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: bApplySize, resizable: false }));
        },
    });
});


