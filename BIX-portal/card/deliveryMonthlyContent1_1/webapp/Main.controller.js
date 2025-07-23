sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"bix/common/ai/service/AgentService",
	"sap/ui/core/EventBus",
], function (Controller, JSONModel, MessageToast, AgentService, EventBus) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent1_1.Main", {
		_oEventBus: EventBus.getInstance(),
		_bFlag: true, // 카드 로드 예외 처리
		onInit: function () {
			// 초기 로딩 상태 설정
			this.getView().setModel(new JSONModel({
				"isLoading": true,
				"title": "",
				//"positive": "",
				//"negative": "",
				"full": ""
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
			var sViewid = "deliveryMonthlyContent1_1View";

			console.log("보고서 컨텐츠 생성 파라미터:", params);

			// 로딩 상태 설정
			oModel.setProperty("/isLoading", true);
			oModel.setProperty("/title", "");
			oModel.setProperty("/full", "");

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
			]

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
					functions: aMergeFunctions,
				}
			};
			*/

			// 전사 기준 (일시적), org_tp = "delivery"
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
					console.warn("보고서 컨텐츠 내용이 없습니다. 전체 결과:", result);
					throw new Error("보고서 컨텐츠 내용이 없습니다.");
				}

				// 백엔드에서 받은 결과를 파싱 및 구조 변환
				var oReportData = this._parseReportContent(sReportContent);

				// 기존 뷰 구조에 맞게 모델 업데이트
				oModel.setProperty("/title", oReportData.title || "");
				//oModel.setProperty("/positive", oReportData.positive || "");
				//oModel.setProperty("/negative", oReportData.negative || "");
				oModel.setProperty("/full", oReportData.full || "");
				oModel.setProperty("/isLoading", false);

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
						title: content.title || content.제목 || "",
						//positive: content.positive || content.긍정요인 || "",
						//negative: content.negative || content.부정요인 || "",
						full: content.full || content.줄글 || ""
					};
				}

				// 문자열인 경우 JSON 파싱 시도
				if (typeof content === 'string' && content.trim().startsWith('{')) {
					var jsonData = JSON.parse(content);
					return {
						title: jsonData.title || jsonData.제목 || "",
						//positive: jsonData.positive || jsonData.긍정요인 || "",
						//negative: jsonData.negative || jsonData.부정요인 || "",
						full: jsonData.full || jsonData.줄글 || ""
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
				title: "",
				//positive: "",
				//negative: "",
				full: ""
			};

			var lines = content.split('\n');
			var currentSection = "";

			for (var i = 0; i < lines.length; i++) {
				var line = lines[i].trim();

				if (!line) continue;

				// 섹션 구분자 확인
				if (line.toLowerCase().includes("title") || line.includes("제목")) {
					currentSection = "title";
					var titleMatch = line.match(/(?:title|제목)\s*:\s*(.+)/i);
					if (titleMatch) {
						reportData.title = titleMatch[1];
					}
					continue;
				}

				/*
				if (line.toLowerCase().includes("positive") || line.includes("긍정")) {
					currentSection = "positive";
					continue;
				}

				if (line.toLowerCase().includes("negative") || line.includes("부정")) {
					currentSection = "negative";
					continue;
				}
				*/

				if (line.toLowerCase().includes("full") || line.includes("줄글") || line.includes("인사이트")) {
					currentSection = "full";
					var fullMatch = line.match(/(?:full|인사이트|줄글)\s*:\s*(.+)/i);
					if (fullMatch) {
						reportData.full = fullMatch[1];
					}
					continue;
				}

				// 내용 처리
				if (currentSection === "title" && !reportData.title) {
					reportData.title = line;
				}
				/*
				else if (currentSection === "positive") {
					reportData.positive += (reportData.positive ? " " : "") + line;
				}
				else if (currentSection === "negative") {
					reportData.negative += (reportData.negative ? " " : "") + line;
				}
				*/
				else if (currentSection === "full") {
					reportData.full += (reportData.full ? "\n" : "") + line;
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
				"title": "공헌이익 및 이익률 하락 지속, DT 확대에도 수익성 저하",
				//"positive": "시스템 복구 중입니다.",
				//"negative": "일시적인 서비스 장애가 발생했습니다.",
				"full": `당월 전체 매출은 11,079억 원으로 전년 동월 대비 7% 감소하였으며, 영업이익은 –649억 원으로 적자를 기록하여 전년 대비 269.9% 급감하였다. 공헌이익은 –230억 원으로 전년 대비 128% 하락하였고, 공헌이익률은 11.1%로 37.8%p 하락하였다. SGA는 419억 원으로 전년 대비 4.7% 감소하였으나, 매출 감소율을 상회하지 못해 전체 수익성 하락에 영향을 미쳤다.

BR 비율은 74.8%로 6.2%p 증가하며 매출 인력의 집중도는 향상되었으나, 인력 대비 수익 창출력은 악화되었다. DT 부문은 648억 원으로 전년 수준을 유지하였으나, ROHC는 –0.1로 126.3% 하락하며 생산성 지표가 급격히 저하되었다. Non-MM은 69억 원으로 29% 증가하여 비정형 매출 비중이 확대되었으나, 수익성에는 긍정적 영향을 주지 못하였다.

고객사별 실적을 보면, SKT는 매출이 7.3% 증가했음에도 마진은 22.9% 감소하고, 마진율은 20.3%p 하락하여 수익성 저하가 두드러졌다. SKB는 매출이 11.1% 감소하였고 마진은 적자 전환되었으며, 마진율도 –4.2%로 하락하였다. ICT 계열은 매출이 23.2% 감소했으나 마진율은 소폭 상승하며 수익성 유지에 일부 기여하였다.

반면 Hi-Tech 사업부문에서는 SKHy와 반도체계열 모두 매출은 유사 수준이나 마진은 큰 폭으로 감소하였다. 특히 SKHy는 –251억 원의 적자를 기록하였으며, 마진율도 –1.9%로 전년 대비 급감하였다. 제조/Global 부문에서는 SKI, SKON, 기타 제조 모두 매출이 전년 대비 20~30% 감소하였으며, 마진율도 하락세를 보였다. 특히 SKON은 매출 31.9% 감소, 마진 26.4% 감소로 수익성 약화가 확인되었다.

금융/전략사업부문에서는 금융 계열과 유통/서비스 계열 모두 전년 대비 매출과 마진이 모두 하락하였다. 특히 대외Cloud의 경우 매출은 10.7% 감소하였으며, 마진은 적자 전환되었고 마진율은 –1.9%로 전환되어 사업성 재점검이 필요하다. 반면 공공 부문은 적자폭을 축소하였고, 마진율도 –24.2%에서 –10.7%로 개선되었다.

조직별로 보면, AT서비스, 제조서비스, Enterprise서비스 모두 매출 대비 마진율이 목표 대비 10%p 이상 낮아 전사 수익성 확보가 미진한 것으로 분석된다. Cloud부문은 매출은 확보되었으나 마진율이 1.9%로 목표 대비 12.3%p 이상 낮아 구조적 수익성 개선이 요구된다.

종합적으로 보면, DT 중심의 매출 유지에도 불구하고 전반적인 마진율 하락과 적자 확대가 동반되고 있으며, 고객사별로 수익성 편차가 커지고 있다. 매출 성장 중심의 사업 전략에서 벗어나 수익성 기반의 관리체계 정비와 고객사별 손익 분석 기반 재구성 전략이 요구된다.`
			});
		},
		dataLoad: function () {
			this._oEventBus.publish("CardChannel", "CardFullLoad", {
				cardId: this.getView().getId()
			})
		},
	});
});