sap.ui.define([], function() {
    "use strict";
    
    return {
      /**
       * 에이전트 응답 파싱
       * @param {string|Object} data - 서버 응답 데이터
       * @returns {Object} 파싱된 에이전트 응답
       */
      parseAgentResponse: function(data) {
        console.log("마스터 에이전트 호출 성공 - 원본 데이터:", data);
        
        // 데이터 정제 및 파싱
        var resultString = data;
        
        // 문자열이 OData 응답 형식인 경우 처리
        if (typeof data === 'object' && data.value) {
          resultString = data.value;
        }
        
        // 중첩된 JSON 문자열 처리
        if (typeof resultString === 'string') {
          // 문자열에서 불필요한 이스케이프 제거
          resultString = resultString.replace(/\\"/g, '"');
          
          // JSON 객체를 나타내는 중괄호가 있는지 확인
          var jsonStartIndex = resultString.indexOf('{');
          var jsonEndIndex = resultString.lastIndexOf('}');
          
          if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
            // JSON 부분만 추출
            resultString = resultString.substring(jsonStartIndex, jsonEndIndex + 1);
          }
        }
        
        // 파싱 시도
        var result;
        try {
          result = JSON.parse(resultString);
          console.log("파싱된 결과:", result);
        } catch (parseError) {
          console.error("첫 번째 파싱 시도 실패:", parseError);
          
          // 정규식을 사용하여 JSON 객체 부분 추출 시도
          var match = /\{[\s\S]*"selected_agent"[\s\S]*\}/g.exec(resultString);
          if (match) {
            try {
              result = JSON.parse(match[0]);
              console.log("정규식으로 추출 후 파싱 성공:", result);
            } catch (e) {
              console.error("정규식 추출 후 파싱 실패:", e);
              throw new Error("응답 데이터 파싱 실패");
            }
          }
          else {
            // 마지막 대안: selected_agent 필드 직접 추출
            var agentMatch = /"selected_agent"\s*:\s*"([^"]+)"/g.exec(resultString);
            var confidenceMatch = /"confidence"\s*:\s*([0-9.]+)/g.exec(resultString);
            var reasoningMatch = /"reasoning"\s*:\s*"([^"]+)"/g.exec(resultString);
            
            if (agentMatch) {
              result = {
                selected_agent: agentMatch[1],
                confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
                reasoning: reasoningMatch ? reasoningMatch[1] : "정보 없음"
              };
              console.log("정규식으로 필드 추출 성공:", result);
            }
            else {
              throw new Error("응답에서 에이전트 정보 추출 실패");
            }
          }
        }
        
        return result;
      }
    };
  });