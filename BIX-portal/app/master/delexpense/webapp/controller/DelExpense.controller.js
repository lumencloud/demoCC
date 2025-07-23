sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "bix/common/library/customDialog/OrgSingleSelect",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",    
    "sap/ui/core/Fragment",
    "sap/ui/table/RowSettings",


  ], (BaseController, JSONModel, OrgSingleSelect, MessageToast, Filter, FilterOperator, Fragment, RowSettings) => {
    "use strict";
  
    return BaseController.extend("bix.master.delexpense.controller.App", {
        _aPropertyList : [],
        onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteDelExpense");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function () {

          this._setModel(); //초기 모델 셋팅
        },

        /**
         * GL 계정 셋팅
         * 검색창 모델
         */
        _setModel: async function(){
          this.getView().setModel(new JSONModel(), "searchModel"); // 검색 초기모델
          
          await this._cmCodeSetting(); // gl계정 Setting
          await this._dateSetting(); // 날짜 제한 셋팅

          this._tableSetting();
          

        },
        onSearch : function (){
            this._tableSetting();
        },

        _tableSetting : async function(){

            let aTableData = await this._tableDataRequest();
            this.getView().getModel("searchModel").setProperty("/count", aTableData.length);
            this.getView().setModel(new JSONModel(aTableData), "expenseCoModel");

        },      
        
        _tableDataRequest : async function(){
             // Filter 종합
             let totalFilter = [];

            // gl 계정 필터
            let aSelectGL = this.byId("GlSelect").getSelectedKeys();
            let aGLFilter = [];
            aSelectGL.forEach((sSelectGL)=>{
                aGLFilter.push(new Filter("gl_account", FilterOperator.EQ, sSelectGL))
            })
            let GLFilter = new Filter({
                filters : aGLFilter,
                and: false
            })
            totalFilter.push(GLFilter);


            // search Model data 가져오기
            let oSearchData = this.getView().getModel("searchModel").getData();

            //ccorg_cd Filter
            let ccorgFilter;
            if(oSearchData.orgId){
                ccorgFilter = new Filter("ccorg_cd", FilterOperator.EQ, oSearchData.orgId)
                totalFilter.push(ccorgFilter)
            }
             

            //마감년월 Filter
            let dateFilter;
            if(oSearchData.yearMonth){
                dateFilter = new Filter({
                    filters : [
                        new Filter("year", FilterOperator.EQ, `${oSearchData.yearMonth.getFullYear()}`),
                        new Filter("month", FilterOperator.EQ, `${oSearchData.yearMonth.getMonth()+1}`),
                    ],
                    and:true
                })

                totalFilter.push(dateFilter)
            }

           

            let andFilter = new Filter({
                filters : totalFilter,
                and: true
            })

            let aTableData = await this._getData("sga", "/if_expense_co", andFilter)
            return aTableData
        },
        /**
         * commonCode - exp_co_gl_account
         */
        _cmCodeSetting : async function(){
          let aCodeSetting = await this._getData("cm", "/code_item_view(\'exp_co_gl_account\')/Set")
          let aGlModel = [];
          let initData = [];
          aCodeSetting.forEach((oCode) => {
            let oCodeData = {
              name : oCode.name,
              value : oCode.value
            }

            aGlModel.push(oCodeData)
            initData.push(oCode.name)
          })

          this.getView().setModel(new JSONModel(aGlModel), "GLModel") //멀티콤보 박스 모델 설정
          this.byId("GlSelect").setSelectedKeys(initData) //전체 선택
        },

        /**
         * tag : c의 날짜 갖고오기
         */
        _dateSetting : async function () {
          let aDateData = await this._getData("cm", "/Version") // cm Model path Version
          let oFindData = aDateData.find((oDate)=>oDate.tag === 'C')

          let dMaxDate = new Date(oFindData.year, oFindData.month) // 데이터 해당 연의 월 + 1
          let dMinDate = new Date(oFindData.year -1, 12 - 1) // 데이터 전년도의 12월
          
          this.byId("searchMonthYear").setMaxDate(dMaxDate)
          this.byId("searchMonthYear").setMinDate(dMinDate)
          this.getView().getModel("searchModel").setProperty("/yearMonth", new Date(oFindData.year, oFindData.month-1))
        },


        /**
         * 데이터 불러오기
         * @param {String} sUrl 
         * @returns 
         */
        _getData: async function (sModel, sUrl, filter) {
          let oModel = this.getOwnerComponent().getModel(sModel); //manifest의 모델 바인딩
          let aContexts = await oModel.bindList(sUrl, null, null, filter).requestContexts(0, 1000);
          let aData = await Promise.all(aContexts.map(oContext => oContext.requestObject())); // 요청한 데이터 배열 데이터로 변환
          return aData;
        },

        /**
         * 매출조직명 Dialog Open
         * @param {Event} oEvent 
         * @param {String} sFlag
         */
        onOrgSingleSelectDialogOpen: async function (oEvent, sFlag) {
          //해당 칸에 바인딩되어있는 데이터를 fragment에 전달하기 위한 source
          let oSource = oEvent.getSource();
          // fragment setting
          this._oOrgSingleSelectDialog = new OrgSingleSelect({
              fragmentController: this,
              bindingSource: oSource,
          });

          // fragment open
          this._oOrgSingleSelectDialog.open();
        },

        /**
         * 엑셀 Export
         */
        onExcelExport: function () {
          let workbook = new ExcelJS.Workbook();
          let worksheet = workbook.addWorksheet("Sheet1");

          let aBindingModel = this.getView().getModel("expenseCoModel").getData();
          // 헤더 추가
          let aColumns = ['seq', 'ERP Cost Center', '회계연도', '마감월',  '계정코드', '중계정', '1월 위임 비용', '2월 위임 비용', '3월 위임 비용','4월 위임 비용','5월 위임 비용','6월 위임 비용','7월 위임 비용','8월 위임 비용','9월 위임 비용','10월 위임 비용','11월 위임 비용','12월 위임 비용']
          let aBindingKeys = [ 'seq', 'ccorg_cd', 'year', 'month', 'gl_account', 'commitment_item', 'co_m1_amt', 'co_m2_amt', 'co_m3_amt','co_m4_amt','co_m5_amt','co_m6_amt','co_m7_amt','co_m8_amt','co_m9_amt','co_m10_amt','co_m11_amt','co_m12_amt']
          let aWidth = [6,14.9,8.6,8.6,18,18,18,18,18,18,18,18,18,18,18,18,18,18]
            
          let aHeader = [];
          for(let i=0; i < aColumns.length; i++){
            let oColumn = {
                header : aColumns[i],
                key : aBindingKeys[i],
                width : aWidth[i]
            }
            aHeader.push(oColumn)
          }
          worksheet.columns=aHeader;
          
          aBindingModel.forEach(function (oContext) {
            let oExcelRow = [];            
            //내용 추가
            aBindingKeys.forEach((sBindingKeys) => {
                if(sBindingKeys === 'ver' || sBindingKeys === 'flag'){
                    return;
                }
                if(sBindingKeys.includes("amt")){
                    oExcelRow.push(Number(oContext[sBindingKeys]))    
                } else {
                    if(sBindingKeys === "month"){
                        oExcelRow.push(oContext[sBindingKeys].padStart(2,'0'))
                    } else {
                        oExcelRow.push(oContext[sBindingKeys])
                    }
                    
                }
                
            })
            worksheet.addRow(oExcelRow);
          }.bind(this));          

          //정렬 맞추기
          // 숫자에서 문자 변환
          function numberToColumn(n){
            let s = '';
            while ( n > 0){
                let m = (n-1) % 26
                s = String.fromCharCode(65 + m) + s;
                n = Math.floor(((n-1)/26));
            }
            return s;
          }
          // A~F 가운데 정렬 1~6
          // G~R 뒤에 붙이기 6~마지막
          for(let i = 1; i < aHeader.length+1; i++){
            if( i < 6){
                worksheet.getColumn(numberToColumn(i)).eachCell(cell => {
                    cell.alignment = {horizontal: 'center', vertical: 'middle'}
                  })
            } else {
                worksheet.getColumn(numberToColumn(i)).eachCell(cell => {
                    cell.alignment = {horizontal: 'right', vertical: 'middle'}
                  })
                  worksheet.getColumn(numberToColumn(i)).numFmt = `"\\"#,##0.00;[Red]\\-"\\"#,##0.00`;
            }
            
          }
          // 헤더 가운데 정렬
          worksheet.getRow('1').eachCell(cell => {
            cell.alignment = {horizontal: 'center', vertical: 'middle'}
          })

          

          workbook.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `템플릿.xlsx`;
            link.click();
        });
      },

      /**
       * 엑셀 Import
       * @param {Event} oEvent 
       */
      onExcelImport: function (oEvent) {
          let aFile = oEvent.getParameters()["files"];
          let oFile = aFile && aFile[0];

          if (oFile && window.FileReader) {
              var reader = new FileReader();

              reader.onload = function (oEvent) {
                  var data = new Uint8Array(oEvent.target.result);
                  var workbook = XLSX.read(data, { type: 'array' });

                  workbook.SheetNames.forEach(async function (sheetName) {

                    let aExcelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                        header : [ 'seq', 'ccorg_cd', 'year', 'month', 'gl_account', 'commitment_item', 'co_m1_amt', 'co_m2_amt', 'co_m3_amt','co_m4_amt','co_m5_amt','co_m6_amt','co_m7_amt','co_m8_amt','co_m9_amt','co_m10_amt','co_m11_amt','co_m12_amt'],
                        range: 1 
                    });

                    // 비교 기준용 데이터 
                    let aBaseData = await this._tableDataRequest();

                    // 데이터 비교를 통해 key값 비교 ccorg_cd, gl_account, commitment_item, seq 등을 통하여 신규 혹은 업데이트를 비교한다.
                    aExcelData.forEach((oExcelData)=>{
                        //엑셀 데이터에 적용된 포멧터 해제
                        for(let i = 1; i < 13; i++){
                            Object(oExcelData)[`co_m${i}_amt`] = Object(oExcelData)[`co_m${i}_amt`].replace("₩", "")
                        }

                        // 데이터베이스의 데이터에 엑셀의 데이터와 교차하는 데이터 여부 확인
                        let isSameData = aBaseData.find(data=>
                            data.ccorg_cd === oExcelData.ccorg_cd && data.gl_account === oExcelData.gl_account && data.commitment_item === oExcelData.commitment_item && String(data.seq) === oExcelData.seq
                        )
                        if(!isSameData){
                            oExcelData.state = "Information"; //신규
                        } else {
                            // update 여부 확인을 위해 co_m1_amt ~ co_m12_amt 값을 비교 동시에 
                            let bUpdateFlag = true;
                            for(let i = 1; i < 13; i++){
                                if(bUpdateFlag === true ){                                
                                    bUpdateFlag = (Object(oExcelData)[`co_m${i}_amt`]===Object(isSameData)[`co_m${i}_amt`])
                                }
                            }

                            if(bUpdateFlag){
                                oExcelData.state = "None"
                            } else {
                                oExcelData.state = "Error"
                            }                                     
                        }
                    })
                    

                    // 날짜 업데이트
                    let dSearchDate = this.getView().getModel("searchModel").getProperty("/yearMonth");
                    aExcelData.forEach((oExcelData)=> {
                        oExcelData.year = dSearchDate.getFullYear();
                        oExcelData.month = dSearchDate.getMonth()+1;
                        }
                    )
                      if (aExcelData.length > 0) {
                          if (!this._excelUploadDialog) {
                              let sComponentName = this.getOwnerComponent().getMetadata().getComponentName();

                              await this.loadFragment({
                                  id: "excelUploadDialog",
                                  name: `${sComponentName}.view.fragment.ExcelUpload`,
                                  controller: this,
                              }).then(function (oDialog) {
                                  this._excelUploadDialog = oDialog;
                              }.bind(this));
                          }
                          let sExcelTableId = Fragment.createId("excelUploadDialog", "Table");
                          let oExcelTable = this.byId(sExcelTableId);
                          oExcelTable.setModel(new JSONModel(aExcelData), "excelUploadModel")                                                    
                          this._excelUploadDialog.open()
                          

                      } else {
                          MessageToast.show("데이터가 없습니다.");
                      }
                  }.bind(this));
              }.bind(this);

              reader.onerror = function (oError) {
                  console.error(oError);
              };

              reader.readAsArrayBuffer(oFile);
          };
      },

      /**
         * 엑셀 업로드 Dialog 저장 및 취소 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag 저장, 취소
         */
      onExcelUploadDialogButton: function (oEvent, sFlag) {
        if (sFlag === "Save") {
            let sExcelTableId = Fragment.createId("accountExcelUpload", "Table");
            let oExcelTable = this.byId(sExcelTableId);
            let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
            let bInvalid = aBindingContexts.find(function (oContext) {
                let oBindingObject = oContext.getObject();

                // 중복된 Account가 존재할 때
                let sExcelTableId = Fragment.createId("accountExcelUpload", "Table");
                let oExcelTable = this.byId(sExcelTableId);
                let aBindingContexts = oExcelTable.getBinding("rows").getContexts();
                let aAccount = aBindingContexts.map(oContext => oContext.getObject()["Account"]);
                let isInvalid = !!aAccount.find((sDt, index) => aAccount.indexOf(sDt) !== index);

                // 하나라도 유효하지 않으면 true 반환
                return !this._validateField(oBindingObject["Account"], "Department")
                    || this._aPropertyList.some((oProperty) => {
                        if (oProperty["value"] !== "A02"
                            && oProperty["value"] in oBindingObject
                            && oBindingObject[oProperty["value"]] !== undefined
                            && oBindingObject[oProperty["value"]] !== null) {
                            return !this._validateField(oBindingObject[oProperty["value"]], "Number")
                        } else {
                            return false
                        }
                    })
                    || isInvalid;
            }.bind(this));

            if (!!bInvalid) {
                MessageToast.show("유효하지 않은 데이터가 존재합니다.");
            } else {
                // 입력한 데이터 반영

                aBindingContexts.forEach(function (oContext) {
                    let oBindingObject = oContext.getObject();

                    // 둘 다 0일 때 해당 항목 무시
                    // if (Object.entries(oBindingObject).filter(([key]) => key !== "Account").every(([key,val]) => val === 0)) return;
                    if (this._aPropertyList.every(oProperty => (oBindingObject[oProperty["value"]] === null || oBindingObject[oProperty["value"]] === undefined || oBindingObject[oProperty["value"]] === "") && !oBindingObject[`${oProperty["value"]}_total_yn`])) return;
                    let oAddTargeTable = this.byId("accountTargetTable");
                    let aTableContext = oAddTargeTable.getBinding("rows").getContexts()
                    aTableContext.forEach(function (oAddTargetContext) {
                        if (oAddTargetContext.getObject()["account_nm"] === oBindingObject["Account"]) {
                            this._aPropertyList.forEach((oProperty) => {
                                if (oProperty["value"] in oBindingObject
                                    && oBindingObject[oProperty["value"]] !== undefined
                                    && oBindingObject[oProperty["value"]] !== null) {
                                    oAddTargetContext.setProperty("new_"+oProperty["value"]+"_data", Number(oBindingObject[oProperty["value"]]));
                                }
                                oAddTargetContext.setProperty("new_"+oProperty["value"]+"_total_yn", oBindingObject[`${oProperty["value"]}_total_yn`]);
                            })
                        }
                    }.bind(this));
                }.bind(this));

                this._excelUploadDialog.close();

             
                MessageToast.show("업로드되었습니다.");
            }
            this._setHighlight()
            this._excelUploadDialog.close();
        }
    },
    
    });
  });