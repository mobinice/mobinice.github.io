(function (global) {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const scriptURL = document.currentScript && document.currentScript.src;
  const assetBase = new URL('.', scriptURL || new URL('assets/', document.baseURI));
  const appIconHash = 'bc9c27c06591589608565c65785a0924ee1d4d5b';
  let serial = 0;
  const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const px = v => `${number(v)}px`;
  const type = p => String(p.t || p.type || '').toUpperCase();
  const shown = p => p.visible !== false;
  const opacity = p => number(p.o ?? p.opacity, 1);
  const svg = tag => document.createElementNS(SVG, tag);

  function color(c, alpha = 1) {
    const values = Array.isArray(c) ? c : [number(c?.r) * 255, number(c?.g) * 255, number(c?.b) * 255, c?.a ?? 1];
    return `rgba(${number(values[0])}, ${number(values[1])}, ${number(values[2])}, ${number(values[3], 1) * alpha})`;
  }

  function stops(p) {
    return (p.stops || p.gradientStops || []).map(s => ({ position: number(s.p ?? s.position), color: color(s.c || s.color) }));
  }

  function gradient(p, n) {
    const list = stops(p);
    const m = p.transform || p.gradientTransform || [[1, 0, 0], [0, 1, 0]];
    const w = Math.max(number(n.w, 1), 0.001), h = Math.max(number(n.h, 1), 0.001);
    if (type(p) === 'GRADIENT_LINEAR') {
      // Figma's transform maps normalized node coordinates into gradient space.
      const gx = m[0][0] / w, gy = m[0][1] / h;
      const norm = Math.hypot(gx, gy) || 1;
      const extent = Math.abs(gx / norm) * w + Math.abs(gy / norm) * h;
      const center = m[0][0] / 2 + m[0][1] / 2 + m[0][2];
      const angle = Math.atan2(gx, -gy) * 180 / Math.PI;
      return `linear-gradient(${angle}deg, ${list.map(s => `${s.color} ${50 + 100 * (s.position - center) / (norm * extent)}%`).join(', ')})`;
    }
    return null;
  }

  function imageURL(p, n) {
    const hash = p.hash || p.imageHash;
    if (hash === appIconHash) return new URL('copaws-a-plan-icon.png', assetBase).href;
    const entry = global.CopawsImageAssets?.[hash];
    if (hash === '4016ec24653a6dd170f0f13a0ee595f084b56ebc' && n.w > 0 && n.h > 0 && Math.abs(n.w / n.h - 1) < 0.05) {
      return entry?.square || new URL('copaws-pc-mina-square.png', assetBase).href;
    }
    return typeof entry === 'string' ? entry : entry?.url || entry?.src;
  }

  function background(p, n, el) {
    if (type(p) === 'SOLID') el.style.backgroundColor = color(p.c || p.color);
    else if (type(p) === 'IMAGE') {
      const url = imageURL(p, n);
      if (!url) { el.dataset.missingImageHash = p.hash || p.imageHash || ''; return; }
      el.style.backgroundImage = `url(${JSON.stringify(url)})`;
      const mode = String(p.mode || p.scaleMode || 'FILL').toUpperCase();
      el.style.backgroundSize = mode === 'FIT' ? 'contain' : mode === 'TILE' ? 'auto' : 'cover';
      if (mode === 'TILE') el.style.backgroundRepeat = 'repeat';
      if (mode === 'CROP' && p.transform) {
        const m = p.transform;
        // Axis-aligned exported image crops; non-axis transforms remain explicit.
        if (m[0][1] === 0 && m[1][0] === 0 && m[0][0] && m[1][1]) {
          el.style.backgroundSize = `${100 / m[0][0]}% ${100 / m[1][1]}%`;
          const pos = (scale, offset) => scale === 1 ? 0 : -100 * offset / (1 - scale);
          el.style.backgroundPosition = `${pos(m[0][0], m[0][2])}% ${pos(m[1][1], m[1][2])}%`;
        } else el.dataset.unsupportedImageTransform = JSON.stringify(m);
      }
    } else if (type(p) === 'GRADIENT_RADIAL' || type(p) === 'GRADIENT_ANGULAR') {
      const layer = document.createElement('div');
      layer.style.position = 'absolute'; layer.style.inset = '0';
      const list = stops(p).map(s => `${s.color} ${s.position * 100}%`).join(', ');
      layer.style.backgroundImage = type(p) === 'GRADIENT_RADIAL' ? `radial-gradient(ellipse 50% 50% at 50% 50%, ${list})` : `conic-gradient(from 90deg, ${list})`;
      const m = p.transform || p.gradientTransform || [[1,0,0],[0,1,0]];
      const [a,b,c] = m[0], [d,e,f] = m[1], det = a*e-b*d;
      if (det) {
        const w = number(n.w,1), h = number(n.h,1);
        layer.style.transformOrigin = '0 0';
        layer.style.transform = `matrix(${e/det},${-d/det*h/w},${-b/det*w/h},${a/det},${(b*f-e*c)/det*w},${(d*c-a*f)/det*h})`;
      }
      el.append(layer);
    } else {
      const css = gradient(p, n);
      if (css) el.style.backgroundImage = css;
      else el.dataset.unsupportedPaint = type(p);
    }
  }

  function radius(n) {
    if (n.t === 'ELLIPSE') return '50%';
    const r = n.r ?? n.cornerRadius ?? n.rectangleCornerRadii ?? 0;
    return Array.isArray(r) ? r.map(px).join(' ') : px(r);
  }

  function paintLayers(n, el) {
    // Figma lists the topmost paint first; DOM paint order is back to front.
    for (const p of (n.f || []).filter(shown).slice().reverse()) {
      const layer = document.createElement('div');
      layer.className = 'copaws-render-paint';
      layer.setAttribute('aria-hidden', 'true');
      layer.style.opacity = opacity(p);
      background(p, n, layer);
      el.append(layer);
    }
  }

  function boxStrokes(n, el) {
    const width = number(n.sw ?? n.strokeWeight);
    if (!width) return;
    for (const p of (n.s || []).filter(shown).slice().reverse()) {
      const layer = document.createElement('div');
      layer.className = 'copaws-render-stroke';
      layer.setAttribute('aria-hidden', 'true');
      const alignment = n.sa || n.strokeAlign || 'INSIDE';
      const outset = alignment === 'OUTSIDE' ? width : alignment === 'CENTER' ? width / 2 : 0;
      if (type(p) === 'SOLID') {
        const c = color(p.c || p.color, opacity(p));
        layer.style.boxShadow = alignment === 'INSIDE' ? `inset 0 0 0 ${width}px ${c}` : alignment === 'OUTSIDE' ? `0 0 0 ${width}px ${c}` : `inset 0 0 0 ${width / 2}px ${c}, 0 0 0 ${width / 2}px ${c}`;
      } else {
        layer.style.inset = px(-outset);
        layer.style.width = `calc(100% + ${outset * 2}px)`;
        layer.style.height = `calc(100% + ${outset * 2}px)`;
        layer.style.padding = px(width);
        layer.style.opacity = opacity(p);
        background(p, n, layer);
        layer.style.mask = 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)';
        layer.style.maskComposite = 'exclude';
      }
      el.append(layer);
    }
  }

  function vector(n, el) {
    const canvas = svg('svg');
    canvas.classList.add('copaws-render-vector');
    canvas.setAttribute('viewBox', `0 0 ${Math.max(number(n.w), 0.001)} ${Math.max(number(n.h), 0.001)}`);
    canvas.setAttribute('preserveAspectRatio', 'none');
    canvas.setAttribute('aria-hidden', 'true');
    const defs = svg('defs'); canvas.append(defs);
    function paint(p) {
      if (type(p) === 'SOLID') return color(p.c || p.color, opacity(p));
      if (type(p) === 'GRADIENT_LINEAR' || type(p) === 'GRADIENT_RADIAL') {
        const g = svg(type(p) === 'GRADIENT_LINEAR' ? 'linearGradient' : 'radialGradient');
        const id = `copaws-gradient-${++serial}`; g.id = id;
        const m = p.transform || [[1, 0, 0], [0, 1, 0]];
        const [a,b,c] = m[0], [d,e,f] = m[1], det = a*e-b*d;
        if (det) g.setAttribute('gradientTransform', `matrix(${e/det} ${-d/det} ${-b/det} ${a/det} ${(b*f-e*c)/det} ${(d*c-a*f)/det})`);
        if (type(p) === 'GRADIENT_LINEAR') { g.setAttribute('y1', '.5'); g.setAttribute('y2', '.5'); }
        for (const s of stops(p)) { const stop = svg('stop'); stop.setAttribute('offset', s.position); stop.setAttribute('stop-color', s.color); stop.setAttribute('stop-opacity', opacity(p)); g.append(stop); }
        defs.append(g); return `url(#${id})`;
      }
      canvas.dataset.unsupportedPaint = type(p); return 'none';
    }
    const paths = (n.paths || n.vectorPaths || []).map(p => {
      const path = svg('path'); path.setAttribute('d', p.data || p.d || '');
      path.setAttribute('fill-rule', p.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero');
      path.setAttribute('clip-rule', p.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero');
      return path;
    });
    if (n.t === 'LINE' && !paths.length) {
      const line = svg('path'); line.setAttribute('d', `M 0 0 L ${number(n.w)} ${number(n.h)}`); paths.push(line);
    }
    for (const p of (n.f || []).filter(shown).slice().reverse()) for (const original of paths) {
      const path = original.cloneNode(); path.setAttribute('fill', paint(p)); canvas.append(path);
    }
    for (const p of (n.s || []).filter(shown).slice().reverse()) {
      const alignment = n.t === 'LINE' ? 'CENTER' : n.sa || 'CENTER', id = `copaws-stroke-${++serial}`;
      if (alignment === 'INSIDE') {
        const clip = svg('clipPath'); clip.id = id;
        paths.forEach(path => clip.append(path.cloneNode())); defs.append(clip);
      } else if (alignment === 'OUTSIDE') {
        const mask = svg('mask'); mask.id = id;
        mask.setAttribute('x', '-100%'); mask.setAttribute('y', '-100%'); mask.setAttribute('width', '300%'); mask.setAttribute('height', '300%');
        const rect = svg('rect'); rect.setAttribute('x','-100%'); rect.setAttribute('y','-100%'); rect.setAttribute('width','300%'); rect.setAttribute('height','300%'); rect.setAttribute('fill','white'); mask.append(rect);
        paths.forEach(path => { const copy = path.cloneNode(); copy.setAttribute('fill','black'); mask.append(copy); }); defs.append(mask);
      }
      for (const original of paths) {
        const path = original.cloneNode(); path.setAttribute('fill', 'none'); path.setAttribute('stroke', paint(p));
        path.setAttribute('stroke-width', number(n.sw, 1) * (alignment === 'CENTER' ? 1 : 2));
        path.setAttribute('stroke-linecap', String(n.strokeCap || 'butt').toLowerCase());
        path.setAttribute('stroke-linejoin', String(n.strokeJoin || 'miter').toLowerCase());
        if (n.dashPattern) path.setAttribute('stroke-dasharray', n.dashPattern.join(' '));
        if (alignment === 'INSIDE') path.setAttribute('clip-path', `url(#${id})`);
        if (alignment === 'OUTSIDE') path.setAttribute('mask', `url(#${id})`);
        canvas.append(path);
      }
    }
    el.append(canvas);
  }

  function textNode(n, el) {
    el.classList.add('copaws-render-text');
    el.style.fontFamily = '"Inter", "PingFang TC", sans-serif';
    el.style.fontSize = px(n.size ?? 16);
    el.style.fontWeight = number(n.weight, 400);
    el.style.fontStyle = n.italic ? 'italic' : 'normal';
    el.style.lineHeight = n.lh?.unit === 'PIXELS' ? px(n.lh.value) : n.lh?.unit === 'PERCENT' ? String(n.lh.value / 100) : 'normal';
    el.style.letterSpacing = n.ls?.unit === 'PERCENT' ? `${n.ls.value / 100}em` : px(n.ls?.value);
    el.style.textAlign = String(n.align || 'LEFT').toLowerCase();
    el.style.justifyContent = n.valign === 'CENTER' ? 'center' : n.valign === 'BOTTOM' ? 'flex-end' : 'flex-start';
    const content = document.createElement('span');
    content.className = 'copaws-render-text-content';
    content.textContent = n.text ?? '';
    if (n.auto === 'WIDTH_AND_HEIGHT') {
      content.style.whiteSpace = 'pre';
      content.style.overflowWrap = 'normal';
    }
    const fills = (n.f || []).filter(shown);
    if (fills.length === 1 && type(fills[0]) === 'SOLID') content.style.color = color(fills[0].c || fills[0].color, opacity(fills[0]));
    else if (fills.length) {
      content.style.color = 'transparent';
      content.style.backgroundImage = fills.map(p => type(p) === 'SOLID' ? `linear-gradient(${color(p.c || p.color, opacity(p))}, ${color(p.c || p.color, opacity(p))})` : gradient(p,n)).filter(Boolean).join(', ');
      content.style.backgroundClip = 'text'; content.style.webkitBackgroundClip = 'text';
    } else content.style.color = 'transparent';
    if (n.textDecoration) content.style.textDecoration = String(n.textDecoration).toLowerCase().replace('_','-');
    el.append(content);
  }

  function effects(n, el) {
    const shadows = [];
    for (const e of (n.e || n.effects || []).filter(shown)) {
      const t = type(e), offset = e.offset || {};
      if (t === 'DROP_SHADOW' || t === 'INNER_SHADOW') shadows.push(`${t === 'INNER_SHADOW' ? 'inset ' : ''}${px(offset.x ?? e.x)} ${px(offset.y ?? e.y)} ${px(e.radius ?? e.r)} ${px(e.spread)} ${color(e.color || e.c, opacity(e))}`);
      if (t === 'LAYER_BLUR') el.style.filter = `blur(${px(e.radius ?? e.r)})`;
      if (t === 'BACKGROUND_BLUR') el.style.backdropFilter = `blur(${px(e.radius ?? e.r)})`;
    }
    if (shadows.length) el.style.boxShadow = shadows.join(', ');
  }

  function node(n, parent, root) {
    const el = document.createElement('div');
    el.className = root ? 'copaws-render-node copaws-render-root' : 'copaws-render-node';
    el.dataset.nodeId = String(n.id ?? ''); el.dataset.name = String(n.n ?? ''); el.dataset.nodeType = n.t;
    if (root) {
      el.style.position = 'relative'; el.style.width = '100%';
      el.style.maxWidth = px(Math.min(number(n.w,1440),1440));
    } else {
      const relative = v => parent.w ? `${number(v) / parent.w * 100}%` : px(v);
      el.style.left = relative(n.x); el.style.top = px(n.y); el.style.width = relative(n.w);
    }
    el.style.height = px(n.h); el.style.borderRadius = radius(n);
    el.style.opacity = opacity(n);
    if (n.visible === false) el.hidden = true;
    const rotation = number(n.rotation ?? n.rot);
    if (rotation) el.style.transform = `rotate(${-rotation}deg)`;
    const overflow = n.scroll ?? n.overflowDirection ?? n.overflow ?? n.od;
    if (overflow === 'VERTICAL' || overflow === 'VERTICAL_SCROLLING') { el.style.overflowY = 'auto'; el.style.overflowX = 'hidden'; }
    else if (overflow === 'HORIZONTAL' || overflow === 'HORIZONTAL_SCROLLING') { el.style.overflowX = 'auto'; el.style.overflowY = 'hidden'; }
    else if (overflow === 'BOTH' || overflow === 'HORIZONTAL_AND_VERTICAL_SCROLLING') el.style.overflow = 'auto';
    else el.style.overflow = n.clip || root ? 'hidden' : 'visible';
    if (n.t === 'TEXT') textNode(n, el);
    else if (n.paths?.length || n.vectorPaths?.length || n.t === 'LINE') vector(n, el);
    else { paintLayers(n, el); }
    effects(n, el);
    for (const child of n.c || []) el.append(node(child, n, false));
    if (!n.paths?.length && !n.vectorPaths?.length && n.t !== 'LINE') boxStrokes(n, el);
    return el;
  }

  global.CopawsRenderer = Object.freeze({
    render(tree, container) {
      if (!tree || !Number.isFinite(tree.w) || !Number.isFinite(tree.h) || !container?.appendChild) throw new TypeError('render requires a Figma node tree and a DOM container');
      const root = node(tree, null, true);
      container.appendChild(root);
      return root;
    }
  });
})(window);
