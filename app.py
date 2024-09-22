import os
import platform
import sys
import signal
import asyncio
from flask import Flask, render_template
from api.system_api import api_blueprint, update_network_info, init_hardware, scheduler
import logging

app = Flask(__name__)

# 检查操作系统是否为 Windows
if platform.system() != 'Windows':
    print("此应用仅支持在 Windows 上运行。")
    sys.exit(1)

# 检查是否以管理员权限运行
def is_admin():
    try:
        return os.getuid() == 0  # 对于 Unix/Linux 系统
    except AttributeError:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()  # 对于 Windows 系统

if not is_admin():
    print("请以管理员权限运行此应用。")
    sys.exit(1)

# 注册蓝图
app.register_blueprint(api_blueprint)

@app.route('/')
def index():
    return render_template('index.html')  # 返回 index.html 页面

# 优化 Ctrl+C 的退出输出
def signal_handler(sig, frame):
    print("\n正在关闭应用...")
    shutdown_scheduler()
    sys.exit(0)

def shutdown_scheduler():
    # 提高 APScheduler 的日志级别
    apscheduler_logger = logging.getLogger('apscheduler')
    apscheduler_logger.setLevel(logging.CRITICAL)
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("Scheduler shut down")

def run_app():
    try:
        # 创建和设置事件循环
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # 初始化硬件信息
        loop.run_until_complete(init_hardware())
        
        # 启动调度器
        scheduler.start()

        # 运行 Flask 应用
        app.run(debug=True, use_reloader=False)  # 禁用自动重载以避免 APScheduler 问题
    except Exception as e:
        print(f"发生异常: {e}")
        # 可考虑记录日志并决定是否重启
        restart_program()

def restart_program():
    print("应用崩溃，正在尝试重启...")
    os.execv(sys.executable, ['python'] + sys.argv)

if __name__ == '__main__':
    # 设置信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    
    # 运行应用
    run_app()
    