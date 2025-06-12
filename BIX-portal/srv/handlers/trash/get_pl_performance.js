module.exports = (srv) => {
    srv.on('get_pl_performance', async (req) => {

        const db = await cds.connect.to('db');
        return await f_pl_performance(db, req);
    });
}
async function f_pl_performance(db, req) {

    /**
     * API 리턴값 담을 배열 선언
     */
    const oResult = [];

    // cds 모듈을 통한 DB 커넥트

    // 조회 대상 DB 테이블
    // entities('<cds namespace 명>').<cds entity 명>
    // srv .cds 에 using from 구문에 엔티티가 속한 db .cds 파일이 최소 한 번이라도 걸려있어야 db.entities 로 엔티티 인식가능
    // (서비스에 등록할 필요는 없음)
    /**
     * pl.target_view
     * [부문/본부/팀 + 년,판매,판매,마진,BR 목표금액] ccorg_cd 기준으로 포탈에 입력한 목표
     */
    const pl_target_view = db.entities('pl').target_view;
    /**
     * pl.wideview_unpivot_view [실적]
     * [부문/본부/팀 + 연월,금액] 팀,본부 단위의 프로젝트 실적비용 집계 뷰
     */
    const pl_view = db.entities('pl').wideview_unpivot_view;
    /**
     * sga.wideview_unpivot_view [sg&a 집계]
     * [부문/본부/팀 + 연,금액] 프로젝트 판관비 집계 뷰
     */
    const sga_view = db.entities('sga.view').wideview_unpivot;
    /**
     * common.org_full_level [조직정보]
     * 조직구조 테이블
     */
    const org_full_level = db.entities('common').org_full_level_view;

    // function 입력 파라미터
    const { year, month, org_id } = req.data;
    const last_year = (Number(year) - 1).toString();

    // QUERY 공통 파라미터 선언
    /** 
     * 타겟 뷰 조회용 컬럼
     */
    const target_col_list = [
        'year', 'sum(ifnull(sale,0)) as target_sale_amount',
        'sum(ifnull(margin,0)) as target_margin_amount', 'sum(ifnull(br,0)) as target_br'];
    const target_where_conditions = { 'year': { in: [year, last_year] } };
    const target_groupBy_cols = ['year']

    /**
     * 실적 조회용 SELECT 컬럼 - 전사, 부문, 본부 공통으로 사용되는 컬럼 조건 (+ 연, 월, 부문, 본부 조건별 추가)
     */
    const pl_col_list = [
        'year', 'month_amt', 'sum(ifnull(sale_amount_sum,0)) as sale_amount_sum', 'sum(ifnull(prj_prfm_amount_sum,0)) as prj_prfm_amount_sum', 'sum(ifnull(margin_amount_sum,0)) as margin_amount_sum'];
    const pl_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'org_id': { "!=": null } };
    const pl_groupBy_cols = ['year', 'month_amt'];

    /**
     * SG&A 조회용 컬럼
     * shared_exp_yn false = 사업 / true = 전사
     */
    const sga_col_list = ['year', 'shared_exp_yn',
        '(sum(ifnull(labor_amount_sum,0)) + sum(ifnull(iv_amount_sum,0)) + sum(ifnull(exp_amount_sum,0))) as amount_sum'];
    const sga_where_conditions = { 'year': { in: [year, last_year] }, 'month_amt': month, 'org_id':{'!=':null}};
    const sga_groupBy_cols = ['year', 'shared_exp_yn'];

    let orgInfo = await SELECT.from(org_full_level).where`lv1_id = ${org_id} or lv2_id = ${org_id} or lv3_id = ${org_id} or div_id = ${org_id} or hdqt_id = ${org_id} or team_id = ${org_id}`;
    if (orgInfo.length < 1) return; // 예외처리 추가 필요 throw error

    //조직 정보를 where조건에 추가
    let a_condition = { 'div_id': orgInfo[0].div_id, 'hdqt_id': orgInfo[0].hdqt_id, 'team_id': orgInfo[0].team_id }
    orgInfo.forEach((a, i) => {
        if (i !== 0) {
            a_condition = { 'div_id': a.div_id, 'hdqt_id': a.hdqt_id, 'team_id': a.team_id, or: a_condition }
        }
    })

    let target_column = target_col_list;
    let target_where = { ...target_where_conditions, and: a_condition };
    let target_groupBy = target_groupBy_cols;

    let pl_column = pl_col_list;
    let pl_where = { ...pl_where_conditions, and: a_condition };
    let pl_groupBy = pl_groupBy_cols;

    let sga_column = sga_col_list;
    let sga_where = { ...sga_where_conditions, and: a_condition };
    let sga_groupBy = sga_groupBy_cols;

    // DB 쿼리 실행 (병렬)
    const [query, query_target, sga_query] = await Promise.all([
        // PL 실적, 목표 조회
        SELECT.from(pl_view).columns(pl_column).where(pl_where).groupBy(...pl_groupBy),
        SELECT.from(pl_target_view).columns(target_column).where(target_where).groupBy(...target_groupBy),
        SELECT.from(sga_view).columns(sga_column).where(sga_where).groupBy(...sga_groupBy)
    ]);

    // 임시 - 비어있을 경우 0 값 생성, 추후 에러처리 or 로직 구성

    let pl_target_row = query_target.find(o => o.year === year),
        pl_target_last_y_row = query_target.find(o => o.year === last_year),
        pl_row = query.find(o => o.year === year),
        pl_last_y_row = query.find(o => o.year === last_year),
        sga_row = sga_query.find(o => o.year === year && o.shared_exp_yn === false),
        sga_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === false),
        sga_exp_row = sga_query.find(o => o.year === year && o.shared_exp_yn === true),
        sga_exp_last_y_row = sga_query.find(o => o.year === last_year && o.shared_exp_yn === true);
    const sale_data =
    {
        "seq": 1,
        "type": "매출",
        "goal": pl_target_row?.["target_sale_amount"] || 0,
        "performanceCurrentYearMonth": pl_row?.["sale_amount_sum"] || 0,
        "performanceLastYearMonth": pl_last_y_row?.["sale_amount_sum"] || 0,
        "performanceAttainmentRateCurrentYear": (pl_target_row?.["target_sale_amount"] || 0) ? (pl_row?.["sale_amount_sum"] || 0) / pl_target_row["target_sale_amount"] * 100 : 0,
        "performanceAttainmentRateLastYear": (pl_target_last_y_row?.["target_sale_amount"] || 0) ? (pl_last_y_row?.["sale_amount_sum"] || 0) / pl_target_last_y_row["target_sale_amount"] * 100 : 0
    };
    oResult.push(sale_data);

    const margin_data =
    {
        "seq": 2,
        "type": "마진",
        "goal": pl_target_row?.["target_margin_amount"] || 0,
        "performanceCurrentYearMonth": pl_row?.["margin_amount_sum"] || 0,
        "performanceLastYearMonth": pl_last_y_row?.["margin_amount_sum"] || 0,
        "performanceAttainmentRateCurrentYear": (pl_target_row?.["target_margin_amount"] || 0) ? (pl_row?.["margin_amount_sum"] || 0) / pl_target_row["target_margin_amount"] * 100 : 0,
        "performanceAttainmentRateLastYear": (pl_target_last_y_row?.["target_margin_amount"] || 0) ? (pl_last_y_row?.["margin_amount_sum"] || 0) / pl_target_last_y_row["target_margin_amount"] * 100 : 0
    };
    oResult.push(margin_data);

    const margin_rate_data =
    {
        "seq": 3,
        "type": "마진률",
        "goal": sale_data["goal"] !== 0 ? margin_data["goal"] / sale_data["goal"] * 100 : 0,
        "performanceCurrentYearMonth": sale_data["performanceCurrentYearMonth"] !== 0 ? margin_data["performanceCurrentYearMonth"] / sale_data["performanceCurrentYearMonth"] * 100 : 0,
        "performanceLastYearMonth": sale_data["performanceLastYearMonth"] !== 0 ? margin_data["performanceLastYearMonth"] / sale_data["performanceLastYearMonth"] * 100 : 0,
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };
    oResult.push(margin_rate_data);

    const sga_data =
    {
        "seq": 4,
        "type": "SG&A",
        "goal": 0,
        "performanceCurrentYearMonth": sga_row?.["amount_sum"] || 0,
        "performanceLastYearMonth": sga_last_y_row?.["amount_sum"] || 0,
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };

    oResult.push(sga_data);
    // 공헌이익 [마진 - 사업SG&A]
    const contribution_data =
    {
        "seq": 5,
        "type": "공헌이익",
        "goal": 0,
        "performanceCurrentYearMonth": margin_data["performanceCurrentYearMonth"] - (sga_row?.["amount_sum"] || 0),
        "performanceLastYearMonth": margin_data["performanceLastYearMonth"] - (sga_last_y_row?.["amount_sum"] || 0),
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };
    oResult.push(contribution_data);

    const sga_total_data =
    {
        "seq": 6,
        "type": "전사 SG&A",
        "goal": 0,
        "performanceCurrentYearMonth": sga_exp_row?.["amount_sum"] || 0,
        "performanceLastYearMonth": sga_exp_last_y_row?.["amount_sum"] || 0,
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };
    oResult.push(sga_total_data);

    // 영업이익 [공헌이익 - 전사 SG&A]
    const profit_data =
    {
        "seq": 7,
        "type": "영업이익",
        "goal": 0,
        "performanceCurrentYearMonth": contribution_data["performanceCurrentYearMonth"] - (sga_exp_row?.["amount_sum"] || 0),
        "performanceLastYearMonth": contribution_data["performanceLastYearMonth"] - (sga_exp_last_y_row?.["amount_sum"] || 0),
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };
    oResult.push(profit_data);

    // 영업이익률 데이터 [영업이익/매출]
    const profit_rate_data =
    {
        "seq": 8,
        "type": "영업이익률",
        "goal": 0,
        "performanceCurrentYearMonth": (pl_row?.["sale_amount_sum"] || 0) != 0 ? profit_data["performanceCurrentYearMonth"] / pl_row["sale_amount_sum"] * 100 : 0,
        "performanceLastYearMonth": (pl_last_y_row?.["sale_amount_sum"] || 0) != 0 ? profit_data["performanceLastYearMonth"] / pl_last_y_row["sale_amount_sum"] * 100 : 0,
        "performanceAttainmentRateCurrentYear": 0,
        "performanceAttainmentRateLastYear": 0
    };
    oResult.push(profit_rate_data);
    return oResult;

};

module.exports.f_pl_performance = f_pl_performance;