"""Build a reproducible installable plugin archive without tests, credentials or site data."""
from pathlib import Path
import hashlib,zipfile
root=Path(__file__).resolve().parent.parent
source=root/'wordpress'/'rivton-core'
output=root/'artifacts'/'rivton-core-0.2.0.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for file in sorted(source.rglob('*')):
  if not file.is_file(): continue
  if file.suffix not in ['.php','.js','.css','.json','.txt']: raise SystemExit(f'Unexpected package file: {file}')
  name='rivton-core/'+file.relative_to(source).as_posix()
  info=zipfile.ZipInfo(name,date_time=(2026,11,4,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  archive.writestr(info,file.read_bytes())
digest=hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(digest+'  '+output.name+'\n',encoding='ascii')
print(output.name,output.stat().st_size,'bytes',digest)
