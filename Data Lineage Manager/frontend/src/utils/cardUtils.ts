// Utilidades reutilizadas por GraphView para gerar HTML de cards e lidar com ícones/cores.
// Mantém puro (sem dependência de Vue) para evitar efeitos colaterais.

export function lighten(hex: string, percent: number){
  const num = parseInt(hex.replace('#',''),16);
  const r = Math.min(255, ((num>>16)&0xff) + Math.round(255*percent/100));
  const g = Math.min(255, ((num>>8)&0xff) + Math.round(255*percent/100));
  const b = Math.min(255, (num&0xff) + Math.round(255*percent/100));
  return '#'+[r,g,b].map(x=> x.toString(16).padStart(2,'0')).join('');
}

export function pickReadable(hex: string){
  if(!hex) return '#fff';
  const c = hex.replace('#','');
  const bigint = parseInt(c.length===3? c.split('').map(x=> x+x).join(''): c,16);
  const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  const lum=(0.2126*r+0.7152*g+0.0722*b)/255;
  return lum>0.62? '#1F2937':'#fff';
}

export function sanitizeSvg(raw: string){
  if(!raw.includes('</svg>') && !/\/>\s*$/.test(raw)) return { valid:false, content:'' };
  let out=raw.replace(/<!--([\s\S]*?)-->/g,'');
  out=out.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  const allowed=['svg','g','path','circle','rect','ellipse','line','polyline','polygon','defs','use'];
  out=out.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g,(m,tag,attrs)=>{
    tag=tag.toLowerCase(); if(!allowed.includes(tag)) return '';
    let safe='';
    if(attrs){
      attrs=attrs.replace(/\son[a-zA-Z]+="[^"]*"/g,'').replace(/(href|xlink:href)="javascript:[^"]*"/gi,'');
      const attrAllow=/(id|class|width|height|viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|d|cx|cy|r|x|y|rx|ry|points|xmlns|xmlns:xlink)="[^"]*"/gi;
      const matches=attrs.match(attrAllow); if(matches) safe=' '+matches.join(' ');
    }
    return `<${m.startsWith('</')?'/':''}${tag}${m.startsWith('</')?'':safe}>`;
  });
  out=out.replace(/>[^<]+</g,'><');
  if(!out.toLowerCase().startsWith('<svg')){
    const inner=out.replace(/^[\s\S]*?<svg[^>]*>/i,'').replace(/<\/svg>[\s\S]*$/i,'');
    out=`<svg viewBox="0 0 24 24">${inner}</svg>`;
  }
  if((out.match(/</g)||[]).length !== (out.match(/>/g)||[]).length) return { valid:false, content:'' };
  if(/^<svg[^>]*><\/svg>$/.test(out.replace(/\s+/g,''))) return { valid:false, content:'' };
  return { valid:true, content:out };
}

export function getNodeSymbol(data:any){
  const cat=((data && (data.categoria||data.tipo))? (data.categoria||data.tipo):'').toString().toLowerCase();
  const icon=(p:string)=> `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">${p}</svg>`;
  if(cat.includes('bronze')) return icon('<circle cx="12" cy="12" r="9" stroke="#b87333" fill="#e6b07a" />');
  if(cat.includes('silver')) return icon('<circle cx="12" cy="12" r="9" stroke="#aaa" fill="#e0e0e0" /><path d="M8 12h8" stroke="#888" />');
  if(cat.includes('gold')) return icon('<circle cx="12" cy="12" r="9" stroke="#ffd700" fill="#fff8dc" /><path d="M9 9h6v6H9z" stroke="#ffd700" />');
  if(cat.includes('dash')) return icon('<rect x="4" y="4" width="16" height="16" rx="2" stroke="#888" fill="#f3f4f6" /><path d="M8 10h8M8 14h5" stroke="#888" />');
  if(cat.includes('pipe')) return icon('<path d="M4 12h16" stroke="#888" /><path d="M8 8v8M16 8v8" stroke="#888" />');
  if(cat.includes('note')) return icon('<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#888" /><path d="M14 3v6h6" stroke="#888" />');
  if(cat.includes('sql')||cat.includes('table')) return icon('<ellipse cx="12" cy="5" rx="7" ry="3" stroke="#2563eb" fill="#e0e7ff" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" stroke="#2563eb" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="#2563eb" />');
  if(cat.includes('view')) return icon('<circle cx="12" cy="12" r="3" stroke="#10b981" fill="#d1fae5" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="#10b981" />');
  return icon('<circle cx="12" cy="12" r="10" stroke="#e5e7eb" fill="#f3f4f6" /><path d="M8 12h8M12 8v8" stroke="#9ca3af" />');
}

export function buildSafeIconHtml(rawIcon:string|undefined, data:any, baseColor:string){
  const fallbackCircle = `<svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="icon"><circle cx="12" cy="12" r="10" fill="${baseColor}" /></svg>`;
  if(rawIcon){
    const t = rawIcon.trim();
    if(t.startsWith('<svg')){ const svg=sanitizeSvg(t); if(svg.valid) return svg.content; }
    else if(/^data:image\//.test(t) || /(\.svg|\.png|\.jpg|\.jpeg|\.gif)$/i.test(t)) return `<img src="${t}" alt="icon" class="dlm-icon-img" />`;
  }
  if(data.categoria||data.tipo) return getNodeSymbol(data);
  return fallbackCircle;
}

export interface CardHtmlOptions {
  showIcons: boolean;
  expanded: boolean;
  nome: string;
  second: string;
  code: string;
  baseColor: string;
  fg: string;
  iconHtml: string;
  id: string;
  categoria?: string;
}

export function buildCardHtml(opts: CardHtmlOptions){
  const { showIcons, expanded, nome, second, code, baseColor, fg, iconHtml, id, categoria } = opts;
  const expandedCls = expanded ? 'is-expanded' : '';
  return `<div class="dlm-card ${expandedCls}" style="width:280px" data-node-id="${id}">
    <div class="dlm-bar" style="background:linear-gradient(to right, ${baseColor}, ${lighten(baseColor,25)})"></div>
    <div class="dlm-body">
      <div class="dlm-head">
        ${showIcons ? `<div class=\"dlm-icon\" style=\"background:${baseColor};color:${fg}\" title=\"${categoria||''}\">${iconHtml}</div>` : ''}
        <div class="dlm-text-group">
          <div class="dlm-title" title="${nome}">${nome}</div>
          <div class="dlm-sub">Table: ${second}</div>
        </div>
        <button type="button" class="dlm-caret" data-node-id="${id}" aria-label="Expandir" title="Expandir">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dlm-caret-svg"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
      </div>
      <div class="dlm-details"><pre><code>${code}</code></pre></div>
    </div>
  </div>`;
}
