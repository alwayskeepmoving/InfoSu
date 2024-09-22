function updateTime() {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('zh-CN'); // 使用本地时间格式
    const formattedDay = now.toLocaleDateString('zh-CN', { weekday: 'long' }); // 使用本地时间格式
    const formattedTime = now.toLocaleTimeString('zh-CN'); // 使用本地时间格式
    const formattedDateTime = `${formattedDate} ${formattedDay}`;
    document.getElementById('current-date').textContent = formattedDateTime;
    document.getElementById('current-time').textContent = formattedTime;

}
// 每秒更新一次时间
setInterval(updateTime, 1000);
updateTime(); // 初始调用，避免延迟

/* 在这里放个分割线 */

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
    backgroundColor: 'rgba(29,76,92,0.40)'
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
const memoryChart = createChart('memoryChart', '内存占用率 (%)',  {
    lineColor: 'rgba(0,144,230,1.00)', 
    backgroundColor: 'rgba(0,58,92,0.40)'
});

// Fetch memory information
function fetchMemoryInfo() {
    fetch('/api/memory')
        .then(response => response.json())
        .then(data => {
            // 更新内存占用率
            updateElement('memory-usage', `当前内存占用: ${data.memory_percent}%`);

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
            diskUsageElement.innerHTML = ''; // Clear the previous content
            data.disk_usage.forEach(disk => {
                const listItem = document.createElement('li');
                listItem.textContent = `分区: ${disk.device}, 使用情况: ${disk.used} / ${disk.total}, 百分比: ${disk.percent}`;
                diskUsageElement.appendChild(listItem);
            });
        });
}

// Fetch network information
function fetchNetworkInfo() {
    fetch('/api/network')
        .then(response => response.json())
        .then(data => {
            updateElement('net-rx', `实时下行: ${data.net_rx}`);
            updateElement('net-tx', `实时上行: ${data.net_tx}`);
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
                <p id="battery-power-source">电源: ${data.power_source}</p>
            `;
            } else {
                batterySection.innerHTML = `
                <p id="battery-percent">电池百分比: ${data.percent}</p>
                <p id="battery-time-left">剩余时间: ${data.time_left}</p>
                <p id="battery-power-plugged">电源插入: ${data.power_plugged}</p>
                <p id="battery-status">状态: ${data.status}</p>
            `;
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

// 立即调用所有 API 请求以在页面加载时获取初始数据
fetchMotherboardInfo();
fetchCPUInfo();
fetchMemoryInfo();
fetchDiskInfo();
fetchNetworkInfo();
fetchBatteryInfo();
fetchGPUInfo();

// Set individual intervals for each type of data
const cpuInterval = setInterval(fetchCPUInfo, 1500);    // CPU info every 2 seconds
const memoryInterval = setInterval(fetchMemoryInfo, 3000); // Memory info every 5 seconds
const diskInterval = setInterval(fetchDiskInfo, 10000);  // Disk info every 10 seconds
const betworkInterval = setInterval(fetchNetworkInfo, 1000); // Network info every 3 seconds
const batteryInterval = setInterval(fetchBatteryInfo, 15000); // Battery info every 15 seconds
const gpuInterval = setInterval(fetchGPUInfo, 1500);    // GPU info every 7 seconds

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
    clearInterval(cpuInterval);
    clearInterval(memoryInterval);
    clearInterval(diskInterval);
    clearInterval(betworkInterval);
    clearInterval(batteryInterval);
    clearInterval(gpuInterval);
});