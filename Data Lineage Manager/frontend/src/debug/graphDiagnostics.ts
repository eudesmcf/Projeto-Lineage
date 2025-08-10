/*
  graphDiagnostics.ts
  Utilitários de validação e logging para o GraphView.
  Ativar via:
   localStorage.setItem('dlmDebug','1')  // liga
   localStorage.removeItem('dlmDebug')   // desliga
  Ou chamar window.__DLM?.setDebug(true)
*/

export interface BaseElement { data: any }
export interface CyLike {
  nodes: () => any;
  edges: () => any;
  getElementById: (id:string)=> any;
}

function isDebugEnabled(){
  // Vite: import.meta.env.DEV garante só em dev; em produção precisa explicitamente no storage
  // @ts-ignore
  return (typeof window !== 'undefined') && (localStorage.getItem('dlmDebug') === '1' || (window as any).DLM_ENABLE_DEBUG) ;
}

function logGroup(title:string, fn:()=>void){
  if(!isDebugEnabled()) return;
  try{ console.groupCollapsed(`%c[DLM][VALIDATE] ${title}`, 'color:#2563eb;font-weight:600'); fn(); } finally { console.groupEnd(); }
}

export interface DiagnosticsContext {
  cy: CyLike | null;
  baseNodes: BaseElement[];
  baseEdges: BaseElement[];
  selectedCategories: string[] | null;
}

export interface ValidationReportItem { level:'info'|'warn'|'error'; message:string; meta?:any }
export interface ValidationReport { ok:boolean; items: ValidationReportItem[]; summary:string }

function push(items:ValidationReportItem[], level:ValidationReportItem['level'], message:string, meta?:any){
  items.push({ level, message, meta });
}

export function validateGraphIntegrity(ctx:DiagnosticsContext): ValidationReport {
  const items: ValidationReportItem[] = [];
  if(!ctx.cy){ push(items,'error','cy instance inexistente'); return { ok:false, items, summary:'Sem cy' }; }
  const cy = ctx.cy as any;
  const nodeIds = new Set<string>();
  cy.nodes().forEach((n:any)=>{
    const id = n.id();
    if(nodeIds.has(id)) push(items,'error','ID de nó duplicado', { id });
    nodeIds.add(id);
  });
  cy.edges().forEach((e:any)=>{
    const s = e.data('source'); const t = e.data('target');
    if(!nodeIds.has(s) || !nodeIds.has(t)) push(items,'error','Edge com endpoint inexistente', { id:e.id(), source:s, target:t });
    if(s === t) push(items,'warn','Edge auto-referenciado', { id:e.id() });
  });
  // Virtual edges não devem duplicar reais
  const realPairs = new Set<string>();
  cy.edges().forEach((e:any)=>{ if(!e.data('virtual')) realPairs.add(e.data('source')+'>'+e.data('target')); });
  cy.edges('[virtual]').forEach((e:any)=>{
    const key = e.data('source')+'>'+e.data('target');
    if(realPairs.has(key)) push(items,'warn','Edge virtual duplicando edge real', { id:e.id(), key });
  });
  const errors = items.filter(i=> i.level==='error').length;
  const summary = errors ? `Falhas: ${errors}` : 'OK';
  return { ok: errors===0, items, summary };
}

export function validateIconSanitization(): ValidationReport {
  const items: ValidationReportItem[] = [];
  if(typeof document === 'undefined'){ return { ok:true, items, summary:'SSR skip' }; }
  const icons = Array.from(document.querySelectorAll('.dlm-icon')) as HTMLElement[];
  icons.forEach(icon=>{
    // Texto direto suspeito
    const text = Array.from(icon.childNodes).filter(n=> n.nodeType===3 && n.textContent?.trim()).map(n=> n.textContent?.trim()).join(' ');
    if(text){ push(items,'warn','Texto residual dentro do ícone', { text, outer: icon.outerHTML.slice(0,120)+'...' }); }
    // Tags proibidas
    if(icon.querySelector('script,style,iframe')) push(items,'error','Tag proibida encontrada em ícone', { outer: icon.outerHTML });
  });
  const summary = items.some(i=> i.level==='error') ? 'Problemas em ícones' : 'OK';
  return { ok: !items.some(i=> i.level==='error'), items, summary };
}

export function validateFilterCollapse(ctx:DiagnosticsContext): ValidationReport {
  const items: ValidationReportItem[] = [];
  if(!ctx.cy) return { ok:false, items:[{ level:'error', message:'cy ausente'}], summary:'Sem cy'};
  const cy = ctx.cy as any;
  const selected = ctx.selectedCategories ? new Set(ctx.selectedCategories) : null;
  if(!selected || selected.size===0) return { ok:true, items, summary:'Sem filtro ativo' };
  const visibleIds = new Set<string>();
  cy.nodes().forEach((n:any)=> visibleIds.add(n.id()));
  // Para cada par de nós visíveis conectados por caminho no grafo base através de nós ocultos, deve existir caminho direto (real ou virtual) no grafo filtrado
  // Construir mapa do grafo base
  const outMap: Record<string,string[]> = {};
  ctx.baseEdges.forEach(e=>{ const s=e.data.source; const t=e.data.target; (outMap[s] ||= []).push(t); });
  function reachableThroughHidden(a:string,b:string): boolean {
    const queue = [...(outMap[a]||[])];
    const visited = new Set<string>();
    while(queue.length){
      const x = queue.shift()!;
      if(x===b) return true;
      if(visited.has(x)) continue; visited.add(x);
      // se x é visível (e não b), parar expansão por esse ramo
      if(visibleIds.has(x) && x!==b) continue;
      (outMap[x]||[]).forEach(n=> queue.push(n));
    }
    return false;
  }
  const hasDirect = (a:string,b:string)=> cy.edges().some((e:any)=> e.data('source')===a && e.data('target')===b);
  const vis = Array.from(visibleIds);
  for(let i=0;i<vis.length;i++){
    for(let j=0;j<vis.length;j++){
      if(i===j) continue;
      const a = vis[i], b = vis[j];
      if(!hasDirect(a,b) && reachableThroughHidden(a,b)){
        push(items,'warn','Par visível deveria ter edge colapsado', { source:a, target:b });
      }
    }
  }
  const summary = items.length? 'Avisos encontrados':'OK';
  return { ok: true, items, summary };
}

export function runAllDiagnostics(ctx:DiagnosticsContext){
  if(!isDebugEnabled()) return;
  logGroup('Integridade do grafo', ()=>{
    const rep = validateGraphIntegrity(ctx);
    rep.items.forEach(it=> console[it.level==='error'?'error': it.level==='warn'?'warn':'log']('[graph]', it.message, it.meta||''));
    console.log('Resumo:', rep.summary);
  });
  logGroup('Sanitização de ícones', ()=>{
    const rep = validateIconSanitization();
    rep.items.forEach(it=> console[it.level==='error'?'error': it.level==='warn'?'warn':'log']('[icon]', it.message, it.meta||''));
    console.log('Resumo:', rep.summary);
  });
  logGroup('Colapso de filtro', ()=>{
    const rep = validateFilterCollapse(ctx);
    rep.items.forEach(it=> console[it.level==='error'?'error': it.level==='warn'?'warn':'log']('[collapse]', it.message, it.meta||''));
    console.log('Resumo:', rep.summary);
  });
}

export function attachGlobalAPI(ctxProvider:()=>DiagnosticsContext){
  if(typeof window === 'undefined') return;
  (window as any).__DLM = (window as any).__DLM || {};
  (window as any).__DLM.setDebug = (v:boolean)=>{ if(v) localStorage.setItem('dlmDebug','1'); else localStorage.removeItem('dlmDebug'); console.info('[DLM] Debug =', v); };
  (window as any).__DLM.runDiagnostics = ()=> runAllDiagnostics(ctxProvider());
}
