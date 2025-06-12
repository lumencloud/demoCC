module.exports = (srv) => {
    srv.on('get_code_data', async (req) => { //[READ] 제거함 
        const db = await cds.connect.to('db');
        const { category } = req.data;

        console.log(req);

        const code_header = db.entities('common').code_header;

        // 모든 코드그룹 반환을 코드 아이템 레벨까지
        let aCodeHeader = await SELECT.from(code_header)
            .columns(header => {
                header.category, header.use_yn, header.delete_yn, header.items(item => {
                    item.name, item.value, item.sort_order, item.use_yn, item.delete_yn;    // 전체 : item`.*`
                })
            })
            .orderBy("category");

        // 카테고리 파라미터가 존재할 시 필터링
        var aHeader = (category) ? aCodeHeader.filter(oResult => oResult.category === category) : aCodeHeader;

        // delete_yn이 true가 아닌 데이터만 반환
        let aResult = [];
        aHeader.forEach(oHeader => {
            // 헤더의 use_yn:true, delete_yn:false일 때만 사용
            if (oHeader.use_yn && !oHeader.delete_yn) {
                oHeader.items.forEach(oItem => {
                    // Item의 use_yn:true, delete_yn:false일 때만 사용
                    if (oItem.use_yn && !oItem.delete_yn) {
                        let oResult = {
                            group: oHeader.category,
                            name: oItem.name,
                            value: oItem.value,
                            sort_order: oItem.sort_order,
                        };

                        aResult.push(oResult);
                    }
                });
            }
        })

        // category, sort_order 순으로 정렬
        let aSortFields = [
            { field: "category", order: "asc" },
            { field: "sort_order", order: "asc" },
        ];
        aResult.sort((oItem1, oItem2) => {
            for (const { field, order } of aSortFields) {
                // 필드가 null일 때
                if (oItem1[field] === null && oItem2[field] !== null) return -1;
                if (oItem1[field] !== null && oItem2[field] === null) return 1;
                if (oItem1[field] === null && oItem2[field] === null) continue;

                if (typeof oItem1[field] === "string") {    // 문자일 때 localeCompare
                    var iResult = oItem1[field].localeCompare(oItem2[field]);
                } else if (typeof oItem1[field] === "number") { // 숫자일 때
                    var iResult = oItem1[field] - oItem2[field];
                }

                if (iResult !== 0) {
                    return (order === "asc") ? iResult : -iResult;
                }
            }
            return 0;
        })

        return aResult;
    });
}