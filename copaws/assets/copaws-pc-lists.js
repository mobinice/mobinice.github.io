(() => {
  const ownerNames=['小安','雅婷','志明','冠宇','怡君','小晴','家豪','欣怡','柏翰','詠晴','子軒','雅雯','宇翔','婉婷','品妤','承恩','芷晴','冠廷','佩珊','怡萱','建宏','美玲','育誠','佳穎'];
  const sitterNames=['Mina Chen','小芸','柏宇','Nina Lin','阿哲','小雨','Emma Wu','張維','Lulu','Sam Chen','怡君','小晴','宇翔','婉婷','家豪','欣怡','芷晴','冠廷','佩珊','怡萱','建宏','美玲','育誠','佳穎'];
  window.bindCopawsLists = api => {
    const {screen,root,trees,state}=api;
    const isMap=['PC07','BPC02'].includes(screen), isPage=['PC07-1','BPC02-1'].includes(screen);
    if(!isMap&&!isPage)return;
    const sitter=screen.startsWith('BPC'), labels=sitter?ownerNames:sitterNames;
    const setText=(el,value)=>{const span=el?.querySelector('.copaws-render-text-content');if(span)span.textContent=value;};
    const select=(name)=>{state.person=name;api.go(sitter?'BPC03':'PC08');};
    if(isMap){
      const x=860.248,y=282,w=488.607,h=548;
      const list=document.createElement('div');list.className='pc-nearby-scroll';list.setAttribute('aria-label',sitter?'附近飼主':'附近寵物保母');
      Object.assign(list.style,{position:'absolute',left:x/1440*100+'%',top:y+'px',width:w/1440*100+'%',height:h+'px',overflowY:'auto',scrollbarWidth:'none'});
      root.append(list);
      const listNodes=trees[screen].c.filter(n=>n.x>=x-.01&&n.x+n.w<=1350&&n.y>=y&&n.y+n.h<=821);
      const templates=listNodes.filter(n=>n.y>=374&&n.y<453);
      for(const node of listNodes){const el=root.querySelector(`[data-node-id="${node.id}"]`);if(!el)continue;el.style.left=(node.x-x)/w*100+'%';el.style.top=node.y-y+'px';el.style.width=node.w/w*100+'%';list.append(el);}
      for(let index=6;index<20;index++)for(const node of templates){
        const original=root.querySelector(`[data-node-id="${node.id}"]`);if(!original)continue;
        const el=original.cloneNode(true);el.dataset.nodeId=node.id+'-fixture-'+index;el.style.top=node.y-374+index*92+'px';
        if(node.t==='TEXT'&&node.y===377)setText(el,labels[index]);
        if(node.t==='TEXT'&&node.text?.includes('km'))setText(el,(.8+index*.4).toFixed(1)+' km');
        list.append(el);
      }
      for(let index=0;index<20;index++){
        const hit=document.createElement('div');Object.assign(hit.style,{position:'absolute',left:'0',top:index*92+'px',width:'100%',height:'78px'});
        api.clickable(hit,()=>select(labels[index]),labels[index]);list.append(hit);
      }
      list.scrollTop=state[screen+'Scroll']||0;
      list.onscroll=()=>{state[screen+'Scroll']=list.scrollTop;const thumb=api.names('nearby list scroll thumb')[0];if(thumb)thumb.style.top=(282+384*list.scrollTop/(list.scrollHeight-h))+'px';};
      api.bind('selected person preview',()=>select(labels[0]));
    }
    if(isPage){
      const container=trees[screen].c.find(n=>n.n==='內容捲動區');if(!container)return;
      const rows=container.c.filter(n=>n.t==='TEXT'&&/^#\d+$/.test(n.text||''));
      let page=state[screen+'Page']||1;
      const apply=(newPage)=>{
        page=Math.min(3,Math.max(1,newPage));state[screen+'Page']=page;
        rows.forEach((row,index)=>{
          const offset=(page-1)*8+index;
          const el=root.querySelector(`[data-node-id="${row.id}"]`);setText(el,'#'+(offset+1));
          const nameNode=container.c.find(n=>n.t==='TEXT'&&Math.abs(n.y-(row.y-11))<1&&n.x>200&&n.x<500);
          if(nameNode)setText(root.querySelector(`[data-node-id="${nameNode.id}"]`),labels[offset]);
        });
        for(const node of container.c.filter(n=>n.t==='FRAME'&&n.y===714&&/^\d$/.test(n.n))){
          const el=root.querySelector(`[data-node-id="${node.id}"]`);el?.setAttribute('aria-current',+node.n===page?'page':'false');
          const paint=el?.querySelector('.copaws-render-paint');if(paint)paint.style.backgroundColor=+node.n===page?'#0b6b3a':'white';
          const text=el?.querySelector('.copaws-render-text-content');if(text)text.style.color=+node.n===page?'white':'#0b6b3a';
        }
        const description=[...root.querySelectorAll('.copaws-render-text-content')].find(el=>/^第 1 頁/.test(el.textContent)||/^第 [123] 頁/.test(el.textContent));
        if(description)description.textContent=`第 ${page} 頁 · 顯示 ${(page-1)*8+1}–${page*8} / 24`;
      };
      for(const node of container.c.filter(n=>n.t==='FRAME'&&n.n==='›'&&n.y<700)){
        const index=Math.round((node.y-32)/80),el=root.querySelector(`[data-node-id="${node.id}"]`);
        api.clickable(el,()=>select(labels[(page-1)*8+index]),`查看${labels[index]}`);
      }
      for(const node of container.c.filter(n=>n.t==='FRAME'&&n.y===714)){
        const el=root.querySelector(`[data-node-id="${node.id}"]`);
        api.clickable(el,()=>apply(/^\d$/.test(node.n)?+node.n:page+(node.n==='›'?1:-1)),node.n==='›'?'下一頁':node.n==='‹'?'上一頁':`第${node.n}頁`);
      }
      if(page!==1)apply(page);
    }
  };
})();
