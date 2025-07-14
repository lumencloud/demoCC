const settings = require('../config/settings');

/**
 * AI 서비스를 위한 로거 유틸리티
 */
class Logger {
    /**
     * Logger 생성자
     * @param {Object} [options={}] - 로거 옵션
     * @param {string} [options.detailedModule='AI'] - 상세 모듈명
     * @param {boolean} [options.enableDebug] - 디버그 활성화 여부
     */
    constructor(options = {}) {
        this.detailedModule = options.detailedModule || 'AI';
        this.enableDebug = options.enableDebug !== undefined ? options.enableDebug : settings.logging.levels.enableDebug;
    }

    /**
     * 일반 정보 로깅
     * @param {string} message - 로그 메시지
     * @param {Object} [context] - 추가 컨텍스트 정보
     */
    info(message, context) {
        this._log('INFO', message, context, settings.logging.moduleNames.general);
    }

    /**
     * 경고 로깅
     * @param {string} message - 로그 메시지
     * @param {Object} [context] - 추가 컨텍스트 정보
     */
    warn(message, context) {
        this._log('WARN', message, context, `${settings.logging.moduleNames.detailed}_${this.detailedModule}`);
    }

    /**
     * 오류 로깅
     * @param {string} message - 로그 메시지
     * @param {Object|Error} [contextOrError] - 에러 객체 또는 추가 컨텍스트 정보
     */
    error(message, contextOrError) {
        const context = contextOrError instanceof Error 
            ? { error: contextOrError.message }
            : contextOrError;
        this._log('ERROR', message, context, `${settings.logging.moduleNames.detailed}_${this.detailedModule}`);
    }

    /**
     * 디버그 로깅 (enableDebug가 true일 때만 출력)
     * @param {string} message - 로그 메시지
     * @param {Object} [context] - 추가 컨텍스트 정보
     */
    debug(message, context) {
        if (this.enableDebug) {
            this._log('DEBUG', message, context, `${settings.logging.moduleNames.detailed}_${this.detailedModule}`);
        }
    }
    
    /**
     * 내부 로깅 함수
     * @private
     * @param {string} level - 로그 레벨 (INFO, WARN, ERROR, DEBUG)
     * @param {string} message - 로그 메시지
     * @param {Object} [context] - 추가 컨텍스트 정보
     * @param {string} moduleName - 모듈명
     */
    _log(level, message, context, moduleName) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}] [${moduleName}]`;
        
        if (context) {
            const contextStr = JSON.stringify(context);
            console.log(`${prefix} ${message} | ${contextStr}`);
        }
        else {
            console.log(`${prefix} ${message}`);
        }
    }
}

/**
 * Logger 인스턴스 생성 함수
 * @param {string} module - 모듈명 (상세 로그에서 사용)
 * @param {Object} [options={}] - 추가 옵션
 * @param {boolean} [options.enableDebug] - 디버그 활성화 여부 (기본값: settings에서 가져옴)
 * @returns {Logger} Logger 인스턴스
 */
const createLogger = (module, options = {}) => {
    return new Logger({ 
        detailedModule: module,
        ...options 
    });
};

module.exports = {
    Logger,
    createLogger
};