(function (global) {
  'use strict';

  // Prototype fixtures only. No auth, payment, storage, network, or mobile engine.
  const DAY = 86400000;
  const bindings = new WeakMap();
  const REGIONS = {"台北市":["松山區","信義區","大安區","中山區","中正區","大同區","萬華區","文山區","南港區","內湖區","士林區","北投區"],"台中市":["中區","東區","南區","西區","北區","西屯區","南屯區","北屯區","豐原區","東勢區","大甲區","清水區","沙鹿區","梧棲區","后里區","神岡區","潭子區","大雅區","新社區","石岡區","外埔區","大安區","烏日區","大肚區","龍井區","霧峰區","太平區","大里區","和平區"],"基隆市":["中正區","七堵區","暖暖區","仁愛區","中山區","安樂區","信義區"],"台南市":["新營區","鹽水區","白河區","柳營區","後壁區","東山區","麻豆區","下營區","六甲區","官田區","大內區","佳里區","學甲區","西港區","七股區","將軍區","北門區","新化區","善化區","新市區","安定區","山上區","玉井區","楠西區","南化區","左鎮區","仁德區","歸仁區","關廟區","龍崎區","永康區","東區","南區","北區","安南區","安平區","中西區"],"高雄市":["鹽埕區","鼓山區","左營區","楠梓區","三民區","新興區","前金區","苓雅區","前鎮區","旗津區","小港區","鳳山區","林園區","大寮區","大樹區","大社區","仁武區","鳥松區","岡山區","橋頭區","燕巢區","田寮區","阿蓮區","路竹區","湖內區","茄萣區","永安區","彌陀區","梓官區","旗山區","美濃區","六龜區","甲仙區","杉林區","內門區","茂林區","桃源區","那瑪夏區"],"新北市":["板橋區","三重區","中和區","永和區","新莊區","新店區","樹林區","鶯歌區","三峽區","淡水區","汐止區","瑞芳區","土城區","蘆洲區","五股區","泰山區","林口區","深坑區","石碇區","坪林區","三芝區","石門區","八里區","平溪區","雙溪區","貢寮區","金山區","萬里區","烏來區"],"宜蘭縣":["宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉"],"桃園市":["桃園區","中壢區","大溪區","楊梅區","蘆竹區","大園區","龜山區","八德區","龍潭區","平鎮區","新屋區","觀音區","復興區"],"嘉義市":["東區","西區"],"新竹縣":["竹北市","竹東鎮","新埔鎮","關西鎮","湖口鄉","新豐鄉","芎林鄉","橫山鄉","北埔鄉","寶山鄉","峨眉鄉","尖石鄉","五峰鄉"],"苗栗縣":["苗栗市","苑裡鎮","通霄鎮","竹南鎮","頭份市","後龍鎮","卓蘭鎮","大湖鄉","公館鄉","銅鑼鄉","南庄鄉","頭屋鄉","三義鄉","西湖鄉","造橋鄉","三灣鄉","獅潭鄉","泰安鄉"],"南投縣":["南投市","埔里鎮","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉"],"彰化縣":["彰化市","鹿港鎮","和美鎮","線西鄉","伸港鄉","福興鄉","秀水鄉","花壇鄉","芬園鄉","員林市","溪湖鎮","田中鎮","大村鄉","埔鹽鄉","埔心鄉","永靖鄉","社頭鄉","二水鄉","北斗鎮","二林鎮","田尾鄉","埤頭鄉","芳苑鄉","大城鄉","竹塘鄉","溪州鄉"],"新竹市":["東區","北區","香山區"],"雲林縣":["斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","古坑鄉","大埤鄉","莿桐鄉","林內鄉","二崙鄉","崙背鄉","麥寮鄉","東勢鄉","褒忠鄉","台西鄉","元長鄉","四湖鄉","口湖鄉","水林鄉"],"嘉義縣":["太保市","朴子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","竹崎鄉","梅山鄉","番路鄉","大埔鄉","阿里山鄉"],"屏東縣":["屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","長治鄉","麟洛鄉","九如鄉","里港鄉","鹽埔鄉","高樹鄉","萬巒鄉","內埔鄉","竹田鄉","新埤鄉","枋寮鄉","新園鄉","崁頂鄉","林邊鄉","南州鄉","佳冬鄉","琉球鄉","車城鄉","滿州鄉","枋山鄉","三地門鄉","霧台鄉","瑪家鄉","泰武鄉","來義鄉","春日鄉","獅子鄉","牡丹鄉"],"花蓮縣":["花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","富里鄉","秀林鄉","萬榮鄉","卓溪鄉"],"台東縣":["台東市","成功鎮","關山鎮","卑南鄉","鹿野鄉","池上鄉","東河鄉","長濱鄉","太麻里鄉","大武鄉","綠島鄉","海端鄉","延平鄉","金峰鄉","達仁鄉","蘭嶼鄉"],"金門縣":["金城鎮","金沙鎮","金湖鎮","金寧鄉","烈嶼鄉","烏坵鄉"],"澎湖縣":["馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉"],"連江縣":["南竿鄉","北竿鄉","莒光鄉","東引鄉"]};
  const family = key => key.replace(/-.*$/, '');
  const minutes = value => /^\d{2}:\d{2}$/.test(value || '') && +value.slice(0, 2) < 24 && +value.slice(3) < 60
    ? +value.slice(0, 2) * 60 + +value.slice(3) : NaN;
  const validTime = (start, end) => Number.isFinite(minutes(start)) && minutes(end) > minutes(start);
  const dayString = (y, m, d) => `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  const textOf = node => node?.text ?? (node?.c || []).map(textOf).join('');
  const flatten = tree => {
    const list = [];
    function walk(n, parent) { if (!n) return; list.push({ n, parent }); (n.c || []).forEach(c => walk(c, n)); }
    walk(tree, null); return list;
  };

  function bindCopawsFlows(api) {
    if (!api?.root || !api.state) return;
    const root = api.root;
    bindings.get(root)?.();
    const screen = api.screen;
    const base = family(screen);
    const state = api.state.flows ||= {
      prototype: true, forms: {}, checks: {}, pickers: [], pets: null, bookings: {},
      selectedBooking: 'fixture-1', role: 'owner', availability: [],
      cancellation: { strikes: 0, lastAt: 0, blockedUntil: 0 }, filters: {},
    };
    if (screen.startsWith('BPC')) state.role = 'sitter';
    else if (screen.startsWith('PC')) state.role = 'owner';
    const tree = api.trees instanceof Map ? api.trees.get(screen) : api.trees?.[screen];
    const nodes = flatten(tree);
    const byId = new Map(nodes.map(entry => [String(entry.n.id), entry]));
    const elements = [...root.querySelectorAll('[data-node-id]')];
    const byElementId = new Map(elements.map(el => [el.dataset.nodeId, el]));
    const actions = new Map();
    let userInteracted = false;
    const refreshers = [];
    const cleanups = [];
    const form = state.forms[base] ||= {};
    const now = () => Number.isFinite(state.fixtureNow) ? state.fixtureNow : Date.now();
    const toast = text => api.toast(text);
    const named = name => elements.filter(el => el.dataset.name === name && el.dataset.nodeType !== 'TEXT');
    const texts = el => [...el.querySelectorAll('.copaws-render-text-content')];
    const domText = el => el?.querySelector('input,textarea,select')?.value ??
      el?.querySelector('[contenteditable="true"]')?.textContent ??
      texts(el || root)[0]?.textContent ?? '';
    const field = name => named(name.endsWith(' field') ? name : `${name} field`)[0];
    const read = name => String(field(name) ? domText(field(name)) : form[name] ?? '').trim();
    const setField = (name, value) => {
      const key = name.replace(/ field$/, ''); form[key] = String(value);
      api.fieldValue(name.endsWith(' field') ? name : `${name} field`, String(value));
    };
    const saveForm = () => {
      elements.filter(el => / field$/.test(el.dataset.name)).forEach(el => {
        if (/密碼|驗證碼/.test(el.dataset.name)) return;
        if (named(el.dataset.name).length > 1) {
          state.nodeFields ||= {}; (state.nodeFields[screen] ||= {})[el.dataset.nodeId] = domText(el);
        } else form[el.dataset.name.replace(/ field$/, '')] = domText(el);
      });
    };
    const go = key => { saveForm(); api.go(key); };
    const open = (key, options) => { saveForm(); api.open(key, options); };
    const close = value => { api.close(value); global.bindCopawsFlows(api); };
    const onElement = (el, handler) => {
      if (!el) return;
      actions.set(el, handler);
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      el.style.cursor = 'pointer';
    };
    const on = (names, handler) => (Array.isArray(names) ? names : [names]).forEach(name =>
      named(name).forEach((el, index) => onElement(el, event => handler(event, el, index))));
    const disabled = (el, value) => {
      if (!el) return;
      el.setAttribute('aria-disabled', String(value));
      el.style.cursor = value ? 'not-allowed' : 'pointer';
      if ('disabled' in el) el.disabled = value;
    };
    const disableNames = (names, value) => (Array.isArray(names) ? names : [names]).forEach(name => named(name).forEach(el => {
      disabled(el, value);
      if (userInteracted) {
        const paint = [...el.children].find(c => c.classList.contains('copaws-render-paint'));
        if (paint) paint.style.backgroundColor = value ? '#e8ece7' : '#0b6b3a';
        texts(el).forEach(t => { t.style.color = value ? '#92978e' : '#ffffff'; });
      }
    }));
    const paintChoice = (el, selected) => {
      el.setAttribute('aria-pressed', String(selected));
      const paint = [...el.children].find(c => c.classList.contains('copaws-render-paint'));
      if (paint) paint.style.backgroundColor = selected ? '#0b6b3a' : '#ffffff';
      texts(el).forEach(t => { t.style.color = selected ? '#ffffff' : '#0b6b3a'; });
    };
    const update = () => refreshers.forEach(fn => fn());
    const booking = () => state.bookings[state.selectedBooking] ||= {
      id: state.selectedBooking, status: 'meeting_pending', ownerMet: false, sitterMet: false,
      startsAt: Date.parse('2026-12-16T14:00:00+08:00'), prototype: true,
    };
    const cooldown = () => state.cancellation.blockedUntil > now();
    const locate = () => { state.locateBooking = state.selectedBooking; state.filters.bookings = '全部'; go('PC11'); };

    // Capture only owned actions, before the host's generic Figma reaction handlers.
    function handleClick(event) {
      if (event.target?.dataset?.flowFileInput) return;
      let el = event.target instanceof global.Element ? event.target : event.target?.parentElement;
      if (base === 'PC11' || base === 'BPC04') {
        const target = el?.closest('[data-node-id]');
        let entry = byId.get(target?.dataset.nodeId), y = entry?.n.y || 0;
        while (entry?.parent && entry.parent !== tree) { y += entry.parent.y || 0; entry = byId.get(entry.parent.id); }
        const row = nodes.find(({ n }) => /(?:booking|case) row background \d/.test(n.n) && y >= n.y && y < n.y + n.h);
        if (row) state.selectedBooking = byElementId.get(row.n.id)?.dataset.bookingId || `fixture-${+row.n.n.match(/\d+$/)[0] + 1}`;
      }
      while (el && el !== root) {
        if (actions.has(el)) {
          event.preventDefault(); event.stopImmediatePropagation();
          userInteracted = true;
          if (el.getAttribute('aria-disabled') !== 'true') actions.get(el)(event);
          return;
        }
        el = el.parentElement;
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape' && screen.startsWith('PG')) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (pickerScreen) cancelPicker(); else close();
        return;
      }
      if (!['Enter', ' '].includes(event.key) || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
      handleClick(event);
    }
    function handleInput() { userInteracted = true; saveForm(); update(); }
    root.addEventListener('click', handleClick, true);
    root.addEventListener('keydown', handleKey, true);
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleInput);
    bindings.set(root, () => {
      root.removeEventListener('click', handleClick, true); root.removeEventListener('keydown', handleKey, true);
      root.removeEventListener('input', handleInput); root.removeEventListener('change', handleInput);
      cleanups.forEach(fn => fn());
    });
    Object.entries(form).forEach(([name, value]) => { if (named(`${name} field`).length === 1) setField(name, value); });
    Object.entries(state.nodeFields?.[screen] || {}).forEach(([id, value]) => {
      const el = byElementId.get(id); if (!el) return;
      const input = el.querySelector('input,textarea');
      if (input) input.value = value; else if (texts(el)[0]) texts(el)[0].textContent = value;
    });

    const checks = [];
    nodes.filter(({ n }) => n.n === 'checkbox').forEach(({ n, parent }, index) => {
      const el = byElementId.get(n.id);
      const siblings = parent?.c || [];
      const hit = siblings.filter(s => s.n === 'Hit area / checkbox').find(s =>
        n.x >= s.x && n.y >= s.y && n.x < s.x + s.w && n.y < s.y + s.h);
      const labelNode = siblings.filter(s => s.t === 'TEXT' && s.x >= n.x + n.w && Math.abs(s.y - n.y) < 18)
        .sort((a, b) => a.x - b.x)[0];
      const label = labelNode?.text || `checkbox-${index}`;
      const key = `${screen}:${label}`;
      if (!(key in state.checks)) state.checks[key] = !!(n.c || []).find(c => c.text === '✓');
      const checked = () => state.checks[key];
      const draw = (changed = false) => {
        if (!el) return;
        el.setAttribute('role', 'checkbox'); el.setAttribute('aria-checked', String(checked()));
        el.setAttribute('aria-label', label);
        if (hit) {
          const h = byElementId.get(hit.id); h?.setAttribute('role', 'checkbox'); h?.setAttribute('aria-checked', String(checked())); h?.setAttribute('aria-label', label);
          el.setAttribute('aria-hidden', 'true'); el.tabIndex = -1;
        }
        if (!changed) return;
        const paint = [...el.children].find(c => c.classList.contains('copaws-render-paint'));
        if (paint) paint.style.backgroundColor = checked() ? '#0b6b3a' : '#ffffff';
        let tick = el.querySelector('[data-flow-tick]') || texts(el).find(t => t.textContent === '✓');
        if (!tick) {
          tick = document.createElement('span'); tick.dataset.flowTick = 'true'; tick.textContent = '✓';
          Object.assign(tick.style, { position: 'absolute', inset: '0', textAlign: 'center', color: '#fff', pointerEvents: 'none' }); el.append(tick);
        }
        tick.style.visibility = checked() ? 'visible' : 'hidden';
        if (hit) { const h = byElementId.get(hit.id); h?.setAttribute('role', 'checkbox'); h?.setAttribute('aria-checked', String(checked())); h?.setAttribute('aria-label', label); }
      };
      const toggle = () => { state.checks[key] = !checked(); (state.editedChecks ||= {})[key] = true; draw(true); update(); };
      onElement(el, toggle); if (hit) onElement(byElementId.get(hit.id), toggle);
      if (labelNode) { const labelEl = byElementId.get(labelNode.id); onElement(labelEl, toggle); if (labelEl) labelEl.tabIndex = -1; }
      checks.push({ checked, key, draw }); draw(!!state.editedChecks?.[key]);
    });
    const agreed = () => checks.length > 0 && checks.every(c => c.checked());

    if (!screen.startsWith('PG')) on(['shared filter button', '篩選'], () => {
      state.filterSource = screen;
      open(['PC18', 'BPC10'].includes(base) ? 'PG10' : ['PC11', 'BPC04'].includes(base) ? 'PG13' : 'PG01');
    });
    if (['PG01', 'PG10', 'PG13'].includes(screen)) {
      const choices = ['全部', '需求確認中', '待雙方見面', '即將服務', '進行中', '待撥款', '已付款', '待完成', '已完成', '退款/取消'];
      let selected = state.filterDraft?.status || '全部';
      on(choices, (_, el) => {
        selected = el.dataset.name;
        choices.forEach(name => named(name).forEach(c => paintChoice(c, c === el)));
      });
      on('清除', () => {
        selected = '全部';
        choices.forEach(name => named(name).forEach(c => paintChoice(c, name === '全部')));
        checks.forEach(c => { state.checks[c.key] = false; c.draw(true); });
        state.filterDraft = null;
        ['服務地區', '地區', '城市', '行政區'].forEach(name => { if (field(name)) setField(name, '全部地區'); });
      });
      on('套用篩選', () => {
        saveForm();
        const origin = state.filterSource || (screen === 'PG10' ? 'PC18' : screen === 'PG13' ? 'PC11' : 'PC06');
        state.filters[origin] = { ...form, status: selected }; state.filterDraft = null;
        close(); if (api.screen !== origin) go(origin);
        toast('已套用示意篩選');
      });
    }

    function startPicker(key, fieldName, kind, options, target) {
      saveForm();
      const value = target ? domText(target) : read(fieldName);
      const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      const context = { origin: screen, field: fieldName, kind, options, targetNodeId: target?.dataset.nodeId, depth: 1, draft: {
        city: read('城市') || '台北市', district: read('行政區') || '大安區',
        year: match ? +match[1] : kind === 'birth' ? 1995 : 2026,
        month: match ? +match[2] : kind === 'birth' ? 6 : 12, day: match ? +match[3] : 16,
        hour: /^\d{2}:/.test(value) ? value.slice(0, 2) : '00', minute: /^\d{2}:/.test(value) ? value.slice(3, 5) : '00',
        pet: state.selectedPet || '麻糬', option: value,
      } };
      if (target && /Only$/.test(kind)) {
        const entry = byId.get(target.dataset.nodeId);
        const peers = nodes.filter(e => e.parent === entry?.parent && / field$/.test(e.n.n) && Math.abs(e.n.y - entry.n.y) < 2);
        peers.forEach(({ n }) => {
          const part = /西元年/.test(n.n) ? 'year' : /月份/.test(n.n) ? 'month' : /^日期/.test(n.n) ? 'day' : null;
          if (part) context.draft[part] = parseInt(domText(byElementId.get(n.id)), 10) || context.draft[part];
        });
      }
      if(kind==='month')Object.assign(context.draft,state.pickers.at(-1)?.draft||state.calendar||{});
      state.pickers.push(context);
      open(key, { field: fieldName.endsWith(' field') ? fieldName : `${fieldName} field`, targetNodeId: context.targetNodeId });
    }
    let picker = state.pickers[state.pickers.length - 1];
    const pickerScreen = /^PG(?:01-1(?:-1)?|01-2|02|03|04|11|20(?:-1|-2)?|21)$/.test(screen);
    if (pickerScreen && !picker) {
      picker = { origin: 'PC04', depth: 0, field: screen === 'PG04' ? '開始時間' : screen === 'PG02' || screen === 'PG11' ? '寵物資訊' : '服務日期',
        kind: screen.startsWith('PG20') ? 'birth' : 'date', draft: { city: '台北市', district: '大安區', year: screen.startsWith('PG20') ? 1995 : 2026, month: screen.startsWith('PG20') ? 6 : 12, day: 16, hour: '00', minute: '00', pet: '麻糬' } };
      state.pickers.push(picker);
    }
    function finishPicker(value, extra = {}) {
      if (!picker) return close(value);
      const target = state.forms[family(picker.origin)] ||= {};
      Object.assign(target, extra);
      if (picker.kind === 'month') {
        const parentPicker = state.pickers[state.pickers.length - 2];
        if (parentPicker) Object.assign(parentPicker.draft, { year: picker.draft.year, month: picker.draft.month });
      }
      if (picker.targetNodeId) {
        state.nodeFields ||= {}; (state.nodeFields[picker.origin] ||= {})[picker.targetNodeId] = String(value);
      } else target[picker.field.replace(/ field$/, '')] = String(value);
      state.pickers.pop();
      for (let i = 0; i < (picker.depth || 0); i++) api.close();
      if (api.screen !== picker.origin) api.go(picker.origin);
      global.bindCopawsFlows(api);
    }
    function cancelPicker() {
      if (!picker) return close();
      state.pickers.pop();
      for (let i = 0; i < (picker.depth || 0); i++) api.close();
      if (api.screen !== picker.origin) api.go(picker.origin);
      global.bindCopawsFlows(api);
    }
    const stage = key => { if (picker) picker.depth++; open(key, { field: picker?.field, targetNodeId: picker?.targetNodeId }); };
    if (!screen.startsWith('PG') || ['PG01', 'PG10', 'PG13'].includes(screen)) {
      on('城市 field', () => startPicker('PG01-1', '城市', 'region'));
      on('行政區 field', () => startPicker('PG01-2', '行政區', 'district'));
      on(['地區 field', '服務地區 field', '需求地區 field'], (_, el) => startPicker('PG01-1', el.dataset.name, 'region'));
      on('生日 field', () => startPicker('PG20', '生日', 'birth'));
      on(['服務日期 field', '開始日期 field', '結束日期 field'], (_, el) => startPicker('PG21', el.dataset.name, 'date'));
      on(['開始時間 field', '結束時間 field'], (_, el) => startPicker('PG04', el.dataset.name, 'time'));
      on('寵物資訊 field', () => startPicker(screen === 'PC04-1' && !state.pets?.length ? 'PG11' : 'PG02', '寵物資訊', 'pet'));
      const classifications = {
        領補換類別: ['初發', '補發', '換發'], 種類: ['貓咪', '狗狗', '爬蟲', '其他'],
        性別: ['公', '母', '未知'], 年齡: Array.from({ length: 31 }, (_, i) => `${i} 歲`),
        品種: /狗/.test(read('種類')) ? ['米克斯', '柴犬', '貴賓犬', '柯基犬', '黃金獵犬', '拉布拉多', '其他'] :
          ['米克斯', '英國短毛貓', '美國短毛貓', '布偶貓', '波斯貓', '暹羅貓', '其他'],
      };
      Object.entries(classifications).forEach(([name, values]) => on(`${name} field`, (_, el) => startPicker('PG03', name, 'classification', values, el)));
      on(['生日 · 西元年 field', '領補換日期 · 西元年 field'], (_, el) => startPicker('PG20', el.dataset.name, 'yearOnly', null, el));
      on('月份 field', (_, el) => startPicker('PG20-1', el.dataset.name, 'monthOnly', null, el));
      on('日期 field', (_, el) => startPicker('PG20-2', el.dataset.name, 'dayOnly', null, el));
    }
    nodes.filter(({ n }) => /上傳|照片|身分證正面|身分證反面|良民證/.test(n.n) && n.t === 'FRAME' &&
      (/ field$/.test(n.n) || /^上傳/.test(n.n))).forEach(({ n }) => {
      const el = byElementId.get(n.id); if (!el) return;
      const key = `${base}:${n.n}`;
      const preview = item => {
        let img = el.querySelector('[data-flow-file-preview]');
        if (!img) { img = document.createElement('img'); img.dataset.flowFilePreview = 'true'; el.append(img); }
        img.src = item.url; img.alt = `本機預覽：${item.name}`;
        Object.assign(img.style, { position: 'absolute', inset: '3px', width: 'calc(100% - 6px)', height: 'calc(100% - 6px)', objectFit: 'contain', pointerEvents: 'none', background: '#fff' });
        el.setAttribute('aria-label', `${n.n}，已選 ${item.name}，僅本機預覽`);
      };
      if (state.files?.[key]) preview(state.files[key]);
      onElement(el, () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
        input.style.display = 'none'; el.append(input);
        input.addEventListener('change', () => {
          const file = input.files?.[0]; input.remove(); if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return toast('請選擇 10MB 以內的 PNG、JPEG 或 WebP 圖片');
          state.files ||= {}; const old = state.files[key]; if (old) URL.revokeObjectURL(old.url);
          const item = { name: file.name, url: URL.createObjectURL(file), size: file.size };
          state.files[key] = item; preview(item); toast('僅在本機預覽，未上傳網路');
        }, { once: true });
        input.addEventListener('cancel', () => input.remove(), { once: true });
        // The native input click must not re-enter this field's capture handler.
        input.addEventListener('click', event => event.stopPropagation());
        input.dataset.flowFileInput = 'true'; input.click();
      });
    });
    if (pickerScreen) on(['×', '關閉', '返回', '取消'], cancelPicker);

    // Reuse exported option geometry while exposing complete static fixture choices.
    function choiceGrid(options, candidates, selected, choose, columns = 3) {
      let source = nodes.filter(({ n }) => n.t === 'FRAME' && candidates.includes(n.n));
      const fallback = !source.length && /^PG01-1/.test(screen);
      if (fallback) source = flatten(api.trees?.['PG01-1']).filter(({ n }) => n.t === 'FRAME' && candidates.includes(n.n));
      if (!source.length) return;
      const first = source[0];
      let template = byElementId.get(first.n.id);
      const host = template?.parentElement || named('dialog')[0];
      if (!host) return;
      if (!template) {
        template = document.createElement('div'); template.className = 'copaws-render-node';
        Object.assign(template.style, { border: '1px solid #e4d9c8', borderRadius: '8px', textAlign: 'center' });
        const paint = document.createElement('div'); paint.className = 'copaws-render-paint'; template.append(paint);
        const label = document.createElement('span'); label.className = 'copaws-render-text-content';
        Object.assign(label.style, { position: 'relative', fontSize: '16px', fontWeight: '600', lineHeight: `${first.n.h}px` }); template.append(label);
      }
      const offsetX = fallback ? first.parent.x : 0, offsetY = fallback ? first.parent.y : 0;
      const left = Math.min(...source.map(s => s.n.x)) + offsetX, top = Math.min(...source.map(s => s.n.y)) + offsetY;
      const right = Math.max(...source.map(s => s.n.x + s.n.w)) + offsetX, bottom = Math.max(...source.map(s => s.n.y + s.n.h)) + offsetY;
      const xs = [...new Set(source.map(s => s.n.x))].sort((a, b) => a - b), ys = [...new Set(source.map(s => s.n.y))].sort((a, b) => a - b);
      const gapX = xs.length > 1 ? xs[1] - xs[0] - first.n.w : 18;
      const gapY = ys.length > 1 ? ys[1] - ys[0] - first.n.h : 16;
      const hostWidth = byId.get(host.dataset.nodeId)?.n.w || first.parent.w;
      let area;
      function build() {
      if (area) return area;
      area = document.createElement('div'); area.dataset.flowOptions = 'true';
      Object.assign(area.style, { position: 'absolute', left: `${left / hostWidth * 100}%`, top: `${top}px`,
        width: `${(right - left) / hostWidth * 100}%`, height: `${Math.min(bottom - top, first.parent.h)}px`, overflowY: 'auto',
        display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${gapY}px ${gapX}px`, alignContent: 'start' });
      const clone = template.cloneNode(true);
      source.forEach(s => byElementId.get(s.n.id)?.remove());
      host.append(area);
      if (fallback) nodes.filter(({ n }) => n.t === 'TEXT' && /找不到|搜尋其他/.test(n.text || '')).forEach(({ n }) => { const el = byElementId.get(n.id); if (el) el.hidden = true; });
      options.forEach((value, index) => {
        const el = clone.cloneNode(true);
        el.removeAttribute('data-node-id'); el.dataset.name = `flow option ${value}`;
        el.querySelectorAll('[data-node-id]').forEach(n => n.removeAttribute('data-node-id'));
        Object.assign(el.style, { position: 'relative', left: 'auto', top: 'auto', width: '100%', height: `${first.n.h}px` });
        const content = texts(el)[0]; if (content) content.textContent = value;
        el.setAttribute('aria-label', value); el.dataset.flowValue = value;
        onElement(el, () => {
          choose(value, index);
          [...area.children].forEach(c => paintChoice(c, c.dataset.flowValue === value));
        });
        paintChoice(el, value === selected); area.append(el);
      });
      return area;
      }
      source.forEach(({ n }) => onElement(byElementId.get(n.id), () => {
        selected = n.n; choose(n.n, options.indexOf(n.n));
        build();
      }));
      if (!fallback && first.parent.h < bottom) { host.style.overflowY = 'auto'; host.style.scrollbarWidth = 'none'; }
      return { filter(query) {
        const grid = build(); let count = 0;
        grid.querySelectorAll('[data-flow-value]').forEach(el => {
          const show = el.dataset.flowValue.includes(query); el.hidden = !show; el.style.display = show ? '' : 'none'; if (show) count++;
        });
        return count;
      } };
    }

    if (screen === 'PG01-1' || screen === 'PG01-1-1') {
      const cities = Object.keys(REGIONS);
      const options = choiceGrid(cities, cities, picker.draft.city, city => {
        picker.draft.city = city; picker.draft.district = REGIONS[city][0]; update();
      });
      const searchField = field('城市');
      if (searchField && !searchField.querySelector('input')) {
        const input = document.createElement('input'); input.className = 'pc-input'; input.setAttribute('aria-label', '搜尋城市');
        input.value = screen === 'PG01-1-1' ? domText(searchField) : '';
        input.placeholder = screen === 'PG01-1-1' ? '搜尋城市' : domText(searchField);
        searchField.querySelectorAll('[data-node-type="TEXT"]').forEach(el => { el.style.visibility = 'hidden'; });
        searchField.append(input);
      }
      const search = () => {
        if (!userInteracted) return;
        const query = read('城市').replace(/^搜尋城市$/, '').replace(/臺/g, '台');
        const count = options?.filter(query) ?? 0;
        disableNames('下一步', !!options && count === 0);
      };
      refreshers.push(search);
      on('下一步', () => stage('PG01-2'));
    }
    if (screen === 'PG01-2') {
      const districts = REGIONS[picker.draft.city] || [];
      const districtOptions = choiceGrid(districts, Object.values(REGIONS).flat(), picker.draft.district, value => { picker.draft.district = value; });
      if (picker.depth && picker.draft.city !== '台北市') districtOptions?.filter('');
      if (picker.depth) setField('已選城市', picker.draft.city);
      on(['更換城市', '變更城市'], () => stage('PG01-1'));
      on(['確認選擇', '確認行政區'], () => {
        if (!districts.includes(picker.draft.district)) return toast('請選擇行政區');
        const { city, district } = picker.draft;
        finishPicker(/地區/.test(picker.field) ? `${city} · ${district}` : picker.kind === 'district' ? district : city,
          { 城市: city, 行政區: district });
      });
    }
    if (screen === 'PG04') {
      const hourCandidates = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
      const groups = nodes.filter(({ n }) => n.t === 'FRAME' && /^\d{2}$/.test(n.n));
      const left = Math.min(...groups.map(g => g.n.x));
      groups.forEach(({ n }) => onElement(byElementId.get(n.id), () => {
        const part = n.x <= left + 50 ? 'hour' : 'minute'; picker.draft[part] = n.n;
        groups.filter(g => (g.n.x <= left + 50) === (part === 'hour')).forEach(g => paintChoice(byElementId.get(g.n.id), g.n.id === n.id));
      }));
      // Hour columns may export only their visible rows; append missing values in-place.
      const hourNodes = groups.filter(g => g.n.x <= left + 50);
      const hourHost = hourNodes[0] && byElementId.get(hourNodes[0].n.id)?.parentElement;
      if (hourHost) { hourHost.style.overflowY = 'auto'; hourHost.style.scrollbarWidth = 'none'; }
      if (hourNodes.length && hourNodes.length < 24) {
        const host = byElementId.get(hourNodes[0].n.id)?.parentElement;
        if (host && /scroll|小時|hour/i.test(host.dataset.name || '')) {
          const template = byElementId.get(hourNodes[0].n.id);
          const step = hourNodes[1] ? hourNodes[1].n.y - hourNodes[0].n.y : 56;
          hourCandidates.filter(v => !hourNodes.some(n => n.n.n === v)).forEach(v => {
            const el = template.cloneNode(true); el.removeAttribute('data-node-id'); el.dataset.name = `hour ${v}`;
            el.querySelectorAll('[data-node-id]').forEach(c => c.removeAttribute('data-node-id'));
            el.style.top = `${hourNodes[0].n.y + Number(v) * step}px`; texts(el)[0].textContent = v;
            onElement(el, () => { picker.draft.hour = v; [...host.children].filter(c => c.dataset.name).forEach(c => paintChoice(c, c === el)); });
            paintChoice(el, v === picker.draft.hour); host.append(el);
          });
        }
      }
      on(['確認時間', '確認選擇'], () => finishPicker(`${picker.draft.hour}:${picker.draft.minute}`));
    }
    if (/^PG20(?:-1|-2)?$/.test(screen)) {
      const part = screen === 'PG20' ? 'year' : screen === 'PG20-1' ? 'month' : 'day';
      const numeric = nodes.filter(({ n }) => n.t === 'FRAME' && /^(\d{1,4})\s*(月)?$/.test(n.n));
      numeric.forEach(({ n }) => onElement(byElementId.get(n.id), () => {
        picker.draft[part] = parseInt(domText(byElementId.get(n.id)), 10);
        numeric.forEach(({ n: other }) => paintChoice(byElementId.get(other.id), other.id === n.id));
      }));
      if (part === 'year') {
        let pageYear = Math.min(...numeric.map(({ n }) => +n.n));
        const shift = amount => {
          pageYear += amount;
          numeric.forEach(({ n }, index) => {
            const el = byElementId.get(n.id), year = pageYear + index;
            if (!el) return; const label = texts(el)[0]; if (label) label.textContent = String(year);
            el.setAttribute('aria-label', String(year)); paintChoice(el, year === picker.draft.year);
          });
        };
        on('‹', () => shift(-12)); on('›', () => shift(12));
      }
      if (part === 'day' && picker.depth && new Date(picker.draft.year, picker.draft.month, 0).getDate() !== numeric.length) {
        const count = new Date(picker.draft.year, picker.draft.month, 0).getDate();
        const cols = new Set(numeric.map(({ n }) => n.x)).size;
        choiceGrid(Array.from({ length: count }, (_, i) => String(i + 1)), numeric.map(({ n }) => n.n), String(picker.draft.day), value => { picker.draft.day = +value; }, cols)?.filter('');
      }
      on('確認選擇', () => {
        if (/Only$/.test(picker.kind)) return finishPicker(String(picker.draft[part]));
        if (part === 'year') return stage('PG20-1');
        if (part === 'month') return stage('PG20-2');
        const { year, month, day } = picker.draft;
        if (day > new Date(year, month, 0).getDate()) return toast('請選擇有效日期');
        finishPicker(dayString(year, month, day));
      });
    }
    if (screen === 'PG03' || screen === 'PG21' || base === 'PC09' || base === 'BPC07') {
      const draft = pickerScreen ? picker.draft : state.calendar ||= { year: 2026, month: 12, day: 16 };
      const days=nodes.filter(({n})=>/^日期 \d+$/.test(n.n));
      const renderCalendar=()=>{
        if(!days.length)return;
        const xs=[...new Set(days.map(({n})=>n.x))].sort((a,b)=>a-b),ys=[...new Set(days.map(({n})=>n.y))].sort((a,b)=>a-b);
        const count=new Date(draft.year,draft.month,0).getDate(),offset=new Date(draft.year,draft.month-1,1).getDay();
        nodes.filter(({n})=>n.t==='TEXT'&&/^2026 十二月$/.test(n.text)).forEach(({n})=>{const e=byElementId.get(n.id);if(e)texts(e)[0].textContent=`${draft.year} ${['一','二','三','四','五','六','七','八','九','十','十一','十二'][draft.month-1]}月`;});
        days.forEach(({n,parent})=>{const el=byElementId.get(n.id),day=+n.n.split(' ')[1],index=offset+day-1;if(!el)return;el.hidden=day>count;el.style.left=`${xs[index%7]/parent.w*100}%`;el.style.top=`${ys[0]+Math.floor(index/7)*(ys[1]-ys[0])}px`;});
        nodes.filter(({n})=>n.t==='TEXT'&&/^2026\/12\/16/.test(n.text)).forEach(({n})=>{const el=byElementId.get(n.id);if(el)texts(el)[0].textContent=dayString(draft.year,draft.month,draft.day);});
      };
      if(draft.year!==2026||draft.month!==12||draft.day!==16)renderCalendar();
      nodes.filter(({ n }) => /^日期 \d+$/.test(n.n)).forEach(({ n }) => onElement(byElementId.get(n.id), () => {
        draft.day = +n.n.split(' ')[1];
        renderCalendar();
        nodes.filter(({ n: d }) => /^日期 \d+$/.test(d.n)).forEach(({ n: d }) => paintChoice(byElementId.get(d.id), d.id === n.id));
      }));
      if (screen === 'PG03') {
        if (picker.kind === 'classification') {
          const title = nodes.find(({ n }) => n.t === 'TEXT' && /選擇.*年|選擇.*月/.test(n.text || ''));
          const titleEl = title && byElementId.get(title.n.id)?.querySelector('.copaws-render-text-content');
          if (titleEl) titleEl.textContent = `選擇${picker.field}`;
          const candidates = nodes.filter(({ n }) => n.t === 'FRAME' && /^\d{1,2}\s*月$/.test(n.n)).map(({ n }) => n.n);
          choiceGrid(picker.options || [], candidates, picker.draft.option, value => { picker.draft.option = value; }, 4)?.filter('');
          const yearField = field('西元年'); if (yearField) yearField.hidden = true;
          nodes.filter(({ n }) => n.t === 'TEXT' && n.text === '西元年').forEach(({ n }) => { const el = byElementId.get(n.id); if (el) el.hidden = true; });
          on('確認選擇', () => {
            if (!picker.options?.includes(picker.draft.option)) return toast('請先選擇一個選項');
            finishPicker(picker.draft.option);
          });
        } else {
        draft.year = parseInt(read('西元年'), 10) || draft.year;
        on('西元年 field', (_, el) => startPicker('PG20', el.dataset.name, 'yearOnly', null, el));
        nodes.filter(({ n }) => n.t === 'FRAME' && /^\d{1,2}\s*月$/.test(n.n)).forEach(({ n }) => onElement(byElementId.get(n.id), () => {
          draft.month = parseInt(n.n, 10);
          nodes.filter(({ n: p }) => p.t === 'FRAME' && /^\d{1,2}\s*月$/.test(p.n)).forEach(({ n: p }) => paintChoice(byElementId.get(p.id), p.id === n.id));
        }));
        on('確認選擇', () => {
          const today=new Date(now());
          if(draft.year*12+draft.month<today.getFullYear()*12+today.getMonth()+1)return toast('不可選擇過去月份');
          if(picker.origin==='PC09'&&(draft.year!==2026||draft.month!==12))return toast('此保母該月份尚未設定可預約時段');
          draft.day=Math.min(draft.day,new Date(draft.year,draft.month,0).getDate());state.calendar={...draft};finishPicker(`${draft.year}年${draft.month}月`);
        });
        }
      }
      if (screen === 'PG21') on(['確認選擇', '確認日期'], () => {
        if (draft.day > new Date(draft.year, draft.month, 0).getDate()) return toast('請選擇有效日期');
        finishPicker(dayString(draft.year, draft.month, draft.day));
      });
      if (screen === 'PG21' || base === 'PC09' || base === 'BPC07') on('⌄', () => startPicker('PG03', '年月', 'month'));
    }

    if (screen === 'PG02') {
      const pets = nodes.filter(({ n }) => n.t === 'FRAME' && /pet|寵物|麻糬|豆豆/.test(n.n) && n.w < 1000 && (n.c || []).length > 1);
      pets.forEach(({ n }, index) => {
        const choosePet = () => {
        picker.draft.pet = /豆豆/.test(textOf(n)) ? '豆豆' : '麻糬';
        pets.forEach(({ n: p }) => paintChoice(byElementId.get(p.id), p.id === n.id));
        checks.forEach((c, i) => { state.checks[c.key] = i === index; c.draw(true); });
        };
        onElement(byElementId.get(n.id), choosePet);
        flatten(n).filter(({ n: c }) => /checkbox/.test(c.n)).forEach(({ n: c }) => onElement(byElementId.get(c.id), choosePet));
      });
      on(['確認選擇', '確認寵物'], () => { state.selectedPet = picker.draft.pet; finishPicker(picker.draft.pet); });
    }
    if (screen === 'PG11') on(['建立寵物資料', '新增寵物資料'], () => {
      state.petReturn = { origin: picker.origin, field: picker.field };
      state.pickers.pop(); close(); go('PC23');
    });

    if (base === 'PC03') {
      on('跳轉預約看進度 →', () => { state.selectedBooking = state.matchedBookingId || 'fixture-3'; locate(); });
      on('✎', (_, el) => { state.editDemand = el.closest('[data-name^="需求卡"]')?.dataset.nodeId; go('PC22'); });
      on('×', (_, el) => { state.deleteDemand = el.closest('[data-name^="需求卡"]')?.dataset.nodeId; open('PG19'); });
      (state.deletedDemands || []).forEach(id => { const el = byElementId.get(id); if (el) el.hidden = true; });
    }
    if (base === 'BPC01' || base === 'BPC03') {
      if(base==='BPC01')named('×').filter(el=>el.textContent.includes('略過需求')).forEach(el=>el.setAttribute('aria-label','略過需求'));
      on('接受需求', () => {
        if (api.state.sitterApproved === false) return open('PG16-1');
        if (cooldown()) return toast('取消冷卻期間，暫時無法接受新需求');
        state.selectedBooking = `quick-demand-${state.skippedFixtures || 0}`;
        open('PG06');
      });
      on(['略過需求', '×', '婉拒'], () => {
        state.skippedFixtures=(state.skippedFixtures||0)+1;
        const name=['小安','佳妤','阿哲'][state.skippedFixtures%3];
        nodes.filter(({n})=>n.t==='TEXT').forEach(({n})=>{
          const el=byElementId.get(n.id);if(!el)return;
          if(n.text==='飼主 小安')texts(el)[0].textContent=`飼主 ${name}`;
          if(n.text==='NT$ 400')texts(el)[0].textContent=`NT$ ${400+state.skippedFixtures%3*100}`;
        });
        toast('已顯示下一筆示意需求');
      });
    }
    if (base === 'PC05') {
      on('接受', (_, el, index) => {
        if (cooldown()) return toast('示意保母仍在取消冷卻期間，無法建立新配對');
        state.selectedBooking = `applicant-${index}`; state.applicant = index;
        booking(); state.matchedBookingId = state.selectedBooking;
        toast('已建立示意配對，等待雙方分別確認見面'); locate();
      });
      on('婉拒', (_, el, index) => { state.applicant = index; open('PG08'); });
    }
    if (['PC04', 'PC10', 'PC22'].includes(base)) {
      const validForm = () => !!read('服務地址') && +read('照護費（NT$）') > 0 &&
        validTime(read('開始時間'), read('結束時間')) && !!read('寵物資訊') && !/建立|選擇/.test(read('寵物資訊'));
      refreshers.push(() => disableNames(['送出需求', '更新需求', '儲存修改'], !validForm()));
      on(['送出需求', '更新需求', '儲存修改'], () => {
        if (!validForm()) return toast('請填寫地址、寵物、照護費及有效時間');
        saveForm(); state.lastDemand = { ...form, prototype: true };
        if (base === 'PC10') { if (cooldown()) return toast('此保母目前無法接受新預約'); go('PC10-1'); }
        else { toast('示意需求已儲存'); go('PC03'); }
      });
    }
    if (screen === 'PC10-1') on('確認付款', () => {
      if (cooldown()) return toast('此保母目前無法接受新預約');
      state.selectedBooking = 'prototype-booking'; booking().payment = 'prototype_only';
      toast('僅建立示意預約，未進行真實扣款'); locate();
    });
    if (base === 'PC09') {
      on('booked disabled slot', () => {}); disableNames('booked disabled slot', true);
      on('available slot', (_, el) => {
        if (cooldown()) return toast('保母取消冷卻期間，時段不可預約');
        state.selectedSlot = domText(el); el.setAttribute('aria-pressed', 'true');
      });
      on('下一步，填寫需求', () => {
        if (cooldown()) return toast('保母取消冷卻期間，時段不可預約');
        const times = (state.selectedSlot || '09:00–12:00').split(/[–-]/);
        Object.assign(state.forms.PC10 ||= {}, { 開始時間: times[0], 結束時間: times[1], 服務日期: dayString(2026, 12, state.calendar?.day || 16) }); go('PC10');
      });
    }
    if (base === 'BPC07') {
      const saveNames = ['新增可服務時段', '儲存可服務時段', '儲存時段'];
      refreshers.push(() => disableNames(saveNames, !validTime(read('開始時間'), read('結束時間'))));
      on(saveNames, () => {
        const start = read('開始時間'), end = read('結束時間');
        if (!validTime(start, end)) return toast('結束時間必須晚於開始時間');
        const date = dayString(state.calendar?.year || 2026, state.calendar?.month || 12, state.calendar?.day || 16);
        const occupied = nodes.filter(({ n }) => ['available slot', 'booked disabled slot'].includes(n.n))
          .map(({ n }) => textOf(n).match(/(\d{2}:\d{2})[–-](\d{2}:\d{2})/)).filter(Boolean);
        if ((state.calendar?.day || 16) === 16 && occupied.some(s => minutes(start) < minutes(s[2]) && minutes(end) > minutes(s[1]))) return toast('此時段與已設定或已配對時段重疊');
        if (state.availability.some(s => s.date === date && minutes(start) < minutes(s.end) && minutes(end) > minutes(s.start))) return toast('此時段與已儲存時段重疊');
        state.availability.push({ date, start, end, prototype: true }); toast('已儲存示意可服務時段');
      });
      on('booked disabled slot', () => {}); disableNames('booked disabled slot', true);
    }

    if (base === 'PC11' || base === 'BPC04') {
      const rows = nodes.filter(({ n }) => n.t === 'FRAME' && /(?:預約|案件|booking).*\d/i.test(n.n));
      rows.forEach(({ n }, index) => {
        const el = byElementId.get(n.id); if (!el) return;
        const ordinal = +(n.n.match(/\d+$/)?.[0] || index);
        const id = `fixture-${ordinal + 1}`; el.dataset.bookingId = id;
        const select = () => { state.selectedBooking = id; };
        el.addEventListener('pointerdown', select, true); cleanups.push(() => el.removeEventListener('pointerdown', select, true));
        if (state.locateBooking === id || state.locateBooking && !/^fixture-/.test(state.locateBooking) && ordinal === 0) {
          el.dataset.bookingId = state.locateBooking; el.style.outline = '2px solid #0b6b3a'; el.tabIndex = -1;
          el.scrollIntoView?.({ block: 'center' }); el.focus?.({ preventScroll: true });
        }
        const filter = state.filters[screen];
        if (filter?.status && filter.status !== '全部' && !state.locateBooking) {
          const rowNodes = nodes.filter(e => e.parent === tree && e.n.y >= n.y && e.n.y < n.y + n.h && e.n.x >= n.x && e.n.x < n.x + n.w);
          const show = rowNodes.some(e => e.n.text === filter.status);
          rowNodes.forEach(e => { const node = byElementId.get(e.n.id); if (node) node.hidden = !show; });
        }
      });
      on(['確認已見面', '確認見面'], () => open(state.role === 'sitter' ? 'PG05-1' : 'PG05'));
      on(['立即完成', '完成並評價', '留下評價'], () => open('PG07-1'));
      on(['取消案件', '取消配對'], () => open(state.role === 'sitter' ? 'PG09-2' : now() >= booking().startsAt - 3 * DAY ? 'PG09-1' : 'PG09'));
      if (base === 'BPC04') on('管理案件', () => open('PG09-2'));
      on('提醒我', () => toast('已記錄本次示意提醒，未建立系統通知'));
    }
    if (screen === 'PG05' || screen === 'PG05-1') {
      refreshers.push(() => disableNames('確認已見面', !agreed()));
      on('確認已見面', () => {
        if (!agreed()) return;
        const b = booking(); b[screen === 'PG05-1' ? 'sitterMet' : 'ownerMet'] = true;
        b.status = b.ownerMet && b.sitterMet ? 'upcoming' : 'meeting_pending';
        if (b.status === 'upcoming') { close(); toast('雙方均已確認，示意預約進入即將服務'); }
        else open('PG05-2');
      });
    }
    if (screen === 'PG05-2') {
      disableNames(['已確認見面', '確認已見面'], true); on(['已確認見面', '確認已見面'], () => {});
      on('返回', () => { close(); if (api.screen === 'PG05' || api.screen === 'PG05-1') close(); });
    }
    if (screen === 'PG06' || screen === 'PG06-1') {
      refreshers.push(() => disableNames('接受需求', !agreed() || cooldown()));
      on('接受需求', () => {
        if (!agreed() || cooldown()) return;
        booking().status = 'meeting_pending'; close(); go('BPC04'); toast('示意案件已接受，等待雙方確認見面');
      });
    }
    if (['PC12', 'BPC03'].includes(base)) on('取消配對', () => open(state.role === 'sitter' ? 'PG09-2' : now() >= booking().startsAt - 3 * DAY ? 'PG09-1' : 'PG09'));
    if (/^PG09(?:-1|-2)?$/.test(screen)) {
      const blocked = () => screen === 'PG09-1' || (screen !== 'PG09-2' && now() >= booking().startsAt - 3 * DAY) || now() >= booking().startsAt;
      disableNames(['確認取消', '不可取消'], blocked());
      on('確認取消', () => {
        const b = booking(); if (blocked() || b.status === 'cancelled') return;
        b.status = 'cancelled'; b.cancelledAt = now();
        if (screen === 'PG09-2') {
          const c = state.cancellation;
          c.strikes = c.lastAt && now() - c.lastAt < 30 * DAY ? c.strikes + 1 : 1;
          c.lastAt = now(); c.days = [1, 3, 7][Math.min(c.strikes, 3) - 1]; c.blockedUntil = now() + c.days * DAY;
          b.cooldown = { ...c }; toast(`示意案件已取消，新配對冷卻 ${c.days} 天`);
        } else { b.reopenAt = now() + DAY; toast('示意配對已取消，24 小時後可重新媒合'); }
        close(); go(screen === 'PG09-2' ? 'BPC04' : 'PC03');
      });
      on(['保留預約', '保留案件', '保留配對'], () => close());
    }
    if (screen === 'PG19') {
      on(['確認刪除', '確認取消'], () => { state.deletedDemands ||= []; state.deletedDemands.push(state.deleteDemand); close(); go('PC03'); });
      on('保留配對', () => close());
    }
    if (screen === 'PG08') {
      on(['已找到保母，謝謝', '時間不適合', '需求已調整', '暫不需要服務'], (_, el) => { state.declineReason = el.dataset.name; paintChoice(el, true); });
      on('確認婉拒', () => { state.declinedApplicants ||= []; state.declinedApplicants.push(state.applicant); close(); toast('已婉拒此示意申請'); });
    }
    if (screen === 'PG07' || screen === 'PG07-1') {
      const stars = nodes.filter(({ n }) => /^評分 [1-5] 星$/.test(n.n));
      let rating = state.ratings?.[screen] ?? stars.filter(({ n }) => textOf(n).includes('★')).length;
      stars.forEach(({ n }) => onElement(byElementId.get(n.id), () => {
        rating = +n.n.match(/\d/)[0]; (state.ratings ||= {})[screen] = rating;
        stars.forEach(({ n: s }) => {
          const label = byElementId.get(s.id)?.querySelector('.copaws-render-text-content');
          if (label) { label.textContent = +s.n.match(/\d/)[0] <= rating ? '★' : '☆'; label.style.color = +s.n.match(/\d/)[0] <= rating ? '#e6a423' : '#9ca39b'; }
        });
      }));
      on('確認完成', () => {
        if (!(rating >= 1 && rating <= 5)) return toast('請選擇星級');
        const b = booking(); b.rating = rating; b.status = 'completed';
        close(); toast('示意評價已儲存，未執行真實撥款');
      });
    }

    if (base === 'PC23') on(['儲存寵物資料', '儲存'], () => {
      const name = read('寵物名稱'); if (!name) return toast('請輸入寵物名稱');
      state.pets ||= []; state.pets.push({ name, prototype: true }); state.selectedPet = name;
      if (state.petReturn) {
        const target = state.petReturn; state.petReturn = null;
        (state.forms[family(target.origin)] ||= {})[target.field.replace(/ field$/, '')] = name;
        go(target.origin === 'PC04-1' ? 'PC04' : target.origin);
      } else go('PC16');
    });
    if (screen === 'PG17') {
      on(['傳送驗證碼', '傳送簡訊'], () => { state.passwordOtpSent = true; toast('示意驗證碼為 123456，未傳送真實簡訊'); });
      on(['驗證並繼續', '驗證身分'], () => {
        if (read('手機驗證碼') !== '123456' && read('驗證碼') !== '123456') return toast('請輸入示意驗證碼 123456');
        state.passwordVerified = true; state.passwordDepth = (state.passwordDepth || 0) + 1; open('PG17-1');
      });
    }
    if (screen === 'PG17-1') on(['儲存變更', '確認變更'], () => {
      if (!state.passwordVerified) { toast('請先完成示意手機驗證'); return open('PG17'); }
      const password = read('新密碼'), confirmation = read('確認新密碼') || read('確認密碼');
      if (!password || password !== confirmation) return toast('兩次密碼需一致且不可空白');
      state.passwordVerified = false;
      if (api.state.fields) Object.keys(api.state.fields).filter(key => /PG17.*密碼/.test(key)).forEach(key => delete api.state.fields[key]);
      state.passwordDepth = (state.passwordDepth || 0) + 1; open('PG17-2');
    });
    if (screen === 'PG17-2') on('完成', () => {
      for (let i = 0; i < (state.passwordDepth || 0); i++) api.close();
      state.passwordDepth = 0;
      if (/^PG17/.test(api.screen)) go(state.role === 'sitter' ? 'BPC08' : 'PC15');
      else global.bindCopawsFlows(api);
    });
    if (base === 'PC01') {
      on('傳送驗證碼', () => { state.otpSent = true; toast('示意驗證碼為 123456，未傳送真實簡訊'); });
      on('驗證並繼續', () => {
        const digits = Array.from({ length: 6 }, (_, i) => domText(named(`OTP digit ${i}`)[0])).join('');
        if (digits !== '123456') return go('PC01-1');
        state.authFixture = true; toast('已通過示意驗證，未登入正式帳號'); go('PC02');
      });
    }
    if (base === 'PC02') {
      refreshers.push(() => disableNames('完成註冊', !agreed() || !read('本名')));
      on('完成註冊', () => { if (!agreed() || !read('本名')) return; state.registeredFixture = true; toast('已完成示意資料，未建立真實帳號'); go('PC06'); });
      on(['服務條款', '隱私政策'], () => toast('此原型未接正式條款文件，請勿輸入真實個資'));
    }
    if (['PC14', 'BPC12'].includes(base)) on('送出', () => {
      const value = read('訊息') || read('留言'); if (!value) return toast('請先輸入訊息');
      (state.messages ||= []).push({ bookingId: state.selectedBooking, text: value, prototype: true });
      setField(field('訊息') ? '訊息' : '留言', ''); toast('示意訊息已送出，未傳送至真人');
    });
    if (['PC14', 'BPC12'].includes(base)) on(['好的沒問題', '稍等我回覆您'], (_, el) => setField('留言', el.dataset.name));
    if (['PC18', 'PC19'].includes(base)) on('立即完成', () => open('PG07-1'));
    if (/^PG15(?:-\d)?$/.test(screen)) {
      on('變更密碼', () => { state.passwordDepth = 1; open('PG17'); });
      on('登出', () => open('PG18'));
      on(['切換保母模式', '切換飼主模式'], () => open('PG16'));
    }
    if (screen === 'PG16') {
      on(['飼主', '寵物保母'], (_, el) => {
        state.nextRole = el.dataset.name === '飼主' ? 'owner' : 'sitter';
        ['飼主', '寵物保母'].forEach(name => named(name).forEach(c => paintChoice(c, c === el)));
      });
      on('確認切換', () => {
        const role = state.nextRole || (state.role === 'owner' ? 'sitter' : 'owner');
        if (role === 'sitter' && api.state.sitterApproved === false) return open('PG16-1');
        state.role = role; api.state.role = role; go(role === 'sitter' ? 'BPC01' : 'PC06');
      });
    }
    if (screen === 'PG18') on(['登出', '確認登出'], () => { state.authFixture = false; go('PC01'); toast('已離開示意帳號，未操作正式登入服務'); });
    if (['PC17', 'BPC09', 'BPC06'].includes(base)) on(['送出審核', '送出資料審核', '儲存變更', '送出回報'], () => {
      if (base === 'PC17' && !agreed()) return toast('請先確認審核條款');
      saveForm(); toast('已儲存本次示意資料，未提交正式服務'); go(base === 'BPC06' ? 'BPC05' : base === 'PC17' ? 'PC15-1' : 'BPC08');
    });
    update();
  }

  global.bindCopawsFlows = bindCopawsFlows;
})(window);
