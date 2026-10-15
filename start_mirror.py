"""Start the laptop mirror and open its page once the server is ready."""
import os
import runpy
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

def open_when_ready():
    url = 'http://localhost:' + os.getenv('PORT', '8080')
    for _ in range(60):
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    webbrowser.open(url)
                    return
        except OSError:
            time.sleep(.5)
    print('Could not open the page automatically. Check the server messages.')

if __name__ == '__main__':
    threading.Thread(target=open_when_ready, daemon=True).start()
    runpy.run_path(str(Path(__file__).with_name('server.py')), run_name='__main__')
