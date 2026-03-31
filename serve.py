#!/usr/bin/env python3
"""SPA-aware static server for Plot PWA.
Serves dist/ with fallback to index.html for client-side routing.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def do_GET(self):
        # Serve actual files if they exist, otherwise fallback to index.html (SPA)
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        # Cache-busting for dev, cache assets in prod
        if "/assets/" in self.path:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        # Colorized logging
        status = args[1] if len(args) > 1 else ""
        color = "\033[32m" if "200" in str(status) else "\033[33m"
        print(f"{color}{args[0]}\033[0m" if args else "")

if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler)
    ip = os.popen("ipconfig getifaddr en0 2>/dev/null || echo localhost").read().strip()
    print(f"\n  \033[1m🟠 Plot PWA serving at:\033[0m")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  iPhone:  http://{ip}:{PORT}")
    print(f"  \033[2m(same Wi-Fi network required)\033[0m\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
