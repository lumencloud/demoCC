_groupInfo: function(aResults) {
    // x축 라벨
    let aLabel = aResults.map(r => r.account_nm);

    // div_name별 그룹 정보 계산
    let groupMap = {}; // { div_name: {start: idx, end: idx, sum: int} }
    aResults.forEach((row, idx) => {
        let name = row.div_name;
        if (!groupMap[name]) {
            groupMap[name] = { start: idx, end: idx, sum: 0 };
        }
        groupMap[name].end = idx;
        groupMap[name].sum += Number(row.div_value) || 0;
    });

    return { aLabel, groupMap };
}

const groupLabelsPlugin = {
    id: 'groupLabelsPlugin',
    afterDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        if (!xScale) return;

        // UI5 Controller에서 계산한 groupMap을 chart.options.plugins.groupLabels에 전달해야 함
        const groupMap = chart.options.plugins.groupLabels.groupMap;
        if (!groupMap) return;

        ctx.save();
        ctx.textAlign = "center";
        ctx.font = "bold 13px Arial";
        let y = chartArea.bottom + 30; // x축 아래 그룹명
        let y2 = chartArea.bottom + 50; // x축 아래 그룹 합계

        Object.keys(groupMap).forEach(divName => {
            const info = groupMap[divName];
            // 그룹 첫번째~마지막 x축 위치의 가운데 계산
            let x1 = xScale.getPixelForValue(info.start);
            let x2 = xScale.getPixelForValue(info.end);
            let midX = (x1 + x2) / 2;

            // 1. div_name 출력
            ctx.fillStyle = "#222";
            ctx.fillText(divName, midX, y);

            // 2. div_value 합계 출력 (콤마, 억 단위 등 포맷 원하는 대로)
            ctx.font = "normal 12px Arial";
            ctx.fillStyle = "#666";
            ctx.fillText(info.sum.toLocaleString(), midX, y2);

            // 원하면 밑줄도 추가 가능 (선택)
            // ctx.beginPath();
            // ctx.moveTo(x1 + 10, y + 10);
            // ctx.lineTo(x2 - 10, y + 10);
            // ctx.strokeStyle = "#aaa";
            // ctx.lineWidth = 1;
            // ctx.stroke();
        });

        ctx.restore();
    }
};


