"""Read every tracked file at a fixed git ref; never scan dependencies or secrets."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
ref=sys.argv[1] if len(sys.argv)>1 else '079f5501c52104d816152c392f2c6531e470bcca'
commit=subprocess.check_output(['git','rev-parse',ref],text=True).strip()
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',commit],text=True).splitlines()
patterns={
 'media':r'(?:from ["\']@/assets|src=|https?://)',
 'content/actions/SEO':r'(?:title:|label:|placeholder=|description|<h[1-6]|<p|href=|to=|submitLabel=)',
 'tokens/layout/motion':r'(?:#[0-9a-fA-F]{3,8}\b|\d+(?:px|rem|svh)|className=|setProperty|@media)',
 'data/filter/navigation':r'(?:const (?:MENU|CATS|OPS|TYPES)|options=|localProperties|localSettings|localTeam|calendly|whatsapp)'
}
rows=[];hits=[]
for path in paths:
 b=subprocess.check_output(['git','show',f'{commit}:{path}'])
 try: content=b.decode('utf-8-sig');binary='\x00' in content
 except UnicodeDecodeError: binary=True
 rows.append({'path':path,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'classification':'binary asset' if binary else 'source/config/document'})
 if not binary:
  for n,line in enumerate(content.splitlines(),1):
   categories=[key for key,pattern in patterns.items() if re.search(pattern,line)]
   if categories:hits.append({'path':path,'line':n,'categories':categories,'source':line.strip()})
folder=Path('docs/rivton');folder.mkdir(parents=True,exist_ok=True)
for name,items in [('source-inventory',rows),('hardcoded-inventory',hits)]:
 (folder/f'{name}.json').write_text(json.dumps({'commit':commit,'method':'static scan; manual findings in audit.md','items':items},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(rows)} tracked files read at {commit}; {len(hits)} source locations classified')
