sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"bix/common/ai/service/AgentService",
    "sap/ui/core/EventBus",
], function (Controller, JSONModel, MessageToast, AgentService, EventBus) {
	"use strict";

	return Controller.extend("bix.card.aiReportMonthlyAiInsight.Main", {
		/**
		 * EventBus Instance
		 */
		_oEventBus: EventBus.getInstance(),

		onInit: function () {
			// 초기 로딩 상태 설정
			this.getView().setModel(new JSONModel({
				"isLoading": false,
				"insight": "",
				"summary": ""
			}), "LLMModel");

			this._dataSetting();
		},

		_dataSetting: function () {
			this.byId("cardContent").setBusy(true);
			let oData = JSON.parse(sessionStorage.getItem("aiReport"));

			// 백엔드에서 보고서 데이터 로드
			this._loadReportData(oData);
		},

		/**
		 * 보고서 데이터 로드
		 * @param {Object} params - 보고서 생성 파라미터
		 * @param {string} params.orgId - 조직 ID
		 * @param {string} params.type - 보고서 타입
		 * @param {string} params.year - 대상 연도
		 * @param {string} params.month - 대상 월
		 * @private
		 */
		_loadReportData: function (params) {
			var oModel = this.getView().getModel("LLMModel");
			var sViewid = "aiReportMonthlyAiInsightView";

			console.log("보고서 생성 파라미터:", params);

			// 로딩 상태 설정
			oModel.setProperty("/isLoading", true);

			// 공통 Funtcion
			let aFunctions = [
				{
					name: "get_actual_m_pl_oi",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_rate_gap_pl_oi",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_ai_forecast_pl",
					params: {
						year: params.year,
						org_id: params.orgId,
						org_tp: params.type,
					}
				},
				{
					name: "get_ai_forecast_m_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
			];

			// 전사 Funtcion
			let aAllFunctions = [
				{
					name: "get_actual_m_account_sale_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_sale_org_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_br_org_detail",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_rohc_org_oi",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_ai_forecast_deal_pipeline",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_ai_forecast_rodr_pipeline",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_ai_forecast_deal_type_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type,
						deal_stage_cd: "new"
					}
				},
				{
					name: "get_ai_forecast_deal_type_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type,
						deal_stage_cd: "nego",
					}
				},
				{
					name: "get_ai_forecast_deal_type_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type,
						deal_stage_cd: "contract",
					}
				},
				{
					name: "get_ai_forecast_deal_type_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type,
						deal_stage_cd: "lost",
					}
				},
				{
					name: "get_ai_forecast_deal_type_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type,
						deal_stage_cd: "qualified",
					}
				},
			];

			// Delivery Funtcion
			let aDeliveryFunctions = [
				{
					name: "get_actual_m_sale_org_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_br_org_detail",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_rohc_org_oi",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_sga",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
			];

			// Accuont Funtcion
			let aAccountFunctions = [
				{
					name: "get_actual_m_account_sale_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_sga",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_sale_rodr_org_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
			];

			// Cloud Funtcion
			let aCloudFunctions = [
				{
					name: "get_actual_m_sga",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_sale_org_pl",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_br_org_detail",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
				{
					name: "get_actual_m_rohc_org_oi",
					params: {
						year: params.year,
						month: params.month,
						org_id: params.orgId,
						org_tp: params.type
					}
				},
			];

			// 타입별 합칠 Function
			let oMergeArray = {
				all: [...aFunctions, ...aAllFunctions],
				delivery: [...aFunctions, ...aDeliveryFunctions],
				account: [...aFunctions, ...aAccountFunctions],
				cloud: [...aFunctions, ...aCloudFunctions],
			};

			// type에 따라서 합친 배열
			let aMergeFunctions = oMergeArray[params.type];
			
			// 보고서 에이전트 호출을 위한 데이터 구성
			var interactionData = {
                interaction: {
                    type: "context_fill",
                    timestamp: new Date().toISOString()
                },
                context: {
                    id: sViewid,
                    functions: [
                        {
                            name: "get_actual_m_pl_oi",
                            params: {}
                        },
                    ],
                    global_params: {
                        year: params.year,
                        month: params.month,
                        org_id: params.orgId,
                        org_tp: params.type
                    }
                }
            };
 

			var options = {
				showBusyDialog: false,
				showProgressPercentage: false,
				onProgress: function (progress) {
					console.log("보고서 생성 진행률:", progress + "%");
				},
				pollOptions: {
					pollInterval: 3000,
					maxTries: 40,
					initialDelay: 1000
				}
			};

			AgentService.processInteraction(interactionData, options)
				.then(function (result) {
					console.log("보고서 생성 완료:", result);
					var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
					this._processReportResult(parsedResult);
				}.bind(this))
				.catch(function (error) {
					console.error("보고서 생성 오류:", error);
					this._setFallbackData();
					MessageToast.show("보고서 생성 중 오류가 발생했습니다.");
				}.bind(this))
				.finally(function () {
					oModel.setProperty("/isLoading", false);
					this.byId("cardContent").setBusy(false);
				}.bind(this));
		},

		/**
		 * 보고서 결과 처리
		 * @param {Object} result - 보고서 생성 결과
		 * @private
		 */
		_processReportResult: function (result) {
			var oModel = this.getView().getModel("LLMModel");

			try {
				// 보고서 에이전트 응답에서 내용 추출
				var sReportContent = result.agent_result?.executive_summary ||
					result.results?.final_report ||
					result.final_output || "";

				if (!sReportContent) {
					// 보고서 내용이 없으면 null을 전달
					this._oEventBus.publish("pl", "aiReportMonthlyAiInsightSmry", { summary: null });
					
					console.warn("보고서 내용이 없습니다. 전체 결과:", result);
					throw new Error("보고서 내용이 없습니다.");
				}

				// 백엔드에서 받은 결과를 파싱하여 구조 변환
				var oReportData = this._parseReportContent(sReportContent);

				// 기존 뷰 구조에 맞게 모델 업데이트
				oModel.setProperty("/insight", oReportData.insight || "");
				oModel.setProperty("/summary", oReportData.summary || "");
				oModel.setProperty("/isLoading", false);

				// aiReportMonthlyAiInsightSmry에 insight 전달
                this._oEventBus.publish("pl", "aiReportMonthlyAiInsightSmry", { summary: oReportData.summary });

				console.log("보고서 데이터 로드 완료:", oReportData);
			} catch (error) {
				console.error("보고서 결과 처리 오류:", error);
				this._setFallbackData();
			}
		},

		/**
		 * 보고서 내용 파싱
		 * @param {string} content - 보고서 내용
		 * @returns {Object} 파싱된 보고서 데이터
		 * @private
		 */
		_parseReportContent: function (content) {
			try {
				// 백엔드에서 이미 JSON 구조로 보내주는 경우
				if (typeof content === 'object') {
					return {
						insight: content.insight || content.인사이트 || "",
						summary: content.summary || content.요약 || ""
					};
				}

				// 문자열인 경우 JSON 파싱 시도
				if (typeof content === 'string' && content.trim().startsWith('{')) {
					var jsonData = JSON.parse(content);
					return {
						insight: jsonData.insight || jsonData.인사이트 || "",
						summary: jsonData.summary || jsonData.요약 || ""
					};
				}

				// 텍스트 형태로 온 경우 파싱
				return this._parseTextToStructure(content);
			} catch (error) {
				console.error("보고서 내용 파싱 오류:", error);
				return {
					insight: "인사이트",
					summary: "요약"
				};
			}
		},

		/**
		 * 텍스트를 구조화된 데이터로 변환
		 * @param {string} content - 텍스트 내용
		 * @returns {Object} 구조화된 보고서 데이터
		 * @private
		 */
		_parseTextToStructure: function (content) {
			console.log("텍스트 파싱 대상:", content);

			var reportData = {
				insight: "",
				summary: ""
			};

			var lines = content.split('\n');
			var currentSection = "";

			for (var i = 0; i < lines.length; i++) {
				var line = lines[i].trim();

				if (!line) continue;

				// 섹션 구분자 확인		
				if (line.toLowerCase().includes("insight") || line.includes("인사이트")) {
					currentSection = "insight";
					var fullMatch = line.match(/(?:full|인사이트|줄글)\s*:\s*(.+)/i);
					if (fullMatch) {
						reportData.full = fullMatch[1];
					}
					continue;
				}

				if (line.toLowerCase().includes("summary") || line.includes("요약")) {
					currentSection = "summary";
					var fullMatch = line.match(/(?:full|요약|줄글)\s*:\s*(.+)/i);
					if (fullMatch) {
						reportData.full = fullMatch[1];
					}
					continue;
				}

				// 내용 처리
				if (currentSection === "insight") {
					reportData.insight += (reportData.insight ? " " : "") + line;
				}
				else if (currentSection === "summary") {
					reportData.summary += (reportData.summary ? " " : "") + line;
				}
			}

			// 기본값 설정
			if (!reportData.insight) {
				reportData.insight = "AI 인사이트";
			}

			if (!reportData.summary) {
				reportData.summary = "AI 요약";
			}

			return reportData;
		},

		/**
		 * 기본 데이터 설정 (오류 시)
		 * @private
		 */
		_setFallbackData: function () {
			var oModel = this.getView().getModel("LLMModel");

			oModel.setData({
				"isLoading": false,
				"insight": "시스템 오류로 인해 기본 데이터를 표시합니다.",
				"summary": "일시적인 서비스 장애가 발생했습니다."
			});
		},
	});
});