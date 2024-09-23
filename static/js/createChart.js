Chart.register(ChartStreaming);

function createChart(canvasId, label, styleOptions = {}, maxDataPoints = 65) {

    const {
        lineColor = 'rgba(75, 192, 192, 1)', 
        backgroundColor = 'rgba(75, 192, 192, 0.2)', 
        initialYMax = 100, 
        dynamicYMax = false // 增加 dynamicYMax 并设默认值为 false
    } = styleOptions;

    const ctx = document.getElementById(canvasId).getContext('2d');
    if (!ctx) {
        console.error(`未能获取到 canvas 的 2D 上下文，ID: ${canvasId}`);
        return null;
    }

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
                        duration: 60000, // 显示过去 60 秒的数据
                        refresh: 500, // 每0.5秒更新一次数据
                        delay: 2000, // 延迟 2 秒
                    }
                },
                y: {
                    beginAtZero: true,
                    max: initialYMax // 初始的 y 轴最大值
                }
            }
        }
    });

    const recentDataPoints = [];

    return {
        chart,
        update(dataPoint) {
            const now = luxon.DateTime.now().toJSDate(); // 转换为 JavaScript 的 Date 对象

            recentDataPoints.push(dataPoint);
            if (recentDataPoints.length > maxDataPoints) {
                recentDataPoints.shift(); // 超出 maxDataPoints 时移除最早的数据点
            }

            // 如果 dynamicYMax 为 true，则根据最近的数据动态调整 yMax
            if (dynamicYMax) {
                const currentMax = Math.max(...recentDataPoints);
                const yMax = currentMax * 1.2; // 适当放大最大值
                chart.options.scales.y.max = yMax; // 动态更新 y 轴的最大值
            } else {
                chart.options.scales.y.max = initialYMax; // 使用传递的初始最大值
            }

            // 更新图表数据
            chart.data.datasets[0].data.push({
                x: now, // 实时横轴数据
                y: dataPoint // 实时纵轴数据
            });

            if (chart.data.datasets[0].data.length > maxDataPoints) {
                chart.data.datasets[0].data.shift(); // 移除最早的数据点
            }

            chart.update('quiet'); // 静默更新
        }
    };
}
