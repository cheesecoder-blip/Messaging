const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DIR=process.env.DATA_DIR||path.join(__dirname,'data'),UP=path.join(DIR,'uploads'),F=path.join(DIR,'db.json');
fs.mkdirSync(UP,{recursive:true});
// Private login list: lowercase last name -> name id. Never sent to the browser.
const USERS={antig:'00552',cael:'00132',gorra:'00241',hilomen:'01073',ihalas:'00511',jamero:'00880',jaspe:'00621',jemlani:'01034',laab:'00054',labaco:'00618',lumod:'00658',magdaraog:'00169',mendoza:'00699',sabanal:'00845',sambaan:'00619',suico:null,sumihay:'00917',tagun:'01070',
abdulnaser:'00011',caayupan:'00168',cahilog:'01032',caingin:'00806',callo:'00738',cayasan:'00773',celestian:'00052',co:'00509',dumanon:'00129',duterte:'00093',ebonia:'00656',endab:'01072',englis:'00279',fullido:'00009',go:'00994',joring:'00737',luzon:'00240',madelo:'00551',marangga:'00239',matalum:'00918',navaja:'00203'};
const TYPES=['questionnaire','guess','scramble','riddle','tap','math'];
let db={messages:[],events:[],stickers:[],files:{},sessions:{},seq:0};
try{db={...db,...JSON.parse(fs.readFileSync(F,'utf8'))}}catch{}
let tm;const save=()=>{clearTimeout(tm);tm=setTimeout(()=>fs.writeFileSync(F,JSON.stringify(db)),200)};
const fails={},id12=()=>crypto.randomBytes(8).toString('hex'),norm=s=>String(s??'').trim().toLowerCase();
const bad=(m,c=400)=>{throw Object.assign(new Error(m),{code:c})};
const scr=(a,seed)=>{a=a.split('|')[0];const h=s=>crypto.createHash('md5').update(s).digest()[0];let r=[...a].map((c,i)=>[c,h(c+i+seed)]).sort((x,y)=>x[1]-y[1]).map(x=>x[0]).join('');if(r===a&&a.length>1)r=[...a].reverse().join('');return r};
const pub=(e,u)=>{const c=JSON.parse(JSON.stringify(e.config));if(c.items)c.items=c.items.map(i=>{const o={type:i.type,q:i.q,options:i.options,points:i.points};if(e.type==='scramble')o.shown=scr(i.answer,e.id);return o});delete c.secret;
const board=Object.entries(e.results).map(([user,r])=>({user,...r})).sort((a,b)=>e.type==='guess'?a.score-b.score:b.score-a.score);
return{id:e.id,type:e.type,title:e.title,desc:e.desc,creator:e.creator,count:e.joined.length,joined:e.joined.includes(u),config:c,board,mine:e.results[u]||null}};
const clean=(type,c)=>{if(!TYPES.includes(type))bad('Unknown event type.');c=c||{};
if(['questionnaire','scramble','riddle'].includes(type)){if(!Array.isArray(c.items)||!c.items.length)bad('Add at least one item.');
return{items:c.items.map((i,n)=>{const t=type==='questionnaire'?i.type:'id',o={type:t,q:String(i.q||'').slice(0,2000),points:Math.max(0,+i.points||0)};
if(type!=='scramble'&&!o.q.trim())bad(`Item ${n+1} needs text.`);
if(t==='mc'){o.options=(i.options||[]).map(x=>String(x).trim());if(o.options.length<2||o.options.some(x=>!x))bad(`Item ${n+1}: fill in at least two options and remove empty lines.`);o.answer=+i.answer;if(!(o.answer>=0&&o.answer<o.options.length))bad(`Item ${n+1}: correct option number is out of range.`)}
else if(t==='tf')o.answer=i.answer==='false'?'false':'true';
else{o.answer=String(i.answer||'').trim();if(!o.answer)bad(`Item ${n+1} needs an answer.`)}return o})}}
if(type==='guess'){const mn=Math.floor(+c.min),mx=Math.floor(+c.max),s=Math.floor(+c.secret);if(!(mn<mx&&s>=mn&&s<=mx))bad('Secret must be between min and max.');return{min:mn,max:mx,secret:s}}
const s=Math.min(120,Math.max(5,Math.floor(+c.seconds)||10));return type==='tap'?{seconds:s}:{seconds:s,max:Math.min(1000,Math.max(5,Math.floor(+c.max)||12))}};
const better=(e,u,r)=>{const o=e.results[u];if(!o||r.score>o.score)e.results[u]=r};
http.createServer(async(req,res)=>{try{
const url=new URL(req.url,'http://x'),P=url.pathname,M=req.method;
const user=db.sessions[(/(?:^|; )t=([a-f0-9]+)/.exec(req.headers.cookie||'')||[])[1]];
const J=(c,o,h={})=>{res.writeHead(c,{'content-type':'application/json',...h});res.end(JSON.stringify(o))},E=(c,m)=>J(c,{error:m});
const body=async(max=5e6)=>{const c=[];let n=0;for await(const d of req){n+=d.length;if(n>max)bad('File too large.',413);c.push(d)}return Buffer.concat(c)};
const jb=async()=>{try{return JSON.parse((await body()).toString()||'{}')}catch(e){if(e.code)throw e;bad('Bad request.')}};
if(!P.startsWith('/api/')&&!P.startsWith('/f/')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});return res.end(fs.readFileSync(path.join(__dirname,'public','index.html')))}
if(P==='/api/login'&&M==='POST'){const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0],a=fails[ip]||{n:0,t:0};if(Date.now()-a.t>6e5)a.n=0;if(a.n>=10)return E(429,'Too many tries. Wait a few minutes.');
const b=await jb(),k=norm(b.last),id=String(b.id||'').trim();const ok=Object.hasOwn(USERS,k)&&(USERS[k]===null?id==='':USERS[k]===id);
if(!ok){fails[ip]={n:a.n+1,t:Date.now()};return E(401,'Wrong last name or name identification.')}
const tok=crypto.randomBytes(24).toString('hex'),name=k[0].toUpperCase()+k.slice(1);db.sessions[tok]=name;save();
return J(200,{user:name},{'set-cookie':`t=${tok}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`})}
if(!user)return E(401,'Please log in.');
if(P==='/api/me')return J(200,{user});
if(P==='/api/logout'&&M==='POST'){delete db.sessions[/t=([a-f0-9]+)/.exec(req.headers.cookie)[1]];save();return J(200,{})}
if(P==='/api/upload'&&M==='POST'){const b=await body(25e6);if(!b.length)bad('Empty file.');const id=crypto.randomBytes(12).toString('hex');fs.writeFileSync(path.join(UP,id),b);
const name=decodeURIComponent(req.headers['x-name']||'file').slice(0,120),type=String(req.headers['content-type']||'application/octet-stream').split(';')[0];db.files[id]={name,type};save();return J(200,{url:'/f/'+id,name,type})}
if(P.startsWith('/f/')){const id=P.slice(3),f=db.files[id];if(!f)return E(404,'Not found');const p=path.join(UP,id),st=fs.statSync(p),inline=/^(image\/(png|jpeg|gif|webp)|audio\/|video\/)/.test(f.type);
const h={'content-type':f.type,'x-content-type-options':'nosniff','cache-control':'private, max-age=86400','accept-ranges':'bytes'};if(!inline)h['content-disposition']="attachment; filename*=UTF-8''"+encodeURIComponent(f.name);
const r=/bytes=(\d*)-(\d*)/.exec(req.headers.range||'');if(r){const s=+r[1]||0,e=r[2]?+r[2]:st.size-1;res.writeHead(206,{...h,'content-range':`bytes ${s}-${e}/${st.size}`,'content-length':e-s+1});return fs.createReadStream(p,{start:s,end:e}).pipe(res)}
res.writeHead(200,{...h,'content-length':st.size});return fs.createReadStream(p).pipe(res)}
if(P==='/api/messages'){if(M==='GET'){const a=+url.searchParams.get('after')||0;const l=db.messages.filter(m=>m.id>a);return J(200,a?l:l.slice(-200))}
const b=await jb(),k=b.kind||'text';if(!['text','image','audio','file','sticker'].includes(k))bad('Bad message.');const m={id:++db.seq,user,t:Date.now(),kind:k};
if(k==='text'){m.text=String(b.text||'').trim().slice(0,4000);if(!m.text)bad('Empty message.')}else{const f=db.files[String(b.url||'').slice(3)];if(!f)bad('File not found.');m.url=b.url;m.name=f.name}
db.messages.push(m);save();return J(200,m)}
if(P==='/api/stickers'){if(M==='GET')return J(200,db.stickers);const b=await jb();if(!db.files[String(b.url||'').slice(3)])bad('File not found.');db.stickers.push({url:b.url,by:user});save();return J(200,{})}
const p=P.split('/');
if(p[2]==='events'){
if(!p[3]){if(M==='GET')return J(200,db.events.map(e=>({id:e.id,type:e.type,title:e.title,creator:e.creator,count:e.joined.length})).reverse());
const b=await jb(),title=String(b.title||'').trim().slice(0,120);if(!title)bad('Give the event a title.');const e={id:id12(),type:b.type,title,desc:String(b.desc||'').slice(0,1000),creator:user,config:clean(b.type,b.config),joined:[user],results:{},state:{}};db.events.push(e);save();return J(200,{id:e.id})}
const e=db.events.find(x=>x.id===p[3]);if(!e)return E(404,'Event not found.');
if(!p[4]&&M==='GET')return J(200,pub(e,user));
if(p[4]==='full'&&M==='GET')return J(200,{id:e.id,title:e.title,desc:e.desc,config:e.config});
if(!p[4]&&M==='PUT'){const b=await jb(),title=String(b.title||'').trim().slice(0,120);if(!title)bad('Give the event a title.');e.config=clean(e.type,b.config);e.title=title;e.desc=String(b.desc||'').slice(0,1000);save();return J(200,{id:e.id})}
if(p[4]==='join'&&M==='POST'){if(!e.joined.includes(user))e.joined.push(user);save();return J(200,{})}
if(!e.joined.includes(user))bad('Join the event first.',403);
if(p[4]==='submit'&&M==='POST'){const b=await jb();
if(e.config.items){if(e.type==='questionnaire'&&e.results[user])bad('You already submitted.');const a=Array.isArray(b.answers)?b.answers:[];let s=0,mx=0;
e.config.items.forEach((i,n)=>{mx+=i.points;const x=a[n];const ok=i.type==='mc'?String(x)!==''&&+x===i.answer:i.type==='tf'?String(x)===i.answer:norm(x)!==''&&i.answer.split('|').map(norm).includes(norm(x));if(ok)s+=i.points});
better(e,user,{score:s,label:`${s}/${mx}`})}
else if(e.type==='tap'||e.type==='math'){const cap=e.config.seconds*(e.type==='tap'?14:3);const s=Math.max(0,Math.min(cap,Math.floor(+b.score)||0));better(e,user,{score:s,label:String(s)})}
else bad('Not supported.');save();return J(200,e.results[user])}
if(p[4]==='guess'&&M==='POST'&&e.type==='guess'){if(e.results[user])bad('You already found it.');const n=Math.floor(+(await jb()).n),st=e.state[user]||(e.state[user]={tries:0});if(!Number.isFinite(n))bad('Enter a number.');st.tries++;
if(n===e.config.secret){e.results[user]={score:st.tries,label:st.tries+(st.tries===1?' try':' tries')};save();return J(200,{hint:'correct',tries:st.tries})}save();return J(200,{hint:n<e.config.secret?'higher':'lower',tries:st.tries})}}
E(404,'Not found')}catch(e){try{res.headersSent?res.end():(res.writeHead(e.code>=400&&e.code<600?e.code:500,{'content-type':'application/json'}),res.end(JSON.stringify({error:e.code?e.message:'Server error.'})))}catch{}}
}).listen(process.env.PORT||3000,()=>console.log('Messages running'));
