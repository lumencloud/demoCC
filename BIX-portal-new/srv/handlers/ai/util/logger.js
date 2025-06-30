// srv/handlers/ai/util/logger.js

/**
 * AI 서비스를 위한 로거 유틸리티
 */
class Logger {
  constructor(options = {}) {
    this.module = options.module || 'ai-agent';
    this.enableDebug = options.enableDebug !== undefined ? options.enableDebug : true;
  }

  /**
   * 일반 정보 로깅
   * @param {string} message - 로그 메시지
   * @param {Object} [context] - 추가 컨텍스트 정보
   */
  info(message, context) {
    this._log('INFO', message, context);
  }

  /**
   * 경고 로깅
   * @param {string} message - 로그 메시지
   * @param {Object} [context] - 추가 컨텍스트 정보
   */
  warn(message, context) {
    this._log('WARN', message, context);
  }

  /**
   * 오류 로깅
   * @param {string} message - 로그 메시지
   * @param {Object|Error} [contextOrError] - 에러 객체 또는 추가 컨텍스트
   */
  error(message, contextOrError) {
    if (contextOrError instanceof Error) {
      this._log('ERROR', message, { error: contextOrError.message });
    } else {
      this._log('ERROR', message, contextOrError);
    }
  }

  /**
   * 디버그 로깅 (enableDebug가 true일 때만 출력)
   * @param {string} message - 로그 메시지
   * @param {Object} [context] - 추가 컨텍스트 정보
   */
  debug(message, context) {
    if (this.enableDebug) {
      this._log('DEBUG', message, context);
    }
  }

  /**
   * 내부 로깅 함수
   * @private
   */
  _log(level, message, context) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.module}]`;
    
    if (context) {
      const contextStr = JSON.stringify(context);
      console.log(`${prefix} ${message} | ${contextStr}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = {
  Logger,
  createLogger: (module, options = {}) => {
    return new Logger({ module, ...options });
  }
};