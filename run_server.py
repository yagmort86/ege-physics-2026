# -*- coding: utf-8 -*-
"""
EGE Physics 2026 - Offline Local Network Server
Starts a standalone local web server and prints the local network URL to share with the child.
Works 100% offline without external internet.
"""

import http.server
import socket
import socketserver
import os
import sys
import webbrowser

PORT = 8080

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Connect to a dummy local network address
        s.connect(('192.168.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

class EGEHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable caching for development convenience
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure correct MIME type for WebP
        if path.lower().endswith(".webp"):
            return "image/webp"
        return super().guess_type(path)

    def log_message(self, format, *args):
        # Clean logging: only print errors or page hits
        if len(args) > 1 and "200" not in str(args[1]):
            super().log_message(format, *args)

def main():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    local_ip = get_local_ip()

    # Reconfigure stdout for utf-8 on Windows
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    server_address = ("", PORT)

    class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        allow_reuse_address = True

    with ThreadedTCPServer(server_address, EGEHTTPRequestHandler) as httpd:
        print("=" * 64)
        print("  📘 Интерактивное пособие: ЕГЭ 2026 Физика (Демидова М.Ю.)")
        print("=" * 64)
        print(f"  🟢 Локальный сервер запущен и готов к работе!")
        print()
        print(f"  💻 На этом компьютере:")
        print(f"     http://localhost:{PORT}")
        print()
        print(f"  📱 Ссылка для ребенка в домашней сети (Wi-Fi):")
        print(f"     http://{local_ip}:{PORT}")
        print()
        print("  ℹ️  Интернет не требуется: сервер работает автономно.")
        print("  Для остановки сервера нажмите Ctrl + C.")
        print("=" * 64)

        # Open in default browser automatically on start
        try:
            webbrowser.open(f"http://localhost:{PORT}")
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Сервер остановлен.")
            httpd.server_close()

if __name__ == "__main__":
    main()
