(() => {
  'use strict';
  const trees = JSON.parse(document.getElementById('pc-design-data').textContent);
  const app = document.getElementById('app');
  const nodeRoutes = Object.fromEntries(Object.entries(trees).map(([key, tree]) => [tree.id, key]));
  window.CopawsImageAssets = {
    bc9c27c06591589608565c65785a0924ee1d4d5b: 'assets/copaws-a-plan-icon.png',
    '4016ec24653a6dd170f0f13a0ee595f084b56ebc': 'assets/copaws-pc-mina.png',
    b69eea3ba333478b2019e24c84cf446492c49aa9: 'assets/copaws-pc-yuna.png'
  };
  const state = { role:'owner', fields:{}, selectedPet:'麻糬', city:'台北市', district:'大安區', carousel:0, paused:false, favorites:new Set(), sitterApproved:true, meeting:{owner:false,sitter:false} };
  let screen = '', currentRoot, stack = [], historyStack = [], carouselTimer, toastTimer;
  const walk = (node, fn) => { fn(node); node.c?.forEach(child => walk(child, fn)); };
  const names = (name, root=currentRoot) => [...root.querySelectorAll('[data-name]')].filter(el => el.dataset.name === name);
  function toast(message) { const box=document.getElementById('announcement'); box.textContent=message; box.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>box.classList.remove('visible'),2600); }
  function clickable(el, action, label) {
    el.classList.add('pc-clickable'); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label',label||el.dataset.name);
    el.onclick=event=>{event.stopPropagation(); if(el.getAttribute('aria-disabled')!=='true')action(event);};
    el.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();el.click();}};
  }
  function bind(name, handler, options={}) { const found=names(name); const targets=options.all?found:found.slice(0,1); targets.forEach((el,index)=>clickable(el,event=>handler(event,el,index),options.label)); return options.all?targets:targets[0]; }
  function fieldValue(name, value) {
    if(value===undefined)return state.fields[`${screen}:${name}`] ?? names(name)[0]?.querySelector('input,textarea')?.value ?? names(name)[0]?.textContent;
    state.fields[`${screen}:${name}`]=value;
    names(name).forEach(el=>{const input=el.querySelector('input,textarea');if(input)input.value=value;else{const text=el.querySelector('.copaws-render-text-content');if(text)text.textContent=value;}});
  }
  function editable(node, el) {
    if(!node.n.endsWith(' field')&&!node.n.startsWith('OTP digit'))return;
    const picker=/生日|出生|年份|月份|日期|時間|寵物資訊|城市|縣市|行政區|地區|身分證正面|身分證反面|良民證/.test(node.n)||node.c?.some(child=>/^[⌄▾▼]$/.test(child.text||''));
    if(picker)return;
    const text=node.c?.find(child=>child.t==='TEXT');
    const input=document.createElement(node.h>64?'textarea':'input');
    input.className='pc-input'+(node.n.startsWith('OTP')?' pc-otp':'');
    if(text){input.style.fontSize=`${text.size||16}px`;input.style.fontWeight=String(text.weight||400);}
    input.setAttribute('aria-label',node.n.replace(' field',''));
    const initial=text?.text||'';
    input.placeholder=/^(請輸入|輸入|再次輸入|留下|填寫|補充)/.test(initial)?initial:'';
    input.value=state.fields[`${screen}:${node.n}`]??(input.placeholder?'':initial);
    if(node.n.startsWith('OTP')){input.maxLength=1;input.inputMode='numeric';}
    else if(/密碼/.test(node.n)) input.type='password';
    else if(/費|金額/.test(node.n)) {input.type='number';input.min='0';}
    else if(/手機/.test(node.n))input.type='tel';
    input.oninput=()=>{state.fields[`${screen}:${node.n}`]=input.value;input.dispatchEvent(new CustomEvent('pc:fieldchange',{bubbles:true,detail:{name:node.n,value:input.value}}));};
    [...el.children].filter(child=>child.dataset.nodeType==='TEXT').forEach(child=>child.style.visibility='hidden');el.append(input);
  }
  function routeAction(node, el) {
    const dest=node.reactions?.flatMap(r=>r.actions||[]).find(action=>action.destinationId)?.destinationId;
    const target=nodeRoutes[dest];
    if(target)clickable(el,()=>{
      const card=el.closest('[data-name="sitter comparison card"]');
      if(card)state.person=card.textContent.includes('Yuna Lin')?'Yuna Lin':'Mina Chen';
      target.startsWith('PG')?open(target):go(target);
    });
  }
  function setup(root, key) {
    currentRoot=root;
    walk(trees[key],node=>{const el=root.querySelector(`[data-node-id="${node.id}"]`);if(!el)return; routeAction(node,el);editable(node,el);});
    walk(trees[key],node=>{if(node.t==='TEXT'&&node.auto==='WIDTH_AND_HEIGHT'&&node.align==='LEFT'){
      const el=root.querySelector(`[data-node-id="${node.id}"]`);if(el)el.style.width='max-content';
    }
      const el=root.querySelector(`[data-node-id="${node.id}"]`);if(!el)return;
      if(/Avatar/.test(node.n)&&node.t==='INSTANCE'){el.style.width=node.w+'px';el.style.height=node.h+'px';}
      if(node.f?.some(p=>p.t==='image')){el.style.aspectRatio=`${node.w}/${node.h}`;el.style.height='auto';}
    });
    if(key.startsWith('BPC'))state.role='sitter';else if(key.startsWith('PC'))state.role='owner';
    const sitter=state.role==='sitter';
    const routes=new Map([['Copaws',sitter?'BPC01':'PC06'],['探索保母','PC06'],['地圖',sitter?'BPC02':'PC07'],['我的預約','PC11'],['個人中心',sitter?'BPC08':'PC15'],['接案','BPC01'],['我的案件','BPC04'],['行程','BPC04'],['快速發需求','PC03'],['自己挑保母','PC06'],['我的收藏','PC21']]);
    for(const node of trees[key].c||[]){
      const target=routes.get(node.n);if(!target)continue;
      const isNavigation=node.y<80||(['PC03','PC06'].includes(key)&&['快速發需求','自己挑保母','我的收藏'].includes(node.n));
      if(isNavigation){const el=root.querySelector(`[data-node-id="${node.id}"]`);if(el)clickable(el,()=>go(target));}
    }
    bind('帳號選單',()=>open(sitter?'PG15-3':'PG15-2'));
    bind('‹',back);bind('×',()=>stack.length?close():back());
    bind('shared filter button',()=>open(key==='PC11'?'PG13':'PG01'));
    bind('篩選',()=>open(key==='PC11'?'PG13':'PG01'));
    setupLinks(key);
    if(key==='PC06')setupCarousel();
    if(window.bindCopawsFlows)window.bindCopawsFlows(api);
    if(window.bindCopawsLists)window.bindCopawsLists(api);
  }
  function setupLinks(key) {
    const mapping={
      PC03:{'＋':'PC04'}, PC08:{'查看可預約時段':'PC09'},
      PC15:{'認證狀態':'PC17','我的毛孩':'PC16','付款與收款':'PC18'},
      PC16:{'＋':'PC23','編輯':'PC23'},
      PC19:{'查看發票':'PC20'}, PC12:{'返回我的預約':'PC11'},
      BPC08:{'編輯寵物保母檔案':'BPC09','可服務時段':'BPC07','認證狀態':'PC17','評價與成長':'BPC11','收入與撥款':'BPC10'},
      BPC03:{'查看飼主資料':'BPC03'}, BPC05:{'新增服務回報':'BPC06','聯絡飼主':'BPC12'},
      PG15:{'查看個人資料':'PC15'},'PG15-2':{'查看個人資料':'PC15'},
      'PG15-1':{'查看個人資料':'BPC08'},'PG15-3':{'查看個人資料':'BPC08'},
      PG14:{'調整篩選':'PG01'},'PG14-1':{'重新載入':'PC03'},'PG16-1':{'查看認證狀態':'PC17'},
    };
    const base=key.replace(/-.*$/,'');
    for(const [name,target] of Object.entries(mapping[key]||mapping[base]||{})){
      bind(name,()=>target.startsWith('PG')?open(target):go(target),{all:true});
      const label=(trees[key].c||[]).find(node=>node.n===name);
      if(label&&['PC15','BPC08'].includes(base)) {
        const arrow=(trees[key].c||[]).find(node=>node.t==='FRAME'&&node.n==='›'&&Math.abs(node.y-label.y)<20&&node.x>label.x);
        if(arrow){const el=currentRoot.querySelector(`[data-node-id="${arrow.id}"]`);if(el)clickable(el,()=>go(target),name);}
      }
    }
    if(key==='PC01')bind('訪客瀏覽操作區',()=>go('PC06'));
    if(/^PC0[567]/.test(key)||key==='PC21'){
      currentRoot.addEventListener('pointerdown',event=>{
        let el=event.target.closest('[data-name]');
        while(el&&el!==currentRoot){
          if(/comparison card|申請保母|favorite row/.test(el.dataset.name||'')){
            const texts=[...el.querySelectorAll('.copaws-render-text-content')].map(t=>t.textContent);
            state.person=texts.find(t=>['Mina Chen','Yuna Lin','小芸','Emma Wu','Nina Lin'].includes(t))||'Mina Chen';break;
          }el=el.parentElement;
        }
      },true);
    }
    if(key==='PC21'){
      const input=names('保母篩選 field')[0]?.querySelector('input')||currentRoot.querySelector('input');
      if(input){input.placeholder='輸入保母名字';if(/輸入/.test(input.value))input.value='';input.oninput=()=>{names('favorite row 0').concat(names('favorite row 1'),names('favorite row 2'),names('favorite row 3')).forEach(row=>row.style.visibility=row.textContent.toLowerCase().includes(input.value.toLowerCase())?'visible':'hidden');};}
      bind('查看時段',()=>go('PC09'),{all:true});
    }
    if(['PC14','BPC12'].includes(key))bind('↻',()=>refreshChat(key),{all:true});
  }
  function refreshChat(key){if(key==='PC14'){go('PC14-1',{replace:true});setTimeout(()=>{if(screen==='PC14-1')go('PC14',{replace:true});},650);}else toast('已更新最新訊息');}
  function draw(key, host, overlay=false) {
    let design=trees[key];
    if(state.person&&state.person!=='Mina Chen'&&/^PC(?:08|09|10|12|13|14)$/.test(key)){
      design=structuredClone(design);
      walk(design,node=>{if(node.text==='Mina Chen')node.text=state.person;if(state.person==='Yuna Lin'){
        if(node.text?.includes('4.9 · 126'))node.text=node.text.replace('4.9 · 126','4.8 · 88');
        node.f?.forEach(p=>{if(p.hash==='4016ec24653a6dd170f0f13a0ee595f084b56ebc')p.hash='b69eea3ba333478b2019e24c84cf446492c49aa9';});
      }});
      if(state.person!=='Yuna Lin') {
        let avatar;walk(trees.PC05,n=>{if(!avatar&&n.n==='PC / Avatar / Canonical UI04')avatar=n;});
        if(avatar)walk(design,node=>{if(!node.f?.some(p=>p.hash==='4016ec24653a6dd170f0f13a0ee595f084b56ebc'))return;
          const clone=structuredClone(avatar),sx=node.w/avatar.w,sy=node.h/avatar.h;
          clone.c?.forEach(child=>walk(child,n=>{n.x*=sx;n.y*=sy;n.w*=sx;n.h*=sy;n.id=node.id+'-'+n.id;}));
          node.t='FRAME';node.f=clone.f;node.c=clone.c;node.r=Math.min(node.w,node.h)*.22;
        });
      }
    }
    const root=window.CopawsRenderer.render(design,host);
    root.dataset.screen=key;root.classList.add('pc-view');
    if(overlay){
      root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',trees[key].n);
      [...root.children].filter(el=>el.classList.contains('copaws-render-paint')).forEach(el=>el.style.visibility='hidden');
      root.style.height='100vh';
      const panel=trees[key].c?.find(node=>node.n==='dialog');
      if(panel){const el=root.querySelector(`[data-node-id="${panel.id}"]`);el.style.top=`max(16px, calc(50vh - ${panel.h/2}px))`;el.style.maxHeight='calc(100vh - 32px)';el.style.overflowY='auto';}
      const mask=root.querySelector('[data-name="彈窗遮罩"]');if(mask){mask.style.height='100vh';mask.onclick=()=>close();}
    }
    setup(root,key);
    if(!key.startsWith('PG')) {
      const header=document.createElement('header');header.className='pc-header';header.setAttribute('aria-label','主要導航');
      for(const node of trees[key].c||[])if(node.y<80&&node.y+node.h<=81){const el=root.querySelector(`[data-node-id="${node.id}"]`);if(el)header.append(el);}
      root.append(header);
    }
    requestAnimationFrame(()=>alignCertifications(root));
    document.fonts.ready.then(()=>{if(root.isConnected)alignCertifications(root);});
    return root;
  }
  function alignCertifications(root) {
    const texts=[...root.querySelectorAll('[data-node-type="TEXT"]')].filter(el=>parseFloat(el.style.fontSize)>=16&&el.textContent.trim().length>0);
    for(const badge of [...root.querySelectorAll('[data-name]')].filter(el=>/platform verification|平台認證 \/|identity verified badge/.test(el.dataset.name))){
      const rect=badge.getBoundingClientRect();
      const candidates=texts.map(el=>{const span=el.querySelector('.copaws-render-text-content'),range=document.createRange();range.selectNodeContents(span||el);return {el,b:range.getBoundingClientRect()};}).filter(({b})=>Math.abs(b.y+b.height/2-rect.y-rect.height/2)<10&&b.left<rect.left&&Math.abs(b.right-rect.left)<45);
      candidates.sort((a,b)=>b.b.left-a.b.left);const label=candidates[0];if(!label)continue;
      const parent=badge.parentElement.getBoundingClientRect();badge.style.left=label.b.right-parent.left+8+'px';badge.style.width=rect.height+'px';
    }
  }
  function go(key, options={}) {
    if(!trees[key]){toast('此畫面尚未載入');return;}
    clearInterval(carouselTimer);
    if(screen&&!options.replace)historyStack.push({screen,scroll:window.scrollY});
    screen=key;stack=[];app.replaceChildren();currentRoot=draw(key,app);
    const url=new URL(location.href);url.searchParams.set('screen',key);history.replaceState({},'',url);
    document.title=`${trees[key].n} · Copaws`;window.scrollTo(0,options.scroll||0);
    window.dispatchEvent(new CustomEvent('pc:render',{detail:{screen:key}}));
  }
  function open(key, options={}) {
    if(!trees[key]){toast('此彈窗尚未載入');return;}
    clearInterval(carouselTimer);
    const caller={screen,root:currentRoot,options,focus:document.activeElement};
    caller.root.inert=true;stack.push(caller);screen=key;
    const host=document.createElement('div');host.className='pc-overlay';app.append(host);
    currentRoot=draw(key,host,true);currentRoot.querySelector('[tabindex="0"],input,button')?.focus({preventScroll:true});
    host.addEventListener('click',event=>{if(event.target===host||event.target===host.firstElementChild)close();});
  }
  function close(value) {
    const caller=stack.pop();if(!caller){go(state.role==='sitter'?'BPC01':'PC06',{replace:true});return;}
    currentRoot.parentElement.remove();screen=caller.screen;currentRoot=caller.root;currentRoot.inert=false;
    if(value!==undefined&&caller.options.field)fieldValue(caller.options.field,value);
    caller.options.onConfirm?.(value);caller.focus?.focus({preventScroll:true});
    if(screen==='PC06'&&!stack.length)startCarousel();
  }
  function back(){if(stack.length){close();return;}const last=historyStack.pop();go(last?.screen||(state.role==='sitter'?'BPC01':'PC06'),{replace:true,scroll:last?.scroll});}
  function startCarousel(){clearInterval(carouselTimer);if(state.paused||matchMedia('(prefers-reduced-motion:reduce)').matches)return;carouselTimer=setInterval(()=>{const interacting=names('sitter comparison card').some(el=>el.matches(':hover')||el.contains(document.activeElement));if(!document.hidden&&!interacting)advanceCarousel(1);},5000);}
  function advanceCarousel(direction){state.carousel+=direction;const cards=names('sitter comparison card');if(cards.length===2){const first=cards[0],second=cards[1],left=first.style.left;first.style.left=second.style.left;second.style.left=left;if(!matchMedia('(prefers-reduced-motion:reduce)').matches)cards.forEach(el=>el.animate([{opacity:.35},{opacity:1}],{duration:300}));}}
  function setupCarousel(){bind('上一組保母',()=>advanceCarousel(-1));bind('下一組保母',()=>advanceCarousel(1));bind('暫停自動輪播',(_,el)=>{state.paused=!state.paused;el.setAttribute('aria-label',state.paused?'繼續自動輪播':'暫停自動輪播');const glyph=el.querySelector('.copaws-render-text-content');if(glyph)glyph.textContent=state.paused?'▶':'Ⅱ';state.paused?clearInterval(carouselTimer):startCarousel();});bind('♡',(_,el)=>{const active=el.getAttribute('aria-pressed')==='true';el.setAttribute('aria-pressed',String(!active));const glyph=el.querySelector('.copaws-render-text-content');if(glyph){glyph.textContent=active?'♡':'♥';glyph.style.color=active?'':'#cb573c';}toast(active?'已取消收藏':'已收藏');},{all:true});startCarousel();}
  const api={trees,state,go,open,close,back,bind,fieldValue,toast,names,clickable,get screen(){return screen;},get root(){return currentRoot;},get modalOptions(){return stack.at(-1)?.options||{};}};
  window.CopawsPC=api;
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&stack.length)close();if(event.key==='Tab'&&stack.length){const targets=[...currentRoot.querySelectorAll('[tabindex="0"],input,textarea,button')].filter(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true');if(!targets.length)return;const first=targets[0],last=targets.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  addEventListener('popstate',()=>go(new URLSearchParams(location.search).get('screen')||'PC06',{replace:true}));
  addEventListener('resize',()=>requestAnimationFrame(()=>alignCertifications(currentRoot)));
  go(new URLSearchParams(location.search).get('screen')||'PC06',{replace:true});
})();
