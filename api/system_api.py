# system_api.py

import asyncio
from flask import Blueprint, jsonify
from .audio_visualization import spectrum_data  # 导入频谱数据
import psutil
import platform
import cpuinfo  # 用于获取详细的 CPU 信息
import clr  # 引入 pythonnet 的 clr 模块
# from apscheduler.schedulers.asyncio import AsyncIOScheduler
# from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.executors.pool import ThreadPoolExecutor
import atexit

clr.AddReference(r'dll/LibreHardwareMonitor-net472/LibreHardwareMonitorLib')
from LibreHardwareMonitor.Hardware import Computer, SensorType, HardwareType  # type: ignore

import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logging.getLogger('apscheduler').setLevel(logging.WARNING)  # 将 APScheduler 的日志级别提高到 WARNING
logging.getLogger('werkzeug').setLevel(logging.INFO)  # 将 Werkzeug (Flask 默认服务器) 的日志级别提高到 WARNING

# 创建蓝图
api_blueprint = Blueprint('api', __name__)

# 初始化 last_net_io
last_net_io = psutil.net_io_counters()

# 缓存字典，存储所有设备的信息
hardware_cache = {
    'motherboard': None,
    'memory': None,
    'cpu': None,
    'gpus': [],
    'disk_usage': [],
    'network_stats': {},
    'battery': None,
}

async def init_hardware():
    computer = Computer()
    computer.IsCpuEnabled = True
    computer.IsGpuEnabled = True
    computer.IsMotherboardEnabled = True
    computer.IsMemoryEnabled = True
    computer.Open()
    
    for hardware in computer.Hardware:
        await asyncio.to_thread(hardware.Update)
        if hardware.HardwareType == HardwareType.Motherboard:
            hardware_cache['motherboard'] = hardware
        elif hardware.HardwareType == HardwareType.Memory:
            hardware_cache['memory'] = hardware
        elif hardware.HardwareType == HardwareType.Cpu:
            hardware_cache['cpu'] = hardware
            hardware_cache['cpu_model'] = cpuinfo.get_cpu_info().get('brand_raw', '未知型号')
        elif hardware.HardwareType in (HardwareType.GpuAmd, HardwareType.GpuNvidia):
            hardware_cache['gpus'].append(hardware)
    
    logging.debug("硬件初始化成功")
    return computer

computer = asyncio.run(init_hardware())

def format_speed(bytes_per_sec):
    if bytes_per_sec < 1024:
        return f"{bytes_per_sec:.2f} B/s"
    elif bytes_per_sec < 1024**2:
        return f"{bytes_per_sec / 1024:.2f} KB/s"
    elif bytes_per_sec < 1024**3:
        return f"{bytes_per_sec / 1024**2:.2f} MB/s"
    else:
        return f"{bytes_per_sec / 1024**3:.2f} GB/s"

async def update_cpu_info():
    cpu = hardware_cache.get('cpu')
    if cpu:
        await asyncio.to_thread(cpu.Update)
        # 更新硬件缓存中的CPU信息
        # 这里可以添加更多的CPU信息更新逻辑

async def update_memory_info():
    memory = hardware_cache.get('memory')
    if memory:
        await asyncio.to_thread(memory.Update)
        # 更新硬件缓存中的内存信息
        # 这里可以添加更多的内存信息更新逻辑

def update_disk_info():
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
    hardware_cache['disk_usage'] = disk_usage

# 更新网络信息
def update_network_info():
    global last_net_io
    try:
        net_io = psutil.net_io_counters()

        down_speed = net_io.bytes_recv - last_net_io.bytes_recv
        up_speed = net_io.bytes_sent - last_net_io.bytes_sent

        hardware_cache['network_stats'] = {
            'net_rx': format_speed(down_speed),
            'net_tx': format_speed(up_speed)
        }
        last_net_io = net_io
    except Exception as e:
        logging.error(f"Error updating network info: {e}")


def update_battery_info():
    battery = psutil.sensors_battery()
    if battery is None:
        hardware_cache['battery'] = {
            'status': '未检测到电池',
            'power_source': '交流电'
        }
    else:
        hardware_cache['battery'] = {
            'percent': f"{battery.percent}%",
            'time_left': f"{battery.secsleft // 3600}小时{(battery.secsleft % 3600) // 60}分钟" if battery.secsleft != psutil.POWER_TIME_UNLIMITED else "剩余时间无限",
            'power_plugged': '是' if battery.power_plugged else '否',
            'status': '正在充电' if battery.power_plugged else '未充电'
        }

async def update_gpu_info():
    gpus = hardware_cache.get('gpus', [])
    unique_gpus = set()  # 使用集合来存储唯一的 GPU 名称
    updated_gpus = []

    for gpu in gpus:
        try:
            await asyncio.to_thread(gpu.Update)
            if gpu.Name not in unique_gpus:
                unique_gpus.add(gpu.Name)
                updated_gpus.append(gpu)
        except Exception as e:
            print(f"更新GPU信息时发生错误: {e}")

    hardware_cache['gpus'] = updated_gpus  # 更新整个列表

# 定义调度器
executors = {
    'default': ThreadPoolExecutor(20)  # 使用线程池
}
scheduler = BackgroundScheduler(executors=executors)

# 包装函数，用于在 APScheduler 中运行异步任务
def run_async_job(func, *args, **kwargs):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(func(*args, **kwargs))
    finally:
        loop.close()

# 添加定时任务
try:
    # 首先手动调用每个更新函数以获取初始数据
    asyncio.run(update_cpu_info())
    asyncio.run(update_memory_info())
    update_disk_info()
    update_network_info()
    update_battery_info()
    asyncio.run(update_gpu_info())

    scheduler.add_job(run_async_job, 'interval', seconds=1, args=(update_cpu_info,), max_instances=2)
    scheduler.add_job(run_async_job, 'interval', seconds=1, args=(update_memory_info,), max_instances=2)
    scheduler.add_job(update_disk_info, 'interval', seconds=10, max_instances=2)
    scheduler.add_job(update_network_info, 'interval', seconds=1, max_instances=2)
    scheduler.add_job(update_battery_info, 'interval', seconds=30, max_instances=2)
    scheduler.add_job(run_async_job, 'interval', seconds=2, args=(update_gpu_info,), max_instances=2)
except Exception as e:
    logging.error(f"Error adding jobs to scheduler: {e}")

# 定义关闭处理函数
def shutdown_scheduler():
    # 关闭在 App 运行前的 Trackback，只保留自定义报错
    import tempfile, sys
    # 后续可使用 TemporaryFile() 生成本地日志
    sys.stderr = tempfile.TemporaryFile()
    scheduler.shutdown(wait=False)

# 注册关闭处理函数
atexit.register(shutdown_scheduler)

# API 路由定义
@api_blueprint.route('/api/motherboard', methods=['GET'])
async def get_motherboard_info():
    motherboard = hardware_cache['motherboard']
    mb_stats = {'model': motherboard.Name} if motherboard else {'status': '未检测到主板'}
    return jsonify(mb_stats)

@api_blueprint.route('/api/cpu', methods=['GET'])
async def get_cpu_info():
    cpu = hardware_cache['cpu']
    if cpu:
        cpu_stats = {
            'cpu_model': hardware_cache.get('cpu_model', '未知型号'),
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
    else:
        cpu_stats = {'status': '未检测到CPU信息'}

    return jsonify(cpu_stats)

@api_blueprint.route('/api/memory', methods=['GET'])
async def get_memory_info_endpoint():
    memory = hardware_cache['memory']
    if memory:
        virtual_memory = psutil.virtual_memory()
        swap_memory = psutil.swap_memory()
        memory_stats = {
            'total_memory': f"{virtual_memory.total / (1024 ** 3):.2f} GB",  # 总内存
            'available_memory': f"{virtual_memory.available / (1024 ** 3):.2f} GB",  # 可用内存
            'used_memory': f"{virtual_memory.used / (1024 ** 3):.2f} GB",  # 已用内存
            'memory_percent': f"{virtual_memory.percent}%",  # 内存使用率
            'total_swap': f"{swap_memory.total / (1024 ** 3):.2f} GB",  # 总交换内存
            'used_swap': f"{swap_memory.used / (1024 ** 3):.2f} GB",  # 已用交换内存
            'free_swap': f"{swap_memory.free / (1024 ** 3):.2f} GB",  # 可用交换内存
            'swap_percent': f"{swap_memory.percent}%"  # 交换内存使用率
        }
    else:
        memory_stats = {'status': '未检测到内存'}

    return jsonify(memory_stats)

@api_blueprint.route('/api/disk', methods=['GET'])
def get_disk_info():
    disk_usage = hardware_cache['disk_usage']
    return jsonify({'disk_usage': disk_usage})

@api_blueprint.route('/api/network', methods=['GET'])
def get_network_info():
    network_stats = hardware_cache['network_stats']
    return jsonify(network_stats)

@api_blueprint.route('/api/gpu', methods=['GET'])
async def get_gpu_info():
    gpus = hardware_cache['gpus']
    gpu_stats = []

    for gpu in gpus:
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
            elif sensor.SensorType == SensorType.Factor and "FPS" in sensor.Name:
                gpu_info['fps'] = f"{sensor.Value:.2f} FPS" if sensor.Value >= 0 else "无效帧率"
            elif sensor.SensorType == SensorType.Fan:
                gpu_info['fan_speed'] = f"{sensor.Value} RPM" if sensor.Value > 0 else "风扇处于静音模式或数据无效"
            elif sensor.SensorType == SensorType.SmallData and "D3D Dedicated Memory Used" in sensor.Name:
                gpu_info['dedicated_memory_usage'] = f"{sensor.Value:.2f} MB"
            elif sensor.SensorType == SensorType.SmallData and "D3D Shared Memory Used" in sensor.Name:
                gpu_info['shared_memory_usage'] = f"{sensor.Value:.2f} MB"
        gpu_stats.append(gpu_info)
    
    return jsonify(gpu_stats)

@api_blueprint.route('/api/battery', methods=['GET'])
def get_battery_info():
    battery = hardware_cache['battery']
    return jsonify(battery)

@api_blueprint.route('/api/spectrum', methods=['GET'])
def get_spectrum_info():
    return jsonify(spectrum_data)
