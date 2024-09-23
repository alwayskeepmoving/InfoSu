let spectrumData = null; // 保存当前频谱数据
let prevSpectrumData = null; // 保存前一帧的频谱数据
const frameInterval = 1000 / 30; // 30 FPS，控制绘制的帧速率
let lastDrawTime = 0;
let lastDataFetchTime = 0; // 上次获取数据的时间
const easing = 0.01; // 缓动系数，值越小过渡越平滑
const barSpacing = 2; // 控制频率条之间的间距，可以根据需要调整

// 获取设备的像素比率
const pixelRatio = window.devicePixelRatio || 1;

// 定义频率段
const frequencyBands = [
    { start: 0, end: 500, widthRatio: 0.2, maxAmplitude: 1.0, amplitudeScale: 0.008 },  // 低频
    { start: 500, end: 5000, widthRatio: 0.5, maxAmplitude: 1.0, amplitudeScale: 0.01 },  // 中频
    { start: 5000, end: 22000, widthRatio: 0.3, maxAmplitude: 1.0, amplitudeScale: 0.02 }  // 高频
];

const totalBars = 200; // 总频率条数量

// 设置频率条宽度的基础值
let barWidthBase; // 可以是窗口宽度、控件宽度或手动指定值

// 颜色模式：1 表示统一颜色，2 表示渐变色
let colorMode = 2;

// 初始化 barWidthBase
function initializeBarWidthBase() {
    const canvas = document.getElementById('spectrumCanvas');
    const container = document.getElementById('spectrum-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 设置高分辨率
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    // 调整绘制比例
    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);

    // 重新定义绘制区域
    barWidthBase = width;
}

initializeBarWidthBase();

// 定时从 API 获取数据
async function getSpectrumData() {
    try {
        const response = await fetch('/api/spectrum');
        spectrumData = await response.json();
    } catch (error) {
        console.error("Error fetching spectrum data:", error);
    }
}

// 线性插值函数
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// 绘制频谱的函数
function drawSpectrum(frequency, magnitude, prevMagnitude) {
    const canvas = document.getElementById('spectrumCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width / pixelRatio; // 使用缩放后的宽度
    const height = canvas.height / pixelRatio; // 使用缩放后的高度

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    let currentX = 0;

    for (const band of frequencyBands) {
        // 根据 widthRatio 动态分配条形数量
        const numBarsInBand = Math.round(totalBars * band.widthRatio);
        const bandWidth = width * band.widthRatio;
        const barWidth = (bandWidth / numBarsInBand) - barSpacing; // 频率条宽度减去间距

        const step = (band.end - band.start) / numBarsInBand;
        const bandFrequencies = Array.from({ length: numBarsInBand }, (_, i) => band.start + i * step + step / 2);

        // 处理频率的线性插值，避免相邻条形高度相同
        const bandMagnitudes = bandFrequencies.map((freq, i) => {
            let closestIndex = -1;
            let minDiff = Infinity;

            frequency.forEach((f, idx) => {
                const diff = Math.abs(f - freq);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = idx;
                }
            });

            // 获取最接近频率的振幅数据
            const currentMagnitude = closestIndex !== -1 ? magnitude[closestIndex] : 0;

            // 如果存在下一条数据，进行线性插值
            if (i < numBarsInBand - 1 && closestIndex !== -1) {
                const nextClosestIndex = frequency.findIndex(f => f >= bandFrequencies[i + 1]);
                if (nextClosestIndex !== -1) {
                    const nextMagnitude = magnitude[nextClosestIndex];
                    return lerp(currentMagnitude, nextMagnitude, i / numBarsInBand); // 插值计算
                }
            }
            return currentMagnitude;
        });

        for (let i = 0; i < numBarsInBand; i++) {
            let barHeight = bandMagnitudes[i] * height * band.amplitudeScale;

            if (barHeight > band.maxAmplitude * height) {
                barHeight = band.maxAmplitude * height;
            }

            if (prevMagnitude && prevMagnitude[frequency.indexOf(bandFrequencies[i])]) {
                const targetHeight = barHeight;
                const currentHeight = prevMagnitude[frequency.indexOf(bandFrequencies[i])] * height * band.amplitudeScale;
                barHeight = currentHeight + (targetHeight - currentHeight) * easing;
            }

            if (colorMode === 1) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            } else if (colorMode === 2) {
                // 为每个频段设置不同的色相范围
                let hue;
                if (band.start === 0) { // 低频段：蓝色到青色（240°到180°）
                    hue = 240 - (i / numBarsInBand) * 60;
                } else if (band.start === 500) { // 中频段：绿色到黄色（120°到60°）
                    hue = 120 - (i / numBarsInBand) * 60;
                } else if (band.start === 5000) { // 高频段：橙色到红色（30°到0°）
                    hue = 30 - (i / numBarsInBand) * 30;
                }

                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            }

            // 确保条形在画布范围内
            if (currentX + i * (barWidth + barSpacing) + barWidth <= width) {
                ctx.fillRect(currentX + i * (barWidth + barSpacing), height - barHeight, barWidth, barHeight);
            }
        }

        currentX += bandWidth;
    }
}

// 更新频谱数据并绘制
async function updateSpectrum(timestamp) {
    if (timestamp - lastDataFetchTime > 10) { // 定时获取一次数据
        lastDataFetchTime = timestamp;
        await getSpectrumData();
    }

    if (timestamp - lastDrawTime > frameInterval) {
        lastDrawTime = timestamp;
        if (spectrumData) {
            const { frequency, magnitude } = spectrumData;
            drawSpectrum(frequency, magnitude, prevSpectrumData ? prevSpectrumData.magnitude : null);
            prevSpectrumData = spectrumData; // 保存当前帧数据作为下一帧的前一帧数据
        }
    }
    requestAnimationFrame(updateSpectrum); // 保持帧速率
}

// 切换颜色模式的函数
function toggleColorMode() {
    colorMode = (colorMode === 1) ? 2 : 1; // 在两种模式之间切换
}

// 启动绘制循环
requestAnimationFrame(updateSpectrum);

