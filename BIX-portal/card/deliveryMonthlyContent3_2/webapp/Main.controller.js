sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"bix/common/ai/service/AgentService",
	"sap/ui/core/EventBus",
], function (Controller, JSONModel, MessageToast, AgentService, EventBus) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent3_2.Main", {
		_oEventBus: EventBus.getInstance(),
		onInit: function () {
			// 초기 로딩 상태 설정
			this.getView().setModel(new JSONModel({
				"isLoading": false,
				"title": "",
				"full": ""
			}), "LLMModel");

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
			var sViewid = "deliveryMonthlyContent3_2View";

			console.log("보고서 컨텐츠 생성 파라미터:", params);

			// 로딩 상태 설정
			oModel.setProperty("/isLoading", true);
			oModel.setProperty("/title", "");
			oModel.setProperty("/full", "");

			/* 분기처리 off (추후 분기처리 기능 업데이트 예정)
			// 공통 Funtcion
			let aFunctions = [
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

			// 타입별 합칠 Function
			let oMergeArray = {
				all: [...aFunctions, ...aAllFunctions],
				delivery: [...aFunctions],
				account: [...aFunctions, ...aAllFunctions],
				cloud: [...aFunctions],
			}

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
							name: "get_ai_forecast_pl",
							params: {
								year: params.year,
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
					this.dataLoad();
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

				// 백엔드에서 받은 결과를 파싱 및 구조로 변환
				var oReportData = this._parseReportContent(sReportContent);

				// 기존 뷰 구조에 맞게 모델 업데이트
				oModel.setProperty("/title", oReportData.title || "");
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
						full: content.full || content.줄글 || ""
					};
				}

				// 문자열인 경우 JSON 파싱 시도
				if (typeof content === 'string' && content.trim().startsWith('{')) {
					var jsonData = JSON.parse(content);
					return {
						title: jsonData.title || jsonData.제목 || "",
						full: jsonData.full || jsonData.줄글 || ""
					};
				}

				// 텍스트 형태로 온 경우 파싱
				return this._parseTextToStructure(content);
			} catch (error) {
				console.error("보고서 컨텐츠 내용 파싱 오류:", error);
				console.log("파싱 실패한 원본 내용:", content);
				this.dataLoad();
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
				"title": "하반기 매출 확대 예상되나 수주 구조 및 전환율 개선 필요.",
				"full": `당해년도 매출 목표는 33,692억 원이며, 상반기 누적 실적은 11,079억 원으로 목표 대비 32.9%에 그쳤다. 3월 일시적 실적 급등(2,750억 원)을 제외하면 대부분의 월에서 1,700억 원 내외의 매출을 기록하며 부진한 흐름을 보였다. 하반기에는 계획 기준으로 총 14,102억 원의 매출이 예정되어 있으며, 월평균 2,350억 원 이상의 실적 확보가 필요하다. 이는 상반기 평균 대비 약 27% 이상 증가한 수치로, 실적 추세 반등과 강한 실행력이 요구된다.

Deal Stage별 파이프라인 분석 결과, 초기 단계인 'Lead'가 36건(1,400억 원 이상)으로 가장 많은 사업기회와 금액을 보유하고 있으나, 계약 가능성이 높은 'Qualified' 이상 단계는 건수와 금액 모두 제한적이다. 특히 'Qualified' 단계는 4건에 불과해 하반기 실적에 대한 실질적 기여도가 낮을 수 있다. 이는 사업기회가 초기단계에 과도하게 집중되어 있어 전환율 개선 없이는 실질 수주로 연결되기 어려운 구조임을 나타낸다.

수주금액별 파이프라인 구성에서도 1억 원 이하 소액 프로젝트가 전체의 80건으로 비중이 가장 높다. 대형 수주로 분류되는 100억 원 이상 구간은 수주액은 크지만 사업기회 건수와 전환율이 낮아 실적 반영 시점과 리스크 관리 측면에서 한계가 존재한다. 결과적으로 현재의 수주 구조는 소액 다건 중심의 비효율적 형태이며, 실적 예측 안정성과 이익 기여도 확보를 위해 구조적 개선이 필요하다.

요약하면, 하반기 매출 확대 가능성은 존재하나 파이프라인 구조의 불균형, 낮은 전환 단계 사업 비중, 소액 중심 구성 등의 리스크가 병존하고 있다. 실적 목표 달성을 위해서는 Qualified 이상 단계의 확대, 고액 사업의 수주율 제고, 소액 사업의 빠른 계약 전환 및 전사 단위의 실행력 집중이 요구된다.`
			});
		},
		dataLoad: function () {
			this._oEventBus.publish("CardChannel", "CardFullLoad", {
				cardId: this.getView().getId()
			});
		}
	});
});