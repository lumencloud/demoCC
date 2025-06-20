sap.ui.define([
    "sap/ui/base/Object",
    "../util/JSONParser"
], function(BaseObject, JSONParser) {
    "use strict";

    var ApiService = BaseObject.extend("bix/common/ai/service/ApiService", {  // 경로 제거
        /**
         * 표준화된 Ajax 요청 실행
         * @param {Object} config - 요청 설정
         * @returns {Promise} 응답을 담은 Promise
         */
        executeRequest: function(config) {
            return new Promise(function(resolve, reject) {
                jQuery.ajax({
                    url: config.url,
                    method: config.method || "POST",
                    contentType: "application/json",
                    data: JSON.stringify(config.data || {}),
                    success: function(data) {
                        try {
                            var result = typeof data === 'string' ? JSON.parse(data) : data;
                            if (result.d) result = result.d; // OData 응답 처리
                            resolve(result);
                        }
                        catch (e) {
                            reject(e);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error("Ajax 오류:", status, error);
                        if (xhr.responseText) {
                            try {
                                var errorData = JSON.parse(xhr.responseText);
                                reject({
                                    status: xhr.status,
                                    message: errorData.error ? errorData.error.message : error,
                                    details: errorData
                                });
                            } catch(e) {
                                reject({
                                    status: xhr.status,
                                    message: error,
                                    responseText: xhr.responseText
                                });
                            }
                        } else {
                            reject({
                                status: xhr.status,
                                message: error
                            });
                        }
                    }
                });
            });
        },

        /**
         * 인터랙션 처리 시작 요청
         * @param {Object} interactionData - 인터랙션 데이터
         * @returns {Promise} 응답을 담은 Promise
         */
        startInteractionProcess: function(interactionData) {
            return this.executeRequest({
                url: "/odata/v4/ai-api/process_interaction",
                method: "POST",
                data: {
                    context: JSON.stringify(interactionData)
                }
            });
        },

        /**
         * 작업 상태 확인 요청
         * @param {String} taskId - 작업 ID
         * @returns {Promise} 상태 정보를 담은 Promise
         */
        checkTaskStatus: function(taskId) {
            return this.executeRequest({
                url: "/odata/v4/ai-api/check_task_status",
                method: "POST",
                data: {
                    taskId: taskId
                }
            });
        }
    });
    
    // 싱글톤 인스턴스 생성 및 반환
    var instance = new ApiService();
    return instance;
});