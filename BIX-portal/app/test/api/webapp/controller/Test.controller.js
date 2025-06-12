sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/Messaging",
    "sap/ui/core/HTML"
], (Controller, JSONModel, MessageToast, NumberFormat, Messaging, HTML) => {
    "use strict";
    /**
     * @typedef {sap.ui.base.Event} Event
     */

    return Controller.extend("bix.test.api.controller.Test", {
        /**
         * 초기 실행 메소드
         */
        onInit: async function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Test");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function () {
            this._setChart();
            return;

            this.getView().setModel(new JSONModel({}), "localModel");

            // registerObject 메소드를 적용해야 valueState와 valueStateText가 UI에 적용됨
            let oField = this.byId("testAmount");
            Messaging.registerObject(oField, true);

            this.getView().setModel(new JSONModel({ editMode: false }), "uiModel");
            this.getView().setModel(new JSONModel([{
                name: "테스트1",
                amount: 1234
            }, {
                name: "테스트2",
            }]), "validModel");

            // SimpleForm 바인딩
            this._bindingForm();

            this.getView().setModel(new JSONModel({
                sale: 456,
                margin: 123
            }), "testModel");
        },

        _setChart: function () {
            let oBox = this.byId("chartBox");
            oBox.removeAllItems();

            const oHTML = new HTML({
                content: "<canvas id='chart1' width='480' height='240' >"
            });
            oBox.addItem(oHTML);

            oHTML.attachEventOnce("afterRendering", function () {
                const ctx = document.getElementById('chart1');

                // 데이터 설정
                const data = {
                    labels: ["Test Label", "Test Label2", "Test Label3"],
                    datasets: [
                        {
                            label: "Test1",
                            data: [10000, 20000, 30000],
                            yAxisID: "y",
                        },
                        {
                            label: "Test2",
                            data: [30000, 40000, 50000],
                            yAxisID: "y",
                        },
                        {
                            label: "Test3",
                            data: [50, -40, 10],
                            type: "line",
                            yAxisID: "y1",
                        },
                    ]
                };

                //차트 설정
                const options = {
                    responsive: true,
                    plugins: {
                        // legend: {
                        //     display: false,
                        //     position: 'bottom',
                        // },
                        // tooltip: {
                        //     enabled: false
                        // },
                        title: {
                            display: true,
                            text: "Test Chart",
                            position: "top"
                        }
                    },
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            position: "left",
                            stacked: true
                        },
                        y1: {
                            position: "right",
                            min: -100,
                            max: 100,
                            grid: {
                                display: false
                            }
                        }
                    }
                };

                //도넛 차트 가운데 문자 설정
                // let sCenterTextPlugin = {
                //     id: 'centerText',
                //     beforeDraw: function (chart) {
                //         let width = chart.width,
                //             height = chart.height,
                //             ctx = chart.ctx;

                //         // 상태 복원
                //         ctx.restore();
                //         let fontSize = 2;
                //         ctx.font = fontSize + "em sans-serif";
                //         ctx.fillStyle = '#000000';
                //         ctx.textBaseline = "middle";

                //         let text = sData,
                //             textX = Math.round((width - ctx.measureText(text).width) / 2),
                //             textY = 165;

                //         ctx.fillText(text, textX, textY);

                //         ctx.save();
                //     }
                // };
                // Chart.unregister(sCenterTextPlugin);
                // Chart.register(sCenterTextPlugin);

                new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: options,
                });
            }.bind(this));
        },

        /**
         * 조회 섹션 데이터 바인딩
         */
        _bindingForm: function () {
            // view에서 binding 속성을 이용해도 됨
            // this.byId("SimpleForm1").bindElement("/Test3('Test1')");

            // 생성 Form 바인딩 (GroupID 참고 : https://help.sap.com/docs/ABAP_PLATFORM_NEW/468a97775123488ab3345a0c48cadd8f/74142a38e3d4467c8d6a70b28764048f.html)
            let oModel = this.getOwnerComponent().getModel();
            let oBinding = oModel.bindList("/Test3", undefined, undefined, undefined, {
                $$updateGroupId: "create"
            });

            let oContext = oBinding.create({
                id: crypto.randomUUID()
            });
            this.byId("SimpleForm2").setBindingContext(oContext);
        },

        /**
         * 테이블 타이틀 설정
         * @param {Event} oEvent 
         */
        onTableDataEvent: function (oEvent) {
            let oHeaderContext = oEvent.getSource().getHeaderContext();
            this.byId("testTableTitle").setBindingContext(oHeaderContext);
        },

        /**
         * 수정/조회 버튼 전환 이벤트
         * @param {sap.ui.base.Event} oEvent 
         * @param {Boolean} bFlag 
         */
        onEdit: function (oEvent, bFlag) {
            this.getView().getModel("uiModel").setProperty("/editMode", !bFlag);

            // 수정했던 값 초기화
            if (bFlag) {
                this.byId("SimpleForm1").getBindingContext().resetChanges();
            }
        },

        /**
         * 수정된 데이터 저장 이벤트
         * @param {sap.ui.base.Event} oEvent 
         */
        onSave: function (oEvent) {
            let isInvalidInput = this.getView().getControlsByFieldGroupId("SimpleForm1").filter(function (object) {
                if (object.getFieldGroupIds().length > 0) {
                    // isInvalidInput 메소드는 mdc Field에서 dataType을 설정해야 함
                    return object.isInvalidInput();
                }
            }.bind(this));

            if (isInvalidInput.length) {
                MessageToast.show("필드를 확인해주세요.");
                return;
            }

            // submitBatch를 통해 수정된 데이터 batch로 말아서 요청 전송
            let oModel = this.getOwnerComponent().getModel();
            oModel.submitBatch(oModel.getUpdateGroupId()).then(function (oEvent) {
                // 조회 모드로 전환
                this.byId("EditButton").firePress();

                oModel.refresh();
            }.bind(this));
        },

        /**
         * 데이터 생성
         */
        onCreate: function () {
            // GroupId가 create인 요청만 서버에 전달함
            let oModel = this.getOwnerComponent().getModel();
            oModel.submitBatch("create").then(function (oEvent) {
                MessageToast.show("데이터가 \n생성되었습니다.");

                // 생성 폼에 새로운 데이터 바인딩
                this._bindingForm();

                // 수정했던 값 초기화
                oModel.refresh();
            }.bind(this));
        },

        /**
         * 데이터 삭제
         */
        onDelete: function () {
            let oTable = this.byId("testTable");
            let aSelectedIndices = oTable.getSelectedIndices();
            let aBindingContexts = oTable.getBinding("rows").getContexts();
            aBindingContexts.filter((oContext, index) => {
                if (aSelectedIndices.includes(index)) {
                    // 테이블 바인딩에서만 삭제됨
                    oContext.delete();
                }
            })

            // 삭제된 Context가 가리키는 데이터는 submitBatch에서 요청을 모아서 서버에 한 번에 전달함
            let oModel = this.getOwnerComponent().getModel();
            oModel.submitBatch(oModel.getUpdateGroupId()).then(function () {
                MessageToast.show("데이터가 \n삭제되었습니다.");

                // 수정했던 값 초기화
                oModel.refresh();
            }.bind(this));
        },

        /**
         * 마진율 Formatter
         * @param {String} sAmount 
         * @param {String} sMargin 
         * @returns {Number}
         */
        onMarginRate: function (sAmount, sMargin) {
            const oNumberFormat = NumberFormat.getPercentInstance({
                groupingSeparator: ',',
                decimals: 2
            });

            return (sAmount && sMargin) ? oNumberFormat.format(Number(sMargin) / Number(sAmount)) : null;
        },

        /**
         * LiveChange로 문자 제거
         * @param {Event} oEvent 
         */
        onValidLiveChange: function (oEvent) {
            // 문자 제거
            let iNewValue = parseInt(oEvent.getParameters()["newValue"]?.replace(/[^0-9]/g, "")) || null;
            let oSource = oEvent.getSource();
            oSource.setValue(iNewValue);

            // Clear 버튼 클릭 시 LiveChange 적용
            let sPath = oSource.getBindingContext("validModel");
            let sField = oSource.getBinding("value").getPath();
            this.getView().getModel("validModel").setProperty(`${sPath}/${sField}`, iNewValue);
        },

        /**
         * 선택한 데이터 저장
         */
        onValidSave: function () {
            let oTable = this.byId("validTable");
            let aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                MessageToast.show("저장할 데이터를 \n선택해주세요.");
                return;
            }

            let oModel = this.getOwnerComponent().getModel();
            let oBinding = oModel.bindList("/Test3", undefined, undefined, undefined, {
                $$updateGroupId: "valid"
            });

            let aBindingContexts = oTable.getBinding("rows").getContexts();
            aBindingContexts.filter((oContext, index) => {
                if (aSelectedIndices.includes(index)) {
                    let oBindingObject = oContext.getObject();
                    if (oBindingObject.id) {    // id가 있는 경우 (수정)
                        oBinding.update({
                            amount: oBindingObject.amount,
                            margin: oBindingObject.margin
                        });
                    } else {
                        oBinding.create({
                            id: crypto.randomUUID(),
                            name: oBindingObject.name,
                            amount: oBindingObject.amount,
                            margin: oBindingObject.margin
                        });
                    }
                }
            })

            oModel.submitBatch("valid").then(function () {
                let aChanges = oModel.hasPendingChanges("valid");
                if (!aChanges) {
                    MessageToast.show("데이터가 \n저장되었습니다.");
                } else {
                    MessageToast.show("데이터 저장에 \n실패하였습니다.");
                }
            }.bind(this));
        },

        // excel upload test
        onUpload: function (e) {
            this._import(e.getParameter("files") && e.getParameter("files")[0]);
        },

        // excel upload test
        _import: function (file) {
            var excelData = {};

            if (file && window.FileReader) {
                var reader = new FileReader();

                reader.onload = function (e) {
                    var data = new Uint8Array(e.target.result);
                    var workbook = XLSX.read(data, { type: 'array' });

                    workbook.SheetNames.forEach(function (sheetName) {
                        excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                    });

                    //excelData 데이터 수정을 통해 원하는 데이터만 업로드
                    this.getView().setModel(new JSONModel(excelData), "localModel");
                }.bind(this);

                reader.onerror = function (ex) {
                    console.error(ex);
                };

                reader.readAsArrayBuffer(file);
            };
        },

        //엑셀 템플릿 다운로드
        onTemplateDown: function () {
            let workbook = new ExcelJS.Workbook();
            let worksheet = workbook.addWorksheet("Sheet1");

            let rowValues = ["Name", "Age", "Job", "Address"];
            worksheet.addRow(rowValues);

            workbook.xlsx.writeBuffer().then((buffer) => {
                let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                let link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `템플릿.xlsx`;
                link.click();
            });
        }
    });
});