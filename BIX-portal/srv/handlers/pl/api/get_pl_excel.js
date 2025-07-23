const check_user_auth = require('../../function/check_user_auth');
const get_org_target = require('../../function/get_org_target');

module.exports = (srv) => {
    srv.on('get_pl_excel', async (req) => {
        try{
            /**
             * 핸들러 초기에 권한체크
             */
            // await check_user_auth(req);

            /**
             * API 리턴값 담을 배열 선언
             */
            const oResult = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            // =========================== 조회 대상 DB 테이블 ===========================
            // entities('<cds namespace 명>').<cds entity 명>
            // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
            // (서비스에 등록할 필요는 없음)
            /**
             * pl_wideview_view [실적]
             */
            const pl_view = db.entities('pl').wideview_view;
            const pl_pipeline_view = db.entities('pl').pipeline_view;
            /**
             * sga_wideview_view [sg&a 집계]
             */
            const sga_view = db.entities('sga').wideview_view;
            const sga_excel_export_view = db.entities('sga').excel_export_view;
            const code_header = db.entities('common').code_header
            const dt_task = db.entities('common').dt_task_view
            

            // =================================================================================

            // function 입력 파라미터
            const {} = req.data;
            // QUERY 공통 파라미터 선언

            let o_date = new Date()
            let korea_date = new Date(o_date.getTime() + 9*60*60*1000)

            let s_year = korea_date.getFullYear().toString()
            let s_month = (korea_date.getMonth()+1).toString().padStart(2,'0')
            let s_date = korea_date.getDate().toString().padStart(2,'0')
            let s_hour = korea_date.getHours().toString().padStart(2,'0')
            let s_minute = korea_date.getMinutes().toString().padStart(2,'0')
            let s_second = korea_date.getSeconds().toString().padStart(2,'0')

            let s_now_time = s_year + s_month + s_date + s_hour + s_minute + s_second
            
            /**
             * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
             */
            let pl_column = [
                'seq',
                'year',
                'month',
                'prj_no',
                'prj_nm',
                'cstco_cd',
                'cstco_name',
                'prj_prfm_str_dt',
                'prj_prfm_end_dt',
                'ovse_biz_yn',
                'relsco_yn',
                'prj_tp_cd',
                'itsm_div_yn',
                'crov_div_yn',
                'cnvg_biz_yn',
                'dt_tp',
                'tech_nm',
                'brand_nm',
                'quote_issue_no',
                'quote_target_no',
                'bd_n1_cd',
                'bd_n2_cd',
                'bd_n3_cd',
                'bd_n4_cd',
                'bd_n5_cd',
                'bd_n6_cd',
                'biz_opp_no_sfdc',
                'biz_opp_no',
                // 'biz_opp_nm',
                'deal_stage_cd',
                'deal_stage_chg_dt',
                'dgtr_task_cd',
                'biz_tp_account_cd',
                // 'cls_rsn_tp_cd',
                // 'cls_rsn_tp_nm',
                'expected_contract_date',
                'team_ccorg_cd',
                'team_name',
                'div_ccorg_cd',
                'div_name',
                'hdqt_ccorg_cd',
                'hdqt_name',
                'rodr_team_ccorg_cd',
                'rodr_team_name',
                'rodr_div_ccorg_cd',
                'rodr_div_name',
                'rodr_hdqt_ccorg_cd',
                'rodr_hdqt_name',
                '(case when ifnull(sale_year_amt,0) <> 0 then ifnull(margin_year_amt,0)/sale_year_amt else 0 end)*100 as margin_rate',
                'rodr_year_amt',
                'sale_year_amt',
                'margin_year_amt',
                'prj_prfm_year_amt',
                'sfdc_sale_year_amt',
                'sfdc_margin_year_amt',
            ]
            let sga_column = [
                'year',
                'month',
                'team_ccorg_cd',
                'team_name',
                'div_ccorg_cd',
                'div_name',
                'hdqt_ccorg_cd',
                'hdqt_name',
                // 'shared_exp_yn',
                // 'is_delivery',
                // 'is_total_cc'
            ]
            let pipeline_column = [
                'year',
                'month',
                'team_ccorg_cd as rodr_team_ccorg_cd',
                'team_name as rodr_team_name',
                'div_ccorg_cd',
                'div_name',
                'hdqt_ccorg_cd',
                'hdqt_name',
                'biz_opp_no_sfdc',
                'biz_opp_no',
                // 'biz_opp_nm',
                'deal_stage_cd',
                'deal_stage_chg_dt',
                'biz_tp_account_nm',
                'biz_tp_account_cd',
                'dgtr_task_cd',
                'dgtr_task_nm',
                'expected_contract_date',
                // 'cls_rsn_tp_cd',
                // 'cls_rsn_tp_nm',
                'cstco_cd',
                'cstco_name',
                'case when ifnull(sale_year_amt,0) <> 0 then ifnull(margin_year_amt,0)/sale_year_amt else 0 end as margin_rate',
                'rodr_year_amt',
                'sale_year_amt',
                'margin_year_amt',
            ]
            let sga_excel_export_column = [
                'year',
                'month',
                'team_ccorg_cd',
                'team_name',
                'div_ccorg_cd',
                'div_name',
                'hdqt_ccorg_cd',
                'hdqt_name',
                'gl_account',
                'gl_name',
                'commitment_item',
                'comm_name',
                'asset_yn',
                // 'shared_exp_yn',
                // 'is_total_cc',
                // 'is_delivery',
            ]
            for(let i = 1; i<=12; i++ ){
                pl_column.push(`sale_m${i}_amt`)
                pl_column.push(`prj_prfm_m${i}_amt`)
                pl_column.push(`margin_m${i}_amt`)
                pipeline_column.push(`sale_m${i}_amt`)
                pipeline_column.push(`rodr_m${i}_amt`)
                pipeline_column.push(`margin_m${i}_amt`)
                sga_column.push(`labor_m${i}_amt`)
                sga_column.push(`iv_m${i}_amt`)
                sga_column.push(`exp_m${i}_amt`)
                sga_excel_export_column.push(`m${i}_amt`)
            }

            let s_src_type = `case when src_type = 'E' then 'ERP' when src_type = 'P' then 'Platform' when src_type = 'WO' then 'Working Group' when src_type = 'WA' then 'OS' else 'SFDC' end as src_type` 
            pl_column.push(s_src_type)
            
            const pipeline_where = {'weekly_yn' : false };
            
            const [pl_data, sga_data, sga_excel_export_data, pipeline_data, code_data, dt_task_data] = await Promise.all([
                // PL 실적, 목표 조회
                SELECT.from(pl_view).columns(pl_column).orderBy('org_order'),
                SELECT.from(sga_view).columns(sga_column).orderBy('org_order'),
                SELECT.from(sga_excel_export_view).columns(sga_excel_export_column).orderBy('org_order'),
                SELECT.from(pl_pipeline_view).columns(pipeline_column).where(pipeline_where).orderBy('org_order'),
                SELECT.from(code_header).where({ category:'project_type'}).columns(header => { header.items(item => { item.value, item.name }) }),
                SELECT.from(dt_task).columns(['dgtr_task_cd', 'dgtr_task_nm'])
            ]);
            const a_project_type = code_data[0].items;
            
            pl_data.forEach(pl => {
                let o_prj_tp = a_project_type.find(prj => prj.value === pl.prj_tp_cd)
                let o_dt_task = dt_task_data.find(task => task.dgtr_task_cd === pl.dgtr_task_cd)
                
                pl['prj_tp_nm'] = o_prj_tp?.name??''
                pl['dgtr_task_nm'] = o_dt_task?.dgtr_task_nm??''
            })

            let o_temp = {}

            o_temp[`PL_${s_now_time}`] = pl_data
            o_temp[`SG&A_${s_now_time}`] = sga_data
            o_temp[`SG&A_Excel_Export_${s_now_time}`] = sga_excel_export_data
            o_temp[`Pipeline_${s_now_time}`] = pipeline_data

            oResult.push(o_temp)

            // 데이터 반환
            return oResult;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    });
};