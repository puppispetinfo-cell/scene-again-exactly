import {describe,it,expect} from 'vitest';
import {propertyDraftSchema,propertyPublishSchema,suggestSEO,settingsSchema,marketingSchema,normalizeNeighborhood} from '@/platform/contracts';
import {filterProperties,parseFilters} from '@/lib/filters';
import {optimizeImage} from '@/platform/server/images';
import sharp from 'sharp';
import {localProperties} from '@/data/properties';
describe('platform contracts and safe media',()=>{
 it('allows incomplete drafts and refuses incomplete publication',()=>{expect(propertyDraftSchema.parse({}).price).toBeNull();expect(propertyPublishSchema.safeParse({}).success).toBe(false);});
 it('does not invent facts in deterministic SEO',()=>{const p=propertyDraftSchema.parse({title:'Casa en Córdoba',city:'Córdoba'});const seo=suggestSEO(p);expect(seo.slug).toBe('casa-en-cordoba');expect(seo.description).toContain('Precio a consultar');expect(seo.description).not.toMatch(/dormitorios|pileta|m²/);});
 it('accepts safe new types and operations in existing URL keys',()=>{expect(parseFilters({tipo:'galpon',operacion:'permuta'})).toMatchObject({tipo:'galpon',operacion:'permuta'});expect(parseFilters({tipo:'javascript:alert(1)',operacion:'../bad'})).toEqual({});});
 it('keeps currencies separate while sorting',()=>{const p=localProperties[0]!;const list=[{...p,id:'ars',price:{amount:1000,currency:'ARS' as const}},{...p,id:'usd',price:{amount:1,currency:'USD' as const}}];expect(filterProperties(list,{moneda:'ARS'}).map(p=>p.id)).toEqual(['ars']);expect(filterProperties(list,{precioMax:2}).map(p=>p.id)).toEqual(['usd']);});
 it('normalizes manual neighborhoods without inventing geography',()=>expect(normalizeNeighborhood('  Cerro   de las Rosas  ')).toBe('Cerro de las Rosas'));
 it('rejects tracking scripts and unknown configuration keys',()=>{expect(marketingSchema.safeParse({mode:'direct',gtm:{enabled:true,id:'<script>'},ga4:{enabled:false,id:''},meta:{enabled:false,id:''},ads:{enabled:false,id:''},adsLabels:{},consentRequired:true}).success).toBe(false);});
 it('decodes actual PNG pixels and produces WebP stripped of metadata',async()=>{const input=await sharp({create:{width:10,height:12,channels:3,background:'red'}}).png().toBuffer();const result=await optimizeImage(input,'image/png');const metadata=await sharp(result.data).metadata();expect(metadata.format).toBe('webp');expect(result.width).toBe(10);expect(metadata.exif).toBeUndefined();});
 it('rejects MIME spoofing, SVG and executable bytes',async()=>{const input=await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer();await expect(optimizeImage(input,'image/jpeg')).rejects.toThrow();await expect(optimizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'),'image/png')).rejects.toThrow();await expect(optimizeImage(Buffer.from('<?php echo 1;'),'image/jpeg')).rejects.toThrow();});
 it('rejects files over the explicit 10 MB limit before decoding',async()=>{await expect(optimizeImage(new Uint8Array(10485761),'image/jpeg')).rejects.toThrow('10 MB');});
});
