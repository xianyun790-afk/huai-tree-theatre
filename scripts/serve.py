"""Serve the prebuilt demo on loopback using only Python's standard library."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse
import webbrowser

parser = argparse.ArgumentParser(description='打开槐树街小剧场试玩')
parser.add_argument('--port', type=int, default=5180)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
directory = Path(__file__).resolve().parents[1] / 'dist'
if not (directory / 'index.html').is_file():
    raise SystemExit('没有找到构建文件。请在 playable 目录运行 npm install 和 npm run build。')
server = None
for port in range(args.port, args.port + 20):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(directory)))
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('附近端口均被占用，请使用 --port 选择其他端口。')
url = f'http://127.0.0.1:{server.server_address[1]}/'
print(f'槐树街小剧场试玩：{url}\n游戏运行中，请保持此窗口打开。按 Ctrl+C 停止。', flush=True)
if not args.no_browser:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n试玩服务已停止。')
finally:
    server.server_close()
