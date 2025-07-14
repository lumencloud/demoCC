sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/odata/v4/ODataModel",
	"sap/ui/core/format/NumberFormat"
], function (Controller, JSONModel, ODataModel, NumberFormat) {
	"use strict";

	return Controller.extend("bix.card.plAccountRodrTable.Main", {
		onInit: function () {
			this._bindTable();
		},

		onAfterRendering: function( ) {
			// 카드
            const oCard = this.getOwnerComponent().oCard;
            // Card 높이를 컨테이너 높이와 동일하게 구성
            let sCardId = oCard.getId();
            let oCardDom = document.getElementById(sCardId);
            let oParentElement = oCardDom.parentElement;
            // 대안 1. 초기 테이블 사이즈만 고정. 이 후 창크기 조절시 테이블 크기 미변화
            // oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${oParentElement.clientHeight}px`

            // 대안 2. session을 통해 윈도우 크기 및 카드 크기 저장 후 변화값을 측정하여 카드 크기 변경. 사용 가능하지만 session을 많이 사용해야함.
            let iInnerHeight;
            if(!sessionStorage.getItem('plAccountRodrTableWindow')){
                sessionStorage.setItem('plAccountRodrTableWindow', window.innerHeight.toString());
                sessionStorage.setItem('plAccountRodrTableDom', oParentElement.clientHeight.toString());
                iInnerHeight = oParentElement.clientHeight;
            }else{
                let iDelta = Number(sessionStorage.getItem('plAccountRodrTableWindow')) - window.innerHeight;
                if(iDelta > 0){
                    iInnerHeight = Number(sessionStorage.getItem('plAccountRodrTableDom')) - iDelta;
                }else if(iDelta < 0){
                    iInnerHeight = Number(sessionStorage.getItem('plAccountRodrTableDom')) + iDelta;
                }else{
                    iInnerHeight = Number(sessionStorage.getItem('plAccountRodrTableDom'));
                };
            };
            oCardDom.querySelector(".sapUiView .sapUiXMLView .sapUiViewDisplayBlock")['style'].height = `${iInnerHeight}px`
		},

		_bindTable: async function () {
			let oTable = this.byId("plAccountRodrTable");
			if (!oTable) {
				return;
			};

			oTable.setBusy(true);

            // oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // // 파라미터
            // let dYearMonth = new Date(oData.yearMonth);
            // let iYear = dYearMonth.getFullYear();
            // let sMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            // let sOrgId = oData.orgId;

			oTable.setVisible(false);
			oTable.destroyColumns();
			let oColumn0 = new sap.ui.table.Column({
				template: new sap.m.Text({ text: "{plAccountRodrTableModel>accountName}", emptyIndicatorMode: "On"}),
				hAlign: "Center",
				width: "10rem"
			});
			oColumn0.setLabel(new sap.m.Label({ text: '과제명' }));
			oTable.addColumn(oColumn0);

			const oPlModel = this.getOwnerComponent().getModel("pl_api");
            const oPlBindingContext = oPlModel.bindContext(`/get_rodr_account_y`);
			let aResults = await oPlBindingContext.requestObject();

			let aYear = Object.keys(aResults.value[0]).filter(key => key.startsWith('column')).map(key => key.replace('column',''));

			aYear.forEach(data=>{
				let oColumn1 = new sap.ui.table.Column({
					template: new sap.m.Text({
						text: {
							parts:[
								{path: `plAccountRodrTableModel>${'column'+data}`},
								{value: ""}
							],
							formatter: this.onFormatPerformance.bind(this)
						},
						tooltip: {
							parts: [
								{ path: `plAccountRodrTableModel>${'column'+data}`, targetType: 'any' },
								{ value: 'tooltip' }
							], formatter: this.onFormatPerformance.bind(this)
						},
						textAlign: "End", wrapping: false, width: '100%', emptyIndicatorMode: "On"
					}),
					hAlign: "Center"
				});
				oColumn1.addMultiLabel(new sap.m.Label({ text: data }));
				oTable.addColumn(oColumn1);
			});

			this.getView().setModel(new JSONModel(aResults.value), "plAccountRodrTableModel");
			this.getView().setModel(new JSONModel({cardInfo:"plAccountRodrTable"}),"selectModel");

			oTable.setVisible(true);
			oTable.setBusy(false);
		},

		/**
         * 필드 Formatter
         * @param {String} sType 
         * @param {*} iValue 기본값
         */
        onFormatPerformance: function (iValue, sType) {
            // 값이 없을 때 0으로 돌려보냄
            if (!iValue) iValue=0;

            if (sType === "percent") {         
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 2,
                });
                return oNumberFormat.format(iValue) + "%";
            } else if(sType === "tooltip" ){
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                });
                return oNumberFormat.format(iValue);
            } else {
                var oNumberFormat = NumberFormat.getFloatInstance({
                    groupingEnabled: true,
                    groupingSeparator: ',',
                    groupingSize: 3,
                    decimals: 0
                });
                return oNumberFormat.format(iValue/100000000);
            };
        },

		/**
         * PL account rodr 엑셀 다운로드
         */
        onExcelDownload: async function () {
			let oData = JSON.parse(sessionStorage.getItem("initSearchModel"));

            // 파라미터
            let dYearMonth = new Date(oData.yearMonth);
            let iYear = dYearMonth.getFullYear();
            let iMonth = String(dYearMonth.getMonth() + 1).padStart(2, "0");
            let sOrgId = oData.orgId;

            // 데이터 반환
            const oPlModel = this.getOwnerComponent().getModel("pl_api");
            const oPlBindingContext = oPlModel.bindContext(`/get_rodr_account_y`);

            // Excel Workbook 생성
            const workbook = new ExcelJS.Workbook();

            await Promise.all([
                oPlBindingContext.requestObject(),
            ]).then(function (aResult) {
                let fnSetWorksheet = function (sSheetName, aData) {
                    // Sheet 추가
                    const worksheet = workbook.addWorksheet(sSheetName);

                    // 컬럼 설정
                    let aColumns = [];
                    for (let sKey in aData[0]) {
                        let oColumn = {
                            key: sKey,
                            header: sKey,
                        };

                        aColumns.push(oColumn);
                    }

                    worksheet.columns = aColumns;

                    // 데이터 설정
                    for (let i = 0; i < aData.length; i++) {
                        worksheet.addRow(aData[i]);
                    }
                };

                fnSetWorksheet("Rodr DT", aResult[0].value);
            }.bind(this));

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `Rodr Account Raw Data_${iYear}-${iMonth}.xlsx`;
            link.click();

            setTimeout(() => { URL.revokeObjectURL(url) }, 100);
        },
		onChange:function(){
			let sCardInfo = this.getView().getModel("selectModel").getProperty("/cardInfo")
			this.getOwnerComponent().oCard.setManifest(`../bix/card/${sCardInfo}/manifest.json`)
		},
	});
});