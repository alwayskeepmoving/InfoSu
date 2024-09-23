import sounddevice as sd
import numpy as np
import asyncio

# 全局变量存储频谱数据
spectrum_data = {
    'frequency': [],
    'magnitude': []
}

fs = 44100  # 采样率
blocksize = 4098  # 块大小

def audio_callback(indata, frames, time, status):
    if status:
        print(status)

    # 计算频谱
    spectrum = np.fft.fft(indata[:, 0])
    freq = np.fft.fftfreq(len(spectrum), 1/fs)

    # 只保留正频率部分
    spectrum_magnitude = np.abs(spectrum)[:len(spectrum)//2]
    freq = freq[:len(freq)//2]

    # 更新频谱数据
    global spectrum_data
    spectrum_data['frequency'] = freq.tolist()
    spectrum_data['magnitude'] = spectrum_magnitude.tolist()

async def start_audio_stream():
    try:
        with sd.InputStream(callback=audio_callback, channels=1, samplerate=fs, blocksize=blocksize):
            while True:  # 持续监听
                await asyncio.sleep(0)  # 让出控制权
    except Exception as e:
        print(f"An error occurred: {e}")

# 启动音频流
async def run_audio_listener():
    await start_audio_stream()