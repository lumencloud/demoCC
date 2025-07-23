sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"bix/common/ai/service/AgentService",
	"sap/ui/core/EventBus",
], function (Controller, JSONModel, MessageToast, AgentService, EventBus) {
	"use strict";

	return Controller.extend("bix.card.aiReportMonthlyAiInsight.Main", {
		_oEventBus: EventBus.getInstance(),
		_bFlag: true, // 카드 로드 예외 처리
		onInit: function () {
			// 초기 로딩 상태 설정
			this.getView().setModel(new JSONModel({
				"isLoading": true,
				"insight": "",
				"summary": []
			}), "LLMModel");
			this._oEventBus.publish("aireport", "isCardSubscribed");
			this._dataSetting();
		},

		_dataSetting: function () {
			let oData = JSON.parse(sessionStorage.getItem("aiReport"));

			// 백엔드에서 보고서 컨텐츠 데이터 로드
			this._loadReportData(oData);
		},

		/**
		 * 보고서 컨텐츠 데이터 로드
		 * @param {Object} params - 보고서 컨텐츠 생성 파라미터
		 * @param {string} params.orgId - 조직 ID
		 * @param {string} params.type - 보고서 컨텐츠 타입
		 * @param {string} params.year - 대상 연도
		 * @param {string} params.month - 대상 월
		 * @private
		 */
		_loadReportData: function (params) {
			var oModel = this.getView().getModel("LLMModel");
			var sViewid = "aiReportMonthlyAiInsightView";

			console.log("보고서 컨텐츠 생성 파라미터:", params);

			// 로딩 상태 설정
			oModel.setProperty("/isLoading", true);
			oModel.setProperty("/insight", "");
			oModel.setProperty("/summary", []);

			/* 분기처리 off (추후 분기처리 기능 업데이트 예정)
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
			
			// 보고서 컨텐츠 에이전트 호출을 위한 데이터 구성
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
			*/

			// 전사 기준 (일시적)
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
							params: {
								year: params.year,
								month: params.month,
								org_id: params.orgId,
								org_tp: "delivery"
							}
						},
						{
							name: "get_actual_m_account_sale_pl",
							params: {
								year: params.year,
								month: params.month,
								org_id: params.orgId,
								org_tp: "delivery"
							}
						},
						{
							name: "get_actual_m_sale_org_pl",
							params: {
								year: params.year,
								month: params.month,
								org_id: params.orgId,
								org_tp: "delivery"
							}
						},
						{
							name: "get_ai_forecast_m_pl",
							params: {
								year: params.year,
								month: params.month,
								org_id: params.orgId,
								org_tp: "delivery"
							}
						}
					]
				}
			};

			var options = {
				showBusyDialog: false,
				showProgressPercentage: false,
				onProgress: function (progress) {
					console.log("보고서 컨텐츠 생성 진행률:", progress + "%");
				},
				pollOptions: {
					pollInterval: 3000,
					maxTries: 40,
					initialDelay: 1000
				}
			};

			AgentService.processInteraction(interactionData, options)
				.then(function (result) {
					console.log("보고서 컨텐츠 생성 완료:", result);
					var parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
					this._processReportResult(parsedResult);
				}.bind(this))
				.catch(function (error) {
					console.error("보고서 컨텐츠 생성 오류:", error);
					this._setFallbackData();
					MessageToast.show("보고서 컨텐츠 생성 중 오류가 발생했습니다.");
				}.bind(this))
				.finally(function () {
					oModel.setProperty("/isLoading", false);
				}.bind(this));
		},

		/**
		 * 보고서 컨텐츠 결과 처리
		 * @param {Object} result - 보고서 컨텐츠 생성 결과
		 * @private
		 */
		_processReportResult: function (result) {
			var oModel = this.getView().getModel("LLMModel");

			try {
				// 보고서 컨텐츠 에이전트 응답에서 내용 추출
				var sReportContent = result.agent_result?.executive_summary ||
					result.results?.final_report ||
					result.final_output || "";

				if (!sReportContent) {
					// 보고서 컨텐츠 내용이 없으면 null을 전달
					this._oEventBus.publish("pl", "aiReportMonthlyAiInsightSmry", { summary: null });

					console.warn("보고서 컨텐츠 내용이 없습니다. 전체 결과:", result);
					throw new Error("보고서 컨텐츠 내용이 없습니다.");
				}

				// 백엔드에서 받은 결과를 파싱 및 구조 변환
				var oReportData = this._parseReportContent(sReportContent);

				// 기존 뷰 구조에 맞게 모델 업데이트
				oModel.setProperty("/insight", oReportData.insight || "");
				oModel.setProperty("/summary", oReportData.summary || []);
				oModel.setProperty("/isLoading", false);

				// aiReportMonthlyAiInsightSmry에 insight 전달
				this._oEventBus.publish("pl", "aiReportMonthlyAiInsightSmry", { summary: oReportData.summary });

				console.log("보고서 컨텐츠 데이터 로드 완료:", oReportData);
					this.dataLoad();
			} catch (error) {
				console.error("보고서 컨텐츠 결과 처리 오류:", error);
				this._setFallbackData();
					this.dataLoad();
			}
		},

		/**
		 * 보고서 컨텐츠 내용 파싱
		 * @param {string} content - 보고서 컨텐츠 내용
		 * @returns {Object} 파싱된 보고서 컨텐츠 데이터
		 * @private
		 */
		_parseReportContent: function (content) {
			try {
				// 백엔드에서 이미 JSON 구조로 보내주는 경우
				if (typeof content === 'object') {
					return {
						insight: content.insight || content.인사이트 || "",
						summary: content.summary || content.요약 || []
					};
				}

				// 문자열인 경우 JSON 파싱 시도
				if (typeof content === 'string' && content.trim().startsWith('{')) {
					var jsonData = JSON.parse(content);
					return {
						insight: jsonData.insight || jsonData.인사이트 || "",
						summary: jsonData.summary || jsonData.요약 || []
					};
				}

				// 텍스트 형태로 온 경우 파싱
				return this._parseTextToStructure(content);
			} catch (error) {
				console.error("보고서 컨텐츠 내용 파싱 오류:", error);
				console.log("파싱 실패한 원본 내용:", content);
				this._setFallbackData();
			}
		},

		/**
		 * 텍스트를 구조화된 데이터로 변환
		 * @param {string} content - 텍스트 내용
		 * @returns {Object} 구조화된 보고서 컨텐츠 데이터
		 * @private
		 */
		_parseTextToStructure: function (content) {
			console.log("텍스트 파싱 대상:", content);

			var reportData = {
				insight: "",
				summary: []
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
					continue;
				}

				// 내용 처리
				if (currentSection === "insight") {
					reportData.insight += (reportData.insight ? " " : "") + line;
				}
				else if (currentSection === "summary") {
					// 불릿 포인트나 번호 제거
					var cleanLine = line.replace(/^[\-\*\•\d\.]\s*/, '').trim();
					if (cleanLine) {
						reportData.summary.push(cleanLine);
					}
				}
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
				"insight": `전사 실적은 전년 동월 대비 매출 –7%, 영업이익 –269.9% 하락하며 전반적인 손익 구조의 급격한 악화가 포착되었다. 특히 공헌이익은 –230억 원으로 전년 대비 128% 감소하였으며, 마진율은 11.1%로 37.8%p 하락하였다. 이는 전사적인 수익 창출 구조에 구조적 결함이 존재함을 시사한다.

고객사별 데이터를 분석한 결과, SKT는 매출이 증가(7.3%)하였음에도 마진이 22.9% 하락하고 마진율이 0.72 → 0.52로 낮아진 것으로 나타났다. 이는 고마진 계약 비중 축소 또는 수익성 낮은 신규 프로젝트 증가 가능성이 존재함을 의미한다. SKB는 매출이 11.1% 감소하고 마진은 –216억 원 적자로 전환되었으며, 마진율 역시 –0.04로 하락하였다. 이는 계약 구조 또는 투입 인력 운영 효율성 측면의 전면 재검토가 필요함을 나타낸다. Hi-Tech 사업부문에서도 SKHy와 반도체 계열 모두 마진율이 각각 –0.02 및 0.63으로 낮아졌으며, 전년 대비 마진액은 각각 –2590억 원, –780억 원 감소하였다. 이 또한 제품 포트폴리오 혹은 단가 기반 경쟁력 약화로 해석할 수 있다.

조직별로는 AT서비스, 제조서비스, Enterprise서비스 등 주요 3개 부문 모두 매출 대비 마진율이 5~10%p 이상 목표에 미달하고 있으며, Cloud부문은 매출은 고수준이나 마진율은 1.9%로 목표대비 –12.3%p 낮은 수준이다. 이는 고정비 부담 및 수익성 기반 사업 구조 개편 필요성을 시사한다.

AI는 전략적 Make-up 방안으로 다음을 제시한다. 전사 평균 마진율을 현재 11.1%에서 +5%p 개선하여 16.1%로 회복할 경우, 전사 기준 약 11079억 원 × 0.05 = 약 554억 원의 추가 마진 창출이 가능하다. 연간 누적 기준으로 환산 시 약 6650억 원의 추가 수익 확보가 가능하며, 이는 현재 계획 대비 약 20% 수준의 마진 GAP을 보완할 수 있을 것으로 분석된다. 마진율 제고는 저수익 계정 리디자인, 인력 운영 효율화, 고마진 프로젝트 집중 등을 통해 실현 가능하다.

AI는 이상 징후로 Non-MM 비중의 증가(전년 대비 +29%)와 ROHC의 급격한 하락(–126.3%) 또한 병행 포착하였다. 이는 비정형 수주나 신규 사업 매출은 증가했으나, 자원 투입 대비 산출 효율성이 급격히 저하되었음을 의미한다. 따라서 신규 사업에 대한 수익성 기준 재정립과 ROHC 모니터링 체계를 정비할 필요가 있다.

이상으로, 현재 실적이 수익성 중심의 구조 개편 없이는 개선되기 어렵다고 판단하며, 우선순위는 ① 마진율 개선을 위한 전략 고객 재구성, ② 부문별 손익 기준 리디자인, ③ 고정비 부담 최소화 및 DT 사업의 수익 기반 확장 순으로 설정할 것을 제언한다.`,
				"summary": [
					"전사 수익성 구조 악화, 전년 대비 영업이익 –269.9% 하락",
					"마진율 +5%p 개선 시 연간 약 6650억 원 추가 수익 가능"
				]
			});
		},
		dataLoad: function () {
			this._oEventBus.publish("CardChannel", "CardFullLoad", {
				cardId: this.getView().getId()
			})
		},
	});
});