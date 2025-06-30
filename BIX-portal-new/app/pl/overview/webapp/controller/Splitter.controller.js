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
        _oEventBus: EventBus.getInstance(),

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
            // 현재 URL을 기반으로 hashModel 업데이트
            await this._setHashModel();

            // HashModel 설정 완료 후 visible true로 변경
            this.byId("splitter").setVisible(true);
        },

        /**
         * hashModel을 기반으로 URL Hash 업데이트
         */
        _setHash: function () {
            // 컴포넌트 경로가 다른 경우 Return
            let sCurrHash = HashChanger.getInstance().getHash();
            if (!sCurrHash.includes("overview")) return;
            
            let oHashData = this.getOwnerComponent().getModel("hashModel").getData();

            let sHash = sCurrHash.split("&")[0];
            let sNewHash = sHash + `&/#` + `/${oHashData.page}/${oHashData.pageView}/${oHashData.detail}/${oHashData.detailType}/${oHashData.orgId}`;

            // 해시모델에 detailSelect가 있는 경우에 추가
            if (oHashData.detailSelect) sNewHash += `/${oHashData.detailSelect}`;
            HashChanger.getInstance().setHash(sNewHash);
        },

        /**
         * 현재 URL을 기반으로 hashModel 업데이트
         */
        _setHashModel: async function (sChannelId, sEventId, oEventData) {
            // 컴포넌트 경로가 다른 경우 Return
            let sCurrHash = HashChanger.getInstance().getHash();
            if (!sCurrHash.includes("overview")) return;

            let oSearchModel = this.getOwnerComponent().getModel("searchModel");
            let oHashModel = this.getOwnerComponent().getModel("hashModel");

            let aHash = Modules.getHashArray();
            let sHashOrgId = aHash?.[4];

            // 조직 ID에 따른 조직 정보 검색 (해시가 없을 때는 전사로 고정)
            const oOrgBinding = this.getOwnerComponent().getModel("cm").bindContext("/latest_org", null, {
                $filter: (sHashOrgId ? `id eq ${sHashOrgId} or parent eq null` : "parent eq null")
            });

            //version 에서 tag가 C 를 가져와서 year month  가져오기
            const oVersionContext = this.getOwnerComponent().getModel("cm").bindContext("/Version", null, {
                $filter: "tag eq 'C'"
            });

            // 이미 해시가 있는 경우 해시 반영

            // pl_content_view에서 position이 master, detail 각각 하나씩 반환해서 해시 초기값 넣음
            let sMenuMasterPath = `/pl_content_view(page_path='${aHash?.[0] || ''}',position='master',grid_layout_info='',detail_path='${aHash?.[2] || ''}',detail_info='${aHash?.[3] || ''}')/Set`;
            const oMenuMasterContext = this.getOwnerComponent().getModel("cm").bindContext(sMenuMasterPath);

            let sMenuDetailPath = `/pl_content_view(page_path='${aHash?.[0] || ''}',position='detail',grid_layout_info='',detail_path='${aHash?.[2] || ''}',detail_info='${aHash?.[3] || ''}')/Set`;
            const oMenuDetailContext = this.getOwnerComponent().getModel("cm").bindContext(sMenuDetailPath, null, {
                $filter: 'length(sub_key) gt 0'
            });

            // 병렬로 데이터 호출
            const [oRequest, oVersionData, oMenuMasterData, oMenuDetailData] = await Promise.all([
                oOrgBinding.requestObject(),
                oVersionContext.requestObject(),
                oMenuMasterContext.requestObject(),
                oMenuDetailContext.requestObject(),
            ])

            // master, detail 초기 데이터
            const oPlMasterData = oMenuMasterData.value[0];
            const oPlDetailData = oMenuDetailData.value[0];

            // Date형식으로 전환
            const dDate = oSearchModel.getProperty("/yearMonth") || new Date(
                oVersionData.value[0].year, oVersionData.value[0].month - 1
            )

            // 해시의 조직 ID에 따른 검색 모델 정보 변경 (해시 ID를 가진 조직이 없으면 전사로 고정)
            let oOrgData = oRequest.value.find(oData => oData.id === sHashOrgId) || oRequest.value.find(oData => oData.parent === null);

            //다른 manifest에 속한 카드에 초기 데이터 넘겨주기용 세션스토리지
            sessionStorage.setItem("initSearchModel",
                JSON.stringify({
                    yearMonth: dDate,
                    orgId: oOrgData.id,
                    orgNm: oOrgData.name,
                    orgType: oOrgData.org_type
                })
            )

            // 검색 모델에 반영
            let sLastOrgId = oSearchModel.getProperty("/orgId");
            let oSearchData = {
                yearMonth: dDate,
                orgId: oOrgData.id,
                orgNm: oOrgData.name
            }
            oSearchModel.setData(oSearchData);

            // 조직 ID 해시가 변경되었을 때만 검색 EventBus 실행
            if (sLastOrgId !== oSearchData.id && sLastOrgId) {
                this._oEventBus.publish("pl", "search", oSearchData);
            }

            // URL에 해시가 있는 경우 hashModel에 적용하고, 그렇지 않으면 초기값 적용
            let sLastHashData = oHashModel.getData();
            let oHashData = {
                page: aHash?.[0] || oPlDetailData.page_path,
                pageView: oEventData?.pageView || aHash?.[1] || oPlMasterData.grid_layout_info,
                detail: aHash?.[2] || oPlDetailData.detail_path,
                detailType: aHash?.[3] || oPlDetailData.detail_info,
                orgId: oOrgData.id,
            };

            // Select 해시는 detailType이 detail인 경우에만 설정
            let isValidDetailSelect = oMenuDetailData.value.find(oData => {
                return oData.page_path === oHashData.page && oData.detail_path === oHashData.detail && oData.sub_key === aHash?.[5];
            });

            // detailType이 detail인 경우에만 detailSelect 설정
            if (oHashData["detailType"] === "detail") {
                // 해시의 detailSelect가 유효할 때는 해시 유지, 그렇지 않으면 초기 값 적용
                oHashData["detailSelect"] = (isValidDetailSelect) ? aHash?.[5] : (oPlDetailData?.sub_key || null);
            } else {
                oHashData["detailSelect"] = null;
            }
            oHashModel.setData(oHashData);

            // page가 변경되었을 때 PL, Detail 카드박스 설정 EventBus 실행
            if (sLastHashData["page"] !== oHashData.page && sLastHashData["page"]) {
                this._oEventBus.publish("pl", "page");
            } else if (sLastHashData["pageView"] !== oHashData["pageView"] && sLastHashData["pageView"]) {
                this._oEventBus.publish("pl", "page");
            } else if (sLastHashData["detail"] !== oHashData["detail"] && sLastHashData["detail"]) {
                this._oEventBus.publish("pl", "detail");
            } else if (sLastHashData["detailType"] !== oHashData["detailType"] && sLastHashData["detailType"]) {
                this._oEventBus.publish("pl", "detailType");
            } else if (sLastHashData["orgId"] !== oHashData["orgId"] && sLastHashData["orgId"]) {

            } else if (sLastHashData["detailSelect"] !== oHashData["detailSelect"] && sLastHashData["detailSelect"]) {

            }

            // 변경된 해시 모델을 기준으로 해시 변경
            this._setHash();
        },
    });
});


