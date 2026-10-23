"""سيرفر محلي للتجربة من غير كاش: python tools/serve.py 5190
(وبيقبل PUT على فولدر icons/ بس — عشان صفحة design/icons.html تحفظ الأيقونات)"""
import http.server, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_PUT(self):
        name = os.path.basename(self.path.split('?')[0])
        if not self.path.startswith('/icons/') or not name.endswith('.png'):
            self.send_error(403); return
        os.makedirs('icons', exist_ok=True)
        with open(os.path.join('icons', name), 'wb') as f:
            f.write(self.rfile.read(int(self.headers['Content-Length'])))
        self.send_response(201); self.end_headers()


http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 5190), H).serve_forever()
