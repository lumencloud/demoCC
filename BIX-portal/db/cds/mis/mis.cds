using {managed} from '@sap/cds/common';

namespace common;

/**
 * 조직
 *
 * As-Is : bzm_org
 */
entity mis_com_org : managed {
    key id          : String(20) not null @title: 'BZM_조직_ID';
        org_cd      : String(10) not null @title: '조직_코드';
        org_kor_nm  : String(300)         @title: '조직_한글_명';
        org_eng_nm  : String(300)         @title: '조직_영문_명';
        org_abbr_nm : String(300)         @title: '조직_약어_명';
        upr_org_id  : String(20)          @title: '상위_조직_ID';
        upr_org     : Association to mis_com_org
                          on upr_org.id = $self.upr_org_id;
        lwr_org     : Association to many mis_com_org
                          on lwr_org.upr_org_id = $self.id;
        org_tp_rcid : String(20)          @title: '조직_유형_RCID';
        ccorg_cd    : String(10)          @title: 'CC조직_코드';
        pcorg_cd    : String(10)          @title: 'PC조직_코드';
        org_stp_dgr : Decimal             @title: '조직_단계_차수';
        org_sort_id : String(100)         @title: '조직_정렬_ID';
        vrtl_org_yn : Boolean             @title: '가상_조직_여부';
        real_org_cd : String(10)          @title: '실제_조직_코드';
        org_desc    : String(1000)        @title: '조직_설명';
        org_str_dt  : Date                @title: '조직_시작_일자';
        org_end_dt  : Date                @title: '조직_종료_일자';
        use_yn      : Boolean             @title: '사용_여부';
}

view mis_com_org_view as
    select from mis_com_org {
        *
    }
    where
        '2024-01-01T00:00:00Z' between org_str_dt and org_end_dt;

/**
 * 사원
 *
 * As-Is : bzm_emp
 */
entity mis_com_emp : managed {
    key id                         : String(20) not null @title: 'BZM_사원_ID';
        if_emp_id                  : String(15) not null @title: '인터페이스_사원_ID';
        emp_no                     : String(15)          @title: '사원_번호';
        emp_kor_flnm               : String(300)         @title: '사원_한글_성명';
        emp_eng_flnm               : String(300)         @title: '사원_영문_성명';
        intl_pos_rcid              : String(20)          @title: '내부_직위_RCID';
        pos_sort_dgr               : Decimal             @title: '직위_정렬_차수';
        rsof_rcid                  : String(20)          @title: '직책_RCID';
        scpos_rcid                 : String(20)          @title: '신분_RCID';
        co_tphn_no                 : String(64)          @title: '회사_전화_번호';
        cphn_no                    : String(64)          @title: '휴대전화_번호';
        eml_addr                   : String(200)         @title: '전자우편_주소';
        emp_sts_rcid               : String(20)          @title: '사원_상태_RCID';
        rtm_yn                     : Boolean             @title: '퇴직_여부';
        etco_dt                    : Date                @title: '입사_일자';
        rtm_dt                     : Date                @title: '퇴직_일자';
        rtm_prarg_dt               : Date                @title: '퇴직_예정_일자';
        ontpm_yn                   : Boolean             @title: '공채_여부';
        pr_grd                     : String(10)          @title: '가격_등급';
        crr_yrcnt                  : Decimal             @title: '경력_년수';
        emp_img_atch_file_id       : String(20)          @title: '사원_이미지_첨부_파일_ID';
        emp_img_atch_file_path_nm  : String(200)         @title: '사원_이미지_첨부_파일_경로_명';
        emp_img_orgx_atch_file_nm  : String(200)         @title: '사원_이미지_원본_첨부_파일_명';
        emp_img_atch_file_dwld_url : String(1000)        @title: '사원_이미지_첨부_파일_다운로드_URL';
        dtgr_nm                    : String(50)          @title: '직군_명';
        dty_nm                     : String(50)          @title: '직무_명';
        dg_nm                      : String(50)          @title: '직무등급_명';
        crr_base_dt                : Date                @title: '경력_기준_일자';
}

//고객사
//As-Is : bzm_cstco
entity mis_com_cstco : managed {
    key id                  : String(20) not null @title: 'BZM_고객사_ID';
        erp_cstco_cd        : String(10)          @title: 'ERP_고객사_코드';
        cstco_nm            : String(300)         @title: '고객사_명';
        cstco_rpstr_nm      : String(300)         @title: '고객사_대표자_명';
        brno                : String(10)          @title: '사업자등록번호';
        bztp_div_rcid       : String(20)          @title: '업종_구분_RCID';
        bzcd_nm             : String(300)         @title: '업태_명';
        bztp_nm             : String(300)         @title: '업종_명';
        cstco_zpcd          : String(10)          @title: '고객사_우편번호';
        cstco_addr          : String(200)         @title: '고객사_주소';
        cstco_crdt_grd_rcid : String(20)          @title: '고객사_신용_등급_RCID';
        relsco_yn           : Boolean             @title: '관계사_여부';
        erp_pbl_div_rcid    : String(20)          @title: 'ERP_공공_구분_RCID';
        crdln_amt           : Decimal             @title: '여신_금액';
        pymp_pay_rcid       : String(20)          @title: '대금_지급_RCID';
        natn_rcid           : String(20)          @title: '국가_RCID';
        smla_dmfn_yn        : Boolean             @title: '유사_대내외_여부';
        use_yn              : Boolean             @title: '사용_여부';
        cstco_id            : String(10) not null @title: '고객사_ID';
        cstco_acntg_nm      : String(300)         @title: '고객사_회계_명';
        cstco_aflc_nm       : String(300)         @title: '고객사_계열_명';
        cstco_addr_dtl      : String(60)          @title: '고객사_주소_상세';
}


//공통코드(카테고리)
//As-Is : bzm_ctgr
entity mis_com_ctgr : managed {
    key id            : String(20) not null @title: 'BZM_카테고리_ID';
        svc_tp_cd     : String(50)          @title: '서비스_유형_코드';
        ctgr_idtf_val : String(300)         @title: '카테고리_식별자_값';
        ctgr_cd_val   : String(300)         @title: '카테고리_코드_값';
        ctgr_nm       : String(300)         @title: '카테고리_명';
        ctgr_titl_nm  : String(300)         @title: '카테고리_제목_명';
        ctgr_desc     : String(300)         @title: '카테고리_설명';
        ctgr_lvl      : Decimal             @title: '카테고리_레벨';
        uuse_yn       : Boolean             @title: '미사용_여부';
        prnt_ctgr_id  : String(20)          @title: '부모_카테고리_ID';
        sort_ord      : Decimal             @title: '정렬_순서';
}

/**
 * 실적(추정실행)
 *
 * As-Is : slm_esmt_exe
 */
entity mis_esmt_exe : managed {
    key id                      : String(20) not null @title: 'SLM_추정실행_ID';
        rodr_esmt_ym            : String(6) not null  @title: '수주_추정_년월';
        frst_rgstr_rid          : String(20);
        frst_rgst_dtm           : Timestamp;
        last_updtr_rid          : String(20);
        last_updt_dtm           : Timestamp;
        prj_no                  : String(13)          @title: '프로젝트_번호';
        sell_sls_cnrc_no        : String(15)          @title: '판매_영업_계약_번호';
        dp_no                   : String(20)          @title: 'DP_번호';
        prj_nm                  : String(300)         @title: '프로젝트_명';
        cstco_rid               : String(20)          @title: '고객사_RID';
        cstco                   : Association to one mis_com_cstco
                                      on cstco.id = $self.cstco_rid;
        rodr_sctr_org_rid       : String(20)          @title: '수주_부문_조직_RID';
        rodr_sctr_org           : Association to one mis_com_org
                                      on rodr_sctr_org.id = $self.rodr_sctr_org_rid;
        rodr_hdqt_org_rid       : String(20)          @title: '수주_본부_조직_RID';
        rodr_hdqt_org           : Association to one mis_com_org
                                      on rodr_hdqt_org.id = $self.rodr_hdqt_org_rid;
        rodr_org_rid            : String(20)          @title: '수주_조직_RID';
        rodr_org                : Association to one mis_com_org
                                      on rodr_org.id = $self.rodr_org_rid;
        sale_sctr_org_rid       : String(20)          @title: '매출_부문_조직_RID';
        sale_sctr_org           : Association to one mis_com_org
                                      on sale_sctr_org.id = $self.sale_sctr_org_rid;
        sale_hdqt_org_rid       : String(20)          @title: '매출_본부_조직_RID';
        sale_hdqt_org           : Association to one mis_com_org
                                      on sale_hdqt_org.id = $self.sale_hdqt_org_rid;
        sale_org_rid            : String(20)          @title: '매출_조직_RID';
        sale_org                : Association to one mis_com_org
                                      on sale_org.id = $self.sale_org_rid;
        rodr_cnrc_ym            : String(6)           @title: '수주_계약_년월';
        prj_prfm_end_dt         : Date                @title: '프로젝트_수행_종료_일자';
        prj_prfm_str_dt         : Date                @title: '프로젝트_수행_시작_일자';
        new_crov_div_rcid       : String(20)          @title: '신규_이월_구분_RCID';
        new_crov_div            : Association to one mis_com_ctgr
                                      on  new_crov_div.prnt_ctgr_id = '200358'
                                      and new_crov_div.id           = $self.new_crov_div_rcid;
        prj_scr_yn              : Boolean             @title: '프로젝트_확보_여부';
        ovse_biz_yn             : Boolean             @title: '해외_사업_여부';
        relsco_yn               : Boolean             @title: '관계사_여부';
        cnvg_biz_yn             : Boolean             @title: '융복합_사업_여부';
        prj_tp_rcid             : String(20)          @title: '프로젝트_유형_RCID';
        prj_tp                  : Association to one mis_com_ctgr
                                      on  prj_tp.prnt_ctgr_id = '100024'
                                      and prj_tp.id           = $self.prj_tp_rcid;
        si_os_div_rcid          : String(20)          @title: 'SI_OS_구분_RCID';
        si_os_div               : Association to one mis_com_ctgr
                                      on  si_os_div.prnt_ctgr_id = '200364'
                                      and si_os_div.id           = $self.si_os_div_rcid;
        dp_knd_cd               : String(50)          @title: 'DP_종류_코드';
        dev_aplt_dgtr_tech_rcid : String(20)          @title: '개발_적용_DT_기술_RCI';
        dev_aplt_dgtr_tech      : Association to one mis_com_ctgr
                                      on  dev_aplt_dgtr_tech.prnt_ctgr_id = '200086'
                                      and dev_aplt_dgtr_tech.id           = $self.dev_aplt_dgtr_tech_rcid;
        brand_nm                : String(300)         @title: '브랜드_명';
        dp_nm                   : String(300)         @title: 'DP_명';
        bd_n1_rid               : String(20) not null @title: '비즈니스도메인_1_RID';
        bd_n2_rid               : String(20) not null @title: '비즈니스도메인_2_RID';
        bd_n3_rid               : String(20) not null @title: '비즈니스도메인_3_RID';
        bd_n4_rid               : String(20)          @title: '비즈니스도메인_4_RID';
        bd_n5_rid               : String(20)          @title: '비즈니스도메인_5_RID';
        bd_n6_rid               : String(20)          @title: '비즈니스도메인_6_RID';
        itsm_div_rcid           : String(20)          @title: 'ITSM_구분_RCID';
        itsm_div                : Association to one mis_com_ctgr
                                      on  itsm_div.prnt_ctgr_id = '200368'
                                      and itsm_div.id           = $self.itsm_div_rcid;
        rodr_n1_mm_amt          : Decimal             @title: '수주_1_월_금액';
        rodr_n2_mm_amt          : Decimal             @title: '수주_2_월_금액';
        rodr_n3_mm_amt          : Decimal             @title: '수주_3_월_금액';
        rodr_n4_mm_amt          : Decimal             @title: '수주_4_월_금액';
        rodr_n5_mm_amt          : Decimal             @title: '수주_5_월_금액';
        rodr_n6_mm_amt          : Decimal             @title: '수주_6_월_금액';
        rodr_n7_mm_amt          : Decimal             @title: '수주_7_월_금액';
        rodr_n8_mm_amt          : Decimal             @title: '수주_8_월_금액';
        rodr_n9_mm_amt          : Decimal             @title: '수주_9_월_금액';
        rodr_n10_mm_amt         : Decimal             @title: '수주_10_월_금액';
        rodr_n11_mm_amt         : Decimal             @title: '수주_11_월_금액';
        rodr_n12_mm_amt         : Decimal             @title: '수주_12_월_금액';
        rodr_n1_qtr_amt         : Decimal             @title: '수주_1_분기_금액';
        rodr_n2_qtr_amt         : Decimal             @title: '수주_2_분기_금액';
        rodr_n3_qtr_amt         : Decimal             @title: '수주_3_분기_금액';
        rodr_n4_qtr_amt         : Decimal             @title: '수주_4_분기_금액';
        rodr_year_amt           : Decimal             @title: '수주_년_금액';
        sale_n1_mm_amt          : Decimal             @title: '매출_1_월_금액';
        sale_n2_mm_amt          : Decimal             @title: '매출_2_월_금액';
        sale_n3_mm_amt          : Decimal             @title: '매출_3_월_금액';
        sale_n4_mm_amt          : Decimal             @title: '매출_4_월_금액';
        sale_n5_mm_amt          : Decimal             @title: '매출_5_월_금액';
        sale_n6_mm_amt          : Decimal             @title: '매출_6_월_금액';
        sale_n7_mm_amt          : Decimal             @title: '매출_7_월_금액';
        sale_n8_mm_amt          : Decimal             @title: '매출_8_월_금액';
        sale_n9_mm_amt          : Decimal             @title: '매출_9_월_금액';
        sale_n10_mm_amt         : Decimal             @title: '매출_10_월_금액';
        sale_n11_mm_amt         : Decimal             @title: '매출_11_월_금액';
        sale_n12_mm_amt         : Decimal             @title: '매출_12_월_금액';
        sale_n1_qtr_amt         : Decimal             @title: '매출_1_분기_금액';
        sale_n2_qtr_amt         : Decimal             @title: '매출_2_분기_금액';
        sale_n3_qtr_amt         : Decimal             @title: '매출_3_분기_금액';
        sale_n4_qtr_amt         : Decimal             @title: '매출_4_분기_금액';
        sale_year_amt           : Decimal             @title: '매출_년_금액';
        prj_prfm_n1_mm_amt      : Decimal             @title: '프로젝트_수행_1_월_금액';
        prj_prfm_n2_mm_amt      : Decimal             @title: '프로젝트_수행_2_월_금액';
        prj_prfm_n3_mm_amt      : Decimal             @title: '프로젝트_수행_3_월_금액';
        prj_prfm_n4_mm_amt      : Decimal             @title: '프로젝트_수행_4_월_금액';
        prj_prfm_n5_mm_amt      : Decimal             @title: '프로젝트_수행_5_월_금액';
        prj_prfm_n6_mm_amt      : Decimal             @title: '프로젝트_수행_6_월_금액';
        prj_prfm_n7_mm_amt      : Decimal             @title: '프로젝트_수행_7_월_금액';
        prj_prfm_n8_mm_amt      : Decimal             @title: '프로젝트_수행_8_월_금액';
        prj_prfm_n9_mm_amt      : Decimal             @title: '프로젝트_수행_9_월_금액';
        prj_prfm_n10_mm_amt     : Decimal             @title: '프로젝트_수행_10_월_금';
        prj_prfm_n11_mm_amt     : Decimal             @title: '프로젝트_수행_11_월_금';
        prj_prfm_n12_mm_amt     : Decimal             @title: '프로젝트_수행_12_월_금';
        prj_prfm_n1_qtr_amt     : Decimal             @title: '프로젝트_수행_1_분기_금';
        prj_prfm_n2_qtr_amt     : Decimal             @title: '프로젝트_수행_2_분기_금';
        prj_prfm_n3_qtr_amt     : Decimal             @title: '프로젝트_수행_3_분기_금';
        prj_prfm_n4_qtr_amt     : Decimal             @title: '프로젝트_수행_4_분기_금';
        prj_prfm_year_amt       : Decimal             @title: '프로젝트_수행_년_금액';
        rmdr_sale_n1_mm_amt     : Decimal             @title: '잔여_매출_1_월_금액';
        rmdr_sale_n2_mm_amt     : Decimal             @title: '잔여_매출_2_월_금액';
        rmdr_sale_n3_mm_amt     : Decimal             @title: '잔여_매출_3_월_금액';
        rmdr_sale_n4_mm_amt     : Decimal             @title: '잔여_매출_4_월_금액';
        rmdr_sale_n5_mm_amt     : Decimal             @title: '잔여_매출_5_월_금액';
        rmdr_sale_n6_mm_amt     : Decimal             @title: '잔여_매출_6_월_금액';
        rmdr_sale_n7_mm_amt     : Decimal             @title: '잔여_매출_7_월_금액';
        rmdr_sale_n8_mm_amt     : Decimal             @title: '잔여_매출_8_월_금액';
        rmdr_sale_n9_mm_amt     : Decimal             @title: '잔여_매출_9_월_금액';
        rmdr_sale_n10_mm_amt    : Decimal             @title: '잔여_매출_10_월_금액';
        rmdr_sale_n11_mm_amt    : Decimal             @title: '잔여_매출_11_월_금액';
        rmdr_sale_n12_mm_amt    : Decimal             @title: '잔여_매출_12_월_금액';
        rmdr_sale_n1_qtr_amt    : Decimal             @title: '잔여_매출_1_분기_금액';
        rmdr_sale_n2_qtr_amt    : Decimal             @title: '잔여_매출_2_분기_금액';
        rmdr_sale_n3_qtr_amt    : Decimal             @title: '잔여_매출_3_분기_금액';
        rmdr_sale_n4_qtr_amt    : Decimal             @title: '잔여_매출_4_분기_금액';
        rmdr_sale_year_amt      : Decimal             @title: '잔여_매출_년_금액';
        dblbk_sctr_org_rid      : String(20)          @title: '더블부킹_부문_조직_RID';
        dblbk_sctr_org          : Association to one mis_com_org
                                      on dblbk_sctr_org.id = $self.dblbk_sctr_org_rid;
        dblbk_hdqt_org_rid      : String(20)          @title: '더블부킹_본부_조직_RID';
        dblbk_hdqt_org          : Association to one mis_com_org
                                      on dblbk_hdqt_org.id = $self.dblbk_hdqt_org_rid;
        dblbk_org_rid           : String(20)          @title: '더블부킹_조직_RID';
        dblbk_org               : Association to one mis_com_org
                                      on dblbk_org.id = $self.dblbk_org_rid;
        dblbk_sale_yn           : Boolean             @title: '더블부킹_매출_여부';
        rskel_yn                : Boolean             @title: '리스크_여부';
        cnrc_rskel_cd           : String(50)          @title: '계약_리스크_코드';
        rskel_tp_rcid           : String(20)          @title: '리스크_유형_RCID';
        excp_logic_clf_rcid     : String(20)          @title: '예외_로직_분류_RCID';
        excp_logic_clf          : Association to one mis_com_ctgr
                                      on  excp_logic_clf.prnt_ctgr_id = '200678'
                                      and excp_logic_clf.id           = $self.excp_logic_clf_rcid;
        excp_sale_logic_nm      : String(300)         @title: '예외_매출_로직_명';
        excp_sale_logic_desc    : String(4000)        @title: '예외_매출_로직_설명';
        sctr_dcid_yn            : Boolean             @title: '부문_확정_여부';
        sctr_dcid_dt            : Date                @title: '부문_확정_일자';
        hdqt_dcid_yn            : Boolean             @title: '본부_확정_여부';
        hdqt_dcid_dt            : Date                @title: '본부_확정_일자';
        aco_dcid_yn             : Boolean             @title: '전사_확정_여부';
        aco_dcid_dt             : Date                @title: '전사_확정_일자';
        ver_no                  : Decimal             @title: '버전_번호';
        org_pfls_dcid_yn        : Boolean             @title: '조직_손익_확정_여부';
        dgtr_tp_rcid            : String(20)          @title: 'DT_유형_RCID';
        dgtr_tp                 : Association to one mis_com_ctgr
                                      on  dgtr_tp.prnt_ctgr_id = '200205'
                                      and dgtr_tp.id           = $self.dgtr_tp_rcid;
        dpd_brand_dp_rid        : String(20)          @title: 'DPD_브랜드DP_RID';
        src_div_rcid            : String(20)          @title: '출처_구분_코드';
        crrn_yn                 : Boolean             @title: '보정_여부';
        sls_prfm_str_dt         : Date                @title: '영업_수행_시작_일자';
        sls_prfm_end_dt         : Date                @title: '영업_수행_종료_일자';
        rmk_cntt                : String(4000)        @title: '비고_내용';
        team_unt_nm             : String(300)         @title: '팀_단위_명';
        prfm_prjm_rid           : String(20)          @title: '수행_PM_RID';
        prfm_prjm               : Association to one mis_com_emp
                                      on prfm_prjm.id = $self.prfm_prjm_rid;
        org_ver_rid             : String(20)          @title: '조직_버전_RID';
        esmt_src_div_cd         : String(100)         @title: '';
        esmt_src_trgt_cd        : String(100)         @title: '';
        dev_aplt_dgtr_tech_nm   : String(200)         @title: '';
        rskel_grd_rcid          : String(20)          @title: '리스크_등급_RCID';
        rskel_grd               : Association to one mis_com_ctgr
                                      on  rskel_grd.prnt_ctgr_id = '1500084'
                                      and rskel_grd.id           = $self.rskel_grd_rcid;
        crrn_sno                : String(10)          @title: '';
        end_prclm_dt            : Date                @title: '';
        qttn_trg_no             : String(13)          @title: '견적_대상_번호';
        qttn_pblsh_no           : String(8)           @title: '견적_발행_번호';
        crrn_trg_no             : String(13)          @title: '보정_사업_번호';
        crrn_cnrc_no            : String(15)          @title: '보정_계약_번호';
        rspb_sls_org_rid        : String(20)          @title: '책임_영업_조직_rid';
        account_rid             : String(20)          @title: 'ACCOUNT_RID';
        erp_stts_cd             : String(5)           @title: 'ERP_상태_코드';
}

entity mis_esmt_exe_filter : managed {
    key id                      : String(20) not null @title: 'SLM_추정실행_ID';
        rodr_esmt_ym            : String(6) not null  @title: '수주_추정_년월';
        frst_rgstr_rid          : String(20);
        frst_rgst_dtm           : Timestamp;
        last_updtr_rid          : String(20);
        last_updt_dtm           : Timestamp;
        prj_no                  : String(13)          @title: '프로젝트_번호';
        sell_sls_cnrc_no        : String(15)          @title: '판매_영업_계약_번호';
        dp_no                   : String(20)          @title: 'DP_번호';
        prj_nm                  : String(300)         @title: '프로젝트_명';
        cstco_rid               : String(20)          @title: '고객사_RID';
        cstco                   : Association to one mis_com_cstco
                                      on cstco.id = $self.cstco_rid;
        rodr_sctr_org_rid       : String(20)          @title: '수주_부문_조직_RID';
        rodr_sctr_org           : Association to one mis_com_org
                                      on rodr_sctr_org.id = $self.rodr_sctr_org_rid;
        rodr_hdqt_org_rid       : String(20)          @title: '수주_본부_조직_RID';
        rodr_hdqt_org           : Association to one mis_com_org
                                      on rodr_hdqt_org.id = $self.rodr_hdqt_org_rid;
        rodr_org_rid            : String(20)          @title: '수주_조직_RID';
        rodr_org                : Association to one mis_com_org
                                      on rodr_org.id = $self.rodr_org_rid;
        sale_sctr_org_rid       : String(20)          @title: '매출_부문_조직_RID';
        sale_sctr_org           : Association to one mis_com_org
                                      on sale_sctr_org.id = $self.sale_sctr_org_rid;
        sale_hdqt_org_rid       : String(20)          @title: '매출_본부_조직_RID';
        sale_hdqt_org           : Association to one mis_com_org
                                      on sale_hdqt_org.id = $self.sale_hdqt_org_rid;
        sale_org_rid            : String(20)          @title: '매출_조직_RID';
        sale_org                : Association to one mis_com_org
                                      on sale_org.id = $self.sale_org_rid;
        rodr_cnrc_ym            : String(6)           @title: '수주_계약_년월';
        prj_prfm_end_dt         : Date                @title: '프로젝트_수행_종료_일자';
        prj_prfm_str_dt         : Date                @title: '프로젝트_수행_시작_일자';
        new_crov_div_rcid       : String(20)          @title: '신규_이월_구분_RCID';
        new_crov_div            : Association to one mis_com_ctgr
                                      on  new_crov_div.prnt_ctgr_id = '200358'
                                      and new_crov_div.id           = $self.new_crov_div_rcid;
        prj_scr_yn              : Boolean             @title: '프로젝트_확보_여부';
        ovse_biz_yn             : Boolean             @title: '해외_사업_여부';
        relsco_yn               : Boolean             @title: '관계사_여부';
        cnvg_biz_yn             : Boolean             @title: '융복합_사업_여부';
        prj_tp_rcid             : String(20)          @title: '프로젝트_유형_RCID';
        prj_tp                  : Association to one mis_com_ctgr
                                      on  prj_tp.prnt_ctgr_id = '100024'
                                      and prj_tp.id           = $self.prj_tp_rcid;
        si_os_div_rcid          : String(20)          @title: 'SI_OS_구분_RCID';
        si_os_div               : Association to one mis_com_ctgr
                                      on  si_os_div.prnt_ctgr_id = '200364'
                                      and si_os_div.id           = $self.si_os_div_rcid;
        dp_knd_cd               : String(50)          @title: 'DP_종류_코드';
        dev_aplt_dgtr_tech_rcid : String(20)          @title: '개발_적용_DT_기술_RCI';
        dev_aplt_dgtr_tech      : Association to one mis_com_ctgr
                                      on  dev_aplt_dgtr_tech.prnt_ctgr_id = '200086'
                                      and dev_aplt_dgtr_tech.id           = $self.dev_aplt_dgtr_tech_rcid;
        brand_nm                : String(300)         @title: '브랜드_명';
        dp_nm                   : String(300)         @title: 'DP_명';
        bd_n1_rid               : String(20) not null @title: '비즈니스도메인_1_RID';
        bd_n2_rid               : String(20) not null @title: '비즈니스도메인_2_RID';
        bd_n3_rid               : String(20) not null @title: '비즈니스도메인_3_RID';
        bd_n4_rid               : String(20)          @title: '비즈니스도메인_4_RID';
        bd_n5_rid               : String(20)          @title: '비즈니스도메인_5_RID';
        bd_n6_rid               : String(20)          @title: '비즈니스도메인_6_RID';
        itsm_div_rcid           : String(20)          @title: 'ITSM_구분_RCID';
        itsm_div                : Association to one mis_com_ctgr
                                      on  itsm_div.prnt_ctgr_id = '200368'
                                      and itsm_div.id           = $self.itsm_div_rcid;
        rodr_n1_mm_amt          : Decimal             @title: '수주_1_월_금액';
        rodr_n2_mm_amt          : Decimal             @title: '수주_2_월_금액';
        rodr_n3_mm_amt          : Decimal             @title: '수주_3_월_금액';
        rodr_n4_mm_amt          : Decimal             @title: '수주_4_월_금액';
        rodr_n5_mm_amt          : Decimal             @title: '수주_5_월_금액';
        rodr_n6_mm_amt          : Decimal             @title: '수주_6_월_금액';
        rodr_n7_mm_amt          : Decimal             @title: '수주_7_월_금액';
        rodr_n8_mm_amt          : Decimal             @title: '수주_8_월_금액';
        rodr_n9_mm_amt          : Decimal             @title: '수주_9_월_금액';
        rodr_n10_mm_amt         : Decimal             @title: '수주_10_월_금액';
        rodr_n11_mm_amt         : Decimal             @title: '수주_11_월_금액';
        rodr_n12_mm_amt         : Decimal             @title: '수주_12_월_금액';
        rodr_n1_qtr_amt         : Decimal             @title: '수주_1_분기_금액';
        rodr_n2_qtr_amt         : Decimal             @title: '수주_2_분기_금액';
        rodr_n3_qtr_amt         : Decimal             @title: '수주_3_분기_금액';
        rodr_n4_qtr_amt         : Decimal             @title: '수주_4_분기_금액';
        rodr_year_amt           : Decimal             @title: '수주_년_금액';
        sale_n1_mm_amt          : Decimal             @title: '매출_1_월_금액';
        sale_n2_mm_amt          : Decimal             @title: '매출_2_월_금액';
        sale_n3_mm_amt          : Decimal             @title: '매출_3_월_금액';
        sale_n4_mm_amt          : Decimal             @title: '매출_4_월_금액';
        sale_n5_mm_amt          : Decimal             @title: '매출_5_월_금액';
        sale_n6_mm_amt          : Decimal             @title: '매출_6_월_금액';
        sale_n7_mm_amt          : Decimal             @title: '매출_7_월_금액';
        sale_n8_mm_amt          : Decimal             @title: '매출_8_월_금액';
        sale_n9_mm_amt          : Decimal             @title: '매출_9_월_금액';
        sale_n10_mm_amt         : Decimal             @title: '매출_10_월_금액';
        sale_n11_mm_amt         : Decimal             @title: '매출_11_월_금액';
        sale_n12_mm_amt         : Decimal             @title: '매출_12_월_금액';
        sale_n1_qtr_amt         : Decimal             @title: '매출_1_분기_금액';
        sale_n2_qtr_amt         : Decimal             @title: '매출_2_분기_금액';
        sale_n3_qtr_amt         : Decimal             @title: '매출_3_분기_금액';
        sale_n4_qtr_amt         : Decimal             @title: '매출_4_분기_금액';
        sale_year_amt           : Decimal             @title: '매출_년_금액';
        prj_prfm_n1_mm_amt      : Decimal             @title: '프로젝트_수행_1_월_금액';
        prj_prfm_n2_mm_amt      : Decimal             @title: '프로젝트_수행_2_월_금액';
        prj_prfm_n3_mm_amt      : Decimal             @title: '프로젝트_수행_3_월_금액';
        prj_prfm_n4_mm_amt      : Decimal             @title: '프로젝트_수행_4_월_금액';
        prj_prfm_n5_mm_amt      : Decimal             @title: '프로젝트_수행_5_월_금액';
        prj_prfm_n6_mm_amt      : Decimal             @title: '프로젝트_수행_6_월_금액';
        prj_prfm_n7_mm_amt      : Decimal             @title: '프로젝트_수행_7_월_금액';
        prj_prfm_n8_mm_amt      : Decimal             @title: '프로젝트_수행_8_월_금액';
        prj_prfm_n9_mm_amt      : Decimal             @title: '프로젝트_수행_9_월_금액';
        prj_prfm_n10_mm_amt     : Decimal             @title: '프로젝트_수행_10_월_금';
        prj_prfm_n11_mm_amt     : Decimal             @title: '프로젝트_수행_11_월_금';
        prj_prfm_n12_mm_amt     : Decimal             @title: '프로젝트_수행_12_월_금';
        prj_prfm_n1_qtr_amt     : Decimal             @title: '프로젝트_수행_1_분기_금';
        prj_prfm_n2_qtr_amt     : Decimal             @title: '프로젝트_수행_2_분기_금';
        prj_prfm_n3_qtr_amt     : Decimal             @title: '프로젝트_수행_3_분기_금';
        prj_prfm_n4_qtr_amt     : Decimal             @title: '프로젝트_수행_4_분기_금';
        prj_prfm_year_amt       : Decimal             @title: '프로젝트_수행_년_금액';
        rmdr_sale_n1_mm_amt     : Decimal             @title: '잔여_매출_1_월_금액';
        rmdr_sale_n2_mm_amt     : Decimal             @title: '잔여_매출_2_월_금액';
        rmdr_sale_n3_mm_amt     : Decimal             @title: '잔여_매출_3_월_금액';
        rmdr_sale_n4_mm_amt     : Decimal             @title: '잔여_매출_4_월_금액';
        rmdr_sale_n5_mm_amt     : Decimal             @title: '잔여_매출_5_월_금액';
        rmdr_sale_n6_mm_amt     : Decimal             @title: '잔여_매출_6_월_금액';
        rmdr_sale_n7_mm_amt     : Decimal             @title: '잔여_매출_7_월_금액';
        rmdr_sale_n8_mm_amt     : Decimal             @title: '잔여_매출_8_월_금액';
        rmdr_sale_n9_mm_amt     : Decimal             @title: '잔여_매출_9_월_금액';
        rmdr_sale_n10_mm_amt    : Decimal             @title: '잔여_매출_10_월_금액';
        rmdr_sale_n11_mm_amt    : Decimal             @title: '잔여_매출_11_월_금액';
        rmdr_sale_n12_mm_amt    : Decimal             @title: '잔여_매출_12_월_금액';
        rmdr_sale_n1_qtr_amt    : Decimal             @title: '잔여_매출_1_분기_금액';
        rmdr_sale_n2_qtr_amt    : Decimal             @title: '잔여_매출_2_분기_금액';
        rmdr_sale_n3_qtr_amt    : Decimal             @title: '잔여_매출_3_분기_금액';
        rmdr_sale_n4_qtr_amt    : Decimal             @title: '잔여_매출_4_분기_금액';
        rmdr_sale_year_amt      : Decimal             @title: '잔여_매출_년_금액';
        dblbk_sctr_org_rid      : String(20)          @title: '더블부킹_부문_조직_RID';
        dblbk_sctr_org          : Association to one mis_com_org
                                      on dblbk_sctr_org.id = $self.dblbk_sctr_org_rid;
        dblbk_hdqt_org_rid      : String(20)          @title: '더블부킹_본부_조직_RID';
        dblbk_hdqt_org          : Association to one mis_com_org
                                      on dblbk_hdqt_org.id = $self.dblbk_hdqt_org_rid;
        dblbk_org_rid           : String(20)          @title: '더블부킹_조직_RID';
        dblbk_org               : Association to one mis_com_org
                                      on dblbk_org.id = $self.dblbk_org_rid;
        dblbk_sale_yn           : Boolean             @title: '더블부킹_매출_여부';
        rskel_yn                : Boolean             @title: '리스크_여부';
        cnrc_rskel_cd           : String(50)          @title: '계약_리스크_코드';
        rskel_tp_rcid           : String(20)          @title: '리스크_유형_RCID';
        excp_logic_clf_rcid     : String(20)          @title: '예외_로직_분류_RCID';
        excp_logic_clf          : Association to one mis_com_ctgr
                                      on  excp_logic_clf.prnt_ctgr_id = '200678'
                                      and excp_logic_clf.id           = $self.excp_logic_clf_rcid;
        excp_sale_logic_nm      : String(300)         @title: '예외_매출_로직_명';
        excp_sale_logic_desc    : String(4000)        @title: '예외_매출_로직_설명';
        sctr_dcid_yn            : Boolean             @title: '부문_확정_여부';
        sctr_dcid_dt            : Date                @title: '부문_확정_일자';
        hdqt_dcid_yn            : Boolean             @title: '본부_확정_여부';
        hdqt_dcid_dt            : Date                @title: '본부_확정_일자';
        aco_dcid_yn             : Boolean             @title: '전사_확정_여부';
        aco_dcid_dt             : Date                @title: '전사_확정_일자';
        ver_no                  : Decimal             @title: '버전_번호';
        org_pfls_dcid_yn        : Boolean             @title: '조직_손익_확정_여부';
        dgtr_tp_rcid            : String(20)          @title: 'DT_유형_RCID';
        dgtr_tp                 : Association to one mis_com_ctgr
                                      on  dgtr_tp.prnt_ctgr_id = '200205'
                                      and dgtr_tp.id           = $self.dgtr_tp_rcid;
        dpd_brand_dp_rid        : String(20)          @title: 'DPD_브랜드DP_RID';
        src_div_rcid            : String(20)          @title: '출처_구분_코드';
        crrn_yn                 : Boolean             @title: '보정_여부';
        sls_prfm_str_dt         : Date                @title: '영업_수행_시작_일자';
        sls_prfm_end_dt         : Date                @title: '영업_수행_종료_일자';
        rmk_cntt                : String(4000)        @title: '비고_내용';
        team_unt_nm             : String(300)         @title: '팀_단위_명';
        prfm_prjm_rid           : String(20)          @title: '수행_PM_RID';
        prfm_prjm               : Association to one mis_com_emp
                                      on prfm_prjm.id = $self.prfm_prjm_rid;
        org_ver_rid             : String(20)          @title: '조직_버전_RID';
        esmt_src_div_cd         : String(100)         @title: '';
        esmt_src_trgt_cd        : String(100)         @title: '';
        dev_aplt_dgtr_tech_nm   : String(200)         @title: '';
        rskel_grd_rcid          : String(20)          @title: '리스크_등급_RCID';
        rskel_grd               : Association to one mis_com_ctgr
                                      on  rskel_grd.prnt_ctgr_id = '1500084'
                                      and rskel_grd.id           = $self.rskel_grd_rcid;
        crrn_sno                : String(10)          @title: '';
        end_prclm_dt            : Date                @title: '';
        qttn_trg_no             : String(13)          @title: '견적_대상_번호';
        qttn_pblsh_no           : String(8)           @title: '견적_발행_번호';
        crrn_trg_no             : String(13)          @title: '보정_사업_번호';
        crrn_cnrc_no            : String(15)          @title: '보정_계약_번호';
        rspb_sls_org_rid        : String(20)          @title: '책임_영업_조직_rid';
        account_rid             : String(20)          @title: 'ACCOUNT_RID';
        erp_stts_cd             : String(5)           @title: 'ERP_상태_코드';
}

/**
 * (pending) project 정보
 *
 * exe 분해 테이블
 */
entity mis_project : managed {
    key prj_no                  : String(13)          @title: '프로젝트_번호';
    key sell_sls_cnrc_no        : String(15)          @title: '판매_영업_계약_번호';
    key rodr_esmt_ym            : String(6);
        dp_no                   : String(20)          @title: 'DP_번호';
        prj_nm                  : String(300)         @title: '프로젝트_명';
        cstco_rid               : String(20)          @title: '고객사_RID';
        cstco                   : Association to one mis_com_cstco
                                      on cstco.id = $self.cstco_rid;
        rodr_sctr_org_rid       : String(20)          @title: '수주_부문_조직_RID';
        rodr_sctr_org           : Association to one mis_com_org
                                      on rodr_sctr_org.id = $self.rodr_sctr_org_rid;
        rodr_hdqt_org_rid       : String(20)          @title: '수주_본부_조직_RID';
        rodr_hdqt_org           : Association to one mis_com_org
                                      on rodr_hdqt_org.id = $self.rodr_hdqt_org_rid;
        rodr_org_rid            : String(20)          @title: '수주_조직_RID';
        rodr_org                : Association to one mis_com_org
                                      on rodr_org.id = $self.rodr_org_rid;
        sale_sctr_org_rid       : String(20)          @title: '매출_부문_조직_RID';
        sale_sctr_org           : Association to one mis_com_org
                                      on sale_sctr_org.id = $self.sale_sctr_org_rid;
        sale_hdqt_org_rid       : String(20)          @title: '매출_본부_조직_RID';
        sale_hdqt_org           : Association to one mis_com_org
                                      on sale_hdqt_org.id = $self.sale_hdqt_org_rid;
        sale_org_rid            : String(20)          @title: '매출_조직_RID';
        sale_org                : Association to one mis_com_org
                                      on sale_org.id = $self.sale_org_rid;
        rodr_cnrc_ym            : String(6)           @title: '수주_계약_년월';
        prj_prfm_end_dt         : Date                @title: '프로젝트_수행_종료_일자';
        prj_prfm_str_dt         : Date                @title: '프로젝트_수행_시작_일자';
        new_crov_div_rcid       : String(20)          @title: '신규_이월_구분_RCID';
        new_crov_div            : Association to one mis_com_ctgr
                                      on  new_crov_div.prnt_ctgr_id = '200358'
                                      and new_crov_div.id           = $self.new_crov_div_rcid;
        prj_scr_yn              : Boolean             @title: '프로젝트_확보_여부';
        ovse_biz_yn             : Boolean             @title: '해외_사업_여부';
        relsco_yn               : Boolean             @title: '관계사_여부';
        cnvg_biz_yn             : Boolean             @title: '융복합_사업_여부';
        prj_tp_rcid             : String(20)          @title: '프로젝트_유형_RCID';
        prj_tp                  : Association to one mis_com_ctgr
                                      on  prj_tp.prnt_ctgr_id = '100024'
                                      and prj_tp.id           = $self.prj_tp_rcid;
        si_os_div_rcid          : String(20)          @title: 'SI_OS_구분_RCID';
        si_os_div               : Association to one mis_com_ctgr
                                      on  si_os_div.prnt_ctgr_id = '200364'
                                      and si_os_div.id           = $self.si_os_div_rcid;
        dp_knd_cd               : String(50)          @title: 'DP_종류_코드';
        dev_aplt_dgtr_tech_rcid : String(20)          @title: '개발_적용_DT_기술_RCI';
        dev_aplt_dgtr_tech      : Association to one mis_com_ctgr
                                      on  dev_aplt_dgtr_tech.prnt_ctgr_id = '200086'
                                      and dev_aplt_dgtr_tech.id           = $self.dev_aplt_dgtr_tech_rcid;
        brand_nm                : String(300)         @title: '브랜드_명';
        dp_nm                   : String(300)         @title: 'DP_명';
        bd_n1_rid               : String(20) not null @title: '비즈니스도메인_1_RID';
        bd_n2_rid               : String(20) not null @title: '비즈니스도메인_2_RID';
        bd_n3_rid               : String(20) not null @title: '비즈니스도메인_3_RID';
        bd_n4_rid               : String(20)          @title: '비즈니스도메인_4_RID';
        bd_n5_rid               : String(20)          @title: '비즈니스도메인_5_RID';
        bd_n6_rid               : String(20)          @title: '비즈니스도메인_6_RID';
        itsm_div_rcid           : String(20)          @title: 'ITSM_구분_RCID';
        itsm_div                : Association to one mis_com_ctgr
                                      on  itsm_div.prnt_ctgr_id = '200368'
                                      and itsm_div.id           = $self.itsm_div_rcid;
        dblbk_sctr_org_rid      : String(20)          @title: '더블부킹_부문_조직_RID';
        dblbk_sctr_org          : Association to one mis_com_org
                                      on dblbk_sctr_org.id = $self.dblbk_sctr_org_rid;
        dblbk_hdqt_org_rid      : String(20)          @title: '더블부킹_본부_조직_RID';
        dblbk_hdqt_org          : Association to one mis_com_org
                                      on dblbk_hdqt_org.id = $self.dblbk_hdqt_org_rid;
        dblbk_org_rid           : String(20)          @title: '더블부킹_조직_RID';
        dblbk_org               : Association to one mis_com_org
                                      on dblbk_org.id = $self.dblbk_org_rid;
        dblbk_sale_yn           : Boolean             @title: '더블부킹_매출_여부';
        rskel_yn                : Boolean             @title: '리스크_여부';
        cnrc_rskel_cd           : String(50)          @title: '계약_리스크_코드';
        rskel_tp_rcid           : String(20)          @title: '리스크_유형_RCID';
        excp_logic_clf_rcid     : String(20)          @title: '예외_로직_분류_RCID';
        excp_logic_clf          : Association to one mis_com_ctgr
                                      on  excp_logic_clf.prnt_ctgr_id = '200678'
                                      and excp_logic_clf.id           = $self.excp_logic_clf_rcid;
        excp_sale_logic_nm      : String(300)         @title: '예외_매출_로직_명';
        excp_sale_logic_desc    : String(4000)        @title: '예외_매출_로직_설명';
        sctr_dcid_yn            : Boolean             @title: '부문_확정_여부';
        sctr_dcid_dt            : Date                @title: '부문_확정_일자';
        hdqt_dcid_yn            : Boolean             @title: '본부_확정_여부';
        hdqt_dcid_dt            : Date                @title: '본부_확정_일자';
        aco_dcid_yn             : Boolean             @title: '전사_확정_여부';
        aco_dcid_dt             : Date                @title: '전사_확정_일자';
        ver_no                  : Decimal             @title: '버전_번호';
        org_pfls_dcid_yn        : Boolean             @title: '조직_손익_확정_여부';
        dgtr_tp_rcid            : String(20)          @title: 'DT_유형_RCID';
        dgtr_tp                 : Association to one mis_com_ctgr
                                      on  dgtr_tp.prnt_ctgr_id = '200205'
                                      and dgtr_tp.id           = $self.dgtr_tp_rcid;
        dpd_brand_dp_rid        : String(20)          @title: 'DPD_브랜드DP_RID';
        src_div_rcid            : String(20)          @title: '출처_구분_코드';
        crrn_yn                 : Boolean             @title: '보정_여부';
        sls_prfm_str_dt         : Date                @title: '영업_수행_시작_일자';
        sls_prfm_end_dt         : Date                @title: '영업_수행_종료_일자';
        rmk_cntt                : String(4000)        @title: '비고_내용';
        team_unt_nm             : String(300)         @title: '팀_단위_명';
        prfm_prjm_rid           : String(20)          @title: '수행_PM_RID';
        prfm_prjm               : Association to one mis_com_emp
                                      on prfm_prjm.id = $self.prfm_prjm_rid;
        org_ver_rid             : String(20)          @title: '조직_버전_RID';
        esmt_src_div_cd         : String(100)         @title: '';
        esmt_src_trgt_cd        : String(100)         @title: '';
        dev_aplt_dgtr_tech_nm   : String(200)         @title: '';
        rskel_grd_rcid          : String(20)          @title: '리스크_등급_RCID';
        rskel_grd               : Association to one mis_com_ctgr
                                      on  rskel_grd.prnt_ctgr_id = '1500084'
                                      and rskel_grd.id           = $self.rskel_grd_rcid;
        crrn_sno                : String(10)          @title: '';
        end_prclm_dt            : Date                @title: '';
        qttn_trg_no             : String(13)          @title: '견적_대상_번호';
        qttn_pblsh_no           : String(8)           @title: '견적_발행_번호';
        crrn_trg_no             : String(13)          @title: '보정_사업_번호';
        crrn_cnrc_no            : String(15)          @title: '보정_계약_번호';
        rspb_sls_org_rid        : String(20)          @title: '책임_영업_조직_rid';
        account_rid             : String(20)          @title: 'ACCOUNT_RID';
        erp_stts_cd             : String(5)           @title: 'ERP_상태_코드';
}

/**
 * (pending) 목표금액 정보
 *
 * exe 분해 테이블
 */
entity mis_target_sale_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '목표금액 대상년'; //2024
    key month                   : String(2)  @title: '목표금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

entity mis_target_cos_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '목표금액 대상년'; //2024
    key month                   : String(2)  @title: '목표금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

entity mis_rmdr_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '수주금액 대상년'; //2024
    key month                   : String(2)  @title: '수주금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

/**
 * (pending) 수주금액 정보
 *
 * exe 분해 테이블
 */
entity mis_order_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '수주금액 대상년'; //2024
    key month                   : String(2)  @title: '수주금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

/**
 * (pending) 매출금액 정보
 *
 * exe 분해 테이블
 */
entity mis_sale_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '매출금액 대상년'; //2024
    key month                   : String(2)  @title: '매출금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

/**
 * 더미 테이블
 */
// entity dummy {
//     key name: String(1) @title: '이름';
// }

/**
 * (pending) 매출원가금액 정보
 *
 * exe 분해 테이블
 */
entity mis_cos_amount : managed {
    key prj_no                  : String(13) @title: '프로젝트_번호';
        prj_no_detail           : Association to one mis_project
                                      on prj_no_detail.prj_no = $self.prj_no;
    key sell_sls_cnrc_no        : String(15) @title: '판매_영업_계약_번호';
        sell_sls_cnrc_no_detail : Association to one mis_project
                                      on sell_sls_cnrc_no_detail.sell_sls_cnrc_no = $self.sell_sls_cnrc_no;
    key year                    : String(4)  @title: '매출원가금액 대상년'; //2024
    key month                   : String(2)  @title: '매출원가금액 대상월'; //12
    key final_yn                : Boolean    @title: '최종여부';
        ver_no                  : Decimal    @title: '버전_번호';
        amount                  : Decimal    @title: '수주금액';
}

/**
 * 목표 매출 정보
 */
entity mis_year_amount : managed {
    key id            : String(20) not null @title: '조직 id';
    key year          : String(4) not null  @title: '대상년도';
        target_sale   : Double              @title: '목표 매출';
        target_margin : Double              @title: '목표 마진';
}

@cds.persistence.exists
entity mis_get_org_descendant(id : String(20), use_yn : Boolean) {
    key id              : String(20);
        upr_org_id      : String(20);
        org_kor_nm      : String(300);
        hierarchy_level : Integer;
        org_tp_rcid     : String(20) @title: '조직_유형_RCID';
        drill_state     : String(8);
}

// 1438(팀 단위) 제거
@cds.persistence.exists
entity mis_get_org_descendant_target(id : String(20), org_tp_rcid : String(20)) {
    key id              : String(20);
        upr_org_id      : String(20);
        org_kor_nm      : String(300);
        hierarchy_level : Integer;
        org_tp_rcid     : String(20) @title: '조직_유형_RCID';
        drill_state     : String(8);
}

@cds.persistence.exists
entity mis_get_org_ancestor(query : String(300)) {
    key id              : String(20);
        upr_org_id      : String(20);
        org_kor_nm      : String(300);
        hierarchy_level : Integer;
        org_tp_rcid     : String(20) @title: '조직_유형_RCID';
        drill_state     : String(8);
}

@cds.persistence.exists
entity mis_get_org_ancestor_target(id : String(20)) {
    key id              : String(20);
        upr_org_id      : String(20);
        org_kor_nm      : String(300);
        hierarchy_level : Integer;
        org_tp_rcid     : String(20) @title: '조직_유형_RCID';
        has_child       : Boolean;
}

@cds.persistence.exists
entity mis_get_prj_descendant(id : String(20)) {
    key prj_no           : String(13);
        sell_sls_cnrc_no : String(15);
        org_tp_rcid      : String(20) @title: '조직_유형_RCID';
        id               : String(20) @title: 'BZM_조직_ID';
        rodr_esmt_ym     : String(6)  @title: '수주_추정_년월';
}

@cds.persistence.exists
entity mis_get_pl_sales(year : String(4), month : String(2), id : String(20)) {
    key seq                                  : Integer;
        type                                 : String(10);
        goal                                 : Double;
        performance                          : Double;
        performanceCurrentYearMonth          : Double;
        performanceLastYearMonth             : Double;
        performanceAttainmentRateCurrentYear : Double;
        performanceAttainmentRateLastYear    : Double;
}

@cds.persistence.exists
entity mis_get_pl_sgna(year : String(4), month : String(2), id : String(20)) {
    key level1                               : String(300);
    key level2                               : String(300);
    key type                                 : String(10);
        // upr_org_id                           : String(20);
        // org_kor_nm                           : String(300);
        // hierarchy_level                      : Integer;
        org_tp_rcid                          : String(20) @title: '조직_유형_RCID';
        // level3                               : String(300);
        goal                                 : Double;
        performanceCurrentYearMonth          : Double;
        performanceLastYearMonth             : Double;
        performanceAttainmentRateCurrentYear : Double;
        performanceAttainmentRateLastYear    : Double;
}


@cds.persistence.exists
entity mis_get_pl_target_sale(id : String(20), year : String(4)) {
    key id                        : String(20);
        org_kor_nm                : String(300);
        org_tp_rcid               : String(20) @title: '조직_유형_RCID';
        upr_org_id                : String(20) @title: '상위_조직_ID';
        hierarchy_level           : Integer;
        drill_state               : String(8);
        lastYearTargetSale        : Integer;
        lastYearTargetMargin      : Integer;
        lastYearPerformanceSale   : Double;
        lastYearPerformanceMargin : Double;
        thisYearTargetSale        : Integer;
        thisYearTargetMargin      : Integer;
}

entity Test3 {
    key id     : String(300) @title: 'ID';
        name   : String(300) @title: '이름';
        amount : Integer     @title: '금액';
        margin : Integer     @title: '마진';
}

entity TestHierarchy {
    key id              : String(300) @title: 'ID';
        name            : String(300) @title: '이름';
        parentId        : String(300) @title: '부모 ID';
        drill_state     : String(8);
        hierarchy_level : Integer;
        amount          : Decimal     @title: '금액';
}

view mis_project_pl_view as
    select from (
        select
            ext.sell_sls_cnrc_no,
            ext.prj_no,
            ext.year,
            ext.month,
            sale_amount,
            sale_sum_amount,
            sale_sctr_org_rid,
            sale_hdqt_org_rid,
            sale_org_rid,
            cos_amount,
            cos_sum_amount,
            order_amount,
            order_sum_amount,
            rmdr_amount,
            rmdr_sum_amount,
            target_sale_amount,
            target_sale_sum_amount,
            target_cos_amount,
            target_cos_sum_amount,
            target_sale_year,
            target_cos_year

        from mis_project_extend_view as ext
        inner join mis_project_view as prj
            on  ext.prj_no           = prj.prj_no
            and ext.sell_sls_cnrc_no = prj.sell_sls_cnrc_no
            and prj.rodr_esmt_ym     = '202413' // 202413 실적 조직기준 합산
    ) {
        key sell_sls_cnrc_no,
        key prj_no,
        key year,
        key month,
            sale_sctr_org_rid,
            sale_hdqt_org_rid,
            sale_org_rid,
            sale_amount,
            sale_sum_amount,
            cos_amount,
            cos_sum_amount,
            order_amount,
            order_sum_amount,
            rmdr_amount,
            rmdr_sum_amount,
            target_sale_amount,
            target_sale_sum_amount,
            target_cos_amount,
            target_cos_sum_amount,
            target_sale_year,
            target_cos_year
    }

view mis_project_extend_view as
    select from (
        select
            prj.sell_sls_cnrc_no,
            prj.prj_no,
            // prj.sale_sctr_org_rid, prj.sale_hdqt_org_rid, prj.sale_org_rid,
            sale.year,
            sale.month,
            sale.amount            as sale_amount,
            sale.sum_amount        as sale_sum_amount,
            cos.amount             as cos_amount,
            cos.sum_amount         as cos_sum_amount,
            order.amount           as order_amount,
            order.sum_amount       as order_sum_amount,
            rmdr.amount            as rmdr_amount,
            rmdr.sum_amount        as rmdr_sum_amount,
            target_sale.amount     as target_sale_amount,
            target_sale.sum_amount as target_sale_sum_amount,
            target_cos.amount      as target_cos_amount,
            target_cos.sum_amount  as target_cos_sum_amount,
            year_t_sale.amount     as target_sale_year,
            year_t_cos.amount      as target_cos_year

        from mis_project_view as prj
        inner join mis_sale_amount_view as sale
            on  prj.sell_sls_cnrc_no = sale.sell_sls_cnrc_no
            and prj.prj_no           = sale.prj_no
            and prj.month            = '13' // 프로젝트 기준월 00~13 중 13 임시
        inner join mis_cos_amount_view as cos
            on  prj.sell_sls_cnrc_no = cos.sell_sls_cnrc_no
            and prj.prj_no           = cos.prj_no
            and sale.year            = cos.year
            and sale.month           = cos.month
        inner join mis_order_amount_view as order
            on  prj.sell_sls_cnrc_no = order.sell_sls_cnrc_no
            and prj.prj_no           = order.prj_no
            and sale.year            = order.year
            and sale.month           = order.month
        inner join mis_rmdr_amount_view as rmdr
            on  prj.sell_sls_cnrc_no = rmdr.sell_sls_cnrc_no
            and prj.prj_no           = rmdr.prj_no
            and sale.year            = rmdr.year
            and sale.month           = rmdr.month
        inner join mis_target_sale_amount_view as target_sale
            on  prj.sell_sls_cnrc_no = target_sale.sell_sls_cnrc_no
            and prj.prj_no           = target_sale.prj_no
            and sale.year            = target_sale.year
            and sale.month           = target_sale.month
        inner join mis_target_cos_amount_view as target_cos
            on  prj.sell_sls_cnrc_no = target_cos.sell_sls_cnrc_no
            and prj.prj_no           = target_cos.prj_no
            and sale.year            = target_cos.year
            and sale.month           = target_cos.month
        inner join (
            select
                prj_no,
                sell_sls_cnrc_no,
                year,
                sum(amount) as amount : Decimal(20, 2)
            from mis_target_sale_amount_view
            group by
                prj_no,
                sell_sls_cnrc_no,
                year
        ) as year_t_sale
            on  year_t_sale.prj_no           = prj.prj_no
            and year_t_sale.sell_sls_cnrc_no = prj.sell_sls_cnrc_no
            and year_t_sale.year             = prj.year

        inner join (
            select
                prj_no,
                sell_sls_cnrc_no,
                year,
                sum(amount) as amount : Decimal(20, 2)
            from mis_target_cos_amount_view
            group by
                prj_no,
                sell_sls_cnrc_no,
                year
        ) as year_t_cos
            on  year_t_cos.prj_no           = prj.prj_no
            and year_t_cos.sell_sls_cnrc_no = prj.sell_sls_cnrc_no
            and year_t_cos.year             = prj.year
    ) {
        key sell_sls_cnrc_no,
        key prj_no,
        key year,
        key month,
            // sale_sctr_org_rid,
            // sale_hdqt_org_rid,
            // sale_org_rid,
            sale_amount,
            sale_sum_amount,
            cos_amount,
            cos_sum_amount,
            order_amount,
            order_sum_amount,
            rmdr_amount,
            rmdr_sum_amount,
            target_sale_amount,
            target_sale_sum_amount,
            target_cos_amount,
            target_cos_sum_amount,
            target_sale_year,
            target_cos_year
    };

view mis_project_view as
    select from common.mis_esmt_exe_filter {
        key rodr_esmt_ym,
        key sell_sls_cnrc_no,
        key prj_no,
            substring(
                rodr_esmt_ym, 1, 4
            ) as year  : String(4),
            substring(
                rodr_esmt_ym, 5, 2
            ) as month : String(2),
            dp_no,
            prj_nm,
            cstco_rid,
            cstco,
            rodr_sctr_org_rid,
            rodr_sctr_org,
            rodr_hdqt_org_rid,
            rodr_hdqt_org,
            rodr_org_rid,
            rodr_org,
            sale_sctr_org_rid,
            sale_sctr_org,
            sale_hdqt_org_rid,
            sale_hdqt_org,
            sale_org_rid,
            sale_org,
            rodr_cnrc_ym,
            prj_prfm_end_dt,
            prj_prfm_str_dt,
            new_crov_div_rcid,
            new_crov_div,
            prj_scr_yn,
            ovse_biz_yn,
            relsco_yn,
            cnvg_biz_yn,
            prj_tp_rcid,
            prj_tp,
            si_os_div_rcid,
            si_os_div,
            dp_knd_cd,
            dev_aplt_dgtr_tech_rcid,
            dev_aplt_dgtr_tech,
            brand_nm,
            dp_nm,
            bd_n1_rid,
            bd_n2_rid,
            bd_n3_rid,
            bd_n4_rid,
            bd_n5_rid,
            bd_n6_rid,
            itsm_div_rcid
    }
    where
        substring(
            rodr_esmt_ym, 5, 6
        ) in (
            '00', '13'
        );


        view mis_target_sale_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            sale_n1_mm_amt as amount,
            sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n1_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            sale_n2_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n2_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            sale_n3_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n3_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            sale_n4_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n4_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            sale_n5_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n5_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            sale_n6_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n6_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            sale_n7_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n7_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            sale_n8_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n8_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            sale_n9_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n9_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            sale_n10_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n10_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            sale_n11_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n11_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            sale_n12_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt+sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n12_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_target_cos_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            prj_prfm_n1_mm_amt as amount,
            prj_prfm_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n1_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            prj_prfm_n2_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n2_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            prj_prfm_n3_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n3_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            prj_prfm_n4_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n4_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            prj_prfm_n5_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n5_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            prj_prfm_n6_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n6_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            prj_prfm_n7_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n7_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            prj_prfm_n8_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n8_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            prj_prfm_n9_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n9_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            prj_prfm_n10_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n10_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            prj_prfm_n11_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n11_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            prj_prfm_n12_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt+prj_prfm_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n12_mm_amt is not null and rodr_esmt_ym in ('202300', '202400') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_cos_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            prj_prfm_n1_mm_amt as amount,
            prj_prfm_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            prj_prfm_n2_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            prj_prfm_n3_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            prj_prfm_n4_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            prj_prfm_n5_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            prj_prfm_n6_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            prj_prfm_n7_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            prj_prfm_n8_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            prj_prfm_n9_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            prj_prfm_n10_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            prj_prfm_n11_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            prj_prfm_n12_mm_amt as amount,
            prj_prfm_n1_mm_amt+prj_prfm_n2_mm_amt+prj_prfm_n3_mm_amt+prj_prfm_n4_mm_amt+prj_prfm_n5_mm_amt+prj_prfm_n6_mm_amt
            +prj_prfm_n7_mm_amt+prj_prfm_n8_mm_amt+prj_prfm_n9_mm_amt+prj_prfm_n10_mm_amt+prj_prfm_n11_mm_amt+prj_prfm_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where prj_prfm_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };
    view mis_order_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            rodr_n1_mm_amt as amount,
            rodr_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            rodr_n2_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            rodr_n3_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            rodr_n4_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            rodr_n5_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            rodr_n6_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            rodr_n7_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            rodr_n8_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            rodr_n9_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            rodr_n10_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            rodr_n11_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt+rodr_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            rodr_n12_mm_amt as amount,
            rodr_n1_mm_amt+rodr_n2_mm_amt+rodr_n3_mm_amt+rodr_n4_mm_amt+rodr_n5_mm_amt+rodr_n6_mm_amt
            +rodr_n7_mm_amt+rodr_n8_mm_amt+rodr_n9_mm_amt+rodr_n10_mm_amt+rodr_n11_mm_amt+rodr_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rodr_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };
    view mis_sale_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            sale_n1_mm_amt as amount,
            sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            sale_n2_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            sale_n3_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            sale_n4_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            sale_n5_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            sale_n6_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            sale_n7_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            sale_n8_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            sale_n9_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            sale_n10_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            sale_n11_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            sale_n12_mm_amt as amount,
            sale_n1_mm_amt+sale_n2_mm_amt+sale_n3_mm_amt+sale_n4_mm_amt+sale_n5_mm_amt+sale_n6_mm_amt
            +sale_n7_mm_amt+sale_n8_mm_amt+sale_n9_mm_amt+sale_n10_mm_amt+sale_n11_mm_amt+sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where sale_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };

    view mis_rmdr_amount_view as select from
    (
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '01' as month : String(2),
            rmdr_sale_n1_mm_amt as amount,
            rmdr_sale_n1_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n1_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '02' as month : String(2),
            rmdr_sale_n2_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n2_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '03' as month : String(2),
            rmdr_sale_n3_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n3_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '04' as month : String(2),
            rmdr_sale_n4_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n4_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '05' as month : String(2),
            rmdr_sale_n5_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n5_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '06' as month : String(2),
            rmdr_sale_n6_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n6_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '07' as month : String(2),
            rmdr_sale_n7_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n7_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '08' as month : String(2),
            rmdr_sale_n8_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n8_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '09' as month : String(2),
            rmdr_sale_n9_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n9_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '10' as month : String(2),
            rmdr_sale_n10_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n10_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '11' as month : String(2),
            rmdr_sale_n11_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt+rmdr_sale_n11_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n11_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
        union all
        select prj_no, sell_sls_cnrc_no, rodr_esmt_ym, ver_no,
            '12' as month : String(2),
            rmdr_sale_n12_mm_amt as amount,
            rmdr_sale_n1_mm_amt+rmdr_sale_n2_mm_amt+rmdr_sale_n3_mm_amt+rmdr_sale_n4_mm_amt+rmdr_sale_n5_mm_amt+rmdr_sale_n6_mm_amt
            +rmdr_sale_n7_mm_amt+rmdr_sale_n8_mm_amt+rmdr_sale_n9_mm_amt+rmdr_sale_n10_mm_amt+rmdr_sale_n11_mm_amt+rmdr_sale_n12_mm_amt as sum_amount
        from common.mis_esmt_exe_filter
        where rmdr_sale_n12_mm_amt is not null and rodr_esmt_ym in ('202313', '202413') and ver_no = 1000
    )
    {
        key prj_no,
        key sell_sls_cnrc_no,
        substring(rodr_esmt_ym, 1, 4) as year : String(4),
        month,
        amount,
        sum_amount,
        true as final_yn : Boolean
    };  