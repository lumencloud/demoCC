sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/control/Modules",
    "bix/common/library/util/Formatter"
  ],
  function (Controller, JSONModel, Modules, formatter) {
    "use strict";
    let _this
    let IndividualCount;
    let targetList;
    let oSaveData
    let IndividualIndex, iTotalLength
    let selectList, sCategory, sId

    return Controller.extend("bix.admin.widget.controller.WidgetCreate", {
      formatter: formatter,

      onInit: function () {
        const boardNewRoute = this.getOwnerComponent().getRouter().getRoute("WidgetCreate");
        boardNewRoute.attachPatternMatched(this.onMyBoardPatternMatched, this);
        const boardNewRoute2 = this.getOwnerComponent().getRouter().getRoute("WidgetUpdate");
        boardNewRoute2.attachPatternMatched(this.onMyBoardPatternMatchedUpdate, this);
      },

      onMyBoardPatternMatched: async function (oEvent) {
        if (oEvent) {
          sCategory = oEvent.getParameter("arguments").category;
        }
        await this.onClear();
        await this.globalVarSet(sCategory);
      },

      onMyBoardPatternMatchedUpdate: async function (oEvent) {
        if (oEvent) {
          sId = oEvent.getParameter("arguments").objectId;
        }
        await this.onClear();
        await this.globalVarSet();
        this.getView().getModel("ui").setProperty("/edit", true)
        let oModel = this.getOwnerComponent().getModel("widget");   // getModel() 의 파라미터는 모델명
        let sPath = `/card('${sId}')`;  // 함수 명과 함수에 들어가는 파라미터

        const oBinding = oModel.bindContext(sPath);
        let oRequest = await oBinding.requestObject();
        this.getView().setModel(new JSONModel(oRequest), "widgetModel");
      },

      globalVarSet: async function (sCategory) {
        _this = this;
        let oUi = {
          edit: false,
          component: false,
          slide: false,
          actionType: false,
          actionUrl: false
        }
        this.getView().setModel(new JSONModel(oUi), 'ui');
        this.getView().setModel(new JSONModel({ category: sCategory, contentType: 0, bannerType: 0 }), "widgetModel");
      },

      onClear: function () {
        Modules.globalClear("Clear", this);
        Modules.globalClear("Input", this);
        Modules.globalClear("Required", this);
      },

      onFieldChange: function (oEvent) {
        let object = oEvent.getSource();
        Modules.fieldCheck(object);
      },

      onChangeCategory: async function (oEvent) {
        _this.byId('individualAction').destroyContent();
        let object = oEvent.getSource();
        Modules.fieldCheck(object);
      },

      onCancel: function () {
          Modules.messageBoxConfirm('warning', "작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", "취소 확인").then(async (bCheck) => {
            if (bCheck) {
              this.getOwnerComponent().getRouter().navTo('RouteMain');
            }
          })
      },

      onRegister: async function () {
        let oCreateModel = this.getView().getModel("widgetModel").getData();
        let bEdit = this.getView().getModel('ui').getData().edit
        let bCheck = Modules.globalCheck("Input", this);
        if (!bCheck) {
          Modules.messageBox('warning', "필수값을 입력해주세요.")
          return;
        }
        if (!bEdit) {
          Modules.messageBoxConfirm('information', "저장하시겠습니까?", "위젯 저장").then(async (bCheck) => {
            if (bCheck) {
              if (oCreateModel.category === 'content') {
                sCategory = "Contents"
                oSaveData = {
                  name: oCreateModel.name,
                  category: oCreateModel.category,
                  description: oCreateModel.description,
                  contentType: oCreateModel.contentType,
                  cardFolder: oCreateModel.contentType === 0 ? oCreateModel.cardFolder : 'richText',
                }
                let oWidgetModel = this.getOwnerComponent().getModel("widget")
                let oBinding = oWidgetModel.bindList("/card", undefined, undefined, undefined, {
                  $$updateGroupId: "AddWidget"
                });
                oBinding.create(oSaveData);
                oWidgetModel.submitBatch("AddWidget").then(() => {
                  this.getOwnerComponent().getModel("widget").refresh();
                  _this.getOwnerComponent().getRouter().navTo("RouteMain");
                });
              }
              else {
                Modules.messageBox('error', '저장에 실패했습니다.');
              }
            }
          })
        } else {
          Modules.messageBoxConfirm('information', "저장하시겠습니까?", "위젯 저장").then(async (bCheck) => {
            if (bCheck) {
              if (oCreateModel.category === 'content') {
                sCategory = "Contents"
                oSaveData = {
                  name: oCreateModel.name,
                  category: oCreateModel.category,
                  description: oCreateModel.description,
                  contentType: oCreateModel.contentType,
                  cardFolder: oCreateModel.contentType === 0 ? oCreateModel.cardFolder : 'richText',
                }
                let oWidgetModel = this.getOwnerComponent().getModel("widget")
                let oBinding = oWidgetModel.bindContext(`/card('${sId}')`, undefined, undefined, undefined, {
                  $$updateGroupId: "UpdateWidget"
                });
                for (const sKey of Object.keys(oSaveData)) {
                  oBinding.getBoundContext().setProperty(sKey, oSaveData[sKey]);
                }
                oWidgetModel.submitBatch("UpdateWidget").then(() => {
                  this.getOwnerComponent().getModel("widget").refresh();
                  this.getOwnerComponent().getRouter().navTo("WidgetDetail", { objectId: sId });
                });
              }
              else {
                Modules.messageBox('error', '저장에 실패했습니다.');
              }
            }
          })
        }
      },
    });
  }
);