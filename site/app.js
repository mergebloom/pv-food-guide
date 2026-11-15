const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
const link=(url,text)=>{const a=el('a','',text);if(url&&/^https:\/\//.test(url))a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const cards=[...document.querySelectorAll('.card')];
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b===button));let n=0;for(const card of cards){card.hidden=button.dataset.filter!=='All'&&card.dataset.food!==button.dataset.filter&&card.dataset.time!==button.dataset.filter;if(!card.hidden)n++;}document.querySelector('#results').textContent=n+' place'+(n===1?'':'s');for(const h of document.querySelectorAll('.section-heading')){let c=h.nextElementSibling,shown=false;while(c&&!c.classList.contains('section-heading')){if(c.classList.contains('card')&&!c.hidden)shown=true;c=c.nextElementSibling;}h.hidden=!shown;}});
document.querySelector('#print').addEventListener('click',()=>window.print());
window.addEventListener('beforeprint',()=>document.querySelectorAll('.hours').forEach(d=>d.open=true));
async function load(card){const photos=card.querySelector('.photos'),hours=card.querySelector('.live-hours');try{
 const r=await fetch('/api/place/'+card.id,{cache:'no-store'});if(!r.ok)throw Error('listing unavailable');const data=await r.json();
 hours.replaceChildren();const ul=el('ul','week');for(const row of data.hours){let text=row;if(card.id==='tia'&&row.startsWith('Tuesday:'))text='Tuesday: Unconfirmed — listing contains an anomalous overnight opening time.';ul.append(el('li','',text));}if(!data.hours.length)ul.append(el('li','','Monday–Sunday: schedule unavailable; check Google Maps.'));hours.append(ul);
 if(card.id==='tia')hours.append(el('p','warning','Tuesday is uncertain: Google lists 00:30–20:30, unlike the other days. Do not rely on that opening time; check before going. The older 11:00–22:30 article schedule is not treated as current.'));
 const date=new Date(data.checked).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Mexico_City'});
 hours.append(el('p','listing-meta','Listed weekly schedule · Puerto Vallarta local time. Retrieved '+date+'. Not independently confirmed with the business.'));
 hours.append(link(data.maps,'Check listing / special hours ↗'),el('div','google-attribution','Google Maps'));
 for(const attr of data.attributions||[])hours.append(link(attr.uri,attr.provider));
 photos.replaceChildren();
 for(const photo of data.photos){const f=el('figure'),img=el('img','venue-photo');img.alt='Venue photograph from the '+card.querySelector('h2').textContent+' Google Maps listing';img.src=photo.src;img.decoding='async';img.addEventListener('error',()=>{img.replaceWith(el('div','unavailable','Photo unavailable — open the real venue gallery below.'));});f.append(img);const caption=el('figcaption');caption.append(el('div','google-attribution','Google Maps'));
 for(const author of photo.authors){const a=link(author.uri,'');a.className='author';if(author.photoUri){const avatar=el('img','avatar');avatar.src=author.photoUri;avatar.alt='';a.append(avatar);}a.append(document.createTextNode('Photo: '+author.displayName));caption.append(a);}if(photo.source)caption.append(link(photo.source,'View source photo ↗'));else caption.append(link(data.maps,'Venue photo gallery ↗'));f.append(caption);photos.append(f);}
 if(!data.photos.length)photos.append(el('div','unavailable','No embeddable venue photos available. Open the real source gallery below.'));
 card.dataset.loaded='true';
 }catch{hours.replaceChildren(el('p','','Live weekly hours unavailable. Please use the Google Maps gallery link to check the current schedule.'));photos.replaceChildren(el('div','unavailable','Venue photos unavailable. No substitute images used. Open the real source gallery below.'));card.dataset.loaded='unavailable';}}
Promise.all(cards.map(load));
