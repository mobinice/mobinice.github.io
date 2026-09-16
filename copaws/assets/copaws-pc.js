/* Desktop presentation reuses the mobile prototype's domain actions and pickers. */
let pcRole = 'owner';
let pcCarouselPage = 0;
let pcCarouselPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pcCarouselHover = false;
const pcHeader = document.createElement('header');
pcHeader.className = 'pc-header';
pcHeader.innerHTML = '<a class="pc-brand" href="pc.html"><img src="assets/copaws-a-plan-icon.png" alt="">Copaws</a><nav class="pc-nav" aria-label="主導航"></nav><button class="pc-menu-trigger" aria-label="帳號選單" aria-expanded="false">☰</button>';
document.body.append(pcHeader);
const pcAccount = document.createElement('aside');
pcAccount.className = 'pc-account'; pcAccount.hidden = true;
document.body.append(pcAccount);
const pcLabel = document.createElement('div'); pcLabel.className='pc-demo-label'; pcLabel.textContent='互動原型 · 示意資料'; document.body.append(pcLabel);
const pcDialog = document.createElement('dialog'); pcDialog.className='pc-dialog'; document.body.append(pcDialog);
function pcPrompt(title, content, action, label='確認') {
  pcDialog.innerHTML=`<h2>${title}</h2>${content}<p class="pc-error" role="alert"></p><footer><button class="btn light" data-dismiss>取消</button><button class="btn" data-confirm>${label}</button></footer>`;
  pcDialog.querySelector('[data-dismiss]').onclick=()=>pcDialog.close();
  pcDialog.querySelector('[data-confirm]').onclick=()=>action(); pcDialog.showModal();
}
function pcPassword(){pcPrompt('變更密碼','<p>此為介面示範，不會修改真實帳號密碼。請勿輸入真實密碼。</p><label>新密碼<input type="password" id="pcPass" autocomplete="new-password"></label><label>確認新密碼<input type="password" id="pcPassAgain" autocomplete="new-password"></label>',()=>{const a=document.getElementById('pcPass').value,b=document.getElementById('pcPassAgain').value;if(a.length<8||a!==b){pcDialog.querySelector('.pc-error').textContent='請輸入至少 8 碼且相同的密碼';return;}pcDialog.close();toast('示範：密碼變更完成');});}
function pcUpdateHeader(){
  if(currentScreen.startsWith('sitter')) pcRole='sitter';
  else if(!['login','otp','register','globalError','globalEmpty'].includes(currentScreen)) pcRole='owner';
  const sitter=pcRole==='sitter';
  const links=sitter?[['sitterMatch','快速接案'],['sitterMap','地圖'],['sitterCases','我的案件'],['sitterProfile','個人中心']]:[['match','探索保母'],['map','地圖'],['bookings','我的預約'],['profile','個人中心']];
  const active=(sitter?sitterTabByScreen:tabByScreen)[currentScreen]||currentScreen;
  pcHeader.querySelector('nav').innerHTML=links.map(([id,label])=>`<button data-pc-go="${id}" ${id===active?'aria-current="page"':''}>${label}</button>`).join('');
  pcHeader.querySelectorAll('[data-pc-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.pcGo));
  pcAccount.innerHTML=`<strong><span class="avatar"></span>${sitter?'Mina Chen':'小安'}</strong><button data-switch>切換${sitter?'飼主':'保母'}模式</button><button data-profile>查看個人資料</button><button data-password>變更密碼</button><button data-logout>登出</button>`;
  pcAccount.querySelector('[data-switch]').onclick=()=>{pcRole=sitter?'owner':'sitter';pcCloseMenu();navigate(sitter?'match':'sitterMatch');};
  pcAccount.querySelector('[data-profile]').onclick=()=>{pcCloseMenu();navigate(sitter?'sitterProfile':'profile');};
  pcAccount.querySelector('[data-password]').onclick=()=>{pcCloseMenu();pcPassword();};
  pcAccount.querySelector('[data-logout]').onclick=()=>{pcCloseMenu();pcPrompt('登出？','<p>即將離開目前的示範帳號。</p>',()=>{pcDialog.close();navigate('login');},'登出');};
}
function pcCloseMenu(){pcAccount.hidden=true;pcHeader.querySelector('.pc-menu-trigger').setAttribute('aria-expanded','false');}
pcHeader.querySelector('.pc-menu-trigger').onclick=()=>{pcAccount.hidden=!pcAccount.hidden;pcHeader.querySelector('.pc-menu-trigger').setAttribute('aria-expanded',String(!pcAccount.hidden));};
document.addEventListener('pointerdown',e=>{if(!pcAccount.contains(e.target)&&!e.target.closest('.pc-menu-trigger'))pcCloseMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')pcCloseMenu();});
const pcOriginalGo=go;
go=function(id){pcOriginalGo(id);pcUpdateHeader();if(id==='match')pcRenderCarousel();if(id==='sitterAvailability')renderSitterAvailabilitySlots();pcSyncPhotos();};
const pcMatch=document.getElementById('match');
pcMatch.querySelector('h1').textContent='找到適合你們的照護夥伴';
pcMatch.querySelector('.subtitle').textContent='讓每一次託付，都從彼此了解開始。';
pcMatch.querySelector('.favorite-entry').innerHTML='我的收藏<span id="favoriteCount" hidden></span>';
pcMatch.querySelector('.favorite-entry').classList.add('pc-favorite');
const pcFilterSummary=document.createElement('div');pcFilterSummary.className='pc-filter-summary';
pcFilterSummary.innerHTML='<strong>台北市 · 大安區</strong><span>到府照護 · 貓咪與狗狗</span><button type="button">篩選</button>';
pcFilterSummary.querySelector('button').onclick=()=>openSharedFilter('match');pcMatch.append(pcFilterSummary);
const pcCarousel=document.createElement('div');pcCarousel.className='pc-carousel';pcCarousel.setAttribute('aria-label','附近保母輪播');
const pcHeading=document.createElement('h2');pcHeading.textContent='附近的保母';pcMatch.append(pcHeading,pcCarousel);
const pcControls=document.createElement('div');pcControls.className='pc-carousel-controls';
pcControls.innerHTML='<button aria-label="上一組">‹</button><button aria-label="暫停輪播">Ⅱ</button><button aria-label="下一組">›</button>';
pcMatch.append(pcControls);
function pcRenderCarousel(){
 const filter=sharedFilterState.match;
 pcFilterSummary.querySelector('strong').textContent=[filter.city,filter.district].filter(Boolean).join(' · ')||'全部地區';
 const list=getFilteredCaregivers().filter(p=>filter.pet!=='other'&&(!filter.city||filter.city==='台北市')&&(!filter.district||filter.district==='大安區'));
 if(!list.length){pcCarousel.innerHTML='<p>目前沒有符合條件的保母，請調整篩選。</p>';return;}
 pcCarouselPage=(pcCarouselPage+list.length)%list.length;
 pcCarousel.innerHTML=Array.from({length:Math.min(2,list.length)},(_,offset)=>{const item=list[(pcCarouselPage+offset)%list.length];const index=typeof item==='number'?item:caregivers.indexOf(item);const p=caregivers[index]||item;const i=index<0?0:index;return `<article class="pc-person-card">${i<2?`<img src="assets/copaws-pc-${i===0?'mina':'yuna'}.png" alt="${escapeHtml(p.name)} 示意照片">`:`<div class="pc-avatar" aria-label="預設頭像">${escapeHtml(p.name.slice(0,1))}</div>`}<div class="pc-person-copy"><h2>${escapeHtml(p.name)}${certBadgeHtml(p.certification,true)}</h2><p>★ ${escapeHtml(p.rating)}</p><strong>${escapeHtml(p.distance)}</strong><p class="pc-intro">${escapeHtml(p.intro)}</p><p>近期時段<br>${escapeHtml(p.nearest)}</p><button class="btn light" data-pc-fav="${i}" aria-label="收藏 ${escapeHtml(p.name)}">${favoriteIndexes.has(i)?'已收藏':'♡'}</button></div><footer class="pc-person-actions"><button data-pc-detail="${i}">查看詳情</button><button class="primary" data-pc-time="${i}">選擇時段</button></footer></article>`;}).join('');
 pcCarousel.querySelectorAll('[data-pc-detail],[data-pc-time]').forEach(b=>b.onclick=()=>{caregiverIndex=selectedCaregiverIndex=Number(b.dataset.pcDetail??b.dataset.pcTime);renderCaregiver();navigate(b.hasAttribute('data-pc-time')?'time':'detail');});
 pcCarousel.querySelectorAll('[data-pc-fav]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.pcFav);favoriteIndexes.has(index)?removeFavorite(index):markFavorite(index);pcRenderCarousel();});
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)pcCarousel.animate([{opacity:.6,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:300});
 pcControls.children[1].textContent=pcCarouselPaused?'▶':'Ⅱ';pcControls.children[1].setAttribute('aria-label',pcCarouselPaused?'播放輪播':'暫停輪播');
}
pcControls.children[0].onclick=()=>{pcCarouselPage-=2;pcRenderCarousel();};
pcControls.children[2].onclick=()=>{pcCarouselPage+=2;pcRenderCarousel();};
pcControls.children[1].onclick=()=>{pcCarouselPaused=!pcCarouselPaused;pcRenderCarousel();};
pcCarousel.onpointerenter=()=>pcCarouselHover=true;pcCarousel.onpointerleave=()=>pcCarouselHover=false;
setInterval(()=>{if(currentScreen==='match'&&!pcCarouselPaused&&!pcCarouselHover&&!pcCarousel.contains(document.activeElement)&&!document.hidden&&!document.querySelector('.modal-layer.show')&&pcAccount.hidden&&!pcDialog.open){pcCarouselPage+=2;pcRenderCarousel();}},5000);
const pcFilterOriginal=applySharedFilter;applySharedFilter=function(){pcFilterOriginal();if(currentScreen==='match'){pcCarouselPage=0;pcRenderCarousel();}};
function pcSplitScreen(id,startSelector,splitSelector){const screen=document.getElementById(id),start=screen.querySelector(startSelector),split=screen.querySelector(splitSelector);if(!start||!split)return;const row=document.createElement('div');row.className='pc-split';const left=document.createElement('div'),right=document.createElement('div');left.className='pc-column';right.className='pc-column';let node=start,isRight=false;screen.insertBefore(row,start);row.append(left,right);while(node){const next=node.nextElementSibling;if(node===split)isRight=true;(isRight?right:left).append(node);node=next;}}
pcSplitScreen('quickDemand','.quick-demand-calendar','.quick-section-title:nth-of-type(2)');
pcSplitScreen('sitterAvailability','.sitter-availability-summary','.sitter-availability-section-title');
pcSplitScreen('time','.caregiver-mini','#slotTitle');
function pcSyncPhotos(){const index=selectedCaregiverIndex;const hero=document.querySelector('#detail .detail-hero');hero.classList.toggle('pc-real-photo',index<2);hero.style.backgroundImage=index<2?`url(assets/copaws-pc-${index===0?'mina':'yuna'}.png)`:'';}
renderSitterAvailabilityCalendar=function(){
 const config=currentSitterScheduleMonth(),grid=document.getElementById('sitterAvailabilityDays'),monthData=sitterAvailabilityByMonth[sitterScheduleMonthKey()]||{},days=new Date(config.year,config.month,0).getDate(),first=new Date(config.year,config.month-1,1).getDay();
 grid.innerHTML=Array.from({length:first},()=>'<span aria-hidden="true"></span>').join('')+Array.from({length:days},(_,i)=>{const day=String(i+1);return `<button class="day ${monthData[day]?.length?'available':''} ${day===sitterAvailabilitySelectedDay?'active':''}" data-sitter-availability-day="${day}" aria-pressed="${day===sitterAvailabilitySelectedDay}">${day}</button>`;}).join('');
 document.getElementById('sitterAvailabilityMonthLabel').textContent=`${config.year} ${chineseMonth(config.month)}`;
 document.getElementById('sitterAvailabilityDayCount').textContent=Object.values(monthData).filter(s=>s.length).length+' 天';
 document.querySelector('[data-add-sitter-availability]').disabled=quickTimeToMinutes(sitterAvailabilityEndTime)<=quickTimeToMinutes(sitterAvailabilityStartTime);
};
sitterAvailabilityStartTime='00:00';sitterAvailabilityEndTime='00:00';renderSitterAvailabilitySlots();
const pcDemandSubmit=document.querySelector('#demand>button[data-go="bookings"]');
pcDemandSubmit.removeAttribute('data-go');pcDemandSubmit.removeAttribute('onclick');
pcDemandSubmit.onclick=()=>{const fee=Number(document.getElementById('careFee').value);if(!Number.isFinite(fee)||fee<=0){toast('請輸入有效照護費');return;}const p=caregivers[selectedCaregiverIndex];pcPrompt('預約確認與付款',`<p>${escapeHtml(p.name)} · ${escapeHtml(selectedSlot)}</p><div class="money-row"><span>照護費</span><strong>NT$ ${fee}</strong></div><div class="money-row"><span>平台費 15%（示例）</span><strong>NT$ ${Math.round(fee*.15)}</strong></div><div class="money-row total"><span>付款總額</span><strong>NT$ ${fee+Math.round(fee*.15)}</strong></div><p>此為付款流程示範，不會實際扣款。</p>`,()=>{pcDialog.close();navigate('bookings');toast('示範需求已送出，等待確認');},'確認示範付款');};
pcUpdateHeader();pcRenderCarousel();
if(!new URLSearchParams(location.search).has('screen'))go('match');
