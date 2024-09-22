

function createChart(canvasId, label, styleOptions = {}, maxDataPoints = 60) {
    const { lineColor = 'rgba(75, 192, 192, 1)', backgroundColor = 'rgba(75, 192, 192, 0.2)' } = styleOptions;
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // 横轴的时间戳
            datasets: [{
                label: label, // 图表的标签
                data: [], // 图表的数据
                borderColor: lineColor, // 线条颜色
                borderWidth: 2, // 线条宽度
                fill: true, // 填充
                backgroundColor: backgroundColor,
                pointRadius: 0, // 隐藏数据点
                pointStyle: 'line', // 确保数据点不会以其他样式显示
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'realtime', // 实时更新横轴
                    realtime: {
                        duration: 60000, // 显示过去 30 秒的数据
                        refresh: 1000, // 每秒更新一次数据
                        delay: 3000, // 延迟 3 秒
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100 // 假设数据是百分比，可以根据需要修改
                }
            }
        }
    });

    return {
        chart,
        update(dataPoint) {
            const now = luxon.DateTime.now().toJSDate(); // 转换为 JavaScript 的 Date 对象
            chart.data.datasets[0].data.push({
                x: now, // 实时横轴数据
                y: dataPoint // 实时纵轴数据
            });
        
            // 限制最大数据点数
            if (chart.data.datasets[0].data.length > maxDataPoints) {
                chart.data.datasets[0].data.shift(); // 移除最早的数据点
            }
        
            chart.update('quiet'); // 静默更新
        }
    };
}
