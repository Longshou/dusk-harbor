#!/usr/bin/env python3
"""把 src/ 下的模块拼接成一个独立的 index.html。"""
import glob
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'


def main():
    src = os.path.join(ROOT, 'src')
    with open(os.path.join(src, '00_head.html'), encoding='utf-8') as f:
        head = f.read()
    js = ''
    for path in sorted(glob.glob(os.path.join(src, '*.js'))):
        with open(path, encoding='utf-8') as f:
            js += f'\n/* ---- {os.path.basename(path)} ---- */\n' + f.read()
    html = (head + f'\n<script src="{THREE_URL}"></script>\n<script>\n'
            + js + '\n</script>\n</body>\n</html>\n')
    out = os.path.join(ROOT, 'index.html')
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print(f'已生成 {out}（{len(html.encode("utf-8")) // 1024} KB）')


if __name__ == '__main__':
    main()
