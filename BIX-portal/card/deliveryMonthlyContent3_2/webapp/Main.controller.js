sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"bix/common/ai/service/AgentService"
], function (Controller, JSONModel, MessageToast, AgentService) {
	"use strict";

	return Controller.extend("bix.card.deliveryMonthlyContent3_2.Main", {
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
			var sViewid = "deliveryMonthlyContent3_2View";

			console.log("보고서 생성 파라미터:", params);

			// 로딩 상태 설정
			oModel.setProperty("/isLoading", true);

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

			// 보고서 에이전트 호출을 위한 데이터 구성
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
					console.warn("보고서 내용이 없습니다. 전체 결과:", result);
					throw new Error("보고서 내용이 없습니다.");
				}

				// 백엔드에서 받은 결과를 파싱하여 title, positive, negative, full 구조로 변환
				var oReportData = this._parseReportContent(sReportContent);

				// 기존 뷰 구조에 맞게 모델 업데이트
				oModel.setProperty("/title", oReportData.title || "");
				oModel.setProperty("/full", oReportData.full || "");
				oModel.setProperty("/isLoading", false);

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
						title: content.title || content.제목 || "",
						full: content.full || content.줄글 || content.인사이트 || ""
					};
				}

				// 문자열인 경우 JSON 파싱 시도
				if (typeof content === 'string' && content.trim().startsWith('{')) {
					var jsonData = JSON.parse(content);
					return {
						title: jsonData.title || jsonData.제목 || "",
						full: jsonData.full || jsonData.인사이트 || ""
					};
				}

				// 텍스트 형태로 온 경우 파싱
				return this._parseTextToStructure(content);
			} catch (error) {
				console.error("보고서 내용 파싱 오류:", error);
				return {
					title: "AI 보고서",
					full: content || ""
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

			// 기본값 설정
			if (!reportData.title) {
				reportData.title = "AI 보고서";
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
				"title": "시스템 오류로 인해 기본 데이터를 표시합니다.",
				"full": "보고서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
			});
		}
	});
});