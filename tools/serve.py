"""سيرفر محلي للتجربة من غير كاش: python tools/serve.py 5190"""
import http.server, os, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 5190), H).serve_forever()
