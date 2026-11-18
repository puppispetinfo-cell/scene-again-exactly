import json,copy
from pathlib import Path
p=Path('wordpress/rivton-core/schemas/contracts.json'); s=json.loads(p.read_text(encoding='utf-8'))
T=lambda n=10000:{'type':'string','maxLength':n}
E=lambda vals:{'type':'string','enum':vals}
N=lambda low=0,high=10000:{'type':'number','minimum':low,'maximum':high}
B={'type':'boolean'}
A=lambda item:{'type':'array','items':item,'maxItems':100}
O=lambda props,required=[]:{'type':'object','properties':props,'required':required,'additionalProperties':False}
base={k:copy.deepcopy(s['pageDefinitionSchema']['properties'][k]) for k in ['id','schemaVersion','revision','extensions']}
entity=lambda props,req:O({**copy.deepcopy(base),**props},['id','schemaVersion','revision']+req)
media=copy.deepcopy(s['mediaAssetSchema']); seo=copy.deepcopy(s['seoSettingsSchema'])
layout=O({'title':T(500),'subtitle':T(2000),'body':T(),'align':E(['left','center','right']),'focalX':N(0,100),'focalY':N(0,100),'height':N(200,1200),'fontSize':N(12,120),'spacing':N(0,160),'columns':{'type':'integer','minimum':1,'maximum':6},'visible':B,'overlay':N(0,1),'overlayColor':{'type':'string','pattern':'^#[0-9a-fA-F]{6}$'},'transition':N(0,1),'media':media,'background':media,'buttonLayout':E(['row','stack']),'carousel':E(['manual','auto']),'interval':N(2000,20000)})
overrides=O({k:copy.deepcopy(layout) for k in ['desktop','tablet','mobile']})
scene=entity({'title':T(500),'subtitle':T(2000),'media':media,'layout':layout,'overrides':overrides,'visible':B,'actions':copy.deepcopy(s['pageSectionSchema']['properties']['actions'])},['title','subtitle','layout','overrides','visible'])
section=s['pageSectionSchema']; section['properties'].update({'label':T(150),'layout':layout,'overrides':overrides,'scenes':A(scene),'faqs':A(O({'id':T(128),'group':E(['Compra','Venta','Alquiler','PublicaciÃ³n','Tasaciones','Visitas','Contacto']),'question':T(500),'answer':T(3000)},['id','group','question','answer']))})
section['properties']['type']['enum']=list(dict.fromkeys(section['properties']['type']['enum']+['hero','search','carousel','cta','services','map','contact','heading','footer']))
s['pageDefinitionSchema']['properties']['sections']['items']=copy.deepcopy(section)
s['locationSchema']=entity({'name':T(150),'slug':{'type':'string','pattern':'^[a-z0-9]+(?:-[a-z0-9]+)*$'},'level':E(['province','city','neighborhood']),'parentId':T(128),'description':T(),'image':media,'latitude':N(-90,90),'longitude':N(-180,180),'order':{'type':'integer','minimum':0},'active':B,'seo':seo},['name','slug','level','description','order','active','seo'])
s['teamMemberSchema']['required']=[k for k in s['teamMemberSchema']['required'] if k not in ['role','biography','photo']]
s['teamMemberSchema']['properties'].update({'order':{'type':'integer','minimum':0},'visible':B})
f=s['propertyFeatureSchema']; f['properties']['valueType']['enum']=['boolean','number','text','select']; f['properties'].update({'group':E(['structural','amenity']),'order':{'type':'integer','minimum':0},'visible':B,'filterVisible':B,'options':A(T(150)),'unit':E(['mÂ²','aÃ±os','unidades','ninguna'])})
f['properties']['icon']=E(['home','bed','bath','area','car','pool','garden','security','gym','balcony','sun','building','check'])
s['propertySchema']['properties'].update({'provinceId':T(128),'cityId':T(128),'neighborhoodId':T(128),'agentId':T(128),'videos':A(media),'attributes':{'type':'object','additionalProperties':{'anyOf':[T(150),N(0,1000000000),B]}}})
s['searchFilterDefinitionSchema']['properties']['source']=E(['manual','operations','types','cities','neighborhoods','features'])
s['configurationSchema']['properties']['filters']['items']=copy.deepcopy(s['searchFilterDefinitionSchema'])
c=s['configurationSchema']['properties'];c['company']=O({'presentation':T(),'history':T(),'tone':T(150),'pillars':A(T(300)),'values':A(T(300)),'services':A(T(300)),'coverage':T(500),'hours':T(500)},['presentation','history','tone','pillars','values','services','coverage','hours'])
c['forms']=O({'leadStorageApproved':B,'privacyReviewed':B,'propertyMessage':T(3000),'ownerMessage':T(3000),'successMessage':T(1000),'preferredChannel':E(['whatsapp']),'propertyFields':A(E(['name','phone','email','message','propertyId','preferredTime'])),'ownerFields':A(E(['name','phone','email','propertyType','location','operation','description']))},['leadStorageApproved','privacyReviewed','propertyMessage','ownerMessage','successMessage','preferredChannel','propertyFields','ownerFields'])
p.write_text(json.dumps(s,ensure_ascii=True,indent=2)+'\n')
d=Path('wordpress/rivton-core/schemas/defaults.json');v=json.loads(d.read_text(encoding='utf-8')); v['location']={'id':'new','schemaVersion':1,'revision':0,'extensions':{},'name':'','slug':'','level':'province','description':'','order':0,'active':True,'seo':copy.deepcopy(v['page']['seo'])};v['team']={'id':'new','schemaVersion':1,'revision':0,'extensions':{},'name':'','order':0,'visible':True};v['section'].update({'label':'','layout':{},'overrides':{},'scenes':[],'faqs':[]});v['feature'].update({'group':'amenity','order':0,'visible':True,'filterVisible':True,'options':[],'unit':'ninguna'});d.write_text(json.dumps(v,ensure_ascii=True,indent=2)+'\n')
