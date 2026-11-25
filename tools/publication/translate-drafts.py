import argparse,json,pathlib,re,time,hashlib,unicodedata
import ctranslate2,sentencepiece as spm
P=argparse.ArgumentParser();P.add_argument('--language',required=True,choices=['yo','ig','ha']);P.add_argument('--threads',type=int,default=3);P.add_argument('--batch',type=int,default=16);P.add_argument('--start',type=int,default=1);P.add_argument('--end',type=int,default=31);P.add_argument('--model',required=True,type=pathlib.Path);P.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[2]);a=P.parse_args()
ROOT=a.root
LANG={'yo':'yor_Latn','ig':'ibo_Latn','ha':'hau_Latn'}[a.language]
sp=spm.SentencePieceProcessor(model_file=str(a.model/'sentencepiece.bpe.model'))
translator=ctranslate2.Translator(str(a.model),device='cpu',compute_type='int8',inter_threads=1,intra_threads=a.threads)
# Every paragraph/sentence is translated; splitting never drops an oversized source tail.
SKIP={'publicationDate','publicationName','publicationTitle','entryId','edition','editionKey','mainReference','memoryReference','quotationReference','supportingReferences','author','translation','language','schemaVersion','dayNumber','programmeStart'}
WEEK={'yo':{'Monday':'Ọjọ́ Ajé','Tuesday':'Ọjọ́ Ìṣẹ́gun','Wednesday':'Ọjọ́rú','Thursday':'Ọjọ́bọ','Friday':'Ọjọ́ Ẹtì','Saturday':'Ọjọ́ Àbámẹ́ta','Sunday':'Ọjọ́ Àìkú'},'ha':{'Monday':'Litinin','Tuesday':'Talata','Wednesday':'Laraba','Thursday':'Alhamis','Friday':'Jumma’a','Saturday':'Asabar','Sunday':'Lahadi'},'ig':{'Monday':'Mọnde','Tuesday':'Tuzdee','Wednesday':'Wenezdee','Thursday':'Tọzdee','Friday':'Fraịdee','Saturday':'Satọdee','Sunday':'Sọnde'}}
# Keep Scripture references exact for existing site ScriptureContent links.
REF=re.compile(r'(?:[1-3]\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?::\d+)?(?:[–—-]\d+)?')

def pieces(text):
 out=[]
 for para in re.split(r'(\n\s*\n)',text):
  if not para:continue
  if para.isspace():out.append((False,para));continue
  last=0
  for match in REF.finditer(para):
   if match.start()>last:out.extend(splittext(para[last:match.start()]))
   out.append((False,match.group()));last=match.end()
  if last<len(para):out.extend(splittext(para[last:]))
 return out

def splittext(text):
 result=[]
 lead=text[:len(text)-len(text.lstrip())];tail=text[len(text.rstrip()):]
 if lead:result.append((False,lead))
 text=text.strip()
 # Models translate one sentence at a time. NLLB is not a document summariser.
 sentences=re.split(r'(?<=[.!?])\s+(?=[A-Z“‘"(])',text) if text else []
 for num,sentence in enumerate(sentences):
  if num:result.append((False,' '))
  sentence=sentence.strip()
  # Keep open/close parentheses around canonical references outside inference.
  before='';after=''
  while sentence.startswith('('):before+='(';sentence=sentence[1:]
  while sentence.endswith('('):after=(' (' if sentence.endswith(' (') else '(')+after;sentence=sentence[:-1].rstrip()
  if before:result.append((False,before))
  if sentence:
   if not re.search(r'[A-Za-z]',sentence):result.append((False,sentence))
   elif len(sp.encode(sentence,out_type=str))<=220:result.append((True,sentence))
   else:
    words=sentence.split();chunk=[]
    for word in words:
     if chunk and len(sp.encode(' '.join(chunk+[word]),out_type=str))>210:
      result.extend([(True,' '.join(chunk)),(False,' ')]);chunk=[]
     chunk.append(word)
    if chunk:result.append((True,' '.join(chunk)))
  if after:result.append((False,after))
 if tail:result.append((False,tail))
 return result

for day in range(a.start,a.end+1):
 source=ROOT/'publication/2026-12/english'/f'day-{day:02}.json'
 dest=ROOT/'publication/2026-12/translations'/a.language/f'day-{day:02}.json'
 if dest.exists():print('EXISTS',day,flush=True);continue
 if not source.exists():print('MISSING_SOURCE',day,flush=True);continue
 raw=source.read_bytes();c=json.loads(raw);jobs=[];paths=[];templates={}
 def walk(v,path=()):
  if isinstance(v,dict):
   for k,x in v.items():
    if k not in SKIP:walk(x,path+(k,))
  elif isinstance(v,list):
   for i,x in enumerate(v):walk(x,path+(i,))
  elif isinstance(v,str):
   if path[-1]=='dayOfWeek':return
   parts=pieces(v);templates[path]=parts
   for i,(active,t) in enumerate(parts):
    if active:jobs.append(t);paths.append((path,i))
 walk(c)
 translated={};start=time.time()
 for pos in range(0,len(jobs),a.batch):
  batch=jobs[pos:pos+a.batch];inputs=[['eng_Latn']+sp.encode(t,out_type=str)+['</s>'] for t in batch]
  results=translator.translate_batch(inputs,target_prefix=[[LANG]]*len(inputs),beam_size=2,max_decoding_length=512,max_input_length=0,repetition_penalty=1.05)
  for i,r in enumerate(results):
   tokens=r.hypotheses[0]
   if tokens and tokens[0]==LANG:tokens=tokens[1:]
   if len(tokens)>=511:raise RuntimeError('Decoding limit hit; source not silently truncated')
   result=unicodedata.normalize('NFC',sp.decode(tokens)).strip()
   if not result:raise RuntimeError('Empty translation')
   translated[paths[pos+i]]=result
  print('PROGRESS',a.language,day,min(pos+a.batch,len(jobs)),len(jobs),'seconds',round(time.time()-start),flush=True)
 for path,parts in templates.items():
  value=''.join(translated[(path,i)] if active else t for i,(active,t) in enumerate(parts))
  target=c
  for p in path[:-1]:target=target[p]
  target[path[-1]]=value
 c['language']=a.language;c['publicationName']='UNLEASH THE SUPERNATURAL'
 if 'dayOfWeek'in c:c['dayOfWeek']=WEEK[a.language][json.loads(raw)['dayOfWeek']]
 c['translation']={'yo':'Ìtumọ̀ àlàyé láti KJV Gẹ̀ẹ́sì','ig':'Nkọwa ntụgharị sitere na KJV Bekee','ha':'Fassarar bayani daga KJV na Turanci'}[a.language]
 c['scriptureNotice']={'yo':'Ọ̀rọ̀ Ìwé Mímọ́ yìí jẹ́ ìtumọ̀ àlàyé láti inú ẹ̀dà Gẹ̀ẹ́sì KJV fún ìwé ìfọkànsìn; kì í ṣe àyọlò láti inú Bíbélì Yorùbá tí a fọwọ́ sí. Ó nílò àyẹ̀wò èdè àti ẹ̀kọ́ Bíbélì kí a tó tẹ̀ ẹ́ jáde.','ig':'Okwu Akwụkwọ Nsọ ndị a bụ nkọwa ntụgharị sitere na KJV Bekee maka akwụkwọ ofufe; ha abụghị okwu e si na Baịbụl Igbo akwadoro depụta. A ka chọrọ nyocha asụsụ na nkuzi tupu ebipụta ya.','ha':'Kalmomin Nassosi a nan fassarar bayani ce daga KJV na Turanci domin littafin ibada; ba ƙaulin wani Littafi Mai Tsarki na Hausa da aka amince da shi ba ne. Ana buƙatar bitar harshe da koyarwa kafin bugawa.'}[a.language]
 c['translationDraft']={'status':'in_progress','machineAssisted':True,'languageReviewRequired':True,'theologicalReviewRequired':True,'sourceSha256':hashlib.sha256(raw).hexdigest(),'model':'facebook/nllb-200-distilled-600M (CTranslate2 int8 conversion)','modelRevision':'302d78f00e6fdb50a1064059df7c392b735e9d05','license':'CC-BY-NC-4.0','sourceSegments':len(jobs),'translatedSegments':len(translated)}
 assert len(jobs)==len(translated)
 dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n');temp.replace(dest)
 print('SAVED',a.language,day,'message_words',len(c['message'].split()),'seconds',round(time.time()-start),flush=True)
