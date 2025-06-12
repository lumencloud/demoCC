sap.ui.define([
  "bix/main/controller/BaseController",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/resource/ResourceModel",
  "sap/ui/model/json/JSONModel",
  'sap/ui/core/Fragment',
  "sap/m/Popover",
  "sap/m/Button",
  "sap/m/library",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Component",
  "sap/ui/core/ComponentContainer",
  "sap/ui/core/EventBus"

], (BaseController, MessageToast, MessageBox, ResourceModel, JSONModel, Fragment,
  Popover, Button, library, Filter, FilterOperator, Component, ComponentContainer, EventBus) => {
  "use strict";

  let ButtonType = library.ButtonType,
    PlacementType = library.PlacementType;

  return BaseController.extend("bix.main.controller.App", {
    _oEventBus: EventBus.getInstance(),


    onInit() {
      this.oFCL = this.byId("fcl");
      this.onSetting();
      this.getView().setModel(new JSONModel({
        sideVisible: false
      }), "menuStr")

      this.getView().setModel(new JSONModel({
        layout: sap.f.LayoutType.OneColumn
      }), "mainControl");

      // this._oEventBus.subscribe("mainApp", "busy", this._setBusyControl, this);

    },

    _setBusyControl(sChannel, sEvent, oData) {
      if (oData.loaded) {
        this.oFCL.setBusy(false);
      }
    },

    onBeforeRendering() {

      // 새로고침 or 딥링크 접근 시, 상단 아이콘탭바 선택 변경
      const oBar = this.byId("iconTab");
      // const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash(); // 원본
      const sHash = this.oRouter.getHashChanger().getHash(); // 딥링크 에러때문에 임시 변수 설정
      let oChatbotBtn = this.byId("chatbotBtn");
      if (sHash !== "") {
        oChatbotBtn.removeStyleClass("custom-dashboard-version")
        // const aRouteInfo = this.oRouter.getRouteByHash(sHash)._oConfig.name.split('.');
        // const oModel = this.getOwnerComponent().getModel("main_menuModel").getProperty("/");
        // let oMenu = oModel.find(o => o.category === aRouteInfo[1] && o.code === aRouteInfo[2] );
        // if(!oMenu) {
        //   let oChildInfo;
        //   const aFolder = oModel.filter(o => o.isApp === 'none');
        //   for (const oParent of aFolder) {
        //     oChildInfo = oParent.Child.find(o => o.category === aRouteInfo[1] && o.code === aRouteInfo[2] );
        //     if(oChildInfo) break;
        //   }
        //   oMenu = oModel.find(o => o.ID === oChildInfo.Parent_ID);
        // }
        // oBar.setSelectedKey(oMenu.ID);
      } else {
        oChatbotBtn.addStyleClass("custom-dashboard-version")
      }

      // 화면 랜더링 전 busy 처리
      // this.oFCL.setBusy(true);

      // sap.ui.getCore().applyTheme("bix_theme");

      // 사이드 메뉴 구성 group 혼용 위해 커스텀 
      const oMenuModel = this.getOwnerComponent().getModel("main_menuModel").getProperty("/");
      const oNavList = this.byId("navList");
      // oNavList.addItem(
      //   new sap.tnt.NavigationListItem({
      //     text: "대시보드",
      //     icon: "sap-icon://home",
      //     key: "home",
      //     select: ()=>{ this.onPressHome(); }
      //   })
      // )
      let index = 0;
      if (Object.keys(oMenuModel).length === 0) return;
      for (const topMenu of oMenuModel) {
        if (topMenu.isApp === 'none' && topMenu.use_yn) {
          oNavList.addItem(
            new sap.tnt.NavigationListGroup({
              hasExpander: true,
              text: {
                path: `main_menuModel>/${index}/i18nTitle_i18nKey`,
                formatter: (sTitle) => {
                  let sI18nTitle = this.oBundle.getText(sTitle);
                  return sI18nTitle;
                }
              },
              items: {
                path: `main_menuModel>/${index}/Child`,
                filters: [
                  new Filter({
                    path: 'use_yn', operator: FilterOperator.EQ, value1: true
                  })
                ],
                template: new sap.tnt.NavigationListItem({
                  text: {
                    path: 'main_menuModel>i18nTitle_i18nKey',
                    formatter: (sTitle) => {
                      let sI18nTitle = "- " + this.oBundle.getText(sTitle);
                      return sI18nTitle;
                    }
                  },
                  // icon: { path: 'main_menuModel>iconSrc'},
                  key: { path: 'main_menuModel>ID' },
                  select: ($event) => { this.onNavToApp($event); }
                })
              }
            })
          )
        } else if (topMenu.isApp === 'main' && topMenu.use_yn) {
          oNavList.addItem(
            new sap.tnt.NavigationListItem({
              text: {
                path: `main_menuModel>/${index}/i18nTitle_i18nKey`,
                formatter: (sTitle) => {
                  let sI18nTitle = this.oBundle.getText(sTitle);
                  return sI18nTitle;
                },
              },
              key: { path: `main_menuModel>/${index}/ID` },
              select: ($event) => { this.onNavToApp($event) },
            })
            // new sap.tnt.NavigationList({
            //   items: {
            //     path: 'main_menuModel>/${index}',
            //     template: new sap.tnt.NavigationListItem({
            //       text: {
            //         path: `i18nTitle_i18nKey`,
            //         formatter: (sTitle) =>  this.oBundle.getText(sTitle)
            //       },
            //       key: '{ID}',
            //       select : ($event) => { this.onNavToApp($event) }
            //     })
            //   }
            // })
          )
        }
        index++;
      }
    },

    onAfterRendering() {

      // 화면 랜더링 실패 시 메시지 처리 & busy 해제
      // const oLoadFailed = setTimeout((() => {
      //   // MessageBox.error("화면호출 실패"); // busy 컨트롤 일괄 적용 후 메시지 처리
      //   this.oFCL.setBusy(false);
      // }).bind(this), 5000);
      // 랜더링 완료 후 해제
      // this._oEventBus.subscribe("mainApp", "busy", ({ }, { }, oData) => {
      //   if (oData.loaded) {
      //     clearTimeout(oLoadFailed);
      //   }
      // }, this);

      //   /**
      //    * mouse over 이벤트
      //    */
      //   let oSide = this.byId("sideNav"),
      //       oNavList = this.byId("navList"),
      //       oSideMenu = oSide.getDomRef();

      //   oSideMenu.addEventListener("mouseenter", ()=>{oSide.setExpanded(true)});
      //   // 메뉴 선택하지 않고 마우스 이동시 메뉴 닫힘
      //   oSideMenu.addEventListener("mouseleave", ()=>{
      //     if(!oSide.getSelectedItem() || ( oSide.getSelectedItem() && !oNavList.getSelectedItem().getDomRef().contains(document.activeElement) )) {
      //       oSide.setExpanded(false)}});
      //   // 메뉴 선택 후 업무단 클릭시 (포커스 이동시) 메뉴 닫힘
      //   oSide.attachBrowserEvent("focusout", ()=>{if(oSide.getSelectedItem() && !oSideMenu.matches(':hover')) {oSide.setExpanded(false)}});

      // setTimeout(()=>{
      //   this.getView().getModel("menuStr").setProperty("/sideVisible", false);
      // }, 500)
    },

    onPressHome() {
      MessageToast.show(this.oBundle.getText("p_m_goToHome"));
      this.oRouter.navTo("RouteHome", {}, { "bix.admin.menu": { route: "Detail" } })
    },

    onPressPersonal(oEvent) {
      let oPopover = new Popover({
        showHeader: false,
        placement: PlacementType.Bottom,
        content: [
          new Button({
            text: "SAP_HORIZON 테마",
            press: () => {
              sap.ui.getCore().applyTheme("sap_horizon");
            }
          }),
          new Button({
            text: "BIX_THEME 테마",
            press: () => {
              sap.ui.getCore().applyTheme("bix_theme");
            }
          }),
          new Button({
            text: 'Feedback',
            press: function () { this.getOwnerComponent().getRouter().navTo("menu") }.bind(this),
            type: ButtonType.Transparent
          }),
          new Button({
            text: 'Help',
            press: function () { this.getOwnerComponent().getRouter().navTo("code") }.bind(this),
            type: ButtonType.Transparent
          }),
          new Button({
            text: 'Logout',
            type: ButtonType.Transparent
          })
        ]
      }).addStyleClass('sapMOTAPopover sapTntToolHeaderPopover');

      oPopover.openBy(oEvent.getSource());
    },

    onSideNavButtonPress(oEvent) {
      // let oToolPage = this.byId("toolPage");
      // let bSideExpanded = oToolPage.getSideExpanded();

      // this._setToggleButtonTooltip(bSideExpanded, oEvent.getSource());

      // oToolPage.setSideExpanded(!oToolPage.getSideExpanded());

      let oSplitApp = this.byId("app");
      let oMenuTree = oSplitApp.getMasterPages()[0].getPages()[0].getContent()[0].getContent()[0];

      oSplitApp.showMaster();
      oMenuTree.collapseAll();

      if (oSplitApp.isMasterShown()) {
        oSplitApp.hideMaster();
      } else {
        oSplitApp.showMaster();
        oMenuTree.expandToLevel(4);
      }

    },

    _setToggleButtonTooltip(bLarge, oBtn) {
      const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      const sExpandMsg = oBundle.getText("p_t_sideNavBtn", [oBundle.getText("p_t_expand")]);
      const sCollapseMsg = oBundle.getText("p_t_sideNavBtn", [oBundle.getText("p_t_collapse")]);

      if (bLarge) {
        oBtn.setTooltip(sExpandMsg);
      } else {
        oBtn.setTooltip(sCollapseMsg);
      }
    },

    /**
     * 사이드 메뉴클릭 이동 이벤트 메소드
     * @param {sideNavItem} oEvent 
     */
    onSideMenuSelect(oEvent) {
      const sMenuKey = oEvent.getParameter("item").getKey();
      const sMsg = this.oBundle.getText("p_m_menuClick", [oEvent.getParameter("item").getText()]);
      MessageToast.show(sMsg);
      if (typeof sMenuKey === 'string' && sMenuKey.length > 0) {
        this.oRouter.navTo(sMenuKey);
      }
    },

    /**
     * 사이드 메뉴 닫기 버튼 (SideMenu.view.xml)
     */
    onCloseSideMenu(oEvent) {
      let oSplitApp = oEvent.getSource().getParent().getParent().getParent().getParent().getParent().getParent();
      if (oSplitApp.getMetadata().getName() === 'sap.m.SplitApp') oSplitApp.hideMaster();
    },

    /**
     * 사이드 메뉴리스트 바로가기 이벤트 메소드
     */
    onClickTopMenu(oEvent) {
      const sKey = oEvent.getParameter("item").getKey();
      if (sKey === "home") {
        this.onPressHome();
        return;
      }
      let oSplitApp = this.byId("app");
      let oMenuTree = oSplitApp.getMasterPages()[0].getPages()[0].getContent()[0].getContent()[0],
        oBinding = oMenuTree.getBinding("items");
      let aFilters = [
        new Filter({
          path: "use_yn",
          operator: FilterOperator.EQ,
          value1: true
        })
      ];
      oBinding.filter(aFilters);

      let aItems = oMenuTree.getItems();

      // oSplitApp.showMaster();
      oMenuTree.collapseAll();

      const iBeforeCount = oMenuTree.getItems().length;

      if (aItems.length > 0) {
        for (let i = 0; i < aItems.length; i++) {
          let sPath = aItems[i].getBindingContextPath();
          let oData = this.getOwnerComponent().getModel("main_menuModel").getProperty(sPath);
          if (oData.ID === sKey) {
            oMenuTree.expand(i);
            for (let j = 0; j < oMenuTree.getItems().length - iBeforeCount; j++) {
              let iNextIndex = i + j + 1;
              oMenuTree.expand(iNextIndex);
            }
            return;
          }
        }
      }
    },

    /**
     * 상단 메뉴검색 제안목록 메소드
     */
    onSuggest(oEvent) {
      this.oSF = oEvent.getSource();
      var sValue = oEvent.getParameter("suggestValue"),
        aFilters = [];
      // if (sValue) {
      // 	aFilters = [
      // 		new Filter([
      // 			new Filter("ProductId", function (sText) {
      // 				return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
      // 			}),
      // 			new Filter("Name", function (sDes) {
      // 				return (sDes || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
      // 			})
      // 		], false)
      // 	];
      // }

      this.oSF.getBinding("suggestionItems").filter(aFilters);
      this.oSF.suggest();
    },

    onNavToApp(oEvent) {
      let oInfo, sCode, sRouteName, sComponent, bCheck = true;
      const sKey = oEvent.getParameter("item").getKey();
      const oData = this.getOwnerComponent().getModel("main_menuModel").getProperty("/");
      const oModel = this.getView().getModel("menuStr");

      if (oData.find(o => o.ID === sKey)) {
        oInfo = oData.find(o => o.ID === sKey);
        console.log(oInfo)
        sCode = oInfo.code;
        sRouteName = "Route." + oInfo.category + "." + oInfo.code;
      } else {
        for (const menu of oData) {
          if (menu.Child && menu.Child.length > 1 && menu.Child.find(o => o.ID === sKey)) {
            oInfo = menu.Child.find(o => o.ID === sKey);
            sCode = oInfo.code;
            sRouteName = "Route." + oInfo.category + "." + oInfo.code;
          }
        }
      }
      // custom-dashboard-version / custom-dashboard-side-version
      // 화면 넓이 조정에 따른 chatbot 위치 클래스 조정
      let oChatbotBtn = this.byId("chatbotBtn");
      if (oInfo.category === 'home') {
        this.getOwnerComponent().getRouter().navTo("RouteHome");
        oModel.setProperty("/sideVisible", false);
        oChatbotBtn.addStyleClass("custom-dashboard-version")
        oChatbotBtn.removeStyleClass("custom-dashboard-side-version")
        return;
      } else if (oInfo.isApp === 'none') {
        let bSide = oModel.getProperty("/sideVisible");
        oModel.setProperty("/sideVisible", !bSide);
        if (bSide) {
          oChatbotBtn.removeStyleClass("custom-dashboard-side-version")
        } else {
          oChatbotBtn.addStyleClass("custom-dashboard-side-version")
        }
        return;
      }
      let oComponentTargetInfo = {};
      if (oInfo.route) {
        oComponentTargetInfo = this.getOwnerComponent().getModel("main_subCompTargetInfo").getProperty("/")[sCode][oInfo.route]
      }
      if (sCode) {

        // this.oFCL.setBusy(true);
        const sMenuTitle = this.oBundle.getText(oInfo.i18nTitle_i18nKey);
        MessageToast.show(sMenuTitle);
        if (bCheck) {
          this.getOwnerComponent().getRouter().navTo(sRouteName, {}, oComponentTargetInfo);
          oModel.setProperty("/sideVisible", false);
          oChatbotBtn.removeStyleClass("custom-dashboard-version")
        }
      }
    },

    onExpandAI_Area() {
      let oFCL = this.byId("fcl");

      if (oFCL.getLayout().toLowerCase().includes('twocolumn')) {
        this.getView().getModel("mainControl").setProperty("/layout", sap.f.LayoutType.OneColumn);
      } else {
        this.getView().getModel("mainControl").setProperty("/layout", sap.f.LayoutType.TwoColumnsBeginExpanded);
      }
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