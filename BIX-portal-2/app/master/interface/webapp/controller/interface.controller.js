sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/format/DateFormat",
  "sap/m/MessageBox",
], (Controller, JSONModel, MessageToast, Filter, FilterOperator, DateFormat, MessageBox) => {
  "use strict";

  return Controller.extend("bix.master.interface.controller.App", {
    _oAddInterfaceDialog: undefined,

    onInit() {
      const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteMain");
      myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
    },

    /**
    * 인터페이스 관리 페이지로 라우팅했을 때
    */
    onMyRoutePatternMatched: function () {
      // 초기 모델 설정
      this._setModel();
    },

    /**
     * 초기 모델 셋팅 검색창 모델, 테이블 혹은 버튼 및 설정 관련 
     */
    _setModel: async function () {
      // 검색 초기모델
      this.getView().setModel(new JSONModel({}), "searchModel"); 

      // 테이블 바인딩
      const oBatchTable = this.byId("table");
      oBatchTable.bindRows({
        path: "/interface_master",
        $$updateGroupId: "update",
        synchronizationMode: "None",
        parameters:{
          $count: true
        },
        events: {
          dataRequested: function () {
            //set busy 작동
            oBatchTable.setBusy(true);
          }.bind(this),
          dataReceived: function (oEvent) {
            // Account Table Title 설정
            let oHeaderContext = oEvent.getSource().getHeaderContext();
            this.byId("title").setBindingContext(oHeaderContext);
            //set busy 종료
            oBatchTable.setBusy(false);
          }.bind(this),
        },
      });

      // visible model setting
      this.getView().setModel(new JSONModel({
        edit: false,                  // true: 수정, false: 조회       
        hasUpdatingChanges: false,    // update 항목 있을때 true
        hasCreateChanges: false,      // create 항목 있을때 true -> 데이터 없을때 생성 관련
        addInterface: false,
      }), "uiModel");

      // 모델 값 변경 시 hasUpdateingChanges를 true로 설정
      let oModel = this.getOwnerComponent().getModel();
      oModel.attachPropertyChange((oEvent) => {
        this.getView().getModel("uiModel").setProperty("/hasUpdatingChanges", true);
      })
    },

    /**
     * 수정 저장 버튼 로직     
     * @param {sap.ui.base.Event} oEvent 
     * @param {String} sFlag 
     */
    onExtensionButton: async function (oEvent, sFlag) {
      // 수정 버튼 클릭
      if (sFlag === "edit") {
        //edit속성에 따라 버튼이 나타나고 사라지는 역할 수행
        this.getView().getModel("uiModel").setProperty("/edit", true); 
      // 저장
      } else if (sFlag === "save") { 
        MessageBox.warning("저장하시겠습니까?", {
          title: "저장",
          // 메시지 박스에 확인과 취소 버튼
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL], 
          //OK 버튼을 강조
          emphasizedAction: MessageBox.Action.OK, 
          onClose: async function (/**@type{String}*/sAction) {
            // 확인 버튼 눌렀을 시
            if (sAction === "OK") { 
              // manist 지정 model 바인딩
              let oModel = this.getOwnerComponent().getModel(); 
              // create, update로 만든 context 전부 실행
              await Promise.all([ 
                // 신규 생성 batch
                oModel.submitBatch("create"),
                // update batch
                oModel.submitBatch("update"),
              // 저장 성공 시                
              ]).then(
                function () {
                  MessageToast.show("저장이 완료되었습니다.");
                  // uiModel 초기화 및 변경사항 초기화
                  this._changeReset(); 
                  // 데이터 새로불러오기
                  this._setModel(); 
                }.bind(this)).catch(
                  // 저장 실패 시
                  function (oError) {
                  MessageToast.show("저장에 실패하였습니다.");
                }.bind(this)
              );

            }
          }.bind(this)
        })
      // 취소 클릭
      } else if (sFlag === "cancel") {     
        // 분기 처리를 위해 uiModel 가져옴
        let oUiModel = this.getView().getModel("uiModel").getData() 
        // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정        
        let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges; 
        //변경 사항 없을시 
        if (bFlag) { 
          // 데이터 요청
          this._setModel();
          // uiModel 초기화 및 변경사항 초기화
          this._changeReset(); 
        //변경 사항 있을시 
        } else { 
          MessageBox.warning("작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", {
            title: "취소 확인",
            // 메시지 박스에 확인과 취소 버튼 
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL], 
            //OK 버튼을 강조
            emphasizedAction: MessageBox.Action.OK, 
            onClose: async function (sAction) {
              // 확인 버튼 눌렀을 시
              if (sAction === "OK") { 
                // 데이터 요청
                this._setModel();
                // 변경된 점 초기화 및, uiModel의 속성을 원래대로 초기화
                this._changeReset();
              }
            }.bind(this)
          })
        }
        //신규 인터페이스 추가 버튼
      } else if (sFlag === "add") { 
        // 다이얼로그 오픈
        this.onAddInterfaceDialogOpen();
      }
    },

    /**
     * 신규 인터페이스 추가 프래그먼트 실행
     * @param {Event} oEvent 
     */
    onAddInterfaceDialogOpen: async function (oEvent) {
      // fragment의 남아있는 데이터 초기화
      this.getOwnerComponent().setModel(new JSONModel({}), "addInterfaceData")

      // addInterfacedata attachProperty      
      let oModel = this.getOwnerComponent().getModel("addInterfaceData");
      oModel.attachPropertyChange((oEvent) => {
        let oAddData = oModel.getData();
        if (!!oAddData.if_step && !!oAddData.source && !!oAddData.table_name) {
          this.getView().getModel("uiModel").setProperty("/addInterface", true);            
        } else {
          this.getView().getModel("uiModel").setProperty("/addInterface", false);          
        }        
      })

      // this._oOrgSingleSelectDialog가 없을 때 호출
      if (!this._oAddInterfaceDialog) {
        let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();
        await this.loadFragment({
          id: "AddInterfaceDialog",
          name: `${sComponentName}.view.fragment.AddInterface`,
          controller: this,
        }).then(function (oDialog) {
          this._oAddInterfaceDialog = oDialog;
          oDialog.open()
        }.bind(this));
      } else {
        // 과거 생성된 다이얼로그 정보 주입 
        let oDialog = this._oAddInterfaceDialog 
        oDialog.open()
      }
    },

    /**
     * fragment의 버튼 작동 코드
     * @param {Event} oEvent 
     * @param {String} sFlag  // 버튼 종류
     */
    onAddInterfaceDialogButton: function (oEvent, sFlag) {
      // 다이얼로그 정보 변수 선언
      let oDialog = this._oAddInterfaceDialog;
      // 
      let oUiModel = this.getView().getModel("uiModel").getData()
      // fragment close 버튼
      if (sFlag === "Close") {
        oUiModel.addInterface = false;
         // 모델의 setProperty가 위에서 작동이 어려워서, 데이터를 밀어넣고 모델 초기화로 적용
         this.getView().getModel("uiModel").refresh();
        oDialog.close();
      // fragment save 버튼
      } else if (sFlag === "Save") {
        let oAddData = this.getView().getModel("addInterfaceData").getData();
        let oTable = this.byId("table");
        let oBinding = oTable.getBinding("rows");
        let aBooleanColumns = ["is_yn", "direct_yn", "use_yn", "represent_yn", "dev_complete_yn"]
        //데이터 이식 : cehckbox 선택 안했을시의 undefined 값을 false로 치환하기 위한 작업
        aBooleanColumns.forEach(
          function(sBooleanColumn){
            if(Object(oAddData)[sBooleanColumn] === undefined){
              Object(oAddData)[sBooleanColumn] = false
            }
          }
        )

        //fragment의 데이터로 새로운 데이터 행 삽입
        oBinding.create(oAddData);

        // 새로운 데이터를 삽입 분기 생성
        oUiModel.hasCreateChanges = true;
        // fragment 의 활성화 되었던 save 값 초기화
        oUiModel.addInterface = false;
        // 모델의 setProperty가 위에서 작동이 어려워서, 데이터를 밀어넣고 모델 재반영
        this.getView().getModel("uiModel").refresh();
        //fragment 종료
        oDialog.close();
      }
    },
    /**
     * 화면의 검색 버튼 로직 변경점에 따라 메시지박스 출현
     */
    onSearch: async function(){
       //분기처리를 위해 모델 가져옴
      let oUiModel = this.getView().getModel("uiModel").getData()
       // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정              
      let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges;

      if (bFlag) {
        // 검색 실행
        this._search();        
      } else {
        //수정사항이 존재할경우 검색 클릭시 메시지 박스 출현
        MessageBox.warning("작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", {
          title: "검색 확인",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async function (/**@type{String}*/sAction) {
            if (sAction === "OK") {
              // 변경사항 초기화
              this._changeReset();
              
              // 검색 실행              
              this._search();  
            }
          }.bind(this)
        })
      }   
    
    },
    /**
     * 검색 메서드 
     */
    _search: async function () {   
    
      const oTable = this.byId("table");
      const oBinding = oTable.getBinding("rows");
      let aFilters = [];
      const oSearchModel = this.getView().getModel("searchModel").getData();

      if (!!oSearchModel.step) {
        if (oSearchModel.step !== "전체") {
          aFilters.push(new Filter("if_step", FilterOperator.EQ, oSearchModel.step));
        }
      }

      if (oSearchModel.source) {
        aFilters.push(new Filter({
          path: "source",
          operator: FilterOperator.Contains,
          value1: oSearchModel.source,
          caseSensitive: false,
        }));
      }

      if (oSearchModel.procedure) {
        aFilters.push(new Filter(
          {
            path: "procedure_name",
            operator: FilterOperator.Contains,
            value1: oSearchModel.procedure,
            caseSensitive: false,
          }
        ))
      }

      if (oSearchModel.table) {
        aFilters.push(
          new Filter(
            {
              path: "table_name",
              operator: FilterOperator.Contains,
              value1: oSearchModel.table,
              caseSensitive: false,
            }
          ));
      }

      await oBinding.filter(aFilters)
      MessageToast.show("검색이 완료되었습니다.")

      
    },

    /**
     * 수정에서 데이터 변경시 $$updateGroupId="update"를 통해서 데이터 수집
     * @param {sap.ui.base.Event} oEvent 
     */
    onChange: async function (oEvent) {
      let oUiModel = this.getView().getModel("uiModel").getData(); // 데이터 생성 혹은 추가시 uiModel 속성 업데이트용 모델
      let oChange = oEvent.getSource().getBindingContext().getObject(); // 변경시의 최종 데이터 가져옴

      let oModel = this.byId("table").getBinding().getModel(); // 데이터 요청용 모델 바인딩
      let sBindingPathBase = "/interface_master" // 기본 path
      let sBindingPath = sBindingPathBase + "(if_step='" + oChange.if_step + "',source='" + oChange.source + "',table_name='" + oChange.table_name + "')" //update용 path

      let oBinding = oModel.bindContext(sBindingPath, undefined, {
        $$updateGroupId: "update"
      });


      for (let key in oChange) {
        oBinding.getBoundContext().setProperty(key, oChange[key]); // 변경데이터를 context로 저장
      }

      oUiModel.hasUpdatingChanges = oModel.hasPendingChanges("update") // uiModel의 update 관련 속성을 false -> true로 변경     

      this.getView().getModel("uiModel").refresh(); // 모델의 setProperty가 위에서 작동이 어려워서, 데이터를 밀어넣고 모델 초기화로 적용

    },

    /**
     * 데이터 불러오기
     * @param {String} sUrl 데이터 직접 바인딩 시 v4는 hierachy tree 구조 바인딩이 불가하므로, flatData 받아서 tree구조 만들기 위함.
     * @returns 
     */
    _getData: async function (sUrl) {
      let oModel = this.getOwnerComponent().getModel(); //manifest의 모델 바인딩
      let aContexts = await oModel.bindList(sUrl, null, null, null).requestContexts(0, 10000); //데이터 요청, 기본은 100개 지정이어서 데이터 늘림
      let aData = await Promise.all(aContexts.map(ctx => ctx.requestObject())); // 요청한 데이터 배열 데이터로 변환
      return aData;
    },




    /**
         * 타임스탬프를 날짜로 변경하는 포매터
         * @param {String} sValue 타임스탬프
         */
    onFormatDate: function (sValue) {
      // 값이 없을 때 Return
      if (!sValue) {
        return;
      } else {
        // 연-월-일로 반환
        let oDateInstance = DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd"
        });

        return oDateInstance.format(new Date(sValue));
      }
    },

    /**
     * uiModel 초기화와 변경사항 초기화
     */
    _changeReset: function () {
      // uiModel 초기화
      this.getView().setModel(new JSONModel({
        addInterface: false,
        edit: false,
        hasUpdatingChanges: false,
        hasCreateChanges: false,
      }), "uiModel");

      // 변경사항 초기화
      let oModel = this.byId("table").getBinding().getModel();
      oModel.resetChanges("create");
      oModel.resetChanges("update");
    },

    onSearchReset: async function () {//검색창 초기화
      let oUiModel = this.getView().getModel("uiModel").getData() //분기처리를 위해 모델 가져옴
      let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges; // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정              

      if (bFlag) {
        // table 초기화      
        this._setModel();
        MessageToast.show("검색조건이 초기화되었습니다.")
      } else { //수정사항이 존재할경우 검색 클릭시 메시지 박스 출현
        MessageBox.warning("작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", {
          title: "취소 확인",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async function (/**@type{String}*/sAction) {
            if (sAction === "OK") {
              // table 초기화      
              this._setModel();
              MessageToast.show("검색조건이 초기화되었습니다.")
            }
          }.bind(this)
        })
      }
    },

    requiredCheck: function () {
      
    }
  });
});