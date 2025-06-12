sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/EventBus",
], (Controller, MessageBox, EventBus) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.m.Input} Input
     */
    return Controller.extend("bix.master.orgtarget.controller.Target", {
        /**
         * @type {Array} 
         */
        _aAddTargetData: [],
        _aPropertyList : [],
        _oEventBus: EventBus.getInstance(),
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteTarget");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
            // 현재 페이지에서 사용할 연도 설정
        },
        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: function () {
        },

        // 위의 카테고리 토글버튼에 따른 검색
        onTogglePress: function (oEvent) {
            // 데이터 수정 유무 확인
            let bCheck = this.getOwnerComponent().getModel("uiModel").getProperty("/refresh")
            if(bCheck){
                // 수정되어있는 데이터가 있을때 화면 이동 여부 확인
                MessageBox["warning"]("작성된 내용은 저장되지 않습니다. 이동하시겠습니까?", {
                    title: "이동 확인",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === "OK") {
                            // 현재 pressed = true 되어있는 table 정보
                            let sType = this.getOwnerComponent().getModel("uiModel").getProperty("/table")
                            // 데이터 수정되어 있는 테이블 refresh
                            this._oEventBus.publish("target", "targetrefresh",{type:sType});
                            this._PressToggle(oEvent)
                        }else{
                            this._PressToggle(oEvent,true)                            
                        }
                    }.bind(this)
                })
            }else{
                this._PressToggle(oEvent)
            }
        },

        /** 
         * toggle button pressed설정
        */
        _PressToggle:function(oEvent,bCancel){
            const aToolbar = this.byId('toggleContainer').getContent();
            const sPressedKey = oEvent.getSource().getText();

            // 선택된버튼을 제외하고는 pressed false로 변경
            aToolbar.forEach(function (oControl) {
                const sKey = oControl.getText();
                if(bCancel){
                    // 이동 취소 시 클릭한 Button pressed = false 설정
                    oControl.setPressed(sKey !== sPressedKey && oControl.getPressed())
                }else{
                    // 클릭한 Button pressed = true 설정
                    oControl.setPressed(sKey === sPressedKey)
                }
            })
            if(!bCancel){
                // 이동하는 화면에 따른 property 설정
                this.getOwnerComponent().getModel("uiModel").setProperty("/table", sPressedKey);
                this.getOwnerComponent().getModel("uiModel").setProperty("/refresh",false)
                this.getOwnerComponent().getModel("uiModel").setProperty("/edit",false)
            }
        },

        /**
         * 초기화 버튼 클릭 이벤트
         */
        onRefresh: async function () {
            // MessageBox를 통해서 초기화 여부 확인
            MessageBox["warning"]("작성된 내용은 저장되지 않습니다. 초기화하시겠습니까?", {
                title: "초기화 확인",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction === "OK") {
                        // 현재 pressed = true 되어있는 table 정보
                        let sType = this.getOwnerComponent().getModel("uiModel").getProperty("/table")
                        // refresh 후 Button enabled 설정
                        this.getOwnerComponent().getModel("uiModel").setProperty("/refresh",false)
                        // eventBus를 통해 현재 보여지는 화면의 controller의 
                        // "target", "targetrefresh"으로 subscribe되어있는 function 실행
                        this._oEventBus.publish("target", "targetrefresh",{type:sType});
                    }
                }.bind(this)
            })
        },

        /**
         * 취소 버튼 클릭 이벤트
         */
        onCancel: async function () {
            // 수정되어 있는 데이터가 있는지 확인
            // 1. 수정된 데이터가 있는 경우 취소 여부를 확인
            // 2. 수정된 데이터가 없는 경우 edit = false 설정하여 조회 모드로 변경
            let bRefresh = this.getOwnerComponent().getModel("uiModel").getProperty("/refresh")
            if(bRefresh){
                //MessageBox를 통해서 수정 취소 여부 확인
                MessageBox["warning"]("작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", {
                    title: "취소 확인",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === "OK") {
                            // 현재 pressed = true 되어있는 table 정보
                            let sType = this.getOwnerComponent().getModel("uiModel").getProperty("/table")
                            // eventBus를 통해 현재 보여지는 화면의 controller의 
                            // "target", "targetrefresh"으로 subscribe되어있는 function 실행
                            this._oEventBus.publish("target", "targetrefresh",{type:sType});
                            // 조회 모드로 변경
                            this.getOwnerComponent().getModel("uiModel").setProperty("/edit",false)
                        }
                    }.bind(this)
                })
            }else{
                // edit = false 설정하여 조회 모드로 변경
                this.getOwnerComponent().getModel("uiModel").setProperty("/edit",false)
            }
        },

        /**
         * 수정 버튼 클릭 이벤트
         */
        onEdit: async function () {
            // edit = true 설정하여 수정 모드로 변경
            this.getOwnerComponent().getModel("uiModel").setProperty("/edit",true)
        },

        /**
         * 저장 버튼 클릭 이벤트
         */
        onSave: async function () {
            //MessageBox를 통해서 저장 여부 확인
            MessageBox["information"]("저장하시겠습니까?", {
                title: "저장",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction === "OK") {
                        // 현재 pressed = true 되어있는 table 정보
                        let sType = this.getOwnerComponent().getModel("uiModel").getProperty("/table")
                        // eventBus를 통해 현재 보여지는 화면의 controller의 
                        // "target", "targetsave"으로 subscribe되어있는 function 실행
                        this._oEventBus.publish("target", "targetsave",{type:sType});
                    }
                }.bind(this)
            })
        },
    });
});