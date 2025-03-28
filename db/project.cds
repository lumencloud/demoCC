namespace project;

entity Organization {
    key id      : UUID; //조직 ID
        name    : String(50); //조직 이름
        parent  : Association to Organization; //상위 조직 ID

        project : Association to Project;
}

entity Project {
    key id           : UUID; //프로젝트 ID
        organization : Association to Organization; // 조직 ID
        year         : Integer; // 연
        month        : Integer; // 월
        revenue      : Decimal(15, 2); // 매출 (원)
        margin       : Decimal(15, 2); // 마진 (원)
}

entity Target {
    key organization  : Association to Organization;
    key year          : Integer;
    key month         : Integer;
        targetRevenue : Decimal(15, 2); // 매출 목표
        targetMargin  : Decimal(15, 2); // 마진 목표
}

@cds.persistence.exists
entity Project_year {
    key year    : Integer;
        revenue : Decimal(15, 2);
        margin  : Decimal(15, 2);
}

@cds.persistence.exists
entity Project_view {
    key node_id         : String(50); // 조직 ID
        name            : String(50); //조직 이름
        parent_id       : String(50);
        revenue         : Decimal(15, 2); // 매출 (원)
        margin          : Decimal(15, 2); // 마진 (원)
    key year            : Integer; // 연
        targetRevenue   : Decimal(15, 2); // 매출 목표
        targetMargin    : Decimal(15, 2); // 마진 목표
        totalCost       : Decimal(15, 2); // 원가
        totalTargetCost : Decimal(15, 2); //목표 원가
        revenueRatio    : Decimal(15, 2); // 매출 비율
        marginRatio     : Decimal(15, 2); //마진 비율
}

@cds.persistence.exists
entity Project_hierView {
    key node_id           : String(50); // 조직 ID
    key parent_id         : String(50); // 부모 조직 ID
        rank              : String(50);
        level             : String(50);
        organization_name : String(50); // 조직 이름
        totalRevenue      : Decimal(15, 2); // 매출 (원)
        totalMargin       : Decimal(15, 2); // 마진 (원)
        totalCost         : Decimal(15, 2); // 원가
}

@cds.persistence.exists
entity Project_hierTotalView {
    key node_id           : String(50);
    key parent_id         : String(50);
        rank              : Integer;
        level             : Integer;
        organization_name : String(50);
        totalRevenue      : Decimal(15, 2);
}

@cds.persistence.exists
entity Project_tableView {
    key id                 : UUID;
        node_id            : String(50);
        organization_name  : String(50);
        parent_id          : String(50);
        rank               : Integer;
        level              : Integer;
        year               : Integer; // 연
        month              : Integer;
        totalRevenue       : Decimal(15, 2);
        totalTargetRevenue : Decimal(15, 2); // 매출 목표

}
