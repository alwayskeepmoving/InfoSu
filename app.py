from flask import Flask, render_template
from api.system_api import api_blueprint  # 导入新的蓝图

app = Flask(__name__)

# 注册蓝图
app.register_blueprint(api_blueprint)

@app.route('/')
def index():
    return render_template('index.html')  # 返回 index.html 页面

if __name__ == '__main__':
    app.run(debug=True)
