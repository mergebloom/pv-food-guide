const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
const link=(url,text)=>{const a=el('a','',text);if(url&&/^https:\/\//.test(url))a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const cards=[...document.querySelectorAll('.card')];
const neighborhood=document.querySelector('#neighborhood'),jump=document.querySelector('#jump');let active='All';
function applyFilters(){
 let n=0,closed=0;jump.replaceChildren(new Option('Choose a restaurant…',''));
 for(const card of cards){const foodMatch=active==='All'||card.dataset.food===active||card.dataset.time.split('|').includes(active);const areaMatch=neighborhood.value==='All'||card.dataset.neighborhood===neighborhood.value;card.hidden=!(foodMatch&&areaMatch);if(!card.hidden){n++;if(card.classList.contains('is-closed'))closed++;jump.add(new Option(card.querySelector('h2').textContent+(card.classList.contains('is-closed')?' · listed closed':''),card.id));}}
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter===active));
 document.querySelector('#results').textContent=`${n} of ${cards.length} entries${closed?' · '+closed+' listed closed':''}`;
 document.querySelector('#empty').hidden=n!==0;
 for(const h of document.querySelectorAll('.section-heading')){let c=h.nextElementSibling,shown=false;while(c&&!c.classList.contains('section-heading')){if(c.classList.contains('card')&&!c.hidden)shown=true;c=c.nextElementSibling;}h.hidden=!shown;}
}
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{active=b.dataset.filter;applyFilters();});
neighborhood.addEventListener('change',applyFilters);document.querySelector('#reset').addEventListener('click',()=>{active='All';neighborhood.value='All';applyFilters();});
jump.addEventListener('change',()=>{const c=document.getElementById(jump.value);if(c&&!c.hidden){c.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});c.querySelector('h2').setAttribute('tabindex','-1');c.querySelector('h2').focus({preventScroll:true});}});
applyFilters();
document.querySelector('#print').addEventListener('click',()=>window.print());
window.addEventListener('beforeprint',()=>document.querySelectorAll('.hours,.sources,.branch-note,footer .method').forEach(d=>d.open=true));
async function load(card){const photos=card.querySelector('.photos'),hours=card.querySelector('.live-hours');try{
 const r=await fetch('/api/place/'+card.id,{cache:'no-store'});if(!r.ok)throw Error('listing unavailable');const data=await r.json();
 card.dataset.businessStatus=data.businessStatus;
 const closed=data.businessStatus==='CLOSED_PERMANENTLY'||data.businessStatus==='CLOSED_TEMPORARILY';const historical=closed||card.dataset.researchStatus==='CLOSED_PERMANENTLY';
 if(closed){card.classList.add('is-closed');if(!card.querySelector('.closure'))card.querySelector('.card-top').after(el('p','warning closure',data.businessStatus==='CLOSED_PERMANENTLY'?'Listed permanently closed — do not plan a visit.':'Listed temporarily closed — check before planning a visit.'));card.querySelector('.order .eyebrow').textContent='HISTORICAL SIGNATURE · NOT A CURRENT MENU';card.querySelector('.directions').textContent='Locate historical address ↗';}
 hours.replaceChildren();
 if(historical){hours.append(el('p','closed-hours warning',closed?'No current operating schedule: this listing is '+(data.businessStatus==='CLOSED_PERMANENTLY'?'permanently':'temporarily')+' closed. Historical article hours are not displayed.':'Research found this location permanently closed; the refreshed status differs. Reopening is unconfirmed — verify before visiting.'));}
 else {const ul=el('ul','week');for(const row of data.hours){let text=row;if(card.id==='tia'&&row.startsWith('Tuesday:'))text='Tuesday: Unconfirmed — listing contains an anomalous overnight opening time.';ul.append(el('li','',text));}if(!data.hours.length)ul.append(el('li','','Monday–Sunday: schedule unavailable; check Google Maps.'));hours.append(ul);}
 if(card.id==='tia')hours.append(el('p','warning','Tuesday is uncertain: Google lists 00:30–20:30, unlike the other days. Do not rely on that opening time; check before going. The older 11:00–22:30 article schedule is not treated as current.'));
 if(data.movedPlaceId)hours.append(el('p','warning','This listing reports a move. The guide has not silently switched branches; verify the replacement via the source listing.'));
 const date=new Date(data.checked).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Mexico_City'});
 hours.append(el('p','listing-meta','Listing checked '+date+' · Puerto Vallarta local time. Status/hours are not independently confirmed with the business.'));
 hours.append(link(data.maps,'Check listing / special hours ↗'),el('div','google-attribution','Google Maps'));
 for(const attr of data.attributions||[])hours.append(link(attr.uri,attr.provider));
 photos.replaceChildren();
 for(const photo of data.photos){const f=el('figure'),img=el('img','venue-photo');img.alt=(historical?'Historical venue photograph':'Venue photograph')+' from the '+card.querySelector('h2').textContent+' Google Maps listing';img.src=photo.src;img.decoding='async';img.addEventListener('error',()=>{img.replaceWith(el('div','unavailable','Photo unavailable — open the real venue gallery below.'));});f.append(img);const caption=el('figcaption');if(historical)caption.append(el('div','','Historical venue photo · not proof of current operation'));caption.append(el('div','google-attribution','Google Maps'));
 for(const author of photo.authors){const a=link(author.uri,'');a.className='author';if(author.photoUri){const avatar=el('img','avatar');avatar.src=author.photoUri;avatar.alt='';a.append(avatar);}a.append(document.createTextNode('Photo: '+author.displayName));caption.append(a);}if(photo.source)caption.append(link(photo.source,'View source photo ↗'));else caption.append(link(data.maps,'Venue photo gallery ↗'));f.append(caption);photos.append(f);}
 if(!data.photos.length)photos.append(el('div','unavailable','No embeddable venue photos available. Open the real source gallery below.'));
 card.dataset.loaded='true';applyFilters();
 }catch{hours.replaceChildren(el('p','','Live weekly hours/status unavailable. Please use the Google Maps gallery link to check the listing.'));photos.replaceChildren(el('div','unavailable','Venue photos unavailable. No substitute images used. Open the real source gallery below.'));card.dataset.loaded='unavailable';}}
async function worker(queue){while(queue.length)await load(queue.shift());}
const queue=[...cards];Promise.all(Array.from({length:3},()=>worker(queue)));
