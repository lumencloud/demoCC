id: "subLabels",
    afterDatasetsDraw(chart, args, pluginOptions) {
        const { ctx, chartArea: { left, bottom }, scales } = chart;
        let subLabelsArr = chart.options.plugins.subLabels && chart.options.plugins.subLabels.labels;
        let aLabels = chart.data.labels;
        if (!subLabelsArr || !aLabels) return;

        // 1. div_name별로 start/end/cnt 계산
        let groupMap = {};
        subLabelsArr.forEach((item, i) => {
            let divName = item[0];
            if (!groupMap[divName]) {
                groupMap[divName] = { start: i, end: i, cnt: 1, sum: item[1] };
            } else {
                groupMap[divName].end = i;
                groupMap[divName].cnt++;
            }
        });

        ctx.save();
        ctx.textAlign = 'center';

        // 2. 각 그룹별로 중앙 인덱스 찾아 한 번만 그리기
        Object.keys(groupMap).forEach(divName => {
            const info = groupMap[divName];
            let centerIdx = Math.floor((info.start + info.end) / 2);
            let x = scales.x.getPixelForValue(centerIdx);
            ctx.font = 'bolder 13px sans-serif';
            ctx.fillStyle = '#333';
            ctx.fillText(divName, x, bottom + 30);
            ctx.font = 'normal 12px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText(info.sum, x, bottom + 50);
        });

        ctx.restore();
    }
