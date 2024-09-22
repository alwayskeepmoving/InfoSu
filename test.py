import clr  # 引入 pythonnet 的 clr 模块
import time

# 引入 LibreHardwareMonitorLib.dll
clr.AddReference(r'dll/LibreHardwareMonitor-net472/LibreHardwareMonitorLib')  # 确保路径正确

from LibreHardwareMonitor.Hardware import Computer
from LibreHardwareMonitor.Hardware import SensorType

# 初始化计算机硬件监控器
computer = Computer()
computer.IsCpuEnabled = True  # 启用 CPU 监控
computer.IsGpuEnabled = True  # 启用 GPU 监控
computer.IsMemoryEnabled = True  # 启用内存监控
computer.IsMotherboardEnabled = True  # 启用主板监控
computer.IsControllerEnabled = True  # 启用控制器（风扇等）监控
computer.IsNetworkEnabled = True  # 启用网络监控
computer.IsStorageEnabled = True  # 启用存储设备监控
computer.Open()

# 获取所有设备信息
for hardware in computer.Hardware:
    hardware.Update()  # 更新设备数据
    print(f"Device: {hardware.Name}")
    
    # 遍历传感器并获取相关数据
    for sensor in hardware.Sensors:
        if sensor.SensorType == 'Voltage':
            print(f"  Voltage: {sensor.Value} V")
        elif sensor.SensorType == 'Clock':
            print(f"  Clock: {sensor.Value} MHz")
        elif sensor.SensorType == 'Temperature':
            print(f"  Temperature: {sensor.Value} °C")
        elif sensor.SensorType == 'Load':
            print(f"  Load: {sensor.Value} %")
        elif sensor.SensorType == 'Fan':
            print(f"  Fan speed: {sensor.Value} RPM")
        elif sensor.SensorType == 'Power':
            print(f"  Power: {sensor.Value} W")
        elif sensor.SensorType == 'Data':
            print(f"  Data: {sensor.Value}")

# 遍历设备
for hardware in computer.Hardware:
    print(f"Device: {hardware.Name}")
    hardware.Update()  # 更新设备传感器数据

    # 遍历传感器
    for sensor in hardware.Sensors:
        if sensor.SensorType == SensorType.Temperature:
            print(f"   Temperature: {sensor.Value} °C")
        elif sensor.SensorType == SensorType.Fan:
            print(f"   Fan Speed: {sensor.Value} RPM")

