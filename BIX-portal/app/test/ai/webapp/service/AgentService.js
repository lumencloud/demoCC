sap.ui.define([
    "sap/ui/base/Object",
    "./ApiService",
    "../util/AsyncTaskManager"
], (BaseObject, ApiService, AsyncTaskManager) => {
    "use strict";

    var AgentService = BaseObject.extend("bix.test.ai.service.AgentService", {
        constructor: function() {
            BaseObject.call(this);

            // AsyncTaskManager 인스턴스 생성
            this._taskManager = new AsyncTaskManager();
        },

        /**
         * 인터랙션 처리 (시작부터 결과까지 전체 프로세스)
         * @param {Object} context - 인터랙션 컨텍스트
         * @param {Object} options - 처리 옵션
         * @returns {Promise} 결과를 담은 Promise
         */
        processInteraction: function(context, options = {}) {
            const defaultOptions = {
                showBusyDialog: true,
                busyDialogTitle: "AI 분석 진행 중",
                busyDialogText: "잠시만 기다려주세요.",
                showProgressPercentage: true,
                progressMessages: {
                    0: "데이터를 분석 중입니다.",
                    30: "인사이트를 생성하고 있습니다.",
                    60: "분석 결과를 정리하는 중 입니다."
                },
                pollOptions: {
                    pollInterval: 3000,
                    maxTries: 40,
                    initialDelay: 1000
                }
            };
            
            // 옵션 병합
            const mergedOptions = this._mergeOptions(defaultOptions, options);
            
            // 작업 시작 함수
            const startFn = () => {
                return ApiService.startInteractionProcess(context);
            };
            
            // 작업 상태 확인 함수
            const checkFn = (taskId) => {
                return ApiService.checkTaskStatus(taskId);
            };
            
            // AsyncTaskManager를 통한 작업 실행
            return this._taskManager.executeTask(startFn, checkFn, mergedOptions);
        },
        
        /**
         * 작업 취소
         * @param {String} taskId - 작업 ID
         * @returns {Boolean} 취소 성공 여부
         */
        cancelTask: function(taskId) {
            return this._taskManager.cancelTask(taskId);
        },
        
        /**
         * 작업 상태 조회
         * @param {String} taskId - 작업 ID
         * @returns {Object|null} 작업 상태 정보
         */
        getTaskStatus: function(taskId) {
            return this._taskManager.getTaskStatus(taskId);
        },
        
        /**
         * 모든 작업 상태 조회
         * @returns {Array} 모든 작업 상태 정보
         */
        getAllTaskStatus: function() {
            return this._taskManager.getAllTaskStatus();
        },
        
        /**
         * 옵션 객체 병합
         * @private
         */
        _mergeOptions: function(defaultOptions, userOptions) {
            const result = Object.assign({}, defaultOptions);
            
            if (!userOptions) return result;
            
            Object.keys(userOptions).forEach(key => {
                // 객체인 경우 재귀적으로 병합
                if (typeof userOptions[key] === 'object' && 
                    userOptions[key] !== null && 
                    !Array.isArray(userOptions[key]) &&
                    typeof result[key] === 'object' &&
                    result[key] !== null &&
                    !Array.isArray(result[key])) {
                    result[key] = this._mergeOptions(result[key], userOptions[key]);
                } else {
                    // 객체가 아닌 경우 값 대체
                    result[key] = userOptions[key];
                }
            });
            
            return result;
        }
    });
    
    // 싱글톤 인스턴스 생성 및 반환
    var instance = new AgentService();
    return instance;
});