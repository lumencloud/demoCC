// srv/handlers/ai/core/agent_executor.js
const fs = require('fs');
const paths = require('../config/paths');
const promptService = require('../prompt/prompt_service');
const { createLogger } = require('../util/logger');

/**
 * Agent 실행하는 클래스
 */
class AgentExecutor {
  constructor() {
    this.logger = createLogger('agent-executor');
    this.llmService = null; // LLM 서비스 인스턴스는 초기화 시 주입 또는 내부 생성
    this.agentRegistry = new Map(); // 등록된 에이전트 구성 저장
    
    // 에이전트 로드
    this.loadAgentsFromPaths();
    
    console.log(`초기화 완료. 등록된 에이전트 수: ${this.agentRegistry.size}`);
    console.log(`등록된 에이전트 목록:`, Array.from(this.agentRegistry.keys()));
  }

  /**
   * paths에 정의된 경로에서 에이전트들 로드
   */
  loadAgentsFromPaths() {
    // 리포트 에이전트 로드
    this.loadAgentFromFile('report_agent', paths.REPORT_AGENT_PATH);
    
    // 네비게이션 에이전트 로드
    this.loadAgentFromFile('navigator_agent', paths.NAVIGATOR_AGENT_PATH);
    
    // 즉답형 에이전트 로드
    this.loadAgentFromFile('quick_answer_agent', paths.QUICK_ANSWER_AGENT_PATH);
  }

  /**
   * 단일 에이전트 파일 로드
   */
  loadAgentFromFile(expectedAgentId, filePath) {
    try {
      console.log(`에이전트 로드 시도: ${expectedAgentId} from ${filePath}`);
      
      // 파일 존재 확인
      if (!fs.existsSync(filePath)) {
        console.log(`파일이 없음: ${filePath}, 기본 에이전트 생성`);
        return;
      }
      
      // 파일 읽기 및 파싱
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const agentConfig = JSON.parse(fileContent);
      
      // agent_id 강제 설정 (파일 내용과 관계없이)
      agentConfig.agent_id = expectedAgentId;
      
      // 등록
      this.registerAgent(agentConfig);
      console.log(`에이전트 등록 완료: ${expectedAgentId}`);
    } catch (error) {
      console.error(`에이전트 로드 실패 (${expectedAgentId}):`, error.message);
    }
  }

  /**
   * LLM 서비스 설정
   * @param {Object} llmService - LLM 호출을 처리하는 서비스 객체
   */
  setLLMService(llmService) {
    this.llmService = llmService;
    this.logger.info('LLM 서비스가 설정되었습니다.');
  }

  /**
   * 에이전트 등록
   * @param {Object} agentConfig - 에이전트 구성 객체
   */
  registerAgent(agentConfig) {
    if (!agentConfig.agent_id) {
      throw new Error('Agent ID is required');
    }
    
    this.agentRegistry.set(agentConfig.agent_id, agentConfig);
    this.logger.info(`에이전트 등록: ${agentConfig.agent_id}`);
    
    return agentConfig;
  }

  /**
   * 에이전트 구성 가져오기
   * @param {string} agentId - 에이전트 ID
   * @returns {Object|null} 에이전트 구성 또는 null
   */
  getAgentConfig(agentId) {
    return this.agentRegistry.get(agentId) || null;
  }

  /**
   * 에이전트 실행
   * @param {string|Object} agentIdOrConfig - 에이전트 ID 또는 구성 객체
   * @param {Object} inputs - 초기 입력값
   * @param {string} executionId - 실행 ID (로깅/추적용)
   * @returns {Object} 실행 결과
   */
  async executeAgent(agentIdOrConfig, inputs = {}, executionId = null) {
    // 실행 시작 시간 기록 (Date 객체)
    const startTimeObj = new Date();
    let executionInfo = null;

    try {
      // LLM 서비스 확인
      if (!this.llmService) {
        throw new Error('LLM 서비스가 설정되지 않았습니다.');
      }

      // 에이전트 구성 가져오기
      let agentConfig;
      
      if (typeof agentIdOrConfig === 'string') {
        // ID로 등록된 에이전트 가져오기
        agentConfig = this.getAgentConfig(agentIdOrConfig);
        if (!agentConfig) {
          throw new Error(`Agent with ID ${agentIdOrConfig} not found`);
        }
      }
      else {
        // 직접 제공된 구성 사용
        agentConfig = agentIdOrConfig;
      }
      
      // 실행 정보 초기화
      executionInfo = {
        agent_id: agentConfig.agent_id,
        execution_id: executionId || this._generateExecutionId(),
        start_time: startTimeObj.toISOString(),
        status: 'RUNNING',
        inputs: { ...inputs },
        results: {},
        error: null,
        end_time: null
      };

      this.logger.info(`에이전트 실행 시작: ${agentConfig.agent_id}`, { 
        execution_id: executionInfo.execution_id 
      });

      // 처리 흐름 실행
      const flow = agentConfig.processing_flow;

      if (!flow) {
        throw new Error('Processing flow not defined in agent configuration');
      }

      let result;
      if (flow.flow_type === 'langchain_sequential') {
        result = await this._executeSequentialFlow(flow, inputs, executionInfo);
      }
      else {
        throw new Error(`Unsupported flow type: ${flow.flow_type}`);
      }

      // 실행 종료 시간 기록 (Date 객체)
      const endTimeObj = new Date();
      
      // 실행 시간 계산 (초 단위)
      const executionTimeSeconds = (endTimeObj - startTimeObj) / 1000;
      
      // 실행 정보 업데이트
      executionInfo.status = 'COMPLETED';
      executionInfo.end_time = endTimeObj.toISOString();
      executionInfo.results = result;

      this.logger.info(`에이전트 실행 완료: ${agentConfig.agent_id}`, { 
        execution_id: executionInfo.execution_id,
        executionTime: `${executionTimeSeconds.toFixed(2)}초`
      });

      return {
        execution_id: executionInfo.execution_id,
        agent_id: agentConfig.agent_id,
        status: executionInfo.status,
        start_time: executionInfo.start_time,
        end_time: executionInfo.end_time,
        execution_time_seconds: executionTimeSeconds.toFixed(2),
        inputs: executionInfo.inputs,
        results: result
      };
    } catch (error) {
      // 오류 발생 시에도 종료 시간과 실행 시간 계산
      const endTimeObj = new Date();
      
      // executionInfo가 아직 초기화되지 않았을 수 있으므로 확인
      let startTimeObj, executionTimeSeconds, executionId, agentId;
      
      if (executionInfo) {
        startTimeObj = new Date(executionInfo.start_time);
        executionTimeSeconds = (endTimeObj - startTimeObj) / 1000;
        executionId = executionInfo.execution_id;
        agentId = executionInfo.agent_id;
      }
      else {
        startTimeObj = startTimeObj; // 함수 시작 시 정의된 startTimeObj 사용
        executionTimeSeconds = (endTimeObj - startTimeObj) / 1000;
        executionId = executionId || this._generateExecutionId();
        agentId = typeof agentIdOrConfig === 'string' ? agentIdOrConfig : 
                 (agentIdOrConfig && agentIdOrConfig.agent_id ? agentIdOrConfig.agent_id : 'unknown');
      }
      
      this.logger.error(`에이전트 실행 실패: ${error.message}`, { 
        agent_id: agentId,
        execution_id: executionId,
        executionTime: `${executionTimeSeconds.toFixed(2)}초`
      });

      return {
        execution_id: executionId,
        agent_id: agentId,
        status: 'FAILED',
        start_time: startTimeObj.toISOString(),
        end_time: endTimeObj.toISOString(),
        execution_time_seconds: executionTimeSeconds.toFixed(2),
        inputs: inputs,
        error: error.message
      };
    }
  }

  /**
   * 순차적 처리 흐름 실행
   * @private
   */
  async _executeSequentialFlow(flow, inputs, executionInfo) {
    const results = {
      steps: {},
      final_outputs: {},
      execution_stats: {
        total_steps: flow.steps.length,
        completed_steps: 0,
        failed_steps: 0,
        total_execution_time: 0
      }
    };

    // 실행 컨텍스트(변수 저장소) 초기화
    let executionContext = { ...inputs };

    // 스텝 정렬 (step_sequence 기준)
    const sortedSteps = [...flow.steps].sort((a, b) => {
      const seqA = a.step_sequence || parseInt(a.step_id, 10) || 0;
      const seqB = b.step_sequence || parseInt(b.step_id, 10) || 0;
      return seqA - seqB;
    });

    // 각 스텝 순차 실행
    for (const step of sortedSteps) {
      try {
        this.logger.debug(`스텝 실행: ${step.step_id} (순서: ${step.step_sequence || 'N/A'})`, { 
          execution_id: executionInfo.execution_id 
        });

        // 스텝 실행 시간 측정 시작 (Date 객체)
        const stepStartTimeObj = new Date();
        const stepStartTime = stepStartTimeObj.toISOString();
        
        // 스텝 결과 객체 초기화
        results.steps[step.step_id] = {
          step_id: step.step_id,
          step_sequence: step.step_sequence,
          start_time: stepStartTime,
          status: 'RUNNING',
          inputs: {},
          output: null,
          error: null,
          end_time: null,
          execution_time_seconds: null
        };

        // 컴포넌트 가져오기
        const component = step.component;
        if (!component) {
          throw new Error(`Component not defined for step ${step.step_id}`);
        }

        // 입력값 준비 - 변수 참조 처리
        const componentInputs = this._prepareComponentInputs(component, executionContext, inputs);
        results.steps[step.step_id].inputs = componentInputs;

        // 컴포넌트 유형에 따른 처리
        let stepResult;
        
        if (component.type === 'prompt') {
          stepResult = await this._executePromptComponent(component, componentInputs);
        }
        else if (component.type === 'tool') {
          stepResult = await this._executeToolComponent(component, componentInputs);
        }
        else {
          throw new Error(`Unsupported component type: ${component.type}`);
        }

        // 스텝 종료 시간 및 실행 시간 계산
        const stepEndTimeObj = new Date();
        const stepEndTime = stepEndTimeObj.toISOString();
        const stepExecutionTimeSeconds = (stepEndTimeObj - stepStartTimeObj) / 1000;

        // 스텝 실행 결과 기록
        results.steps[step.step_id].status = 'COMPLETED';
        results.steps[step.step_id].output = stepResult;
        results.steps[step.step_id].end_time = stepEndTime;
        results.steps[step.step_id].execution_time_seconds = stepExecutionTimeSeconds.toFixed(2);

        // 실행 통계 업데이트
        results.execution_stats.completed_steps++;
        results.execution_stats.total_execution_time += stepExecutionTimeSeconds;
        
        this.logger.debug(`스텝 실행 완료: ${step.step_id}`, {
          execution_id: executionInfo.execution_id,
          executionTime: `${stepExecutionTimeSeconds.toFixed(2)}초`
        });
        
        // 출력 변수에 결과 저장 (다음 단계에서 참조 가능)
        if (component.output_variable) {
          executionContext[component.output_variable] = stepResult;
        }

      } catch (error) {
        // 스텝 종료 시간 및 실행 시간 계산 (오류 시에도)
        const stepEndTimeObj = new Date();
        const stepEndTime = stepEndTimeObj.toISOString();
        const stepStartTimeObj = new Date(results.steps[step.step_id].start_time);
        const stepExecutionTimeSeconds = (stepEndTimeObj - stepStartTimeObj) / 1000;
        
        // 스텝 실행 오류 처리
        this.logger.error(`스텝 실행 실패: ${error.message}`, { 
          execution_id: executionInfo.execution_id,
          step_id: step.step_id,
          executionTime: `${stepExecutionTimeSeconds.toFixed(2)}초`
        });

        results.steps[step.step_id].status = 'FAILED';
        results.steps[step.step_id].error = error.message;
        results.steps[step.step_id].end_time = stepEndTime;
        results.steps[step.step_id].execution_time_seconds = stepExecutionTimeSeconds.toFixed(2);
        
        // 실행 통계 업데이트
        results.execution_stats.failed_steps++;
        results.execution_stats.total_execution_time += stepExecutionTimeSeconds;

        // 전체 처리 중단 (필요에 따라 변경 가능)
        throw new Error(`Step ${step.step_id} execution failed: ${error.message}`);
      }
    }

    // 최종 출력값 저장
    results.final_outputs = executionContext;

    // 실행 통계 완성
    results.execution_stats.total_execution_time = parseFloat(results.execution_stats.total_execution_time.toFixed(2));
    
    return results;
  }

  /**
   * 컴포넌트 입력값 준비 - 변수 참조 지원
   * @param {Object} component - 컴포넌트 객체
   * @param {Object} executionContext - 실행 컨텍스트 (변수 저장소)
   * @param {Object} initialInputs - 초기 입력값
   * @returns {Object} 처리된 입력값
   * @private
   */
  _prepareComponentInputs(component, executionContext, initialInputs = {}) {
    const componentInputs = {};
    
    // 정의된 입력 변수에 대해 처리
    for (const [key, value] of Object.entries(component.input_variables || {})) {
      // 입력값 참조 (예: $input:data)
      if (typeof value === 'string' && value.startsWith('$input:')) {
        const inputKey = value.substring(7); // '$input:' 이후 부분
        
        if (initialInputs.hasOwnProperty(inputKey)) {
          componentInputs[key] = initialInputs[inputKey];
        }
        else {
          this.logger.warn(`참조된 입력값을 찾을 수 없음: ${inputKey}`);
          componentInputs[key] = undefined;
        }
      }
      // 변수 참조 (예: $var:summary)
      else if (typeof value === 'string' && value.startsWith('$var:')) {
        const varName = value.substring(5); // '$var:' 이후 부분
        
        if (executionContext.hasOwnProperty(varName)) {
          componentInputs[key] = executionContext[varName];
        }
        else {
          this.logger.warn(`참조된 변수를 찾을 수 없음: ${varName}`);
          componentInputs[key] = undefined;
        }
      }
      // 일반 값 사용
      else {
        componentInputs[key] = value;
      }
    }
    
    return componentInputs;
  }

  /**
   * 프롬프트 컴포넌트 실행
   * @private
   */
  async _executePromptComponent(component, inputs) {
    if (!this.llmService) {
      throw new Error('LLM service not initialized');
    }

    try {
      // promptService를 통해 프롬프트 컴포넌트 실행
      return await promptService.executePromptComponent(
        component, 
        inputs, 
        this.llmService
      );
    } catch (error) {
      this.logger.error(`프롬프트 컴포넌트 실행 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 도구 컴포넌트 실행
   * @private
   */
  async _executeToolComponent(component, inputs) {
    try {
      this.logger.debug(`도구 컴포넌트 실행: ${component.tool_file}`);

      // 도구 파일 로드
      const ToolClass = require(`../tool/${component.tool_file}`);
      const toolInstance = new ToolClass();

      // 도구 실행
      const result = await toolInstance.execute(inputs);

      this.logger.debug(`도구 컴포넌트 실행 완료: ${component.tool_file}`);

      return result;
    } catch (error) {
      this.logger.error(`도구 컴포넌트 실행 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 실행 ID 생성
   * @returns {string} 생성된 실행 ID
   * @private
   */
  _generateExecutionId() {
    return 'exec_' + Math.random().toString(36).substring(2, 15);
  }
}

// 에이전트 실행기 인스턴스 생성 및 내보내기
const agentExecutor = new AgentExecutor();
module.exports = agentExecutor;