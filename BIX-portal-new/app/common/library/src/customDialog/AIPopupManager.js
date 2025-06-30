sap.ui.define([
    "sap/ui/base/Object",
    "./AiReport"
], function (BaseObject, AiReport) {
    "use strict";

    return BaseObject.extend("bix.common.library.AIPopupManager", {
        constructor: function() {
            BaseObject.call(this);
            this._oCurrentDialog = null;
            this._currentAnalysisId = null;
            this._cancelledAnalysisIds = new Set();
        },

        /**
         * 로딩 상태로 팝업 표시
         */
        showLoadingPopup: function(oTokenData, sCardName, oController) {
            // 이전 팝업 정리
            this._closeCurrentDialog();

            // 새 분석 ID 생성
            this._currentAnalysisId = this._generateAnalysisId();

            // 로딩 상태의 기본 agentInfo
            const loadingAgentInfo = {
                name: "에이전트 선택 중",
                description: "적절한 AI 에이전트를 선택하고 있습니다",
                iconPath: ""
            };
            
            this._oCurrentDialog = new AiReport({
                cardName: sCardName,
                fragmentController: oController,
                agentInfo: loadingAgentInfo,
                aiContent: "AI 분석 중",
                tokenData: oTokenData,
                isLoading: true,
                analysisId: this._currentAnalysisId
            });

            // 팝업 닫기 이벤트 연결
            this._oCurrentDialog.attachAfterClose(() => {
                this._cancelAnalysis(this._currentAnalysisId);
            });

            this._oCurrentDialog.open();
            return this._currentAnalysisId;
        },

        /**
         * 팝업 내용 업데이트
         */
        updateContent: function(analysisId, oContentData) {
            if (this._isValidAnalysis(analysisId) && this._oCurrentDialog) {
                this._oCurrentDialog.updateContent(oContentData);
            }
        },

        /**
         * 진행률 업데이트
         */
        updateProgress: function(analysisId, iProgress) {
            if (this._isValidAnalysis(analysisId) && this._oCurrentDialog) {
                this._oCurrentDialog.updateProgress(iProgress);
            }
        },

        /**
         * 분석 취소
         */
        cancelAnalysis: function(analysisId) {
            this._cancelAnalysis(analysisId);
        },

        /**
         * 분석이 유효한지 확인 (취소되지 않았는지)
         */
        isValidAnalysis: function(analysisId) {
            return this._isValidAnalysis(analysisId);
        },

        /**
         * 현재 다이얼로그 닫기
         */
        closeDialog: function() {
            this._closeCurrentDialog();
        },

        /**
         * 분석 ID 생성
         * @private
         */
        _generateAnalysisId: function() {
            return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        /**
         * 분석 취소
         * @private
         */
        _cancelAnalysis: function(analysisId) {
            if (analysisId) {
                this._cancelledAnalysisIds.add(analysisId);
                console.log("분석 취소:", analysisId);
            }
        },

        /**
         * 유효한 분석인지 확인
         * @private
         */
        _isValidAnalysis: function(analysisId) {
            return analysisId && 
                   analysisId === this._currentAnalysisId && 
                   !this._cancelledAnalysisIds.has(analysisId);
        },

        /**
         * 현재 다이얼로그 정리
         * @private
         */
        _closeCurrentDialog: function() {
            if (this._oCurrentDialog) {
                this._oCurrentDialog.destroy();
                this._oCurrentDialog = null;
            }
        }
    });
});