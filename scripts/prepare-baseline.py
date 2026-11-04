"""Prepare an immutable baseline copy inside .tmp; never overwrite application files."""
from pathlib import Path
import io,subprocess,tarfile
ROOT=Path(__file__).resolve().parent.parent
TARGET=(ROOT/'.tmp'/'baseline').resolve()
if not TARGET.is_relative_to((ROOT/'.tmp').resolve()): raise SystemExit('Unsafe baseline path')
COMMIT='079f5501c52104d816152c392f2c6531e470bcca'
archive_bytes=subprocess.check_output(['git','archive',COMMIT],cwd=ROOT)
TARGET.mkdir(parents=True,exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(archive_bytes)) as archive: archive.extractall(TARGET,filter='data')
print(f'Baseline extracted: {COMMIT} -> {TARGET}')
print('Install baseline dependencies or create a node_modules junction to the root installation; run Vite on 4174.')
