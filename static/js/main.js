function updateTime() {
    const now = new Date();
    const Day = now.toLocaleDateString('zh-CN', { weekday: 'long' }); // 使用本地时间格式
    const formattedTime = now.toLocaleTimeString('zh-CN'); // 使用本地时间格式
    const formattedDay = `(${Day.slice(2)})`
    document.getElementById('current-time').textContent = formattedTime;
    document.getElementById('kanji').textContent = formattedDay;
    const DateTime = now.getDate();
    const formattedDate = `                    
        <span>${DateTime - 2}</span>
        <span>${DateTime - 1}</span>
        <span id="current">
        ${DateTime}
        </span>
        <span>${DateTime + 1}</span>
        <span>${DateTime + 2}</span>`
    document.getElementById('dateDOM').innerHTML = formattedDate;
}
// 每秒更新一次时间
setInterval(updateTime, 1000);
updateTime(); // 初始调用，避免延迟
/* 在这里放个分割线 */


function changeWidth() {
    const clock = document.getElementById("time-container");
    const time = document.getElementById("time-section");
    const c = window.getComputedStyle(clock)["width"];
    const t = window.getComputedStyle(time)["width"];
    const formatc = Number(c.slice(0, -2));
    const formatt = Number(t.slice(0, -2));
    console.log(c, t);
    console.log(formatc, formatt);
    if (formatc > formatt) {
        console.log("溢出了！")
    } else {
        console.log("没有超过！")
    }
}

// Helper function to update the DOM
function updateElement(id, text) {
    document.getElementById(id).innerText = text;
}

// Fetch motherboard information
function fetchMotherboardInfo() {
    fetch('/api/motherboard')
        .then(response => response.json())
        .then(data => {
            const motherboardContainer = document.getElementById('motherboard-info-container');
            const motherboardModel = document.getElementById('motherboard-model');

            if (data.status) {
                motherboardModel.innerText = ` ${data.status}`; // 显示状态
            } else {
                motherboardModel.innerText = `型号： ${data.model}`; // 显示主板型号
            }
        })
        .catch(error => {
            console.error('Error fetching motherboard information:', error);
        });
}

// 初始化 CPU 图表
const cpuChart = createChart('cpuChart', 'CPU 占用率 (%)', {
    lineColor: 'rgba(72,190,230,1.00)',
    backgroundColor: 'rgba(29,76,92,0.40)',
    initialYMax: 100
});

// Fetch CPU information
function fetchCPUInfo() {
    fetch('/api/cpu')
        .then(response => response.json())
        .then(data => {
            const cpuContainer = document.getElementById('cpu-info-container');
            cpuContainer.innerHTML = '';  // 清空之前的内容

            const cpuSection = document.createElement('div');
            cpuSection.classList.add('cpu-section');

            cpuSection.innerHTML = `
                <p id="cpu-model">型号: ${data.cpu_model}</p>
                <p id="cpu-usage">占用率: ${data.cpu_usage}</p>
                <p id="cpu-core-usage">每核心占用: ${data.cpu_percent_per_core.join(', ')}</p>
                <p id="cpu-temp">温度: ${data.cpu_temp}°</p>
                <p id="cpu-power">封装功耗: ${data.cpu_power} </p>
                <p id="cpu-fan-speed">风扇转速: ${data.cpu_fan_speed} </p>
            `;

            // 将 CPU 信息插入容器
            cpuContainer.appendChild(cpuSection);

            // 更新 CPU 图表
            const usageValue = parseFloat(data.cpu_usage); // 转换为数值
            if (!isNaN(usageValue)) { // 确保转换成功
                cpuChart.update(usageValue);
            } else {
                console.error('CPU usage is not a valid number:', data.cpu_usage);
            }

        })
        .catch(error => {
            console.error('Error fetching CPU information:', error);
        });
}

// 初始化内存图表
const memoryChart = createChart('memoryChart', '内存占用率 (%)', {
    lineColor: 'rgba(0,144,230,1.00)',
    backgroundColor: 'rgba(0,58,92,0.40)',
    initialYMax: 100
});

// Fetch memory information
function fetchMemoryInfo() {
    fetch('/api/memory')
        .then(response => response.json())
        .then(data => {
            // 更新内存占用率
            updateElement('memory-usage', `当前内存占用: ${data.memory_percent}`);

            // 更新已使用内存/总内存
            updateElement('memory-used', `已使用内存: ${data.used_memory} / ${data.total_memory}`);

            // 更新内存图表
            const usageValue = parseFloat(data.memory_percent); // 转换为数值
            if (!isNaN(usageValue)) { // 确保转换成功
                memoryChart.update(usageValue);
            } else {
                console.error('Memory percent is not a valid number:', data.memory_percent);
            }
        })
        .catch(error => {
            console.error('Error fetching memory info:', error);
        });
}

// Fetch disk information
function fetchDiskInfo() {
    fetch('/api/disk')
        .then(response => response.json())
        .then(data => {
            const diskUsageElement = document.getElementById('disk-usage');
            diskUsageElement.innerHTML = ''; // 清空之前的内容

            const diskCount = data.disk_usage.length; // 获取磁盘总数

            data.disk_usage.forEach((disk, index) => {
                const listItem = document.createElement('li');

                // 创建文字信息
                const textInfo = document.createElement('p');
                textInfo.innerHTML = `分区: ${disk.device} <br> 使用情况: ${disk.used} / ${disk.total} <br> <div style="text-align: right;">${disk.percent}</div>`;
                listItem.appendChild(textInfo);

                // 创建进度条容器
                const progressBarContainer = document.createElement('div');
                progressBarContainer.classList.add('progress-bar-container'); // 使用 CSS 样式

                // 创建进度条
                const progressBar = document.createElement('div');
                progressBar.classList.add('progress-bar'); // 使用 CSS 样式
                progressBar.style.width = `${disk.percent}`; // 动态设置宽度为百分比

                // 根据占用率百分比设置颜色
                const usagePercent = parseFloat(disk.percent);
                if (usagePercent < 60) {
                    progressBar.classList.add('low'); // 低占用率 - 绿色
                } else if (usagePercent < 80) {
                    progressBar.classList.add('medium'); // 中等占用率 - 橙色
                } else {
                    progressBar.classList.add('high'); // 高占用率 - 红色
                }

                // 将进度条添加到容器中
                progressBarContainer.appendChild(progressBar);

                // 将文字和进度条添加到列表项中
                listItem.appendChild(progressBarContainer);

                // 将列表项添加到父元素中
                diskUsageElement.appendChild(listItem);

                // 如果不是最后一个磁盘，加换行
                if (index < diskCount - 1) {
                    const lineBreak = document.createElement('br');
                    diskUsageElement.appendChild(lineBreak);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching disk information:', error);
        });
}


// 初始化网络图表
const netRxChart = createChart('netRxChart', '实时下行 (KB/s)', {
    lineColor: 'rgba(72,230,172,1.00)',
    backgroundColor: 'rgba(29,92,76,0.40)',
    initialYMax: 1000, // 初始的 Y 轴最大值
    dynamicYMax: true // 启用动态 YMax 更新
});

const netTxChart = createChart('netTxChart', '实时上行 (KB/s)', {
    lineColor: 'rgba(230,72,104,1.00)',
    backgroundColor: 'rgba(92,29,29,0.40)',
    initialYMax: 500, // 初始的 Y 轴最大值
    dynamicYMax: true // 启用动态 YMax 更新
});

// 帮助函数：将带单位的字符串解析为 KB/s 数值
function parseSpeedToKB(speedStr) {
    const speedRegex = /([\d.]+)\s*([A-Za-z]+\/s)/; // 匹配速度和单位
    const match = speedStr.match(speedRegex);

    if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'B/s':
                return value / 1024; // 转换为 KB/s
            case 'KB/s':
                return value; // 保持 KB/s 不变
            case 'MB/s':
                return value * 1024; // 转换为 KB/s
            case 'GB/s':
                return value * 1024 * 1024; // 转换为 KB/s
            default:
                console.error('未知的单位:', unit);
                return NaN;
        }
    } else {
        console.error('无效的速度格式:', speedStr);
        return NaN;
    }
}

// 更新 DOM 元素的帮助函数
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.innerText = value;
    } else {
        console.error(`Element with ID ${id} not found`);
    }
}

// Fetch 网络信息并更新图表
function fetchNetworkInfo() {
    fetch('/api/network')
        .then(response => response.json())
        .then(data => {
            // 更新页面上的网络信息
            updateElement('net-rx', `实时下行: ${data.net_rx}`);
            updateElement('net-tx', `实时上行: ${data.net_tx}`);

            // 将下行和上行速度转换为 KB/s
            const netRxValue = parseSpeedToKB(data.net_rx);
            const netTxValue = parseSpeedToKB(data.net_tx);

            // 动态更新 netRxChart 图表
            if (!isNaN(netRxValue)) {
                netRxChart.update(netRxValue); // 使用图表内部的动态YMax逻辑
            } else {
                console.error('Net RX is not a valid number:', data.net_rx);
            }

            // 动态更新 netTxChart 图表
            if (!isNaN(netTxValue)) {
                netTxChart.update(netTxValue); // 使用图表内部的动态YMax逻辑
            } else {
                console.error('Net TX is not a valid number:', data.net_tx);
            }
        })
        .catch(error => {
            console.error('Error fetching network information:', error);
        });
}


// Fetch battery information
function fetchBatteryInfo() {
    fetch('/api/battery')
        .then(response => response.json())
        .then(data => {
            const batteryContainer = document.getElementById('battery-info-container');
            batteryContainer.innerHTML = '';  // 清空之前的内容

            const batterySection = document.createElement('div');
            batterySection.classList.add('battery-section');

            if (data.status === '未检测到电池') {
                batterySection.innerHTML = `
                <p id="battery-status">状态: ${data.status}</p>
                <p id="battery-power-source">电源: ${data.power_source}</p> <br>
                `;
                // 添加灰色进度条
                const progressBarContainer = document.createElement('div');
                progressBarContainer.classList.add('progress-bar-container');
                const progressBar = document.createElement('div');
                progressBar.classList.add('progress-bar', 'not-detected');
                progressBar.style.width = '100%'; // 充满
                progressBarContainer.appendChild(progressBar);
                batterySection.appendChild(progressBarContainer);
            } else {
                batterySection.innerHTML = `
                <p id="battery-percent">电池百分比: ${data.percent}</p>
                <p id="battery-time-left">剩余时间: ${data.time_left}</p>
                <p id="battery-power-plugged">电源插入: ${data.power_plugged}</p>
                <p id="battery-status">状态: ${data.status}</p>
                `;

                // 添加进度条
                const progressBarContainer = document.createElement('div');
                progressBarContainer.classList.add('progress-bar-container');
                const progressBar = document.createElement('div');
                progressBar.classList.add('progress-bar');

                const batteryPercent = parseFloat(data.percent);
                progressBar.style.width = `${batteryPercent}%`; // 根据电池百分比动态设置宽度

                // 根据是否插电设置样式
                if (data.power_plugged) {
                    progressBar.classList.add('plugged-in'); // 插电状态
                } else {
                    // 根据电池百分比设置颜色
                    if (batteryPercent < 20) {
                        progressBar.classList.add('low'); // 低电量 - 红色
                    } else if (batteryPercent < 50) {
                        progressBar.classList.add('medium'); // 中等电量 - 橙色
                    } else {
                        progressBar.classList.add('high'); // 高电量 - 绿色
                    }
                }

                progressBarContainer.appendChild(progressBar);
                batterySection.appendChild(progressBarContainer);
            }

            // 将电池信息插入容器
            batteryContainer.appendChild(batterySection);
        })
        .catch(error => {
            console.error('Error fetching battery information:', error);
        });
}


// Fetch GPU information
function fetchGPUInfo() {
    fetch('/api/gpu')
        .then(response => response.json())
        .then(data => {
            const gpuContainer = document.getElementById('gpu-info-container');
            gpuContainer.innerHTML = '';  // 清空之前的内容

            data.forEach((gpu, index) => {
                // 为每个 GPU 创建一个新的 section
                const gpuSection = document.createElement('div');
                gpuSection.classList.add('gpu-section');

                //显存占用率: gpu.memory_usage 有bug
                //  <p>显存占用率: ${gpu.memory_usage || '未知'}</p>
                //核心占用率也有bug 所以我用3D负载替代了

                gpuSection.innerHTML = `
                <h3>GPU ${index}</h3>
                <p>型号: ${gpu.model}</p>
                <p>核心频率: ${gpu.gpu_clock || '未知'}</p>
                <p>3D 负载: ${gpu.thrd_usage || '未知'}</p>
                <p>显存频率: ${gpu.memory_clock || '未知'}</p>
                <p>专用显存使用量: ${gpu.dedicated_memory_usage || '未知'}</p>
                <p>共享显存使用量: ${gpu.shared_memory_usage || '未知'}</p>
                <p>GPU 核心温度: ${gpu.gpu_temp || '不支持'}</p>
                <p>封装功耗: ${gpu.gpu_power || '不支持'}</p>
                <p>风扇转速: ${gpu.fan_speed || '不支持'}</p>
                <p>全屏帧率: ${gpu.fps || '不支持'}</p>
            `;

                // 将 GPU 信息插入容器
                gpuContainer.appendChild(gpuSection);
            });
        })
        .catch(error => {
            console.error('Error fetching GPU information:', error);
        });
}


document.addEventListener('DOMContentLoaded', function () {
    // 调用所有 API 请求以在页面加载时获取初始数据
    fetchMotherboardInfo();
    fetchCPUInfo();
    fetchMemoryInfo();
    fetchDiskInfo();
    fetchNetworkInfo();
    fetchBatteryInfo();
    fetchGPUInfo();
});


// Set individual intervals for each type of data
const cpuInterval = setInterval(fetchCPUInfo, 1000);
const memoryInterval = setInterval(fetchMemoryInfo, 1000);
const diskInterval = setInterval(fetchDiskInfo, 10000);
const networkInterval = setInterval(fetchNetworkInfo, 1000);
const batteryInterval = setInterval(fetchBatteryInfo, 10000);
const gpuInterval = setInterval(fetchGPUInfo, 2000);

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
    clearInterval(cpuInterval);
    clearInterval(memoryInterval);
    clearInterval(diskInterval);
    clearInterval(networkInterval);
    clearInterval(batteryInterval);
    clearInterval(gpuInterval);
});
