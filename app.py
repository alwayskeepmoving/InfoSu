import os
import platform
import sys
import signal
from flask import Flask, render_template
from api.system_api import api_blueprint

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

# 自动重启逻辑
def restart_program():
    print("应用崩溃，正在尝试重启...")
    os.execv(sys.executable, ['python'] + sys.argv)

# 优化 Ctrl+C 的退出输出
def signal_handler(sig, frame):
    print("\n正在关闭应用...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    try:
        app.run(debug=True)
    except SystemExit:
        # 处理正常退出
        pass
    except Exception as e:
        print(f"发生异常: {e}")
        restart_program()
