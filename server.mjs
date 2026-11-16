import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHmac,randomBytes} from 'node:crypto';
const catalog=JSON.parse(await readFile(new URL('./catalog.json',import.meta.url)));
const places=Object.fromEntries(catalog.venues.map(v=>[v.slug,v.placeID]));
if(catalog.venues.length!==16||Object.keys(places).length!==16)throw Error('Invalid venue inventory');
const secret=randomBytes(32),key=process.env.GOOGLE_PLACES_API_KEY;
const sign=s=>createHmac('sha256',secret).update(s).digest('base64url');
let day='',used=0; const limits=new Map();
async function google(path,fields){const r=await fetch('https://places.googleapis.com/v1/'+path,{headers:{'X-Goog-Api-Key':key,...(fields?{'X-Goog-FieldMask':fields}:{})},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('upstream');return r;}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://*.googleusercontent.com https://*.ggpht.com; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
 try{
 if(u.pathname.startsWith('/api/')){
  res.setHeader('Cache-Control','no-store');
  const ip=req.socket.remoteAddress,now=Date.now();let l=limits.get(ip);if(!l||now-l.t>600000){l={t:now,n:0};limits.set(ip,l);}if(++l.n>600){res.writeHead(429);return res.end('Please try later');}
  if(limits.size>10000)limits.clear();
  if(u.pathname.startsWith('/api/place/')){
   const slug=u.pathname.split('/').pop();if(!places[slug]){res.writeHead(404);return res.end();}
   const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;used=0;}if(++used>1500)throw Error('daily budget');
   const p=await(await google('places/'+places[slug]+'?languageCode=en','formattedAddress,regularOpeningHours,googleMapsUri,photos,attributions,businessStatus,movedPlaceId')).json();
   const photos=(p.photos||[]).slice(0,2).map(p=>{const payload=Buffer.from(JSON.stringify({name:p.name,exp:Date.now()+600000})).toString('base64url');return {src:'/api/photo?token='+payload+'.'+sign(payload),authors:p.authorAttributions||[],source:p.googleMapsUri||null};});
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({address:p.formattedAddress,hours:p.regularOpeningHours?.weekdayDescriptions||[],maps:p.googleMapsUri,businessStatus:p.businessStatus||'UNKNOWN',movedPlaceId:p.movedPlaceId||null,photos,attributions:p.attributions||[],checked:new Date().toISOString()}));
  }
  if(u.pathname==='/api/photo'){
   const [p,s]=String(u.searchParams.get('token')).split('.');if(!p||s!==sign(p))throw Error('token');const t=JSON.parse(Buffer.from(p,'base64url'));if(t.exp<Date.now()||!Object.values(places).some(id=>t.name.startsWith('places/'+id+'/photos/')))throw Error('expired');
   const r=await google(t.name+'/media?maxWidthPx=1000');res.setHeader('Content-Type',r.headers.get('content-type'));return res.end(Buffer.from(await r.arrayBuffer()));
  }
  res.writeHead(404);return res.end();
 }
 const files={'/':'index.html','/style.css':'style.css','/app.js':'app.js','/favicon.svg':'favicon.svg','/health':'health'};
 if(u.pathname==='/health'){res.setHeader('Content-Type','text/plain');return res.end('ok');}
 if(!files[u.pathname]){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(await readFile(new URL('./site/'+files[u.pathname],import.meta.url)));
 }catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Live listing unavailable. Please use the Google Maps gallery and hours link.'}));}
});
server.listen(8080,'0.0.0.0');

