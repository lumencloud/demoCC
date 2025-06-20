sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/plugins/UploadSetwithTable",
    "bix/common/library/control/Modules",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, JSONModel, MessageToast, UploadSetwithTable, Module, Messaging, Filter, FilterOperator) => {
    "use strict";

    /**
     * @typedef {sap.ui.base.Event} Event
     * @typedef {sap.ui.model.json.JSONModel} JSONModel
     * @typedef {sap.ui.richtexteditor.RichTextEditor} RichTextEditor
     */
    return Controller.extend("bix.master.faq.controller.Detail", {
        /**
         * 초기 실행 메소드
         */
        onInit: function () {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("Detail");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);

        },

        /**
         * 프로젝트 목록 페이지 라우팅 시 실행 코드
         */
        onMyRoutePatternMatched: async function (oEvent) {
            this.getView().setBusy(true);

            // 이전 내용이 보이지 않게 View의 content Aggregation을 초기화
            this.getView().invalidate("content");

            //수정 관련 ui model
            const oUiModel = new JSONModel({ save: false, hasError: false, edit: false, fileCount: 0 });
            this.getView().setModel(oUiModel, "uiModel");
            this.bBackCheck = false
            //테이블 초기 세팅
            this._setModel();

            // SimpleForm에 데이터 바인딩
            const sId = oEvent.getParameter("arguments").id;
            const sPath = `/FaqHeader('${sId}')`;

            let oModel = this.getOwnerComponent().getModel();
            this.byId("simpleForm").bindElement({
                path: sPath,
                parameters: {
                    $$updateGroupId: "update",
                    $expand: "files,user,category"
                },
                events: {
                    dataReceived: async (oEvent) => {
                        // simpleForm에 바인딩된 count 반환
                        let oBindingContext = oEvent.getSource().getBoundContext();

                        //첨부파일갯수 
                        this.getView().getModel("uiModel").setProperty("/fileCount", oBindingContext.getObject("files").length);


                        let sBindingPath = oBindingContext.getPath();
                        let iCount = oBindingContext.getObject("count");

                        // 조회수 +1 (faq_user에 로그인한 사용자가 존재하지 않을 때만 - 사용자 정보는 PL)
                        // 사용자 정보는 PL - performance2 Component.js의 userModel 참고
                        const sId = this.getOwnerComponent().getModel("userModel").getProperty("/name");

                        // updateGroupId 없이 서버에 바로 요청
                        if (!this.bBackCheck) {
                            oBindingContext.setProperty("count", ++iCount);
                            oModel.submitBatch("update");
                        }

                        //로그인된 사용자가 존재할경우
                        if (sId) {
                            //조회여부 체크
                            const oUserBinding = oModel.bindList(sBindingPath + "/user", null, null, null, {
                                $$updateGroupId: "update"
                            });

                            const aContexts = await oUserBinding.requestContexts();
                            // 조회기록 있을경우 체크후 없는경우에만 추가
                            const oExist = aContexts.find(oContext => oContext.getObject("user_id") === sId);
                            if (!oExist) {
                                await oUserBinding.create({ user_id: sId });
                                oModel.submitBatch("update");
                            }

                        }
                        
                        this.getView().setBusy(false);

                    }
                }
            })

            
            //첨부파일 선택에 따른 다운로드,삭제 버튼 활성 비활성화
            const oTable = this.byId("uploadSetTable");
            oTable.attachRowSelectionChange(() => {
                const aContexts = oTable.getSelectedIndices();
                const isSelection = aContexts.length > 0;
                this.byId("downloadButton").setEnabled(isSelection);
                this.byId("deleteButton").setEnabled(isSelection);
            })

            // UploadSetTable 데이터 변경 시 발생하는 이벤트
            oTable.getBinding("rows").attachChange((oEvent) => {
                // 수정 상태일 때만 유효성 검사 활성화
                let isEdit = this.getView().getModel("uiModel").getProperty("/edit");
                if (isEdit) {
                    this._checkValidation();
                }
            });

            // PropertyChange 이벤트 설정
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

        /**
         * 저장버튼 활성화를 위한 필수값 유효성 검사
         */
        _checkValidation: function () {
            // RTE는 값이 모델에 바로 반영되지 않으므로 Editor 자체에서 값을 가져옴
            let oEditor = this.byId("richTextEditor")._oEditor;
            let sContent = oEditor.getContent();

            const oContext = this.byId("simpleForm").getBindingContext();
            const sTitle = oContext?.getObject().title;

            // 제목과 내용이 입력되어 있을 때 저장 버튼 활성화
            let isEnabled = !!sTitle?.trim() && !!sContent?.trim();
            this.getView().getModel("uiModel").setProperty("/save", isEnabled);
        },

        /**
         * 드래그 앤 드롭 dom으로 막기,actionsplaceholder 텍스트 변경
         */
        onAfterRendering: function () {
            const oUploadSetTable = this.byId("uploadSetTable");
            const oDomRef = oUploadSetTable.getDomRef();
            oUploadSetTable.getAggregation("noData").setProperty("description", "첨부파일이 없습니다.")

            //"dragenter", "dragover", "drop" 를 막아서 수정하기전 테이블에 파일첨부 방지
            if (oDomRef) {
                ["dragenter", "dragover", "drop"].forEach(eventName => {
                    oDomRef.addEventListener(eventName, e => {
                        e.preventDefault();
                        e.stopPropagation();
                        MessageToast.show("드래그앤드롭 불가");
                    }, true);
                })
            }

            //actionsplaceholder 텍스트 변경
            const oUploadButton = this.byId("uploadButton");
            oUploadButton.mAggregations._actionButton.setProperty("buttonText", "업로드");

        },

        /**
         * 뒤로 가기
         */
        onBack: function (oEvent) {
            if (this.getView().getModel("uiModel").getProperty("/edit")) {
                this.onFooterButton(oEvent, 'cancel')
            } else {
                this.getOwnerComponent().getRouter().navTo("Main");
            }


        },

        /**
         * 초기 모델 설정
         */
        _setModel: function () {
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

        /**
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

                // 기본적으로 적용이 되지않는 확장자의 경우 . 이후의 확장자를 가져와서 입력
                let sFileType = (!oFileObject.type) ? oFileObject.name.split(".").pop().toLowerCase() : oFileObject.type;
                oListBinding.create({
                    name: oFileObject.name,
                    type: sFileType,
                    size: oFileObject.size,
                    content: oFileReader.result.split(",")[1],  // base64 떼고 보냄
                    url: sThumbnailUrl,
                });

                // 필수값 유효성 검사
                this._checkValidation();

                
                //첨부파일갯수 정정
                this.getView().getModel("uiModel").setProperty("/fileCount", oListBinding.getLength());

            }.bind(this);

            oFileReader.readAsDataURL(oFileObject);
        },

        /**
         * 파일 선택 삭제
         * @param {*} oEvent 
         */
        onDeleteFiles: async function (oEvent) {
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

                // 필수값 유효성 검사
                this._checkValidation();
            }
            
            //첨부파일갯수 정정
            this.getView().getModel("uiModel").setProperty("/fileCount", oTable.getBinding("rows").getLength());
        },

        /**
         * 업로드셋 테이블 플러그인 활성화 완료 이벤트
         * @param {Event} oEvent 
         */
        onPluginActivated: function (oEvent) {
            this.oUploadPluginInstance = oEvent.getParameters()["oPlugin"];
        },

        /**
         * 파일 다운로드
         * @param {Event} oEvent 
         */
        onDownloadFiles: function (oEvent) {
            const oTable = this.byId("uploadSetTable");
            const aContexts = oTable.getSelectedIndices().map((iIndex) => oTable.getContextByIndex(iIndex));

            if (aContexts.length > 0) {
                aContexts.forEach((oContext) => {
                    const sId = oContext.getObject().ID;
                    const sOldUrl = oContext.getObject().url;
                    const sNewUrl = this.formatFilePath(sId, sOldUrl);

                    oContext.setProperty("url", sNewUrl);

                    this.oUploadPluginInstance.download(oContext, true);
                });
            }
        },

        /**
         * 업로드셋 테이블 파일 미리보기 클릭 이벤트
         * @param {Event} oEvent 
         */
        openPreview: function (oEvent) {
            const oSource = oEvent.getSource();
            const oBindingContext = oSource.getBindingContext();
            if (oBindingContext && this.oUploadPluginInstance) {
                const sId = oBindingContext.getObject().ID;
                const sOldUrl = oBindingContext.getObject().url;
                const sNewUrl = this.formatFilePath(sId, sOldUrl);

                oBindingContext.setProperty("url", sNewUrl);
                this.oUploadPluginInstance.openFilePreview(oBindingContext);
            }
        },


        
        /**
         * Footer 버튼 클릭 이벤트
         * @param {Event} oEvent 
         * @param {String} sFlag save:저장, cancel: 취소, edit: 수정, delete: 삭제
         * @returns 
         */
        onFooterButton: async function (oEvent, sFlag) {
            const oModel = this.getView().getModel();

            if (sFlag === "save") { // 저장버튼
                
                //조회수 증가 방지
                this.bBackCheck = true


                // 저장 확인
                let bConfirm = await Module.messageBoxConfirm('information', '저장하시겠습니까?', 'FAQ 저장');
                if (!bConfirm) return;

                this.getView().setBusy(true);

                // 서버에 요청 전송
                oModel.submitBatch("update").then(
                    // 저장 성공 시
                    function () {
                        this.getView().setBusy(false);

                        MessageToast.show("저장이 완료되었습니다.");

                        this.getView().getModel("uiModel").setProperty("/edit", false);

                        //기존 내용 삭제
                        // this.getView().getModel("uiModel").setProperty("/content", "");

                        //content 내용 다시 가져오기
                        const oContext = this.byId("simpleForm").getBindingContext();
                        // this.getView().getModel("uiModel").setProperty("/content", oContext.getProperty("content"));

                        this.getView().getModel("uiModel").setProperty("/save", false);


                        oModel.refresh();

                    }.bind(this),
                    // 저장 실패 시
                    function (oError) {
                        console.error(oError);
                        this.getView().setBusy(false);

                        MessageToast.show("저장에 실패하였습니다.");
                    }.bind(this)
                )

            } else if (sFlag === "cancel") {  //취소버튼 
                if (oModel.hasPendingChanges()) {
                    let bConfirm = await Module.messageBoxConfirm('warning', '작성된 내용은 저장되지 않습니다. 취소하시겠습니까?', '취소 확인');
                    if (!bConfirm) return;
                }
                const oContext = this.byId("simpleForm").getBindingContext();
                this.getView().getModel("uiModel").setProperty("/save", false);


                oModel.resetChanges("update");
                oModel.refresh();

                //조회수 증가 방지
                this.bBackCheck = true
                this.getView().getModel("uiModel").setProperty("/save", false);
                this.getView().getModel("uiModel").setProperty("/hasError", false);
                this.getView().getModel("uiModel").setProperty("/edit", false);
            } else if (sFlag === "edit") {  //수정버튼 
                this.getView().getModel("uiModel").setProperty("/edit", true);

                //수정할경우 첨부파일 visible true전환
                this.byId("uploadSetTable").setVisible(true);
                this.byId("uploadText").setVisible(true);
            } else if (sFlag === "delete") {  //삭제버튼 
                // 삭제 확인
                let bConfirm = await Module.messageBoxConfirm('warning', '삭제하시겠습니까?', 'FAQ 삭제');
                if (!bConfirm) return;

                this.getView().setBusy(true);

                // delete_yn을 true로 변경
                let oBindingContext = this.byId("simpleForm").getBindingContext();
                oBindingContext.setProperty("delete_yn", true);

                // 서버에 요청 전송
                oModel.submitBatch("update").then(
                    // 저장 성공 시
                    function () {
                        this.getView().setBusy(false);

                        MessageToast.show("삭제가 완료되었습니다.");

                        // 메인 화면으로 이동
                        this.getOwnerComponent().getRouter().navTo("Main");
                    }.bind(this),
                    // 저장 실패 시
                    function (oError) {
                        console.error(oError);
                        this.getView().setBusy(false);

                        MessageToast.show("삭제에 실패하였습니다.");
                    }.bind(this)
                )

                return;
            };

            // 메시지 모델 초기화
            Messaging.removeAllMessages();
        },

        /**
         * 썸네일 파일 경로 Formatter
         * @param {String} sId 파일 타입
         * @param {String} sUrl 임시 URL
         */
        formatFilePath: function (sId, sUrl) {
            if (sId) {  // ID가 있는 경우 -> 기존 아이템의 경우 경로 지정
                return `/odata/v4/cm/FaqFile('${sId}')/content`;
            } else {    // 임시 아이템의 경우 url 반환
                return sUrl;
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
        },


        //첨부파일 없는 경우 visible처리 
        /**
         * 
         * @param {*} aFiles  파일 배열
         * @returns {Boolean}
         */
        isFileVisible:function(aFiles){
            return Array.isArray(aFiles) && aFiles.length>0 && this.getView();
        }

    });
});