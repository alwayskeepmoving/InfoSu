from flask import Blueprint, jsonify
import psutil
import platform
import cpuinfo  # 用于获取详细的 CPU 信息

import clr  # 引入 pythonnet 的 clr 模块
clr.AddReference(r'dll/LibreHardwareMonitor-net472/LibreHardwareMonitorLib')
from LibreHardwareMonitor.Hardware import Computer , SensorType, HardwareType  # type: ignore

# 创建蓝图
api_blueprint = Blueprint('api', __name__)

# 初始化 last_net_io
last_net_io = psutil.net_io_counters()

# 缓存字典，存储所有设备
hardware_cache = {}
hardware_cache['gpus'] = []

def init_hardware():
    # 初始化 Computer 对象
    computer = Computer()
    computer.IsCpuEnabled = True
    computer.IsGpuEnabled = True
    computer.IsMotherboardEnabled = True
    computer.IsMemoryEnabled = True
    computer.Open()

    # 遍历所有硬件设备
    for hardware in computer.Hardware:
        print(hardware.HardwareType)  # 打印出硬件类型以供调试
        hardware.Update()  # 初始获取数据
        if hardware.HardwareType == HardwareType.Motherboard:
            hardware_cache['motherboard'] = hardware
        if hardware.HardwareType == HardwareType.Memory:
            hardware_cache['memory'] = hardware
        if hardware.HardwareType == HardwareType.Cpu:
            hardware_cache['cpu'] = hardware
        if hardware.HardwareType == HardwareType.GpuAmd or hardware.HardwareType == HardwareType.GpuNvidia:
            hardware_cache['gpus'].append(hardware)

    return computer  # 返回 computer 对象，以便后续使用

# 调用初始化函数，启动时遍历所有设备
computer = init_hardware()

def format_speed(bytes_per_sec):
    if bytes_per_sec < 1024:
        return f"{bytes_per_sec:.2f} B/s"
    elif bytes_per_sec < 1024**2:
        return f"{bytes_per_sec / 1024:.2f} KB/s"
    elif bytes_per_sec < 1024**3:
        return f"{bytes_per_sec / 1024**2:.2f} MB/s"
    else:
        return f"{bytes_per_sec / 1024**3:.2f} GB/s"
    
# 获取主板信息
def get_motherboard_info_libre():
    motherboard_stats = {}
    motherboard = hardware_cache.get('motherboard', None)  # 使用 None 而不是空列表
    
    if motherboard:
        motherboard.Update()  # 更新主板数据
        motherboard_stats = {
            'model': motherboard.Name  # 只返回主板名称
        }
    else:
        motherboard_stats = {
            'status': '未检测到主板'
        }

    return motherboard_stats

# 获取内存信息
def get_memory_info():
    memory_stats = {}
    
    # 获取虚拟内存信息
    virtual_memory = psutil.virtual_memory()
    memory_stats['total_memory'] = f"{virtual_memory.total / (1024 ** 3):.2f} GB"  # 总内存
    memory_stats['available_memory'] = f"{virtual_memory.available / (1024 ** 3):.2f} GB"  # 可用内存
    memory_stats['used_memory'] = f"{virtual_memory.used / (1024 ** 3):.2f} GB"  # 已用内存
    memory_stats['memory_percent'] = f"{virtual_memory.percent}%"  # 内存使用率

    # 获取交换内存信息
    swap_memory = psutil.swap_memory()
    memory_stats['total_swap'] = f"{swap_memory.total / (1024 ** 3):.2f} GB"  # 总交换内存
    memory_stats['used_swap'] = f"{swap_memory.used / (1024 ** 3):.2f} GB"  # 已用交换内存
    memory_stats['free_swap'] = f"{swap_memory.free / (1024 ** 3):.2f} GB"  # 可用交换内存
    memory_stats['swap_percent'] = f"{swap_memory.percent}%"  # 交换内存使用率

    return memory_stats

# 获取 CPU 信息
def get_cpu_info_libre():
    cpu_stats = {}
    cpu = hardware_cache.get('cpu')

    if cpu:
        cpu.Update()
        cpu_stats = {
            'cpu_model': cpuinfo.get_cpu_info().get('brand_raw', '未知型号'),
            'cpu_freq': "不支持",
            'cpu_usage': "不支持",
            'cpu_temp': "不支持",
            'cpu_fan_speed': "不支持",
            'cpu_percent_per_core': []
        }

        # 获取 CPU 总使用率
        cpu_stats['cpu_usage'] = f"{psutil.cpu_percent(interval=1)}%"

        # 获取每个核心的使用率
        cpu_stats['cpu_percent_per_core'] = [f"{percent}%" for percent in psutil.cpu_percent(interval=1, percpu=True)]

        for sensor in cpu.Sensors:
            if sensor.SensorType == SensorType.Clock and "Bus Speed" in sensor.Name:
                cpu_stats['cpu_freq'] = f"{sensor.Value:.2f} MHz"
                # 这个是总线频率
            if sensor.SensorType == SensorType.Temperature:
                cpu_stats['cpu_temp'] = f"{sensor.Value:.2f} °C"
            if sensor.SensorType == SensorType.Power:
                cpu_stats['cpu_power'] = f"{sensor.Value * 10:.1f} W"
            if sensor.SensorType == SensorType.Fan:
                cpu_stats['cpu_fan_speed'] = f"{sensor.Value} RPM"
    
    return cpu_stats

# 获取 GPU 信息
def get_gpu_info_libre():
    gpu_stats = []
    gpus = hardware_cache.get('gpus', [])
    
    for gpu in gpus:
        gpu.Update()
        gpu_info = {
            'model': gpu.Name,
            'usage': "不支持",
            'dedicated_memory_usage': "不支持",  # 专用显存
            'shared_memory_usage': "不支持",     # 共享显存
            'gpu_temp': "不支持",
            'memory_temp': "不支持",
            'gpu_power': "不支持",
            'fan_speed': "不支持"
        }
        for sensor in gpu.Sensors:
            if sensor.SensorType == SensorType.Load and "GPU Core" in sensor.Name:
                gpu_info['usage'] = f"{sensor.Value:.2f}%"
            if sensor.SensorType == SensorType.Clock and "GPU Core" in sensor.Name:
                gpu_info['gpu_clock'] = f"{sensor.Value:.2f} MHz"
            if sensor.SensorType == SensorType.Load and "D3D 3D" in sensor.Name:
                gpu_info['thrd_usage'] = f"{sensor.Value:.2f}%"
            if sensor.SensorType == SensorType.Power and "Package" in sensor.Name:
                gpu_info['gpu_power'] = f"{sensor.Value:.1f} W"
            elif sensor.SensorType == SensorType.Temperature and "GPU Core" in sensor.Name:
                gpu_info['gpu_temp'] = f"{sensor.Value:.2f} °C"
            if sensor.SensorType == SensorType.Load and "GPU Memory" in sensor.Name:
                gpu_info['memory_usage'] = f"{sensor.Value:.2f}%"
            if sensor.SensorType == SensorType.Clock and "GPU Memory" in sensor.Name:
                gpu_info['memory_clock'] = f"{sensor.Value:.2f} MHz"
            elif sensor.SensorType == SensorType.Temperature and "Memory" in sensor.Name:
                gpu_info['memory_temp'] = f"{sensor.Value:.2f} °C"
                #没有这玩意
            elif sensor.SensorType == SensorType.Factor and "FPS" in sensor.Name:
                gpu_info['fps'] = f"{sensor.Value:.2f} FPS" if sensor.Value >= 0 else "无效帧率"
            elif sensor.SensorType == SensorType.Fan:
                gpu_info['fan_speed'] = f"{sensor.Value} RPM" if sensor.Value > 0 else "风扇处于静音模式或数据无效"
            elif sensor.SensorType == SensorType.SmallData and "D3D Dedicated Memory Used" in sensor.Name:
                gpu_info['dedicated_memory_usage'] = f"{sensor.Value:.2f} MB"
            elif sensor.SensorType == SensorType.SmallData and "D3D Shared Memory Used" in sensor.Name:
                gpu_info['shared_memory_usage'] = f"{sensor.Value:.2f} MB"
        gpu_stats.append(gpu_info)
    
    return gpu_stats

# 单独的 API 端点来获取主板信息
@api_blueprint.route('/api/motherboard', methods=['GET'])
def get_motherboard_info():
    mb_stats = get_motherboard_info_libre()
    return jsonify(mb_stats)


# 单独的 API 端点来获取 CPU 信息
@api_blueprint.route('/api/cpu', methods=['GET'])
def get_cpu_info():
    cpu_stats = get_cpu_info_libre()
    return jsonify(cpu_stats)

# 单独的 API 端点来获取内存信息
@api_blueprint.route('/api/memory', methods=['GET'])
def get_memory_info_endpoint():
    memory_stats = get_memory_info()
    return jsonify(memory_stats)

# 单独的 API 端点来获取磁盘信息
@api_blueprint.route('/api/disk', methods=['GET'])
def get_disk_info():
    disk_usage = []
    for partition in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disk_usage.append({
                'device': partition.device,
                'used': f"{usage.used / (1024**3):.2f} GB",
                'total': f"{usage.total / (1024**3):.2f} GB",
                'percent': f"{usage.percent}%"
            })
        except PermissionError:
            continue
    return jsonify({'disk_usage': disk_usage})

# 单独的 API 端点来获取网络流量信息
@api_blueprint.route('/api/network', methods=['GET'])
def get_network_info():
    global last_net_io
    net_io = psutil.net_io_counters()
    down_speed = net_io.bytes_recv - last_net_io.bytes_recv
    up_speed = net_io.bytes_sent - last_net_io.bytes_sent

    network_stats = {
        'net_rx': format_speed(down_speed),
        'net_tx': format_speed(up_speed)
    }

    last_net_io = net_io  # 更新上次网络统计数据
    return jsonify(network_stats)

# 单独的 API 端点来获取 GPU 信息
@api_blueprint.route('/api/gpu', methods=['GET'])
def get_gpu_info():
    gpu_stats = get_gpu_info_libre()
    return jsonify(gpu_stats)

# 单独的 API 端点来获取电池状态
@api_blueprint.route('/api/battery', methods=['GET'])
def get_battery_info():
    battery = psutil.sensors_battery()
    
    # 如果没有检测到电池
    if battery is None:
        battery_stats = {
            'status': '未检测到电池',
            'power_source': '交流电'  # 默认假设使用交流电
        }
    else:
        battery_stats = {
            'percent': f"{battery.percent}%",  # 电池百分比
            'time_left': f"{battery.secsleft // 3600}小时{(battery.secsleft % 3600) // 60}分钟" if battery.secsleft != psutil.POWER_TIME_UNLIMITED else "剩余时间无限",
            'power_plugged': '是' if battery.power_plugged else '否',
            'status': '正在充电' if battery.power_plugged else '未充电'
        }
    
    return jsonify(battery_stats)

# 注意：记得在适当的时候关闭硬件访问，例如在程序退出时
