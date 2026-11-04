"""Verify the tested installed plugin is byte-for-byte the delivered archive."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
report=json.loads((root/'artifacts/wp-integration.json').read_text(encoding='utf-8'))
if report.get('success') is not True: raise SystemExit('WordPress integration run did not complete')
with zipfile.ZipFile(root/'artifacts/rivton-core-0.2.0.zip') as archive:
 expected={name.removeprefix('rivton-core/'):hashlib.sha256(archive.read(name)).hexdigest() for name in archive.namelist() if not name.endswith('/')}
actual=report.get('pluginHashes',{})
if expected!=actual:
 differences=[name for name in expected if actual.get(name)!=expected[name]]
 raise SystemExit('ZIP differs from the tested installation: '+', '.join(differences))
print('Verified installed ZIP:',len(expected),'files;',len(report['passed']),'PHP checks')
