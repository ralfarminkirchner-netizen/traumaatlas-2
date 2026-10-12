import { positionsForGraph, incidentEdges, shortestPath, inspectGraphIntegrity, graphIdentitySignature } from './atlas-geometry.mjs';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES=['discipline','method','exercise','symptom','category','state','phase','block','profile','phenomenon'];
const COLORS={discipline:'#9aa8c7',method:'#d9a05b',exercise:'#7fb8a4',symptom:'#c98a8a',category:'#b48ea3',state:'#8fd0b8',phase:'#d4b483',block:'#a3b18a',profile:'#a98fc7',phenomenon:'#e9bf83'};
const SHAPES=[['constellation','Atlasordnung'],['sphere','Kugelkörper'],['wall','Gefaltete Wand'],['knot','Raumknoten']];
const css=`.ags{height:100%;min-height:440px;color:#e9eee8;font:12px/1.5 Inter,system-ui,sans-serif;background:#081720;border:1px solid #29444d;border-radius:9px;overflow:hidden;display:flex;flex-direction:column}.ags *{box-sizing:border-box}.ags button,.ags select,.ags input{font:inherit}.ags button{cursor:pointer;color:inherit}.ags button:focus-visible,.ags input:focus-visible,.ags select:focus-visible{outline:2px solid #eec77b;outline-offset:3px}.ags-top{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;padding:14px 17px;background:#10252e;border-bottom:1px solid #29444d}.ags-count{color:#9bbabf;font-size:10px;letter-spacing:.4px}.ags-shapes{display:flex;gap:5px;flex-wrap:wrap}.ags button{background:#132c35;border:1px solid #35525c;border-radius:4px;padding:7px 10px;font-size:10px;min-height:33px}.ags-shapes button[aria-pressed=true]{color:#102324;background:#bce3cc;border-color:#bce3cc}.ags-stage{display:grid;grid-template-columns:minmax(0,1fr) 260px;flex:1;min-height:340px}.ags-world{position:relative;min-width:0;min-height:380px;background:radial-gradient(ellipse at 50% 45%,#13363d,#07141c 72%);overflow:hidden}.ags canvas{width:100%;height:100%;display:block;touch-action:none;user-select:none}.ags-world-note{position:absolute;bottom:15px;left:17px;right:17px;pointer-events:none;display:flex;justify-content:space-between;color:#8daeb5;font-size:9px;gap:18px}.ags-tooltip{position:absolute;top:12px;left:16px;right:16px;pointer-events:none;color:#d6e2dc;font-size:11px;min-height:18px}.ags-inspector{border-left:1px solid #29444d;background:#10212a;padding:19px 17px;overflow:auto;max-height:690px}.ags-type{color:#b8d8c7;letter-spacing:1.5px;font-size:8px;text-transform:uppercase}.ags h2{font:normal 24px/1.18 Georgia,serif;margin:9px 0 12px;color:#f1ede1;overflow-wrap:anywhere}.ags-summary{color:#afc4c8;font-size:11px;line-height:1.8;margin:0 0 15px}.ags-id{color:#839da8;font-size:8px;overflow-wrap:anywhere;font-family:ui-monospace,monospace;margin-bottom:12px}.ags-source{font-size:9px;color:#8daaaf;border-top:1px solid #35515b;padding-top:12px;line-height:1.7}.ags-source a{color:#bfdfce}.ags-relations{margin-top:18px}.ags-relations h3{font-size:10px;color:#adc9cd;font-weight:500;letter-spacing:.5px;margin:0 0 9px}.ags-relation{display:block;text-align:left;width:100%;margin:5px 0!important;padding:8px 9px!important;color:#c5d5d6!important;background:#112b33!important;border-color:#2d4a52!important;white-space:normal;font-size:10px!important;line-height:1.6!important}.ags-relation small{display:block;color:#81a4a9;font-size:8px}.ags-form-controls{display:grid;grid-template-columns:1fr 1fr auto auto;align-items:center;gap:17px;padding:12px 17px;border-top:1px solid #29444d;background:#10252e}.ags-range label{display:flex;justify-content:space-between;font-size:9px;color:#a7c1c5;margin-bottom:8px;gap:10px}.ags-range input{width:100%;accent-color:#bce3cc;height:3px;margin:0;cursor:pointer}.ags-search{display:flex;gap:8px;padding:10px 17px;border-top:1px solid #29444d;background:#0c2029;align-items:center;flex-wrap:wrap}.ags-search select{color:#d5e3df;border:1px solid #33525a;background:#0f2932;border-radius:4px;padding:7px 9px;min-width:100px;flex:1;max-width:300px;font-size:10px}.ags-search label{font-size:9px;color:#97b2b7}.ags-search .ags-result{font-size:9px;color:#d4c59e;flex:1;min-width:130px}.ags-search input{accent-color:#bce3cc}.ags-path button{display:block;text-align:left;width:100%;margin-top:5px}.ags-empty{color:#b2cbd0;text-align:center;padding:35px 20px}.ags button:disabled{opacity:.45;cursor:default}.ags-error{padding:10px 17px;color:#e7c6ab;font-size:10px;border-top:1px solid #69483c}.ags-key{font-size:9px;color:#9bb5b7}.ags input[type=checkbox]{width:13px;height:13px}.ags-download{font-size:9px!important}@media(max-width:800px){.ags-stage{grid-template-columns:1fr}.ags-world{height:480px;min-height:320px;flex:none}.ags-inspector{border-left:none;border-top:1px solid #29444d;max-height:360px}.ags-form-controls{grid-template-columns:1fr 1fr;gap:12px}.ags-form-controls button{font-size:9px}.ags-world-note{font-size:8px}.ags h2{font-size:23px}.ags{min-height:680px}.ags-stage{min-height:0}}@media(max-width:460px){.ags-world{height:390px}.ags-top{padding:12px;gap:9px}.ags-shapes button{font-size:9px;padding:7px 8px}.ags-count{font-size:9px}.ags-search{padding:10px 12px}.ags-world-note span:last-child{display:none}}`;

function boundOf(positions){const list=Object.values(positions);return Math.max(1,...list.map(p=>Math.hypot(p.x,p.y,p.z)));}
export function projectGraph(graph,positions,{width=1000,height=650,yaw=.24,pitch=.14,zoom=1,panX=0,panY=0}={}){
  const bound=boundOf(positions),distance=bound*3.4,scale=Math.min(width,height)*.38/bound*zoom;
  const points=new Map();
  for(const node of graph.nodes){const p=positions[node.id];if(!p)continue;
    const x=p.x*Math.cos(yaw)+p.z*Math.sin(yaw),z=-p.x*Math.sin(yaw)+p.z*Math.cos(yaw);
    const y=p.y*Math.cos(pitch)-z*Math.sin(pitch),depth=p.y*Math.sin(pitch)+z*Math.cos(pitch);
    const factor=distance/(distance+depth);
    points.set(node.id,{x:width/2+x*scale*factor+panX,y:height/2-y*scale*factor+panY,depth,factor,world:p});
  }
  return {points,bound,distance};
}

export function frameSVG(graph,positions,options={}){
  const width=options.width||1000,height=options.height||650,selectedId=options.selectedId;
  const {points}=projectGraph(graph,positions,{...options,width,height});
  const edges=graph.edges.map(e=>{const a=points.get(e.from),b=points.get(e.to);if(!a||!b)return '';const hot=e.from===selectedId||e.to===selectedId;return `<line data-edge-id="${escape(e.id)}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${hot?'#e7cf8e':'#8ab9bd'}" stroke-opacity="${hot?.85:.21}" stroke-width="${hot?1.7:.8}"/>`;}).join('');
  const nodes=[...graph.nodes].sort((a,b)=>(points.get(b.id)?.depth||0)-(points.get(a.id)?.depth||0)).map(n=>{const p=points.get(n.id);if(!p)return '';return `<circle data-node-id="${escape(n.id)}" cx="${p.x}" cy="${p.y}" r="${n.id===selectedId?6:3.2}" fill="${escape(n.color||graph.nodeTypeMeta?.[n.type]?.color||COLORS[n.type]||'#bce3cc')}" stroke="${n.id===selectedId?'#f5d899':'#0a222a'}" stroke-width="${n.id===selectedId?2:1}"/>`;}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#091e27"/><g>${edges}</g><g>${nodes}</g><text x="25" y="30" font-size="12" fill="#bce3cc" font-family="sans-serif">PHÄNOMENATLAS · ${graph.nodes.length} Knoten · ${graph.edges.length} Beziehungen</text></svg>`;
}

export function mountAtlasSpace(host,{graph:initialGraph,onSelect,selectedId:initialSelected,visibleTypes:initialVisibleTypes=null}={}){
  let graph=initialGraph,selectedId=initialSelected||graph.nodes[0]?.id||null,hoverId=null,visibleTypes=initialVisibleTypes;
  let shape='constellation',deform=0,twist=0,overrides={},camera={yaw:.22,pitch:.12,zoom:1,panX:0,panY:0};
  let positions=positionsForGraph(graph,shape,{deform,twist,overrides}),fromPositions=positions,toPositions=positions,morphStart=0,morphFrame=0,travelFrame=0;
  let route=null,travelerId=selectedId,targetId=graph.nodes.at(-1)?.id||null,drag=null,nodeDragEnabled=false,disposed=false;
  let directed=false,width=1000,height=650,frame=null;
  let identity=graphIdentitySignature(graph);
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;
  host.innerHTML=`<style>${css}</style><section class="ags" aria-label="Originalnetz des Phänomenatlas räumlich formen"><div class="ags-top"><div class="ags-shapes">${SHAPES.map(([id,label])=>`<button type="button" data-shape="${id}" aria-pressed="${id===shape}">${label}</button>`).join('')}</div><span class="ags-count"></span></div><div class="ags-stage"><div class="ags-world"><canvas tabindex="0" aria-label="Drehbarer dreidimensionaler Atlasgraph; alle Gegenstände auch im Auswahlfeld erreichbar"></canvas><div class="ags-tooltip" role="status" aria-live="polite"></div><div class="ags-world-note"><span>Die Körper bestehen aus den ursprünglichen Knoten und Kanten.</span><span>Ziehen: drehen · Rad / zwei Finger: zoomen</span></div></div><aside class="ags-inspector"></aside></div><div class="ags-form-controls"><div class="ags-range"><label>Elastisch verformen <output data-output="deform">0 %</output></label><input type="range" min="0" max="100" value="0" data-control="deform" aria-label="Atlasnetz elastisch verformen"></div><div class="ags-range"><label>Im Raum verwinden <output data-output="twist">0 %</output></label><input type="range" min="0" max="100" value="0" data-control="twist" aria-label="Atlasnetz räumlich verwinden"></div><button type="button" data-action="drag" aria-pressed="false">Knoten ziehen</button><button type="button" data-action="reset">Ansicht einpassen</button></div><div class="ags-search"><label>Gegenstand <select data-control="node" aria-label="Originalen Atlasgegenstand auswählen"></select></label><label>Ziel <select data-control="target" aria-label="Ziel einer Bewegung im Originalnetz auswählen"></select></label><button type="button" data-action="path">Entlang der Beziehungen gehen</button><label class="ags-key"><input type="checkbox" data-control="directed"> Richtung beachten</label><span class="ags-result" role="status"></span><button type="button" data-action="svg" class="ags-download">Netz als SVG</button></div><div class="ags-error" hidden></div></section>`;
  const q=s=>host.querySelector(s),canvas=q('canvas'),ctx=canvas.getContext('2d');
  if(!ctx){host.innerHTML='<p>Die Graphzeichnung benötigt eine verfügbare Canvas-Fläche. Die Atlasinhalte bleiben über die bestehende Oberfläche erreichbar.</p>';return {setGraph(){},setSelected(){},setVisibleTypes(){},resetView(){},destroy(){host.innerHTML='';}};}

  function updateChoices(){
    const sorted=[...graph.nodes].sort((a,b)=>a.label.localeCompare(b.label,'de'));
    const options=sorted.map(n=>`<option value="${escape(n.id)}">${escape(n.label)}</option>`).join('');
    q('[data-control="node"]').innerHTML=options;q('[data-control="target"]').innerHTML=options;
    q('[data-control="node"]').value=selectedId||'';q('[data-control="target"]').value=targetId||'';
    q('.ags-count').textContent=`${graph.nodes.length} Originalknoten · ${graph.edges.length} Originalbeziehungen`;
    const report=inspectGraphIntegrity(graph);q('.ags-error').hidden=report.valid;
    q('.ags-error').textContent=report.valid?'':`Quellbefund: ${report.errors.join(' · ')}. Fehlende Gegenstände werden nicht erfunden.`;
  }
  function nodeById(id){return graph.nodes.find(n=>n.id===id);}
  function renderInspector(){
    const n=nodeById(selectedId),panel=q('.ags-inspector');
    if(!n){panel.innerHTML='<p class="ags-empty">Das Originalnetz enthält hier noch keine Gegenstände. Eine persönliche Konstellation wird nicht durch Beispieldaten ersetzt.</p>';return;}
    const relations=incidentEdges(graph,n.id),source=graph.source;
    const summary=n.summary||n.sub||n.label;
    const info=source?.kind==='ocean-instance'?`Originale Phänomen-Instanz · ${n.user?'freier Eintrag':'Atlas-bezogener Eintrag'}<br>${(n.links||[]).length} Mapping-Vorschläge · ${(n.confirmed||[]).length} gespeicherte Zuordnungen`:`Originalinhalt des Atlasbestands${source?.commit?` · Fassung ${escape(source.commit.slice(0,7))}`:''}`;
    panel.innerHTML=`<div class="ags-type">${escape(graph.nodeTypeMeta?.[n.type]?.label||n.type)}</div><h2>${escape(n.label)}</h2><div class="ags-id">${escape(n.id)}</div><p class="ags-summary">${escape(summary)}</p><div class="ags-source">${info}${source?.repository&&source?.commit?`<br><a href="https://github.com/${escape(source.repository)}/blob/${escape(source.commit)}/src/data/graph.ts" target="_blank" rel="noopener noreferrer">Zur ursprünglichen Graphdefinition ↗</a>`:''}</div><div class="ags-relations"><h3>${relations.length} tatsächliche Verbindungen</h3>${relations.map(e=>{const outgoing=e.from===n.id,otherId=outgoing?e.to:e.from,other=nodeById(otherId),label=graph.edgeTypeLabels?.[e.type]||e.reason||e.type;return `<button type="button" class="ags-relation" data-related="${escape(otherId)}"><small>${e.directed===false?'↔':outgoing?'→ ausgehend':'← eingehend'} · ${escape(label)}</small>${escape(other?.label||otherId)}${e.type==='arm'?`<small>Stärke ${e.strength} · Wachstum ${e.growth} · ${e.latched?'angedockt':'offen'}</small>`:''}</button>`;}).join('')||'<p class="ags-summary">Dieser Gegenstand hat in der gewählten Quelle keine erfassten Verbindungen.</p>'}</div>`;
  }
  function choose(id,notify=true){if(!nodeById(id))return;selectedId=id;travelerId=id;route=null;q('[data-control="node"]').value=id;renderInspector();draw();if(notify)onSelect?.(id);}
  function geometry(animate=true){
    fromPositions=positions;toPositions=positionsForGraph(graph,shape,{deform,twist,overrides});
    if(!animate||reduced){positions=toPositions;draw();return;}
    cancelAnimationFrame(morphFrame);morphStart=performance.now();
    const next=now=>{if(disposed)return;const t=Math.min(1,(now-morphStart)/700),smooth=t*t*(3-2*t);positions=Object.fromEntries(Object.entries(toPositions).map(([id,p])=>{const a=fromPositions[id]||p;return [id,{x:a.x+(p.x-a.x)*smooth,y:a.y+(p.y-a.y)*smooth,z:a.z+(p.z-a.z)*smooth}];}));draw();if(t<1)morphFrame=requestAnimationFrame(next);};
    morphFrame=requestAnimationFrame(next);
  }
  function draw(){
    if(disposed)return;
    const ratio=Math.min(2,globalThis.devicePixelRatio||1);
    if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    if(!graph.nodes.length){ctx.fillStyle='#b2cbd0';ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText('Deine persönlichen Phänomene erscheinen aus dem vorhandenen Meerzustand.',width/2,height/2);return;}
    frame=projectGraph(graph,positions,{...camera,width,height});
    const {points}=frame;
    const neighborIds=new Set(incidentEdges(graph,selectedId).flatMap(e=>[e.from,e.to]));
    const pathPairs=new Set((route||[]).slice(1).map((id,i)=>[route[i],id].sort().join('\u0000')));
    for(const e of graph.edges){const a=points.get(e.from),b=points.get(e.to);if(!a||!b)continue;
      const hot=e.from===selectedId||e.to===selectedId,inPath=pathPairs.has([e.from,e.to].sort().join('\u0000'));
      const fade=visibleTypes&&(!visibleTypes.includes(nodeById(e.from)?.type)||!visibleTypes.includes(nodeById(e.to)?.type));
      ctx.lineWidth=inPath?2.4:hot?1.5:.65;ctx.strokeStyle=inPath?'#efc66f':hot?'#e0c893':e.strength<0?'#cd96b6':'#8bb6bb';ctx.globalAlpha=inPath?.95:hot?.64:fade?.025:.19;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      if(hot&&e.directed!==false){const t=.68,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7*Math.cos(angle-.45),y-7*Math.sin(angle-.45));ctx.moveTo(x,y);ctx.lineTo(x-7*Math.cos(angle+.45),y-7*Math.sin(angle+.45));ctx.stroke();}
    }
    const ordered=[...graph.nodes].sort((a,b)=>(points.get(b.id)?.depth||0)-(points.get(a.id)?.depth||0));
    for(const n of ordered){const p=points.get(n.id);if(!p)continue;const selected=n.id===selectedId,hovered=n.id===hoverId,fade=visibleTypes&&!visibleTypes.includes(n.type),radius=(selected?6.5:hovered?5.5:3.1)*p.factor;
      ctx.globalAlpha=selected||hovered?1:fade?.1:.86;ctx.fillStyle=n.color||graph.nodeTypeMeta?.[n.type]?.color||COLORS[n.type]||'#bce3cc';
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=selected?'#f6d895':'#0b252e';ctx.lineWidth=selected?2:1;ctx.stroke();
      if(selected||hovered){ctx.globalAlpha=1;ctx.strokeStyle='#e7ca81';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(p.x,p.y,radius+5,0,Math.PI*2);ctx.stroke();}
      if(selected||hovered||(neighborIds.has(n.id)&&neighborIds.size<12)){const label=n.label.length>34?n.label.slice(0,32)+'…':n.label;ctx.font=`${selected?600:400} 10px system-ui`;ctx.textAlign='center';const tw=ctx.measureText(label).width;ctx.fillStyle='#09212ce6';ctx.fillRect(p.x-tw/2-5,p.y+radius+6,tw+10,16);ctx.fillStyle=selected?'#eed695':'#c2d5d8';ctx.fillText(label,p.x,p.y+radius+18);}
    }
    if(travelerId&&points.has(travelerId)){const p=points.get(travelerId);ctx.globalAlpha=.8;ctx.strokeStyle='#e9c56d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,11,0,Math.PI*2);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  function resize(){const rect=q('.ags-world').getBoundingClientRect();width=Math.max(200,rect.width);height=Math.max(250,rect.height);draw();}
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(q('.ags-world'));
  function hit(x,y){if(!frame)return null;let found=null,dist=12;for(const [id,p] of frame.points){const d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;found=id;}}return found;}
  function point(event){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
  const pointers=new Map();let pinchStart=null;
  const down=event=>{const p=point(event);pointers.set(event.pointerId,p);canvas.setPointerCapture(event.pointerId);if(pointers.size===2){const a=[...pointers.values()];pinchStart={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:camera.zoom};drag=null;return;}drag={id:event.pointerId,start:p,previous:p,node:hit(p.x,p.y),moved:false,pan:event.shiftKey};};
  const move=event=>{const p=point(event);if(pointers.has(event.pointerId))pointers.set(event.pointerId,p);if(pointers.size===2&&pinchStart){const a=[...pointers.values()];camera.zoom=Math.max(.35,Math.min(5,pinchStart.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(1,pinchStart.distance)));draw();return;}
    if(drag&&drag.id===event.pointerId){const dx=p.x-drag.previous.x,dy=p.y-drag.previous.y;if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>4)drag.moved=true;
      if(nodeDragEnabled&&drag.node&&drag.moved){const n=positions[drag.node],s=Math.min(width,height)*.38/frame.bound*camera.zoom,factor=frame.points.get(drag.node).factor;const wx=dx/s/factor,wy=-dy/s/factor;const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);overrides[drag.node]={x:n.x+wx*cy+wy*sp*sy,y:n.y+wy*cp,z:n.z+wx*sy-wy*sp*cy};geometry(false);}else if(drag.pan){camera.panX+=dx;camera.panY+=dy;draw();}else if(drag.moved){camera.yaw+=dx*.007;camera.pitch=Math.max(-1.4,Math.min(1.4,camera.pitch+dy*.007));draw();}drag.previous=p;
    }else{const id=hit(p.x,p.y);if(id!==hoverId){hoverId=id;q('.ags-tooltip').textContent=id?nodeById(id)?.label||id:'';canvas.style.cursor=id?(nodeDragEnabled?'grab':'pointer'):'grab';draw();}}
  };
  const up=event=>{pointers.delete(event.pointerId);pinchStart=null;if(drag?.id===event.pointerId){if(!drag.moved&&drag.node)choose(drag.node);drag=null;}if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);};
  const wheel=event=>{event.preventDefault();camera.zoom=Math.max(.35,Math.min(5,camera.zoom*Math.exp(-event.deltaY*.0015)));draw();};
  const keys=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft')camera.yaw-=.12;if(event.key==='ArrowRight')camera.yaw+=.12;if(event.key==='ArrowUp')camera.pitch-=.1;if(event.key==='ArrowDown')camera.pitch+=.1;if(event.key==='+')camera.zoom=Math.min(5,camera.zoom*1.1);if(event.key==='-')camera.zoom=Math.max(.35,camera.zoom/1.1);draw();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keys);
  q('.ags-shapes').addEventListener('click',event=>{const b=event.target.closest('[data-shape]');if(!b)return;shape=b.dataset.shape;overrides={};q('.ags-shapes').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));geometry();});
  host.querySelectorAll('[data-control="deform"],[data-control="twist"]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.control;if(key==='deform')deform=Number(input.value);else twist=Number(input.value);q(`[data-output="${key}"]`).textContent=input.value+' %';geometry(false);}));
  q('[data-action="drag"]').onclick=()=>{nodeDragEnabled=!nodeDragEnabled;q('[data-action="drag"]').setAttribute('aria-pressed',String(nodeDragEnabled));q('[data-action="drag"]').textContent=nodeDragEnabled?'Knoten ziehen: an':'Knoten ziehen';};
  function resetView(){camera={yaw:.22,pitch:.12,zoom:1,panX:0,panY:0};overrides={};geometry(false);}
  q('[data-action="reset"]').onclick=resetView;
  q('[data-control="node"]').onchange=event=>choose(event.target.value);
  q('[data-control="target"]').onchange=event=>{targetId=event.target.value;};
  q('[data-control="directed"]').onchange=event=>{directed=event.target.checked;};
  q('.ags-inspector').addEventListener('click',event=>{const b=event.target.closest('[data-related]');if(b)choose(b.dataset.related);});
  q('[data-action="path"]').onclick=()=>{route=shortestPath(graph,selectedId,targetId,{directed});if(!route){q('.ags-result').textContent='In diesem Originalnetz gibt es unter dieser Richtungsregel keinen Weg.';draw();return;}q('.ags-result').textContent=`${route.length-1} tatsächliche Kanten: ${route.map(id=>nodeById(id)?.label||id).join(' → ')}`;cancelAnimationFrame(travelFrame);const activeRoute=[...route],start=performance.now();if(reduced){travelerId=activeRoute.at(-1);draw();return;}const tick=now=>{if(disposed)return;const index=Math.min(activeRoute.length-1,Math.floor((now-start)/350));travelerId=activeRoute[index];draw();if(index<activeRoute.length-1)travelFrame=requestAnimationFrame(tick);};travelFrame=requestAnimationFrame(tick);};
  q('[data-action="svg"]').onclick=()=>{const blob=new Blob([frameSVG(graph,positions,{...camera,width:1000,height:650,selectedId})],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Phaenomenatlas_${shape}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};
  updateChoices();renderInspector();resize();
  return {
    setGraph(next){const nextIdentity=graphIdentitySignature(next),changed=nextIdentity!==identity;graph=next;identity=nextIdentity;if(!nodeById(selectedId))selectedId=graph.nodes[0]?.id||null;if(!nodeById(targetId))targetId=graph.nodes.at(-1)?.id||null;if(changed){overrides={};route=null;updateChoices();}renderInspector();geometry(false);},
    setSelected(id){if(id&&nodeById(id))choose(id,false);},
    setVisibleTypes(types){visibleTypes=types;draw();},resetView,
    destroy(){disposed=true;cancelAnimationFrame(morphFrame);cancelAnimationFrame(travelFrame);observer?.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keys);host.innerHTML='';}
  };
}
