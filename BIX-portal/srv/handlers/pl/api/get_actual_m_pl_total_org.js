module.exports = (srv) => {
    srv.on('get_actual_m_pl_total_org', async (req) => {
        try{

            // function 호출 리턴 객체
            const aRes = [];

            // cds 모듈을 통한 DB 커넥트
            const db = await cds.connect.to('db');

            /**
             * pl.wideview_view [실적]
             * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
             */
            const pl_view = db.entities('pl').wideview_view;
            /**
             * common.org_full_level_view [조직정보]
             * 조직구조 테이블
             */
            const org_full_level = db.entities('common').org_full_level_view;

            // function 입력 파라미터
            const { year, month, org_id } = req.data;

            /**
             * 최상위 조직 정보 반환
             */
            const orgInfo = await SELECT.one.from(org_full_level).columns(['org_level', 'org_ccorg_cd', "org_name", 'org_tp']).where({ 'org_id': org_id });
            if (!orgInfo) return '조직 조회 실패'; // 화면 조회 시 유효하지 않은 조직코드 입력시 예외처리 추가 필요 throw error

            let org_col_nm = orgInfo.org_level+'_id';

            let pl_col_list = ['src_type'];
            let pl_where_conditions = { year: year, src_type: { '!=': 'WA' } };
            let pl_where = org_col_nm === 'lv1_id' ? pl_where_conditions : { ...pl_where_conditions, [org_col_nm]: org_id };

            let pl_groupBy = ['src_type'];
            for (let i = 1; i <= 12; i++) {
                pl_col_list.push(`ifnull(sum(sale_m${i}_amt), 0) as m_${i}_sale`)
                pl_col_list.push(`ifnull(sum(margin_m${i}_amt), 0) as m_${i}_margin`)
            }
            const [pl_data] = await Promise.all([
                SELECT.from(pl_view).columns(pl_col_list).where(pl_where).groupBy(...pl_groupBy)
            ])
            // if(!pl_data.length){
            //     //return req.res.status(204).send();
            //     return []
            // }

            let not_secured_pl = pl_data.find(pl => pl.src_type === 'D'),
                secured_pl = pl_data.filter(pl => pl.src_type !== 'D')
            let o_result = {}
            for (let i = 1; i <= 12; i++) {
                const i_month = Number(month);
                if (i <= i_month) {
                    o_result[`m_${i}_sale`] = secured_pl.reduce((iSum, oData) => iSum += oData[`m_${i}_sale`], 0)
                    o_result[`m_${i}_margin`] = secured_pl.reduce((iSum, oData) => iSum += oData[`m_${i}_margin`], 0)
                    o_result[`m_${i}_type`] = 'actual'
                } else {
                    o_result[`m_${i}_sale`] = (not_secured_pl?.[`m_${i}_sale`]??0) + secured_pl.reduce((iSum, oData) => iSum += oData[`m_${i}_sale`], 0)
                    o_result[`m_${i}_margin`] = (not_secured_pl?.[`m_${i}_margin`]??0) + secured_pl.reduce((iSum, oData) => iSum += oData[`m_${i}_margin`], 0)
                    o_result[`m_${i}_type`] = 'plan'
                }
                o_result[`m_${i}_margin_rate`] = o_result[`m_${i}_sale`] === 0 ? 0 : o_result[`m_${i}_margin`] / o_result[`m_${i}_sale`] * 100
            }

            aRes.push(o_result);

            return aRes;
        } catch(error) { 
            console.error(error); 
            return {code:error.code, message:error.message, isError: true} 
        } 
    })
}