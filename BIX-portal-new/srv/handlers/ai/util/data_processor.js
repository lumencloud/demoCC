// srv/handlers/ai/util/data_processor.js
const fs = require('fs');
const paths = require('../config/paths');
const { createLogger } = require('./logger');

class DataProcessor {
  constructor() {
    this.logger = createLogger('data-processor');
  }

  /**
   * 상호작용 데이터에서 AI 에이전트 입력용 데이터 추출 및 가공
   * @param {Object} interactionData - 원본 상호작용 데이터
   * @returns {Object} 가공된 데이터
   */
  processInteractionData(interactionData) {
    try {
      this.logger.info('상호작용 데이터 처리 시작');
      this.logger.debug('interactionData(확인):', {interactionData});

      // 문자열 파싱 공통 처리
      const parsedData = this._parseInteractionData(interactionData);
      
      // 기본 결과 객체 초기화
      const result = {
        // 원본 데이터 참조 보존
        raw: parsedData,
        
        // 마스터 에이전트용 데이터
        //masterInput: this._formatMasterAgentInput(parsedData),
        
        // 결과 에이전트용 데이터
        agentInput: this._formatResultAgentInput(parsedData)
      };
      
      this.logger.info('상호작용 데이터 처리 완료');
      return result;
    } catch (error) {
      this.logger.error('데이터 처리 오류:', error);
      throw new Error(`데이터 처리 중 오류 발생: ${error.message}`);
    }
  }
  
  /**
   * 인터랙션 데이터에서 context의 특정 컴포넌트 데이터 추출
   * @param {*} interactionData - 인터랙션 데이터
   * @param {string} component - 컴포넌트명 ('grid', 'graph', 'textArea', 'form', 'table', 'chart' 등)
   * @param {string} field - 필드명 (선택사항, 없으면 전체 컴포넌트 반환)
   * @returns {*} 추출된 데이터
   */
  extractData(interactionData, component, field = null) {
    const parsedData = this._parseInteractionData(interactionData);
    const componentData = parsedData?.context?.[component] || {};
    
    return field ? (componentData[field] || null) : componentData;
  }

  /**
   * 데이터에서 특정 type 값으로 필터링
   * @param {Array} data - 필터링할 데이터 배열
   * @param {string} targetType - 필터링할 type 값 (예: '매출', '수주', '매출 건수' 등)
   * @returns {Array} 필터링된 데이터 배열
   */
  filterByType(data, targetType) {
    try {
      this.logger.info(`데이터 필터링 시작 - 대상 type: ${targetType}`);
      
      if (!Array.isArray(data)) {
        throw new Error('데이터가 배열 형태가 아닙니다');
      }

      if (!targetType) {
        throw new Error('targetType이 지정되지 않았습니다');
      }
      
      // type 필드가 있는 데이터만 필터링
      const filteredData = data.filter(item => {
        return item && item.type === targetType;
      });
      
      this.logger.info(`필터링 완료 - 원본: ${data.length}개, 필터링 후: ${filteredData.length}개`);
      
      return filteredData;
      
    } catch (error) {
      this.logger.error('데이터 필터링 오류:', error);
      throw new Error(`데이터 필터링 중 오류 발생: ${error.message}`);
    }
  }

  /**
   * 마스터 에이전트용 입력 데이터 형식화
   * @private
   
  _formatMasterAgentInput(interactionData) {
    // 필수 핵심 정보만 추출
    const essentialInfo = {
      // 상호작용 기본 정보
      interactionType: interactionData.interaction?.type || 'unknown',
      eventType: interactionData.interaction?.eventType || '',
      
      // 컨텍스트 핵심 정보
      currentView: interactionData.context?.currentView || '',
      sourceText: interactionData.context?.sourceText || '',
    };
    
    // 상호작용 타입에 따른 추가 필수 정보
    if (interactionData.interaction?.type === 'button_click') {
      essentialInfo.buttonText = interactionData.context?.buttonText || '';
    } else if (interactionData.interaction?.type === 'text_input') {
      essentialInfo.userInput = interactionData.context?.userInput || '';
    } else if (interactionData.interaction?.type === 'chart_click') {
      essentialInfo.chartSelection = interactionData.context?.chartData?.selection || '';
    } else if (interactionData.interaction?.type === 'table_selection') {
      essentialInfo.tableSelection = interactionData.context?.tableData?.selection || '';
    }
    
    // 사용자 입력이 있는 경우 (대화형 상호작용)
    if (interactionData.context?.userInput) {
      essentialInfo.userInput = interactionData.context.userInput;
    }
    
    return JSON.stringify(essentialInfo);
  }
  */
  
  /**
   * 결과 에이전트용 입력 데이터 형식화
   * @private
   */
  _formatResultAgentInput(interactionData) {
    // 상호작용 타입 확인
    const interactionType = interactionData.interaction?.type || 'unknown';
    
    // 그리드 데이터 추출 (있는 경우)
    let gridData = this._extractGridData(interactionData);
    
    // 결과 객체 구성
    const result = {
      //interactionType,
      data: JSON.stringify(gridData) // JSON 문자열로 변환하여 전달
    };
    
    return result;
  }

  /**
   * 그리드 데이터 추출
   * @private
   */
  _extractGridData(interactionData) {
    // 그리드 데이터가 있는지 확인
    if (!interactionData.context?.grid) {
      return null;
    }
    
    const grid = interactionData.context.grid;
    
    // 필수 항목 추출
    return {
      id: grid.id || "데이터 그리드",
      selectedRow: grid.selectedRow || []
      // allData: grid.data || []
    };
  }
  
  /**
   * 차트 데이터 추출
   * @private
  _extractChartData(interactionData) {
    // 예시: 차트 클릭 데이터 추출 로직
    const chartData = {
      chartType: interactionData.chartType,
      clickedPoint: interactionData.point,
      seriesName: interactionData.series,
      value: interactionData.value,
      // 필요한 다른 속성들...
    };
    
    return JSON.stringify(chartData);
  }
  */

  /**
   * 문자열 파싱 공통 처리
   * @private
   */
  _parseInteractionData(interactionData) {
    if (typeof interactionData === "string") {
      return JSON.parse(interactionData);
    }
    return interactionData;
  }
}
  
  module.exports = new DataProcessor();