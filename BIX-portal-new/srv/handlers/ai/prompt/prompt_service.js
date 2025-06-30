// srv/handlers/ai/prompt/prompt_service.js
const aiCoreConnector = require('../core/ai_core_connector');
const { createLogger } = require('../util/logger');

/**
 * 프롬프트 처리 서비스
 */
class PromptService {
  constructor() {
    this.logger = createLogger('prompt-service');
  }
  
  /**
   * 프롬프트 컴포넌트 실행
   * @param {Object} component - 컴포넌트 설정
   * @param {Object} inputs - 입력 변수
   * @param {Function} llmService - LLM 서비스 객체 (콜백)
   * @returns {Promise<string>} 실행 결과
   */
  async executePromptComponent(component, inputs, llmService) {
    try {
      // 컴포넌트 타입 확인
      if (component.type !== 'prompt') {
        throw new Error(`지원되지 않는 컴포넌트 타입: ${component.type}`);
      }
      
      if (!llmService) {
        throw new Error('LLM 서비스가 제공되지 않았습니다.');
      }
      
      // 스텝 입력값 준비
      const componentInputs = this.prepareComponentInputs(component, inputs);
      
      // 템플릿 처리
      let prompt;
      
      // 템플릿 정의 확인
      if (component.template) {
        // 템플릿 객체인 경우 (구조화된 형식)
        if (typeof component.template === 'object') {
          const { name, scenario, version } = component.template;
          
          if (!name || !scenario) {
            throw new Error('템플릿 정의가 올바르지 않습니다. name과 scenario가 필요합니다.');
          }
          
          // AI Core에서 템플릿 가져오기
          const templateInfo = {
            name,
            scenario,
            version: version || '0.0.1' // 버전이 없으면 기본값
          };
          
          // 템플릿 내용 가져오기
          const templateContent = await aiCoreConnector.getPromptTemplate(templateInfo);
          
          // 변수 대체 처리
          prompt = this.processTemplateVars(templateContent, componentInputs);
        }
        // 문자열인 경우 직접 템플릿으로 사용
        else if (typeof component.template === 'string') {
          prompt = this.processTemplateVars(component.template, componentInputs);
        }
        else {
          throw new Error('템플릿 형식이 올바르지 않습니다.');
        }
      }
      else {
        throw new Error('템플릿이 지정되지 않았습니다. template 객체가 필요합니다.');
      }
      
      // 모델 설정 가져오기
      const modelConfig = component.model_config || {};
      
      // LLM 호출
      this.logger.debug(`LLM 호출: ${prompt.substring(0, 100)}...`);
      const response = await llmService.callLLM(prompt, modelConfig);
      
      return response;
    } catch (error) {
      this.logger.error(`프롬프트 컴포넌트 실행 오류: ${error.message}`);
      throw new Error(`프롬프트 컴포넌트 실행 중 오류 발생: ${error.message}`);
    }
  }
  
  /**
   * 컴포넌트 입력값 준비
   * @param {Object} component - 컴포넌트 설정
   * @param {Object} inputs - 현재 실행 컨텍스트의 입력값
   * @returns {Object} 처리된 입력값
   */
  prepareComponentInputs(component, inputs) {
    try {
      const componentInputs = {};
      
      // 정의된 입력 변수 처리
      for (const [key, value] of Object.entries(component.input_variables || {})) {
        let inputValue;
        
        // $input: 접두사가 있는 경우 입력값에서 가져오기
        if (typeof value === 'string' && value.startsWith('$input:')) {
          const inputKey = value.substring(7); // '$input:' 이후 부분
          inputValue = inputs[inputKey];
          
          if (inputValue === undefined) {
            this.logger.warn(`입력값에서 '${inputKey}'를 찾을 수 없습니다.`);
          }
        }
        // $var: 접두사가 있는 경우 변수 참조
        else if (typeof value === 'string' && value.startsWith('$var:')) {
          const varName = value.substring(5); // '$var:' 이후 부분
          inputValue = inputs[varName];
          
          if (inputValue === undefined) {
            this.logger.warn(`변수 '${varName}'를 찾을 수 없습니다.`);
          }
        }
        // 그 외는 직접 값으로 사용
        else {
          inputValue = value;
        }
        
        // undefined인 경우 빈 문자열로 대체
        componentInputs[key] = (inputValue === undefined) ? '' : inputValue;
      }
      
      return componentInputs;
    } catch (error) {
      this.logger.error(`입력값 준비 오류: ${error.message}`);
      throw new Error(`컴포넌트 입력값 준비 중 오류 발생: ${error.message}`);
    }
  }
  
  /**
   * 템플릿 변수 처리
   * @param {string} template - 템플릿 문자열
   * @param {Object} variables - 변수 객체
   * @returns {string} 변수가 대체된 템플릿
   */
  processTemplateVars(template, variables) {
    try {
      let processedTemplate = template;
      
      // 변수 치환
      for (const [key, value] of Object.entries(variables)) {
        let replacementValue = value;
        
        // replacementValue가 undefined나 null이면 빈 문자열로 대체
        if (replacementValue === undefined || replacementValue === null) {
          replacementValue = '';
        }
        
        // 변수 치환 패턴
        const patterns = [
          `{{${key}}}`,   // Mustache 스타일
          `{{?${key}}}`,  // 조건부 Mustache 스타일
          `{${key}}`,     // 단순 중괄호
          `%${key}%`      // 퍼센트 스타일
        ];
        
        // 모든 패턴에 대해 치환
        for (const pattern of patterns) {
          // 정규표현식 특수문자 이스케이프
          const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          processedTemplate = processedTemplate.replace(
            new RegExp(escapedPattern, 'g'), 
            String(replacementValue)
          );
        }
      }
      
      return processedTemplate;
    } catch (error) {
      this.logger.error(`템플릿 변수 처리 오류: ${error.message}`);
      throw new Error(`템플릿 변수 처리 중 오류 발생: ${error.message}`);
    }
  }
}

module.exports = new PromptService();