sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/format/DateFormat",
  "bix/common/library/control/Modules",
], (Controller, JSONModel, MessageToast, MessageBox, DateFormat, Modules) => {
  "use strict";

  return Controller.extend("bix.master.orgtype.controller.App", {

    onInit() {
      const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteOrgType");
      myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);      
    },

    onMyRoutePatternMatched: async function (oEvent) {
      this.getView().setBusy(true)
      Modules.setIconTab(oEvent); // hash 값 , 새로고침 시 메뉴, 사이드메뉴 select 모듈함수
      this._setModel(); //초기 모델 셋팅      
      this._dataSetting(); // 초기 데이터 셋팅
      this.byId("orgTypeSelect").removeAllSelectedItems(); // 속성 타입 멀티 콤보박스 초기화
      this.getView().setBusy(false)
    },

    /**
     * 초기 모델 셋팅 검색창 모델, 테이블 혹은 버튼 및 설정 관련 
     */
    _setModel: async function () {
      this.getView().setModel(new JSONModel(), "searchModel"); // 검색 초기모델
      this.getView().setModel(new JSONModel({
        edit: false,// true: 수정, false: 조회       
        hasUpdatingChanges: false, // update 항목 있을때 true
        hasCreateChanges: false, // create 항목 있을때 true -> 데이터 없을때 생성 관련
      }), "uiModel");
    },

    /**
     * 데이터 setting
     * aFlatData 형식으로 받음
     * _treeSetting 통해서 hierachy 구조 생성
     */
    _dataSetting: async function () {
      let oTable = this.byId("treeTable")
      oTable.setBusy(true)// 로딩 시작 setBusy

      // 트리테이블 바인딩     
      let aTreeData = await this._search();
      // 내부 검색 메서드 - 검색조건을 통해서 데이터 추출 검색조건이 없을 경우 전체 데이터를 가져오는 역할이 가능
      this.getView().setModel(new JSONModel(aTreeData), "orgModel") // 데이터 바인딩      
      
      oTable.setBusy(false) // 데이터 로딩 종료
    },

    /**
     * 검색 버튼 클릭시 메서드 - 분기처리 및 데이터 바인딩 기능, 검색 완료 messageToast
     * this._search() - 검색 데이터로 목적 데이터 필터링 해서 tree 구조 생성
     * 수정 사항의 존재 유무로 분기처리
     */
    onSearch: async function () {
      let aTreeData; // return 관련 데이터
      let oUiModel = this.getView().getModel("uiModel").getData() //분기처리를 위해 모델 가져옴
      let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges; // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정              

      if (bFlag) {
        aTreeData = await this._search(); // 검색용 내부 메서드(검색조건, 데이터 요청을 통해서 tree 구조 데이터 생성)
        this.getView().setModel(new JSONModel(aTreeData), "orgModel") // 데이터 바인딩
        MessageToast.show("검색이 완료되었습니다.")
      } else { //수정사항이 존재할경우 검색 클릭시 메시지 박스 출현
        MessageBox.warning("작성된 내용은 저장되지 않습니다. 검색하시겠습니까?", {
          title: "검색 확인",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async function (/**@type{String}*/sAction) {
            if (sAction === "OK") {
              aTreeData = await this._search(); // 검색용 내부 메서드(검색조건, 데이터 요청을 통해서 tree 구조 데이터 생성)
              this.getView().setModel(new JSONModel(aTreeData), "orgModel") // 데이터 바인딩
              MessageToast.show("검색이 완료되었습니다.")
            }
          }.bind(this)
        })
      }
    },

    /**
     * 검색 메서드 searchModel의 데이터와 서버에 데이터 요청해서 필터링을 통해 treeData 생성
     */
    _search: async function () {

      let oSearchData = this.getView().getModel("searchModel").getData() // 검색 칸 데이터 모아놓은 모델
      let aFilterDataTarget = await this._getData("/OrgTypeView"); // 서버에 전체 데이터 요청      

      // 속성타입 org_tp eq 조건으로 검색
      if (oSearchData.org_tp) {
        aFilterDataTarget = aFilterDataTarget.filter(sItem => oSearchData.org_tp.includes(sItem.org_tp))
        // 배열의 데이터를 포함하고 있는 객체들을 필터
      }

      // 조직명 name 포함 조건으로 검색 
      if (oSearchData.name) {
        aFilterDataTarget = aFilterDataTarget.filter(sItem => sItem.name.toLowerCase().includes(oSearchData.name.toLowerCase()))
      }
      // 조직코드 id eq 조건으로 검색
      if (oSearchData.id) {
        aFilterDataTarget = aFilterDataTarget.filter(sItem => sItem.id.toLowerCase() === oSearchData.id.toLowerCase())
      }
      // 코스트센터코드 ccorg_cd 포함 조건으로 검색
      if (oSearchData.ccorg_cd) {
        aFilterDataTarget = aFilterDataTarget.filter(sItem => sItem.ccorg_cd.toLowerCase().includes(oSearchData.ccorg_cd.toLowerCase()))
      }

      let aflatData = await this._findUpper(aFilterDataTarget)      // 대상 데이터의 부모 데이터 찾고 데이터를 합쳐 Array 데이터 생성(treeSetting에 사용 가능하게 생성)
      let aTreeData = await this._treeSetting(aflatData)            // tree구조로 바꿈      
      this._changeReset(); // 수정관련 값들 초기화

      return aTreeData; // tree데이터 반환
    },

    /**
     * @param {Array} aFilterDataTarget 검색칸의 searchField를 통해서 검색 조건에 해당하는 대상 객체를 모음
     * @returns 검색 조건에 해당하는 대상 객체의 모든 부모들을 aFlatData로부터 찾아서 tree 구조로 만들 리스트 형성
     */
    _findUpper: async function (aFilterDataTarget) {
      let aFlatData = await this._getData("/OrgTypeView"); // 새로 데이터 요청
      
      // 검색한 데이터의 parent가 있으면
      if (aFilterDataTarget[0].parent) {
        for (let i = 0; i < aFilterDataTarget.length; i++) { // 검색조건에 해당하는 데이터를 돌아가면서 부모 데이터 찾기
          if (aFilterDataTarget[i].parent) { // 해당 부모 데이터가 없는 ex: 최상위 데이터 일 경우 종료 
            if (!aFilterDataTarget.find(sItem => sItem.id === aFilterDataTarget[i].parent)) { // 해당 데이터의 부모가 만들고 있는 배열 안에 없을 경우 진행
              let oUpperData = aFlatData.find(sItem => sItem.id === aFilterDataTarget[i].parent) // 해당 데이터의 부모 찾기
              aFilterDataTarget.push(oUpperData) //검색조건에 데이터를 밀어넣음으로, 부모의 부모들도 확인 가능하게 진행
            }
          }
        }
      } 
      
      return aFilterDataTarget; // 대상 데이터의 부모들을 포함한 데이터 
    },

    /**
     * @param {Array} aFlatData url통해서 받아 JSONModel화 시킨 배열 데이터
     * 맵 형성, 부모와 자식 관계 찾기, __metadata에 빈칸 지정으로 treeTable 바인딩시 빈칸이 출현하는 버그 회피
     */
    _treeSetting: function (aFlatData) {
      let aFlat = {};

      // 구조 생성전 맵으로 형성과 동시에 자식 객체 넣을 공간과 metadata 빈값으로 처리
      // flatData의 데이터를 data에 map 형식으로 입력
      for (const oRow of aFlatData) {
        let sKey = oRow['id']; // id 컬럼으로 key 형성
        aFlat[sKey] = oRow; // key 와 데이터 매핑
        aFlat[sKey].__metadata = ''; // key 해당객체에 __metadata의 값을 없앰(null 일 경우 빈칸 나타나는 현상 처리용)
        aFlat[sKey].children = []; // key 해당객체에 자식 객체 밀어넣을 속성 생성
      }

      // parent - child 관계 형성
      for (let i in aFlat) {
        let sParentkey = aFlat[i]?.parent; //자식 객체의 parent 값으로 부모키 설정
        if (aFlat[sParentkey]) { // 부모키 해당하는 객체가 있을경우(최상위 객체 제외)
          aFlat[sParentkey].children.push(aFlat[i]); // 부모 객체의 자식 속성에 자식 객체 밀어넣기 
        }
      }

      // 최상위 부모값 찾기
      let aRoot = [];
      for (let i in aFlat) {
        let sParentkey = aFlat[i].parent;
        if (!aFlat[sParentkey]) { // 부모값이 없는 최상위 값
          aRoot.push(aFlat[i]); // aRoot에 밀어넣기
        }
      }

      return aRoot;

    },

    /**
     * 수정에서 데이터 변경시 $$updateGroupId="update"를 통해서 데이터 수집
     * @param {sap.ui.base.Event} oEvent 
     */
    onChange: async function (oEvent) {
      let oUiModel = this.getView().getModel("uiModel").getData(); // 데이터 생성 혹은 추가시 uiModel 속성 업데이트용 모델
      let oChange = oEvent.getSource().getBindingContext("orgModel").getObject(); // 변경시의 최종 데이터 가져옴

      let oModel = this.getOwnerComponent().getModel(); // 데이터 요청용 모델 바인딩
      let sBindingPathBase = "/OrgType" // 기본 path
      let sBindingPath = sBindingPathBase + "('" + oChange.ccorg_cd + "')" //update용 path
      let aOrgTypeData = await this._getData(sBindingPathBase) // 데이터 새로 요청      

      let bFlag = aOrgTypeData.some(oData => oData.ccorg_cd === oChange.ccorg_cd)
      //OrgType에 ccorg_cd key 를 통해서 데이터 있는지 없는지 확인
      if (bFlag) { //데이터 존재시 update, 데이터 없을시 create
        //update
        let oContext = oModel.bindContext(sBindingPath, undefined, {
          $$updateGroupId: "update"
        })

        oContext.getBoundContext().setProperty("org_tp", oChange.org_tp); // 변경데이터를 context로 저장
        oContext.getBoundContext().setProperty("is_delivery", oChange.is_delivery); // 변경데이터를 context로 저장
        oUiModel.hasUpdatingChanges = oModel.hasPendingChanges("update") // uiModel의 update 관련 속성을 false -> true로 변경
      } else {
        // create
        if (oChange.is_delivery === null) { oChange.is_delivery = false } // notNull 속성 지정되있으므로, null 일경우 false로 지정

        let oBinding = oModel.bindList(sBindingPathBase, null, [], [], {
          $$updateGroupId: "create"
        });

        oBinding.create({
          ccorg_cd: oChange.ccorg_cd, // key값 
          org_tp: oChange.org_tp, // 입력된 데이터 
          is_delivery: oChange.is_delivery // 입력된 데이터 
        })
        oUiModel.hasCreateChanges = oModel.hasPendingChanges("create") // uiModel의 create 관련 속성을 false -> true로 변경
      }

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
     * 수정 저장 버튼 로직     
     * @param {sap.ui.base.Event} oEvent 
     * @param {String} sFlag 
     */
    onFooterButton: async function (oEvent, sFlag) {
      if (sFlag === "edit") { // 수정 버튼 클릭
        this.getView().getModel("uiModel").setProperty("/edit", true); //edit속성에 따라 버튼이 나타나고 사라지는 역할 수행
      } else if (sFlag === "save") { // 저장
        MessageBox.warning("저장하시겠습니까?", {
          title: "저장",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL], // 메시지 박스에 확인과 취소 버튼
          emphasizedAction: MessageBox.Action.OK, //OK 버튼을 강조
          onClose: async function (/**@type{String}*/sAction) {
            if (sAction === "OK") { // 확인 버튼 눌렀을 시
              let oModel = this.getOwnerComponent().getModel(); // manist 지정 model 바인딩
              await Promise.all([ // create, update로 만든 context 전부 실행
                oModel.submitBatch("create"),
                oModel.submitBatch("update"),
              ]).then(// 저장 성공 시                
                function () {
                  MessageToast.show("저장이 완료되었습니다.");                  
                  this._dataSetting(); // 데이터 새로불러오기

                  // this._changeReset();
                }.bind(this)).catch(function (oError) {// 저장 실패 시
                  MessageToast.show("저장에 실패하였습니다.");
                }.bind(this));

            }
          }.bind(this)
        })
      } else if (sFlag === "cancel") {     // 취소     
        let oUiModel = this.getView().getModel("uiModel").getData() // 분기 처리를 위해 uiModel 가져옴
        let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges; // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정        
        if (bFlag) { //변경 사항 없을시 
          // 데이터 요청

          this._dataSetting();

          this._changeReset();
          // uiModel의 edit를 false로 되돌리는 코드 대신 변경된 점 초기화 및, uiModel의 속성을 원래대로 돌리는 코드 사용
        } else { //변경 사항 있을시 
          MessageBox.warning("작성된 내용은 저장되지 않습니다. 취소하시겠습니까?", {
            title: "취소 확인",
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL], // 메시지 박스에 확인과 취소 버튼 
            emphasizedAction: MessageBox.Action.OK, //OK 버튼을 강조
            onClose: async function (sAction) {
              if (sAction === "OK") { // 확인 버튼 눌렀을 시
                // 데이터 요청

                this._dataSetting();
                // 변경된 점 초기화 및, uiModel의 속성을 원래대로 초기화
                this._changeReset();
              }
            }.bind(this)
          })
        }
      }
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
        edit: false,
        hasUpdatingChanges: false,
        hasCreateChanges: false,
      }), "uiModel");

      // 변경사항 초기화
      let oModel = this.getView().getModel();
      oModel.resetChanges("create");
      oModel.resetChanges("update");
    },

    onSearchReset: async function () {//검색창 초기화
      let aTreeData; // return 관련 데이터
      let oUiModel = this.getView().getModel("uiModel").getData() //분기처리를 위해 모델 가져옴
      let bFlag = !oUiModel.hasUpdatingChanges && !oUiModel.hasCreateChanges; // 변경되거나 추가된 내용이 있는지 없는지에 따라 분기 설정              

      if (bFlag) {
        // searchModel 초기화
        this.getView().setModel(new JSONModel(), "searchModel")
        // table 초기화      
        this._dataSetting();
        MessageToast.show("검색조건이 초기화되었습니다.")
      } else { //수정사항이 존재할경우 검색 클릭시 메시지 박스 출현
        MessageBox.warning("작성된 내용은 저장되지 않습니다. 초기화하시겠습니까?", {
          title: "초기화 확인",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async function (/**@type{String}*/sAction) {
            if (sAction === "OK") {
              // searchModel 초기화
              this.getView().setModel(new JSONModel(), "searchModel")
              // table 초기화      
              this._dataSetting();
              MessageToast.show("검색조건이 초기화되었습니다.")
            }
          }.bind(this)
        })
      }
    },

    onSelectionChange: function (oEvent) {
      let aSelectData = []; //선택된 데이터의 키를 모을 배열
      let aSelectList = oEvent.getSource().getSelectedItems() //이벤트로부터 선택된 아이템들의 정보 가져옴
      aSelectList.forEach(
        function (oSelect) {
          aSelectData.push(oSelect.getKey()) //선택된 아이템들의 키를 배열에 모음
        })

      if (aSelectData[0]) {//배열의 첫번째 값이 없을 경우에는 /ort_tp에 null을 setting 하여 검색에서 빈 배열 검색하는 경우를 회피
        this.getView().getModel("searchModel").setProperty("/org_tp", aSelectData)
      } else {
        this.getView().getModel("searchModel").setProperty("/org_tp", null)
      }


    }

  });
});