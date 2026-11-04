"""Package source, built game and Blender files without caches or dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[2]
out = root / '槐树街小剧场-可玩试玩-v0.6.zip'
skip_dirs = {'node_modules', '.git', 'working', '__pycache__'}
with ZipFile(out, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if not path.is_file() or any(part in skip_dirs for part in rel.parts):
            continue
        if path.suffix in {'.zip', '.log', '.blend1', '.tsbuildinfo'} or path.name == '.DS_Store':
            continue
        archive.write(path, Path('槐树街小剧场-v0.6') / rel)
with ZipFile(out) as archive:
    problem = archive.testzip()
    if problem:
        raise SystemExit(f'压缩包校验失败: {problem}')
    print(f'{out}\n{len(archive.namelist())} files, {out.stat().st_size / 1024 / 1024:.1f} MB, CRC verified')
