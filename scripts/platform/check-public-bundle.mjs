import {readFileSync,readdirSync,statSync} from 'node:fs';
const env=readFileSync('.env.local','utf8');const secret=env.match(/^PREVIEW_SECRET=(.+)$/m)?.[1]?.trim();
const root=process.argv[2]??'.vercel/output/static';
const walk=p=>readdirSync(p).flatMap(n=>{const f=p+'/'+n;return statSync(f).isDirectory()?walk(f):[f];});
let checked=0;for(const file of walk(root)){if(!/\.(js|html|json|map)$/.test(file))continue;const text=readFileSync(file,'utf8');if(secret&&text.includes(secret))throw new Error('Server secret in public asset: '+file);if(/VITE_WP_PUBLIC_SNAPSHOT_URL|darkslategrey-gerbil-679218\.hostingersite\.com/.test(text))throw new Error('Active legacy configuration in public asset: '+file);checked++;}
console.log(`Checked ${checked} public assets: no configured preview secret or legacy WordPress endpoint.`);
