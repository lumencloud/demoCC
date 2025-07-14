sap.ui.define([
    "sap/ui/core/mvc/Controller"
  ], (BaseController) => {
    "use strict";
  
    return BaseController.extend("bix.test.design.controller.Design", {
        onInit() {
            const myRoute = this.getOwnerComponent().getRouter().getRoute("RouteDesign");
            myRoute.attachPatternMatched(this.onMyRoutePatternMatched, this);
        },

        onMyRoutePatternMatched: function () {
            let sHighlighText = 
            `
            <div class="ai_report">
                <!-- 문장 타입 -->
                <p class="text_type01">📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></p>
                <p class="text_type02">📉 텍스트타입 14px weight 400 <span class=bold>텍스트 bold</span></p>
                <p class="text_type03">📊 텍스트타입 13px weight 500 <span class=bold>텍스트 bold</span></p>
                <p class="text_type04">📉 텍스트타입 13px weight 400 <span class=bold>텍스트 bold</span></p>

                <!-- 리스트 타입 -->
                <dl class="list_type">
                    <dt>📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></dt>
                    <dd>텍스트타입 14px weight 400</dd>
                    <dd>텍스트타입 14px weight 400</dd>
                    <dd>텍스트타입 14px weight 400</dd>
                </dl>

                <!--  백그라운드 리스트 타입 -->
                <div class="bg_area">
                    <dl class="list_type">
                        <dt>📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></dt>
                        <dd>텍스트타입 14px weight 400</dd>
                        <dd>텍스트타입 14px weight 400</dd>
                        <dd>텍스트타입 14px weight 400</dd>
                    </dl>
                </div>

                <!-- 백그라운드 이미지 타입 -->
                <div class="bg_area">
                    <div class="report_img">
                        <img src="../../../main/resource/reportSample/report_sample_1.png" />    
                    </div>
                </div>

                <!-- 추가질문 -->
                <div><a class="text_add icon01"><span>질의형 텍스트타입</span></a></div>
                <div><a class="text_add icon02"><span>즉답형 텍스트타입</span></a></div>
                <div><a class="text_add icon03"><span>시각화형 텍스트타입</span></a></div>
                <div><a class="text_add icon04"><span>네비게이터형 텍스트타입</span></a></div>
                <div><a class="text_add icon05"><span>현황분석형 텍스트타입</span></a></div>
                <div><a class="text_add icon06"><span>사용안내형 텍스트타입</span></a></div>
                <div><a class="text_add icon07"><span>보고서형 텍스트타입</span></a></div>
            </div>
            

            `

            let sAssiText = 
            `
            <div class="ai_assistant">
                <!-- 문장 타입 -->
                <p class="text_type01">📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></p>
                <p class="text_type02">📉 텍스트타입 14px weight 400 <span class=bold>텍스트 bold</span></p>
                <p class="text_type03">📊 텍스트타입 13px weight 500 <span class=bold>텍스트 bold</span></p>
                <p class="text_type04">📉 텍스트타입 13px weight 400 <span class=bold>텍스트 bold</span></p>

                <!-- 리스트 타입 -->
                <dl class="list_type">
                    <dt>📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></dt>
                    <dd>텍스트타입 14px weight 400</dd>
                    <dd>텍스트타입 14px weight 400</dd>
                    <dd>텍스트타입 14px weight 400</dd>
                </dl>

                <!--  백그라운드 리스트 타입 -->
                <div class="bg_area">
                    <dl class="list_type">
                        <dt>📊 텍스트타입 14px weight 500 <span class=bold>텍스트 bold</span></dt>
                        <dd>텍스트타입 14px weight 400</dd>
                        <dd>텍스트타입 14px weight 400</dd>
                        <dd>텍스트타입 14px weight 400</dd>
                    </dl>
                </div>

                <!-- 백그라운드 이미지 타입 -->
                <div class="bg_area">
                    <div class="report_img">
                        <img src="../../../main/resource/reportSample/report_sample_1.png" />    
                    </div>
                </div>

                <!-- 추가질문 -->
                <div><a class="text_add icon01"><span>질의형 텍스트타입</span></a></div>
                <div><a class="text_add icon02"><span>즉답형 텍스트타입</span></a></div>
                <div><a class="text_add icon03"><span>시각화형 텍스트타입</span></a></div>
                <div><a class="text_add icon04"><span>네비게이터형 텍스트타입</span></a></div>
                <div><a class="text_add icon05"><span>현황분석형 텍스트타입</span></a></div>
                <div><a class="text_add icon06"><span>사용안내형 텍스트타입</span></a></div>
                <div><a class="text_add icon07"><span>보고서형 텍스트타입</span></a></div>
            </div>

        
            `


            this.byId("highlighText").setContent(sHighlighText);
            this.byId("aiAssiText").setContent(sAssiText);
        }
    });
  });