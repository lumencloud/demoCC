sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/BusyDialog"
], function(BaseObject, BusyDialog) {
    "use strict";

    return BaseObject.extend("bix.test.ai.util.AsyncTaskManager", {
        constructor: function() {
            BaseObject.call(this);
            this._tasks = new Map();
            this._defaultOptions = {
                pollInterval: 2000,   // 폴링 간격 (ms)
                maxTries: 30,         // 최대 시도 횟수
                initialDelay: 1000    // 첫 폴링 전 지연 시간
            };
        },

        /**
         * 비동기 작업 시작 및 관리
         * @param {Function} startFn - 작업 시작 함수 (Promise 반환)
         * @param {Function} checkFn - 작업 상태 확인 함수 (Promise 반환)
         * @param {Object} options - 폴링 옵션 및 UI 옵션
         * @returns {Promise} 최종 결과를 담은 Promise
         */
        executeTask: function(startFn, checkFn, options = {}) {
            // 옵션 병합
            const taskOptions = Object.assign({}, this._defaultOptions, options.pollOptions || {});
            
            // 로딩 다이얼로그 설정
            let busyDialog;
            if (options.showBusyDialog) {
                busyDialog = new BusyDialog({
                    title: options.busyDialogTitle || "처리 중",
                    text: options.busyDialogText || "요청을 처리하고 있습니다..."
                });
                busyDialog.open();
            }

            return new Promise((resolve, reject) => {
                // 작업 시작
                startFn()
                    .then(startResult => {
                        const taskId = startResult.taskId || startResult.id || "task_" + Date.now();
                        
                        // 작업 정보 저장
                        this._tasks.set(taskId, {
                            id: taskId,
                            status: "POLLING",
                            options: taskOptions,
                            tries: 0,
                            startTime: new Date()
                        });
                        
                        // 폴링 시작
                        setTimeout(() => {
                            this._poll(
                                taskId, 
                                checkFn,
                                // 성공 콜백
                                (result) => {
                                    if (busyDialog) busyDialog.close();
                                    resolve(result);
                                },
                                // 오류 콜백
                                (error) => {
                                    if (busyDialog) busyDialog.close();
                                    reject(error);
                                },
                                // 진행 상황 콜백
                                (progress) => {
                                    // 진행 상황에 따른 메시지 업데이트
                                    if (busyDialog && options.progressMessages) {
                                        this._updateProgressMessage(busyDialog, progress, options);
                                    }
                                    // 외부 진행 상황 콜백 호출
                                    if (options.onProgress) {
                                        options.onProgress(progress);
                                    }
                                }
                            );
                        }, taskOptions.initialDelay);
                    })
                    .catch(error => {
                        if (busyDialog) busyDialog.close();
                        reject(error);
                    });
            });
        },

        /**
         * 작업 폴링
         * @private
         */
        _poll: function(taskId, checkFn, successCb, errorCb, progressCb) {
            const task = this._tasks.get(taskId);
            if (!task || task.status !== "POLLING") {
                return;
            }
            
            task.tries++;
            
            checkFn(taskId)
                .then(statusResult => {
                    if (statusResult.status === "COMPLETED") {
                        task.status = "COMPLETED";
                        task.result = statusResult.result;
                        if (successCb) successCb(statusResult.result);
                    } 
                    else if (statusResult.status === "FAILED") {
                        task.status = "FAILED";
                        task.error = statusResult.error || new Error("Task failed");
                        if (errorCb) errorCb(task.error);
                    }
                    else if (statusResult.status === "RUNNING") {
                        // 진행 상황 업데이트
                        if (progressCb && statusResult.progress) {
                            progressCb(statusResult.progress);
                        }
                        
                        // 최대 시도 횟수 확인
                        if (task.tries >= task.options.maxTries) {
                            task.status = "TIMEOUT";
                            if (errorCb) errorCb(new Error("Maximum polling attempts reached"));
                            return;
                        }
                        
                        // 다시 폴링
                        setTimeout(() => {
                            this._poll(taskId, checkFn, successCb, errorCb, progressCb);
                        }, task.options.pollInterval);
                    }
                    else {
                        // 알 수 없는 상태
                        task.status = "UNKNOWN";
                        task.lastStatus = statusResult.status;
                        if (errorCb) errorCb(new Error("Unknown status: " + statusResult.status));
                    }
                })
                .catch(error => {
                    task.status = "FAILED";
                    task.error = error;
                    if (errorCb) errorCb(error);
                });
        },

        /**
         * 진행 상황 메시지 업데이트
         * @private
         */
        _updateProgressMessage: function(busyDialog, progress, options) {
            const progressMessages = options.progressMessages || {};
            const thresholds = Object.keys(progressMessages)
                .map(Number)
                .sort((a, b) => a - b);
            
            if (thresholds.length === 0) return;
            
            // 현재 진행률에 해당하는 메시지 찾기
            let message = null;
            for (let i = thresholds.length - 1; i >= 0; i--) {
                if (progress >= thresholds[i]) {
                    message = progressMessages[thresholds[i]];
                    break;
                }
            }
            
            // 메시지가 있으면 업데이트
            if (message) {
                busyDialog.setText(message + 
                    (options.showProgressPercentage ? ` (${progress}%)` : ""));
            }
        },

        /**
         * 작업 취소
         * @param {String} taskId - 작업 ID
         * @returns {Boolean} 취소 성공 여부
         */
        cancelTask: function(taskId) {
            const task = this._tasks.get(taskId);
            if (task && task.status === "POLLING") {
                task.status = "CANCELLED";
                return true;
            }
            return false;
        },
        
        /**
         * 작업 상태 조회
         * @param {String} taskId - 작업 ID
         * @returns {Object|null} 작업 상태 정보
         */
        getTaskStatus: function(taskId) {
            const task = this._tasks.get(taskId);
            return task ? {
                id: task.id,
                status: task.status,
                startTime: task.startTime,
                tries: task.tries,
                result: task.result,
                error: task.error
            } : null;
        },
        
        /**
         * 모든 작업 상태 조회
         * @returns {Array} 모든 작업 상태 정보
         */
        getAllTaskStatus: function() {
            const result = [];
            this._tasks.forEach(task => {
                result.push({
                    id: task.id,
                    status: task.status,
                    startTime: task.startTime,
                    tries: task.tries
                });
            });
            return result;
        }
    });
});