sap.ui.define([
  "bix/main/controller/BaseController",
  "sap/m/MessageToast",
  "sap/ui/model/resource/ResourceModel",
  "sap/ui/model/json/JSONModel",
  "sap/m/Popover",
  "sap/m/Button",
  "sap/m/library",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "bix/main/util/Highlighter"

], (BaseController, MessageToast, ResourceModel, JSONModel, Popover, Button, library, Filter, FilterOperator, Highlighter) => {
  "use strict";

  return BaseController.extend("bix.main.controller.App", {
    onInit() {
      this.onSetting();

    },

    onAfterRendering() {
      const oMenuTree = this.byId("menuTree");
      if (!this.highlighter) {
        this.highlighter = new Highlighter(oMenuTree.getDomRef(), {
          shouldBeObserved: true
        });
      }
    },

    // onUpdateTree(oEvent) {
    //   const oMenuTree = oEvent.getSource()
    //   let _setExpand = (i, oItem) => {
    //     if ( oItem.getExpanded() ){
    //       oMenuTree.collapse(i)
    //     } else {
    //       oMenuTree.expand(i);
    //     } 
    //   }
    //   for(let i=0 ; i<oMenuTree.getItems().length; i++){
    //     let oItem = oMenuTree.getItems()[i];
    //     let oDom = oItem.getDomRef();
    //     if (oDom) {
    //       let oTarget = oDom.querySelector("span[id$='expander']");
    //       oTarget.removeEventListener("mouseenter", _setExpand(i, oItem))
    //       oTarget.addEventListener("mouseenter", _setExpand(i, oItem));
    //     }
    //   }

    // },

    onPressHome() {
      MessageToast.show(this.oBundle.getText("p_m_goToHome"));
      this.oRouter.navTo("RouteHome", {}, { "bix.admin.menu": { route: "Detail" } })
    },

    /**
     * 사이드 메뉴 닫기 버튼 (SdieMenu.view.xml)
     */
    onCloseSideMenu(oEvent) {
      let oSplitApp = oEvent.getSource().getParent().getParent().getParent().getParent().getParent().getParent();
      if(oSplitApp.getMetadata().getName() === 'sap.m.SplitApp') oSplitApp.hideMaster();
    },

    /**
     * 메뉴 확장
     */
    onPressMenu(oEvent) {
      const oItem = oEvent.getSource();
      const oMenuTree = oItem.getParent();
      const bExpand = oItem.getExpanded();
      const iIndex = oItem.getParent().getItems().indexOf(oItem);

      if(bExpand) {
        oMenuTree.collapse(iIndex);
      } else {
        const iBeforeCount = oMenuTree.getItems().length;
        oMenuTree.expand(iIndex);

        for(let i=0; i<oMenuTree.getItems().length-iBeforeCount; i++){
          let iNextIndex = iIndex+i+1;
          oMenuTree.expand(iNextIndex);
        }
      }
    },

    /**
     * 비즈니스 어플리케이션 이동
     */
    onNavToApp(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const sPath = oItem.getBindingContextPath();
      const oData = this.getOwnerComponent().getModel("main_menuModel").getProperty(sPath);
      const sCode = oData.code,
        sRouteName = "Route" + oData.category +"."+ oData.code;
      let oComponentTargetInfo = {};
      if( oData.route ) {
        oComponentTargetInfo = this.getOwnerComponent().getModel("main_subCompTargetInfo").getProperty("/")[sCode][oData.route]
      }
      if( sCode ) {
        MessageToast.show(sRouteName + "앱 클릭");
        oItem.setNavigated(true);
        this.getOwnerComponent().getRouter().navTo(sRouteName, {}, oComponentTargetInfo);
      }
    },

    /**
     * 비즈니스 어플리케이션 새 창 이동
     */
    onOpenBrowserApp(oEvent) {
      const oItem = oEvent.getSource().getParent().getParent();
      const sPath = oItem.getBindingContextPath();
      const oData = this.getOwnerComponent().getModel("main_menuModel").getProperty(sPath);
      const sCode = oData.code;
      const sCategory = oData.category;
      if( sCategory && sCode ) {
        const sMainPath = "/main/index.html#/";
        if( oData.pattern ) {
          const sUrl = window.location.origin + sMainPath + sCategory + "/" + sCode + "&/#/" + oData.pattern;
          window.open(sUrl);
        } else {
          const sUrl = window.location.origin + sMainPath + sCategory + "/" + sCode;
          window.open(sUrl);
        }
        
      }
    },

    /**
     * 메뉴 검색
     */
    onSearchMenu(oEvent) {
      const sQuery = oEvent.getParameter("query");
      let oMenuTree = this.byId("menuTree"),
          oBinding = oMenuTree.getBinding("items");

      let aFilters = [
        new Filter({
          path: "useFlag",
          operator: FilterOperator.EQ,
          value1: true
        })
      ];
      if(sQuery.length > 0){
        let oFilter = new Filter({
          path: "i18nTitle/i18nText",
          operator: FilterOperator.Contains,
          value1: sQuery
        });
        aFilters.push(oFilter);
      }
      oBinding.filter(aFilters);
      oMenuTree.expandToLevel(4);

      this._sFilterValue = sQuery.trim();
      if (this.highlighter) {
        this.highlighter.highlight(this._sFilterValue);
      }

      // let sEscapedText = sQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // let regex = new RegExp("(" + sEscapedText + ")", "gi");

      // for( let oItem of oMenuTree.getItems() ){
      //   let sOrigin = oItem.getContent()[0].getItems()[0].getItems()[0].getProperty("text");
      //   let sHighlight = sOrigin.replace(regex, "<span class='defaultHighlightedText'>$1</span>")
      //   oItem.$().html(sHighlight)
      // }
    },

    /**
     * formatter 함수, [모듈화] 예정
     * @param {*} sTitle 
     * @returns 
     */
    formatI18nMenuTitle(sTitle) {
      let sI18nTitle = this.oBundle.getText(sTitle);
      return sI18nTitle;
    },
  });
});