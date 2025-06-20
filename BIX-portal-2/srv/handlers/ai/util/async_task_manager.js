// srv/handlers/ai/util/async-task-manager.js
const messages = require('../config/messages');
const settings = require('../config/settings');
const cds = require('@sap/cds');

class AsyncTaskManager {
    constructor() {
        this.tasks = new Map();
        this.cleanupInterval = setInterval(() => this._cleanupTasks(), 30 * 60 * 1000); // 30분마다 정리
    }
    
    /**
     * 새 작업 생성
     * @param {Object} options - 작업 옵션
     * @returns {String} 작업 ID
     */
    createTask(options = {}) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.tasks.set(taskId, {
            id: taskId,
            status: 'CREATED',
            startTime: new Date(),
            lastUpdateTime: new Date(),
            progress: 0,
            result: null,
            error: null,
            timeoutId: null,
            options: {
                timeout: options.timeout || 10 * 60 * 1000, // 기본 10분 타임아웃
                ...options
            }
        });
        
        // 타임아웃 설정
        const timeoutId = setTimeout(() => {
            this._timeoutTask(taskId);
        }, this.tasks.get(taskId).options.timeout);
        
        this.tasks.get(taskId).timeoutId = timeoutId;
        
        return taskId;
    }
    
    /**
     * 작업 시작
     * @param {String} taskId - 작업 ID
     * @param {Function} asyncFn - 비동기 실행 함수
     */
    async startTask(taskId, asyncFn) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        
        // 작업 상태 업데이트
        task.status = 'RUNNING';
        task.lastUpdateTime = new Date();
        
        try {
            // 비동기 함수 실행
            task.result = await asyncFn(taskId, (progress) => {
                // 진행 상황 업데이트
                this.updateTaskProgress(taskId, progress);
            });
            
            // 작업 완료
            task.status = 'COMPLETED';
            task.progress = 100;
            task.lastUpdateTime = new Date();
            
            // 타임아웃 취소
            if (task.timeoutId) {
                clearTimeout(task.timeoutId);
                task.timeoutId = null;
            }
            
            return task.result;
        } catch (error) {
            // 작업 실패
            task.status = 'FAILED';
            task.error = error.message;
            task.lastUpdateTime = new Date();
            
            // 타임아웃 취소
            if (task.timeoutId) {
                clearTimeout(task.timeoutId);
                task.timeoutId = null;
            }
            
            // 에러 발생 시에도 기본 응답 반환
            const fallbackResult = JSON.stringify({
                master_result: messages.createFallbackResponse(
                    settings.fallback.masterAgent.default_agent,
                    messages.getMessage('masterAgent', 'executionFailed')
                ),
                agent_result: messages.createErrorResponse(
                    messages.getMessage('status', 'processing'),
                    messages.getMessage('asyncTaskManager', 'taskFailed'),
                    error.message
                ),
                total_execution_time: {
                    start: new Date().toISOString(),
                    end: new Date().toISOString(),
                    seconds: "0.00"
                }
            });
            
            task.result = fallbackResult;
            return fallbackResult;
        }
    }
    
    /**
     * 작업 상태 확인
     * @param {String} taskId - 작업 ID
     * @returns {Object} 작업 상태
     */
    getTaskStatus(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return { status: 'NOT_FOUND' };
        }
        
        // 작업 상태 반환
        return {
            id: task.id,
            status: task.status,
            startTime: task.startTime,
            lastUpdateTime: task.lastUpdateTime,
            progress: task.progress,
            result: task.result,
            error: task.error
        };
    }
    
    /**
     * 작업 진행 상황 업데이트
     * @param {String} taskId - 작업 ID
     * @param {Number} progress - 진행 상황 (0-100)
     */
    updateTaskProgress(taskId, progress) {
        const task = this.tasks.get(taskId);
        if (!task) return;
        
        task.progress = progress;
        task.lastUpdateTime = new Date();
    }
    
    /**
     * 타임아웃 처리
     * @private
     */
    _timeoutTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'RUNNING') return;
        
        task.status = 'TIMEOUT';
        task.error = 'Task execution timed out';
        task.lastUpdateTime = new Date();
        task.timeoutId = null;
    }
    
    /**
     * 오래된 작업 정리
     * @private
     */
    _cleanupTasks() {
        const now = new Date();
        
        for (const [taskId, task] of this.tasks.entries()) {
            // 완료된 작업은 1시간 후 삭제
            if (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'TIMEOUT') {
                const elapsed = now - task.lastUpdateTime;
                if (elapsed > 60 * 60 * 1000) { // 1시간
                    if (task.timeoutId) {
                        clearTimeout(task.timeoutId);
                    }
                    this.tasks.delete(taskId);
                }
            }
        }
    }
    
    /**
     * 모듈 종료 시 정리
     */
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        // 모든 타임아웃 취소
        for (const task of this.tasks.values()) {
            if (task.timeoutId) {
                clearTimeout(task.timeoutId);
            }
        }
        
        this.tasks.clear();
    }
}

// 싱글톤 인스턴스
const asyncTaskManager = new AsyncTaskManager();

// 프로세스 종료 시 정리
process.on('exit', () => {
    asyncTaskManager.dispose();
});

module.exports = asyncTaskManager;