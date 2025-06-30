sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "bix/common/library/control/Modules",
    "sap/ui/core/Messaging",
    "sap/m/plugins/UploadSetwithTable",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, JSONModel, MessageToast, Module, Messaging, UploadSetwithTable, Filter, FilterOperator) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     * @typedef {sap.ui.richtexteditor.RichTextEditor} RichTextEditor
     */
    return Controller.extend("bix.master.faq.controller.Create", {
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const oRoute = this.getOwnerComponent().getRouter().getRoute("Create");
            oRoute.attachPatternMatched(this.onPatternMatched, this);
        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onPatternMatched: function () {
            // 이전 내용이 보이지 않게 View의 content Aggregation을 초기화
            this.getView().invalidate("content");

            // 초기 모델 설정
            this._setModel();

            // SimpleForm에 더미 데이터 바인딩
            let oModel = this.getOwnerComponent().getModel();
            let oListBinding = oModel.bindList("/FaqHeader", undefined, undefined, undefined, {
                $$updateGroupId: "create",
                $expand: "files",
            })
            let oContext = oListBinding.create({
                category_ID: "7c7e8e31-b24c-4d0f-9948-87e711ed421c",
            })
            this.byId("simpleForm").setBindingContext(oContext);


            //첨부파일 선택에 따른 다운로드,삭제 버튼 활성 비활성화
            const oTable = this.byId("uploadSetTable");
            oTable.attachRowSelectionChange(() => {
                const aContexts = oTable.getSelectedIndices();
                const isSelection = aContexts.length > 0;
                this.byId("deleteButton").setEnabled(isSelection);
            })

            // PropertyChange 이벤트 설정 
            //livechange 같은 기능 모델데이터 변경감지
            oModel.attachPropertyChange((oEvent) => {
                let oContext = oEvent.getParameters()["context"];
                let oBindingObject = oContext.getObject();

                // RTE는 값이 모델에 바로 반영되지 않으므로 Editor 자체에서 값을 가져옴
                let oEditor = this.byId("richTextEditor")._oEditor;
                let sContent = oEditor.getContent();

                // 제목과 내용이 입력되어 있을 때 저장 버튼 활성화
                let isEnabled = !!oBindingObject.title?.trim() && !!sContent;
                this.getView().getModel("uiModel").setProperty("/save", isEnabled);
            });
        },


        //actionsplaceholder 텍스트 변경
        onAfterRendering: function () {
            //actionsplaceholder 텍스트 변경
            const oUploadButton = this.byId("uploadButton");
            oUploadButton.mAggregations._actionButton.setProperty("buttonText", "업로드");
            oUploadButton.mAggregations._actionButton.setProperty("style", "Default");
            oUploadButton.mAggregations._actionButton.addStyleClass("custom-uploader-btn");

        },

        /**
         * 초기 모델 설정
         */
        _setModel: function () {
            // ui 모델 설정
            this.getView().setModel(new JSONModel({
                save: false,
                hasError: false,
            }), "uiModel");

            // 메시지 모델 설정
            Messaging.removeAllMessages();
            let oMessageModel = Messaging.getMessageModel();
            let oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
                new Filter("technical", FilterOperator.EQ, true)
            );

            this.getView().setModel(oMessageModel, "messageModel");
            oMessageModelBinding.attachChange((oEvent) => {
                // let aContexts = oEvent.getSource().getContexts();

                // ValueState Error인 것이 있을 때 hasErrorMessage 속성을 true로 설정
                let hasError = this.getView().getModel("messageModel").getData().length > 0;
                this.getView().getModel("uiModel").setProperty("/hasError", hasError);
            });
        },

        /**RichTextEditor 플러그인 추가 설정
         * RichTextEditor Plugin (https://www.tiny.cloud/docs/tinymce/6/image/)
         * @param {Event} oEvent 
         */
        onBeforeEditorInit: function (oEvent) {
            let oRTE = /** @type {RichTextEditor} */ (oEvent.getSource());
            oRTE.setBusy(false);

            let oConfig = oEvent.getParameters()["configuration"];

            // 플러그인 추가
            oConfig.plugins.push("code", "image", "media", "emoticons", "fullscreen");

            // 툴바 순서 설정
            oConfig.toolbar = "fontsize forecolor backcolor | " + oConfig.toolbar;
            oConfig.toolbar += " | code image media emoticons fullscreen";

            // image 버튼에 File Picker 추가
            oConfig.file_picker_types = "image media";
            oConfig.file_picker_callback = (cb, value, meta) => {
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");

                input.addEventListener("change", (e) => {
                    const file = e.target.files[0];

                    const reader = new FileReader();
                    reader.addEventListener("load", () => {
                        const id = "blobid" + (new Date()).getTime();
                        const blobCache = tinymce.activeEditor.editorUpload.blobCache;
                        const base64 = reader.result.split(",")[1];
                        const blobInfo = blobCache.create(id, file, base64);
                        blobCache.add(blobInfo);

                        cb(blobInfo.blobUri(), { title: file.name });
                    });

                    reader.readAsDataURL(file);
                });

                input.click();
            };

            // 기본 폰트 설정
            oConfig.content_style = "body {font-family:Montserrat,sans-serif; font-size:16px }";

            // Eidtor에서 동영상 재생 가능
            oConfig.media_live_embeds = true;
        },

        /**
         * RichTextEditor가 준비됐을 때 실행되는 이벤트
         * @param {Event} oEvent 
         */
        onEditorReady: function (oEvent) {
            let oRTE = /** @type {RichTextEditor} */ (oEvent.getSource());

            // Editor 내부에서 liveChange 설정
            let oApi = /** @type {Object} */ (oRTE.getNativeApi());
            oApi.on("input", (oEvent) => {
                let oModel = this.getOwnerComponent().getModel();
                let oContext = this.byId("simpleForm").getBindingContext();

                // 모델의 propertyChange 이벤트를 강제 실행
                oModel.firePropertyChange({ context: oContext });
            })

            oRTE.setBusy(false);
        },

        /**
         * Footer 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag save: 저장, cancel: 취소 
         */
        onFooterButton: async function (oEvent, sFlag) {
            let oModel = this.getOwnerComponent().getModel();

            if (sFlag === "save") { // 저장 버튼
                // 저장 확인
                let bConfirm = await Module.messageBoxConfirm('information', '저장하시겠습니까?', 'FAQ 저장');
                if (!bConfirm) return;

                // 서버에 요청 전송
                oModel.submitBatch("create").then(
                    // 저장 성공 시
                    function () {
                        this.getView().setBusy(false);

                        MessageToast.show("저장이 완료되었습니다.");

                        // 생성된 게시글의 상세 페이지로 이동
                        let oContext = this.byId("simpleForm").getBindingContext();
                        let sId = oContext.getObject("ID");
                        this.getOwnerComponent().getRouter().navTo("Detail", { id: sId });
                    }.bind(this),
                    // 저장 실패 시
                    function () {
                        this.getView().setBusy(false);

                        MessageToast.show("저장에 실패하였습니다.");
                    }.bind(this)
                )
            } else if (sFlag === "cancel") {  // 취소버튼 

                const oContext = this.byId("simpleForm").getBindingContext();
                const oData = oContext.getObject();
                // 요청 취소
                //제목, 내용, 첨부파일에 값이 있는 경우 confirm
                //haspendingchange는 처음 category를 create하여 작동안되어서 각각 확인
                if (!!oData.title?.trim() || !!oData.content?.trim() || (Array.isArray(oData.files) && oData.files.length > 0)) {

                    let bConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                    if (!bConfirm) return;
                }

                //pending 초기화후 메인페이지로 이등
                oModel.resetChanges("create");
                this.getOwnerComponent().getRouter().navTo("Main");
            };

            // 메시지 모델 초기화
            Messaging.removeAllMessages();
        },

        /**
         * 파일 업로드 성공 시 create 요청 생성
         * @param {Event} oEvent 
         */
        onUploadCompleted: function (oEvent) {
            const oItem = oEvent.getParameter("item");
            const oFileObject = oItem.getFileObject();
            const sThumbnailUrl = URL.createObjectURL(oFileObject);

            const oFileReader = new FileReader();
            oFileReader.onload = function () {
                let oUploadSetTable = this.byId("uploadSetTable");
                let oListBinding = oUploadSetTable.getBinding("rows");


                oListBinding.create({
                    name: oFileObject.name,                    
                    // 기본적으로 적용이 되지않는 확장자의 경우  type이 ""로 나옴 그럴경우 . 이후의 확장자를 가져와서 입력
                    type: oFileObject.type === "" ?
                        oFileObject.name.split(".").pop().toLowerCase() : oFileObject.type,
                    size: oFileObject.size,
                    content: oFileReader.result.split(",")[1],  // base64 떼고 보냄
                    url: sThumbnailUrl,
                });


            }.bind(this);

            oFileReader.readAsDataURL(oFileObject);
        },

        /**
         * 파일 삭제
         * @param {*} oEvent 
         */
        onDeleteSelectedFiles: async function (oEvent) {
            // 아이템 삭제
            const oTable = this.byId("uploadSetTable");
            const aContexts = oTable.getSelectedIndices().map((iIndex) => oTable.getContextByIndex(iIndex));

            if (aContexts.length > 0) {
                // 삭제 확인
                let bConfirm = await Module.messageBoxConfirm('warning', '파일을 삭제하시겠습니까?', '파일 삭제');
                if (!bConfirm) return;
                aContexts.forEach((oContext) => {
                    oContext.delete();
                });
            }
        },


        //플러그인 활성화
        onPluginActivated: function (oEvent) {
            this.oUploadPluginInstance = oEvent.getParameter("oPlugin");
        },


        //테이블에서 미리보기 기능 
        //플러그인 기능
        openPreview: function (oEvent) {
            const oSource = oEvent.getSource();
            const oBindingContext = oSource.getBindingContext();
            if (oBindingContext && this.oUploadPluginInstance) {
                this.oUploadPluginInstance.openFilePreview(oBindingContext);
            }
        },

        /**
         * 파일 사이즈 Formatter
         * @param {String} sFileType 파일 타입
         * @param {String} sFileName 파일명
         * @returns {String} 아이콘 반환 
         */
        formatFileIconSrc: function (sFileType, sFileName) {
            // 이미지일 때 파일 아이콘 null 반환
            if (sFileType?.includes("image")) return null;

            return UploadSetwithTable.getIconForFileType(sFileType, sFileName);
        },

        /**
         * 파일 사이즈 Formatter
         * @param {String} sFileSize 파일 크기
         * @returns {String}
         */
        formatFileSize: function (sFileSize) {
            if (sFileSize) {
                // 콤마 제거
                let iFileSize = parseInt(sFileSize.replaceAll(",", ""));
                return UploadSetwithTable.getFileSizeWithUnits(iFileSize);
            }
        },

        /**
         * 파일 썸네일 이미지 Visible Formatter
         * @param {String} sFileType 파일 유형
         * @returns {Boolean}
         */
        formatImageVisible: function (sFileType) {
            // 파일 타입에 image가 포함되어 있으면 true 반환
            return sFileType?.includes("image");
        },

        /**
         * 파일 썸네일 아이콘 Visible Formatter
         * @param {String} sFileType 파일 유형
         * @returns {Boolean}
         */
        formatIconVisible: function (sFileType) {
            // 파일 타입에 image가 포함되어 있으면 false 반환
            return !sFileType?.includes("image");
        }
    });
});