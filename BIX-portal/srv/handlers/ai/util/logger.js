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
      // 에러 객체인 경우 스택 트레이스 추가
      if (contextOrError instanceof Error) {
        this._log('ERROR', message, {
          error: contextOrError.message,
          stack: contextOrError.stack
        });
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
      
      // 컨텍스트가 있는 경우 JSON으로 변환
      if (context) {
        const contextStr = JSON.stringify(context, null, 2);
        console.log(`${prefix} ${message}\n${contextStr}`);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
  
  // 기본 로거 인스턴스 생성
  const defaultLogger = new Logger();
  
  module.exports = {
    Logger,
    defaultLogger,
    
    // 모듈별 로거 생성 헬퍼 함수
    createLogger: (module, options = {}) => {
      return new Logger({ 
        module, 
        ...options 
      });
    }
  };