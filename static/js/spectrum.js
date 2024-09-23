// 控制渲染开关
let isRenderingEnabled = false;

let spectrumData = null; // 当前频谱数据
let prevSpectrumData = null; // 前一帧的频谱数据
const frameInterval = 1000 / 45; // 30 FPS，控制绘制的帧速率
let lastDrawTime = 0; // 上次绘制时间
let lastDataFetchTime = 0; // 上次获取数据的时间
const easing = 0.01; // 缓动系数，值越小过渡越平滑
const barSpacing = 2; // 控制频率条之间的间距

const pixelRatio = window.devicePixelRatio || 1; // 获取设备的像素比率

// 定义频率段
const frequencyBands = [
    { start: 0, end: 500, widthRatio: 0.3, maxAmplitude: 1.0, amplitudeScale: 0.008 }, // 低频
    { start: 500, end: 5000, widthRatio: 0.4, maxAmplitude: 0.9, amplitudeScale: 0.01 }, // 中频
    { start: 5000, end: 22000, widthRatio: 0.3, maxAmplitude: 1.0, amplitudeScale: 0.02 } // 高频
];

const totalBars = 300; // 总频率条数量
let barWidthBase; // 频率条宽度的基础值
let colorMode = 2; // 颜色模式，1为统一颜色，2为渐变色
let barsColor = 'rgba(0, 255, 0, 0.8)' //颜色模式为1时的颜色

let worker; // Web Worker 实例

// 初始化 Web Worker
function initializeWorker() {
    // 如果渲染开关关闭，不创建 Web Worker，也不进行任何频谱处理
    if (!isRenderingEnabled) {
        return;
    }

    worker = new Worker('/static/js/spectrumWorker.js'); // 创建 Web Worker
    worker.onmessage = function(event) {
        const bandData = event.data; // 接收处理后的频谱数据
        drawSpectrum(bandData); // 绘制频谱
    };
}


initializeWorker(); // 调用初始化函数

// 初始化频率条宽度的基础值
function initializeBarWidthBase() {
    const canvas = document.getElementById('spectrumCanvas');
    const container = document.getElementById('spectrum-container');
    const width = container.clientWidth; // 获取容器宽度
    const height = container.clientHeight; // 获取容器高度

    canvas.width = width * pixelRatio; // 设置画布宽度
    canvas.height = height * pixelRatio; // 设置画布高度

    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio); // 调整绘制比例

    barWidthBase = width; // 初始化条宽基础值
}

initializeBarWidthBase(); // 调用初始化函数

// 从 API 获取频谱数据
async function getSpectrumData() {
    try {
        const response = await fetch('/api/spectrum'); // 请求频谱数据
        spectrumData = await response.json(); // 解析为 JSON
    } catch (error) {
        console.error("Error fetching spectrum data:", error); // 错误处理
    }
}

// 绘制频谱的函数
function drawSpectrum(bandData) {
    const canvas = document.getElementById('spectrumCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width / pixelRatio; // 使用缩放后的宽度
    const height = canvas.height / pixelRatio; // 使用缩放后的高度

    ctx.clearRect(0, 0, width, height); // 清空画布

    let currentX = 0; // 当前 X 坐标

    // 遍历频率段数据
    bandData.forEach((band, bandIndex) => {
        const { bandMagnitudes, numBarsInBand, amplitudeScale, maxAmplitude } = band; // 解构数据

        const bandWidth = width * frequencyBands[bandIndex].widthRatio; // 计算频段宽度
        const barWidth = (bandWidth / numBarsInBand) - barSpacing; // 计算条形宽度

        // 绘制每个频率条
        for (let i = 0; i < numBarsInBand; i++) {
            let barHeight = bandMagnitudes[i] * height * amplitudeScale; // 计算条形高度

            if (barHeight > maxAmplitude * height) {
                barHeight = maxAmplitude * height; // 限制最大高度
            }

            // 设置颜色
            if (colorMode === 1) {
                ctx.fillStyle = barsColor; // 统一颜色
            } else if (colorMode === 2) {
                let hue; // 色相
                if (bandIndex === 0) {
                    hue = 240 - (i / numBarsInBand) * 60; // 低频段色相
                } else if (bandIndex === 1) {
                    hue = 120 - (i / numBarsInBand) * 60; // 中频段色相
                } else if (bandIndex === 2) {
                    hue = 30 - (i / numBarsInBand) * 30; // 高频段色相
                }

                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; // 渐变色
            }

            // 确保条形在画布范围内
            if (currentX + i * (barWidth + barSpacing) + barWidth <= width) {
                ctx.fillRect(currentX + i * (barWidth + barSpacing), height - barHeight, barWidth, barHeight); // 绘制条形
            }
        }

        currentX += bandWidth; // 更新当前 X 坐标
    });
}

// 更新频谱数据并绘制
async function updateSpectrum(timestamp) {
    if (timestamp - lastDataFetchTime > 100) { // 定时获取一次数据
        lastDataFetchTime = timestamp;
        await getSpectrumData();
    }

    if (timestamp - lastDrawTime > frameInterval) { // 控制绘制频率
        lastDrawTime = timestamp;
        if (spectrumData) {
            const { frequency, magnitude } = spectrumData; // 解构数据
            worker.postMessage({ frequency, magnitude, frequencyBands, totalBars }); // 将数据发送到 Worker 进行处理
        }
    }

    requestAnimationFrame(updateSpectrum); // 保持帧速率
}

// 切换颜色模式的函数
function toggleColorMode() {
    colorMode = (colorMode === 1) ? 2 : 1; // 在两种模式之间切换
}

// 控制渲染开关的函数
function toggleRendering() {
    isRenderingEnabled = !isRenderingEnabled; // 切换渲染状态
}

requestAnimationFrame(updateSpectrum); // 启动绘制循环
