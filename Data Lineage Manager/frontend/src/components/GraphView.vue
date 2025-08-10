<template>
  <div class="graph-wrapper" :class="{ fullscreen: fullMode, 'hide-icons': !internalShowIcons }">
    <!-- Mini controls -->
    <div class="mini-controls">
      <button class="mc-btn" data-tip="Zoom in" @click="zoomIn">+</button>
      <button class="mc-btn" data-tip="Zoom out" @click="zoomOut">−</button>
      <button class="mc-btn" :data-tip="fullMode ? 'Sair fullscreen' : 'Entrar fullscreen'" @click="toggleGraphMode">
        <span v-if="!fullMode">⤢</span><span v-else>⤡</span>
      </button>
      <button class="mc-btn" data-tip="Fit (ajustar)" @click="fitGraph">⌂</button>
      <div class="mc-zoom">{{ zoomPercent }}%</div>
    </div>
    <!-- Secondary controls -->
    <div class="mini-controls-alt">
      <button class="mc-btn" data-tip="Highlight Upstream" @click="highlightUpstream">↑</button>
      <button class="mc-btn" data-tip="Highlight Downstream" @click="highlightDownstream">↓</button>
      <button class="mc-btn" data-tip="Limpar destaques" @click="clearHighlights">✕</button>
      <button class="mc-btn" :class="{ active: edgeAnimationOn }" :data-tip="edgeAnimationOn ? 'Parar animação de edges' : 'Animar edges'" @click="toggleEdgeAnimation">⚡</button>
      <button class="mc-btn" :data-tip="'Layout: ' + layoutLabel + ' (clique para alternar)'" @click="cycleLayout">{{ layoutIcon }}</button>
      <button class="mc-btn" :class="{ active: internalShowIcons }" :data-tip="internalShowIcons ? 'Ocultar ícones' : 'Mostrar ícones'" @click="toggleIcons">👁</button>
    </div>
    <div class="mini-controls-alt extra-persist">
      <button class="mc-btn" data-tip="Forçar Exemplo" @click="forceShowExamples">★</button>
      <button class="mc-btn" data-tip="Limpar grafo salvo" @click="clearStoredGraph">⟳</button>
    </div>

    <div ref="cyContainer" class="cy-container" />
    <ContextMenu ref="cm" :model="contextItems" />

    <div v-if="showDemoHint" class="demo-hint">
      <div class="demo-card">
        <h3>Sem dados</h3>
        <p>Nenhum artefato retornado. Gere um exemplo local para testar.</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
          <Button size="small" label="Exemplo simples" icon="pi pi-magic" @click="loadSample" />
          <Button size="small" label="Exemplo complexo" icon="pi pi-sitemap" severity="secondary" @click="loadComplexSample" />
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showCreateLink" header="Criar ligação" :modal="true" style="width:400px">
      <div class="p-fluid form-grid">
        <div class="p-field">
          <label>Destino</label>
          <Dropdown v-model="createLinkForm.destinoId" :options="nodeOptions" optionLabel="label" optionValue="id" placeholder="Selecione" />
        </div>
        <div class="p-field">
          <label>Tipo ligação</label>
          <InputText v-model="createLinkForm.tipoLigacao" />
        </div>
        <Button label="Salvar" @click="submitCreateLink" />
      </div>
    </Dialog>

    <Dialog v-model:visible="showCreateNodeLink" header="Criar artefato & ligar" :modal="true" style="width:420px">
      <div class="p-fluid form-grid">
        <div class="p-field"><label>Nome</label><InputText v-model="createNodeForm.nome" /></div>
        <div class="p-field"><label>Tipo</label><InputText v-model="createNodeForm.tipo" /></div>
        <div class="p-field"><label>Tecnologia</label><InputText v-model="createNodeForm.tecnologia" /></div>
        <div class="p-field">
          <label>Categoria</label>
          <Dropdown v-model="createNodeForm.categoriaNome" :options="props.categorias" optionLabel="nome" optionValue="nome" placeholder="Escolha">
            <template #option="slotProps">
              <span v-if="slotProps.option.icon" v-html="slotProps.option.icon" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></span>
              <span>{{ slotProps.option.nome }}</span>
            </template>
          </Dropdown>
        </div>
        <div class="p-field"><label>Tipo ligação</label><InputText v-model="createNodeForm.tipoLigacao" /></div>
        <Button label="Criar" @click="submitCreateNodeLink" />
      </div>
    </Dialog>

    <Dialog v-model:visible="showEditNode" header="Editar artefato" :modal="true" style="width:420px">
      <div v-if="editNodeForm.id" class="p-fluid form-grid">
        <div class="p-field"><label>Nome</label><InputText v-model="editNodeForm.nome" /></div>
        <div class="p-field"><label>Tipo</label><InputText v-model="editNodeForm.tipo" /></div>
        <div class="p-field"><label>Tecnologia</label><InputText v-model="editNodeForm.tecnologia" /></div>
        <div class="p-field"><label>Categoria</label><Dropdown v-model="editNodeForm.categoriaNome" :options="props.categorias || []" optionLabel="nome" optionValue="nome" placeholder="Escolha" /></div>
        <div class="edit-actions"><Button label="Salvar" @click="saveEditNode" /><Button label="Cancelar" severity="secondary" text @click="showEditNode=false" /></div>
      </div>
    </Dialog>

    <Dialog v-model:visible="showAddNotebook" header="Adicionar Notebook (paths)" :modal="true" style="width:480px">
      <div class="p-fluid form-grid notebook-form">
        <div class="p-field"><label>Notebook</label><InputText v-model="notebookForm.nome" placeholder="Ex: Notebook_Ingest" /></div>
        <div class="p-field"><label>Read Paths (predessores)</label><InputText v-model="notebookForm.readPaths" placeholder="PZ:/raw/arquivo1.csv, PZ:/raw/arquivo2.csv" /></div>
        <div class="p-field"><label>Write Paths (sucessores)</label><InputText v-model="notebookForm.writePaths" placeholder="HZ:/stg/tabela1, HZ:/stg/tabela2" /></div>
        <small class="hint">Separe múltiplos caminhos por vírgula. Zona inferida pelo prefixo antes de ':' (PZ:, HZ:, CZ:, DW:, Synapse:, Dataflow:, PBI:, Cubo:, Notebook:)</small>
        <div class="edit-actions"><Button label="Adicionar" @click="submitAddNotebook" /><Button label="Cancelar" severity="secondary" text @click="showAddNotebook=false" /></div>
      </div>
    </Dialog>

    <div v-if="showInfoPanel" class="info-panel" :style="{ left: infoPanelPos.x + 'px', top: infoPanelPos.y + 'px' }">
      <div class="info-header drag-handle" @mousedown.prevent="startDragInfo">
        <strong>Relações do nó</strong>
        <div class="info-actions">
          <button class="info-copy" @click.stop="copyInfoJson" title="Copiar JSON">⧉</button>
          <button class="info-pin" :class="{ active: infoPanelPinned }" @click.stop="togglePinInfo" :title="infoPanelPinned ? 'Desafixar' : 'Fixar posição'">📌</button>
          <button class="info-close" @click="closeInfoPanel" title="Fechar">×</button>
        </div>
      </div>
      <pre class="info-json">{{ infoJson }}</pre>
    </div>

    <Toast group="global" :pt="{ root: { class: 'graph-toast-root' } }" />
  </div>
</template>

<script setup lang="ts">
// Single clean script with statistics and all graph functionality
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import cytoscape, { Core, EventObjectNode } from 'cytoscape';
import nodeHtmlLabel from 'cytoscape-node-html-label';
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import dagre from 'cytoscape-dagre';
// @ts-ignore
import navigator from 'cytoscape-navigator';
import ContextMenu from 'primevue/contextmenu';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { runAllDiagnostics, attachGlobalAPI } from '../debug/graphDiagnostics';

const props = defineProps<{ showIcons?: boolean; categoryFilter?: string[]|string|null; categorias?: { nome:string; cor:string; icon?:string; grupo?:string; subcategoria?:string }[] }>();
const emit = defineEmits(['toggle-icons','category-counts','update-categorias','nodes-loaded','graph-stats']);

// Register plugins once
// @ts-ignore
if(!(cytoscape as any).__dlmPlugins){
  nodeHtmlLabel(cytoscape);
  cytoscape.use(fcose);
  cytoscape.use(dagre);
  cytoscape.use(navigator);
  // @ts-ignore
  (cytoscape as any).__dlmPlugins = true;
}

// Core refs / state
const cyContainer = ref<HTMLDivElement|null>(null);
let cy: Core | null = null;
let globalClickBound = false;
let cardObserver: MutationObserver | null = null;
const toast = useToast();
const internalShowIcons = ref(props.showIcons !== false);

// UI / dialogs
const showCreateLink = ref(false);
const showCreateNodeLink = ref(false);
const showEditNode = ref(false);
const showDemoHint = ref(false);
const showAddNotebook = ref(false);
const createLinkForm = ref({ destinoId: null as number|null, tipoLigacao: 'relacao' });
const createNodeForm = ref({ nome:'', tipo:'Dataset', tecnologia:'SQL', categoriaNome: null as string|null, tipoLigacao:'relacao' });
const notebookForm = ref({ nome:'', readPaths:'', writePaths:'' });
const editNodeForm = ref({ id:null as string|null, nome:'', tipo:'', tecnologia:'', categoriaNome: null as string|null });
const nodeOptions = ref<{ id:number; label:string }[]>([]);
const cm = ref();
const contextItems = ref<any[]>([]);
const currentNodeId = ref<string|null>(null);

// Layout / zoom
const fullMode = ref(false);
const zoomPercent = ref(100);
const currentLayout = ref<'breadthfirst'|'fcose'|'dagre'>('fcose');
const layoutLabel = computed(()=> currentLayout.value==='breadthfirst' ? 'Hierárquico' : currentLayout.value==='fcose' ? 'Force (fCoSE)' : 'Dagre');
const layoutIcon = computed(()=> currentLayout.value==='breadthfirst' ? '⤓' : currentLayout.value==='fcose' ? '◎' : '⇄');
let navInstance: any = null;

// Edge animation
const edgeAnimationOn = ref(false);
let edgeAnimFrame: number | null = null;
let edgeDashOffset = 0;

// Info panel (draggable)
const showInfoPanel = ref(false);
const infoJson = ref('');
const infoPanelPos = ref({ x:0, y:0 });
const infoPanelPinned = ref(false);
let draggingInfo=false; let dragDX=0; let dragDY=0;

// Statistics
const statsMode = ref<'global'|'selected'>('global');
const stats = ref({ nodes:0, edges:0 });

// Snapshot for filtering
let baseNodes: { data:any }[] = [];
let baseEdges: { data:any }[] = [];

// ---------- Persistence (localStorage) ----------
const STORAGE_KEY = 'dlmGraphV1';
function persistGraph(){
  if(!cy) return;
  const nodes = cy.nodes().map(n=> ({ data:{ id:n.id(), label:n.data('label'), title:n.data('title'), subtitle:n.data('subtitle'), categoria:n.data('categoria'), cor:n.data('cor'), tecnologia:n.data('tecnologia'), tipo:n.data('tipo'), formula:n.data('formula') } }));
  const edges = cy.edges().filter(e=> !e.data('virtual')).map(e=> ({ data:{ id:e.id(), source:e.data('source'), target:e.data('target'), tipo:e.data('tipo') } }));
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:1, savedAt:Date.now(), nodes, edges })); }catch(err){ console.warn('[GraphView] persist fail', err); }
}
function loadStoredGraph(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return false; const parsed=JSON.parse(raw); if(!parsed || !Array.isArray(parsed.nodes)) return false; initCy([ ...parsed.nodes, ...parsed.edges ]); showDemoHint.value=false; snapshotBase(); updateStats('global'); return true; }catch(err){ console.warn('[GraphView] load storage error', err); localStorage.removeItem(STORAGE_KEY); return false; }
}
function clearStoredGraph(){ try{ localStorage.removeItem(STORAGE_KEY); }catch{} if(cy){ cy.elements().remove(); cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove()); } showDemoHint.value=true; snapshotBase(); updateStats('global'); toast.add({ severity:'info', summary:'Grafo limpo', life:1600, group:'global' }); }
function forceShowExamples(){ showDemoHint.value=true; toast.add({ severity:'info', summary:'Exemplos disponíveis', life:1600, group:'global' }); }

// ---------- Helpers ----------
function toggleIcons(){ internalShowIcons.value = !internalShowIcons.value; emit('toggle-icons', internalShowIcons.value); }
function snapshotBase(){ if(!cy) return; baseNodes = cy.nodes().map(n=> ({ data:{ ...n.data(), id:n.id() } })); baseEdges = cy.edges().filter(e=> !e.data('virtual')).map(e=> ({ data:{ ...e.data(), id:e.id(), source:e.data('source'), target:e.data('target'), tipo:e.data('tipo') } })); }
function getCategoria(nome?:string){ if(!nome) return undefined; return props.categorias?.find(c=> c.nome===nome); }
function buildNodeLabel(d:any){ return d.label; }

// ---------- Statistics ----------
function updateStats(mode:'global'|'selected'){
  if(!cy) return; statsMode.value = mode;
  let selectedNodesCount = 0; let selectedEdgesCount = 0;
  if(mode==='global'){
    stats.value.nodes = cy.nodes().length;
    stats.value.edges = cy.edges().filter(e=> !e.data('virtual')).length;
  } else {
    const sel = cy.$('node:selected');
    if(sel.empty()){ updateStats('global'); return; }
    const visited:Record<string,boolean>={}; const stack=[sel[0]]; const edgeSet=new Set<string>();
    while(stack.length){ const nd=stack.pop()!; if(visited[nd.id()]) continue; visited[nd.id()]=true; (nd as any).incomers('edge').forEach((e:any)=>{ if(!e.data('virtual')) edgeSet.add(e.id()); stack.push(e.source()); }); (nd as any).outgoers('edge').forEach((e:any)=>{ if(!e.data('virtual')) edgeSet.add(e.id()); stack.push(e.target()); }); }
    stats.value.nodes=Object.keys(visited).length; stats.value.edges=edgeSet.size; selectedNodesCount=stats.value.nodes; selectedEdgesCount=stats.value.edges;
  }
  const visibleNodes = cy.nodes().length;
  const visibleEdges = cy.edges().filter(e=> !e.data('virtual')).length;
  const totalNodes = baseNodes.length ? baseNodes.length : visibleNodes;
  const totalEdges = baseEdges.length ? baseEdges.filter(e=> !e.data.virtual).length : visibleEdges;
  if(mode==='global'){ selectedNodesCount = cy.$('node:selected').length; selectedEdgesCount = cy.$('edge:selected').filter(e=> !e.data('virtual')).length; }
  emit('graph-stats', { mode: statsMode.value, nodes: stats.value.nodes, edges: stats.value.edges, visibleNodes, visibleEdges, totalNodes, totalEdges, selectedNodes: selectedNodesCount, selectedEdges: selectedEdgesCount });
}

// ---------- Node HTML Cards ----------
function buildNodeHtml(data:any){
  const nome=data.title||data.label; const second=data.subtitle||data.tipo||data.tecnologia||''; const catObj=getCategoria(data.categoria); const baseColor=catObj?.cor || data.cor || '#42a5f5'; const gradient=`linear-gradient(to right, ${baseColor}, ${lighten(baseColor,25)})`; const code=data.formula||'DIVIDE(\n  [Total Sales],\n  [Total Units],\n  0\n)'; const fg=pickReadable(baseColor); const iconHtml=buildSafeIconHtml(catObj?.icon, data, baseColor);
  if(!internalShowIcons.value){
    return `<div class="dlm-card" style="width:280px" data-node-id="${data.id}"><div class="dlm-bar" style="background:${gradient}"></div><div class="dlm-body"><div class="dlm-head"><div class="dlm-text-group"><div class="dlm-title" title="${nome}">${nome}</div><div class="dlm-sub">Table: ${second}</div></div><button type="button" class="dlm-caret" data-expander aria-label="Expandir" title="Expandir"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dlm-caret-svg"><path d="m6 9 6 6 6-6"></path></svg></button></div><div class="dlm-details"><pre><code>${code}</code></pre></div></div></div>`;
  }
  return `<div class="dlm-card" style="width:280px" data-node-id="${data.id}"><div class="dlm-bar" style="background:${gradient}"></div><div class="dlm-body"><div class="dlm-head"><div class="dlm-icon" style="background:${baseColor};color:${fg}" title="${data.categoria||data.tipo||''}">${iconHtml}</div><div class="dlm-text-group"><div class="dlm-title" title="${nome}">${nome}</div><div class="dlm-sub">Table: ${second}</div></div><button type="button" class="dlm-caret" data-expander aria-label="Expandir" title="Expandir"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dlm-caret-svg"><path d="m6 9 6 6 6-6"></path></svg></button></div><div class="dlm-details"><pre><code>${code}</code></pre></div></div></div>`;
}

function buildSafeIconHtml(rawIcon:string|undefined, data:any, baseColor:string){
  const fallbackCircle = `<svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-label="icon"><circle cx="12" cy="12" r="10" fill="${baseColor}" /></svg>`;
  if(rawIcon){ const t=rawIcon.trim(); if(t.startsWith('<svg')){ const svg=sanitizeSvg(t); if(svg.valid) return svg.content; } else if(/^data:image\//.test(t) || /(\.svg|\.png|\.jpg|\.jpeg|\.gif)$/i.test(t)) return `<img src="${t}" alt="icon" class="dlm-icon-img" />`; }
  if(data.categoria||data.tipo) return getNodeSymbol(data); return fallbackCircle;
}
function sanitizeSvg(raw:string){ if(!raw.includes('</svg>') && !/\/?>\s*$/.test(raw)) return { valid:false, content:'' }; let out=raw.replace(/<!--([\s\S]*?)-->/g,''); out=out.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,''); const allowed=['svg','g','path','circle','rect','ellipse','line','polyline','polygon','defs','use']; out=out.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g,(m,tag,attrs)=>{ tag=tag.toLowerCase(); if(!allowed.includes(tag)) return ''; let safe=''; if(attrs){ attrs=attrs.replace(/\son[a-zA-Z]+="[^"]*"/g,'').replace(/(href|xlink:href)="javascript:[^"]*"/gi,''); const attrAllow=/(id|class|width|height|viewBox|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|stroke-dasharray|d|cx|cy|r|x|y|rx|ry|points|xmlns|xmlns:xlink)="[^"]*"/gi; const matches=attrs.match(attrAllow); if(matches) safe=' '+matches.join(' ');} return `<${m.startsWith('</')?'/':''}${tag}${m.startsWith('</')?'':safe}>`; }); out=out.replace(/>[^<]+</g,'><'); if(!out.toLowerCase().startsWith('<svg')){ const inner=out.replace(/^[\s\S]*?<svg[^>]*>/i,'').replace(/<\/svg>[\s\S]*$/i,''); out=`<svg viewBox="0 0 24 24">${inner}</svg>`; } if((out.match(/</g)||[]).length!==(out.match(/>/g)||[]).length) return { valid:false, content:'' }; if(/^<svg[^>]*><\/svg>$/.test(out.replace(/\s+/g,''))) return { valid:false, content:'' }; return { valid:true, content:out }; }

// ---------- Init ----------
function initCy(elements:any[]){
  if(cy){ try{ cy.destroy(); }catch{} cy=null; }
  if(globalClickBound){ document.removeEventListener('click', handleGlobalClick); globalClickBound=false; }
  if(cyContainer.value){ cyContainer.value.querySelectorAll('.dlm-html-label').forEach(el=> el.remove()); cyContainer.value.innerHTML=''; }
  cy = cytoscape({ container: cyContainer.value!, elements, layout:{ name:'fcose', quality:'default', randomize:true, animate:'end', animationDuration:450, idealEdgeLength:170, nodeSeparation:180, nodeRepulsion:9500, gravity:0.30, gravityRange:3.2, gravityCompound:1.0, gravityRangeCompound:2.0, packComponents:true, padding:70 } as any, style:[ { selector:'node', style:{ shape:'round-rectangle', width:280, height:42, 'background-opacity':0, 'border-width':0, label:'', 'text-opacity':0, 'overlay-opacity':0 } as any }, { selector:'edge', style:{ width:1.8,'line-color':'#b0b9c2','target-arrow-color':'#5a6470','target-arrow-shape':'vee','curve-style':'bezier','arrow-scale':1.15,'line-cap':'round','target-distance-from-node':25,'source-distance-from-node':8,opacity:0.97 } as any }, { selector:'edge.hover', style:{ 'line-color':'#1f7ae0','target-arrow-color':'#1f7ae0', width:2.4 } as any }, { selector:'edge.hl-up', style:{ 'line-color':'#2563EB','target-arrow-color':'#2563EB', width:2.8,'arrow-scale':1.6 } as any }, { selector:'edge.hl-down', style:{ 'line-color':'#10B981','target-arrow-color':'#10B981', width:2.8,'arrow-scale':1.6 } as any }, { selector:'edge.anim', style:{ 'line-style':'dashed','line-dash-pattern':[8,5],'line-dash-offset':0,'target-arrow-shape':'vee','arrow-scale':5 } as any }, { selector:'edge.virtual', style:{ 'line-style':'dashed','line-color':'#94a3b8','target-arrow-color':'#94a3b8', width:1.4, opacity:0.75, 'arrow-scale':1.1 } as any }, { selector:'edge:selected', style:{ 'line-color':'#334155','target-arrow-color':'#334155', width:4, 'z-index':999 } as any } ] as any });
  attachGlobalAPI(()=> ({ cy, baseNodes, baseEdges, selectedCategories: Array.isArray(props.categoryFilter)? props.categoryFilter : props.categoryFilter? [props.categoryFilter] : null }));
  runAllDiagnostics({ cy, baseNodes, baseEdges, selectedCategories: Array.isArray(props.categoryFilter)? props.categoryFilter : props.categoryFilter? [props.categoryFilter] : null });
  cy.on('layoutstop', ()=> { if(currentLayout.value==='fcose'){ resolveOverlaps(16,7); if(fullMode.value) cy!.fit(undefined,40); zoomPercent.value=Math.round(cy!.zoom()*100); } logDetachedCards(); });
  // @ts-ignore
  cy.nodeHtmlLabel([{ query:'node', halign:'center', valign:'center', halignBox:'center', valignBox:'center', cssClass:'dlm-html-label', tpl:(d:any)=> buildNodeHtml(d) }]);
  // context menu
  cy.on('cxttap','node',(evt:EventObjectNode)=>{ const nodeId=evt.target.id(); currentNodeId.value=nodeId; nodeOptions.value = cy!.nodes().filter(n=> n.id()!==nodeId).map(n=>({ id:parseInt(n.id()), label:n.data('label') })); contextItems.value=[ { label:'Criar ligação', icon:'pi pi-link', command:()=> showCreateLink.value=true }, { label:'Criar + ligar novo', icon:'pi pi-plus', command:()=> showCreateNodeLink.value=true }, { label:'Editar artefato', icon:'pi pi-pencil', command:()=> openEditNode(nodeId) }, { label:'Adicionar Notebook (paths)', icon:'pi pi-book', command:()=> { showAddNotebook.value=true; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; } }, { label:'Apagar selecionados', icon:'pi pi-trash', command:()=> deleteSelected() } ]; (cm.value as any)?.show(evt.originalEvent); });
  // Context menu no fundo (toda área interna)
  cy.on('cxttap', (evt:any)=>{ if(evt.target===cy){ currentNodeId.value=null; contextItems.value=[ { label:'Gerar exemplo simples', icon:'pi pi-magic', command:()=> loadSample() }, { label:'Gerar exemplo complexo', icon:'pi pi-sitemap', command:()=> loadComplexSample() }, { label:'Limpar destaques', icon:'pi pi-filter-slash', command:()=> clearHighlights() }, { label:'Apagar selecionados', icon:'pi pi-trash', command:()=> deleteSelected() }, { label:'Adicionar Notebook', icon:'pi pi-book', command:()=> { showAddNotebook.value=true; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; } } ]; (cm.value as any)?.show(evt.originalEvent); } });
  cy.on('mouseover','node',evt=> evt.target.connectedEdges().addClass('hover')); cy.on('mouseout','node',evt=> evt.target.connectedEdges().removeClass('hover'));
  cy.on('zoom', ()=> zoomPercent.value=Math.round(cy!.zoom()*100));
  cy.zoom(0.75); cy.center(); zoomPercent.value=Math.round(cy.zoom()*100); cy.nodes().forEach(n=> { n.style('label',''); });
  // Multi-seleção: tap em nó alterna seleção; duplo-click abre painel mantendo outras seleções
  cy.on('tap','node', e=> { const n=e.target; if(n.selected()) n.unselect(); else n.select(); });
  cy.on('dbltap','node', e=> { const n=e.target; if(!n.selected()) n.select(); buildInfoPanel(); });
  cy.on('tap', evt=> { if(evt.target===cy){ closeInfoPanel(); cy!.nodes().unselect(); } });
  cy.on('tap','edge', e=> { const ed=e.target; if(ed.selected()) ed.unselect(); else ed.select(); updateStats(statsMode.value); });
  cy.on('select unselect','node', ()=> { syncCardSelections(); const sel=cy!.$('node:selected'); updateStats(sel.empty()? 'global':'selected'); });
  cy.on('select unselect','edge', ()=> { updateStats(statsMode.value); });
  document.addEventListener('click', handleGlobalClick, true); globalClickBound=true; // capture para garantir antes de Cytoscape
  cyContainer.value?.addEventListener('click', containerClick, true);
  // ensure expand buttons have direct listeners (fallback if global fails)
  setTimeout(()=> wireCardButtons(), 60);
  startCardObserver();
  // Key handler (Delete edges)
  window.addEventListener('keydown', handleKeyDown);
  emitNodesLoaded(); updateStats('global');
}

// ---------- CRUD / Editing ----------
async function submitCreateLink(){ if(!cy || !currentNodeId.value || !createLinkForm.value.destinoId) return; const id='e'+Date.now(); cy.add({ data:{ id, source:currentNodeId.value, target:createLinkForm.value.destinoId!.toString(), tipo:createLinkForm.value.tipoLigacao } }); toast.add({ severity:'success', summary:'Ligação criada', life:2500, group:'global' }); showCreateLink.value=false; createLinkForm.value={ destinoId:null, tipoLigacao:'relacao' }; snapshotBase(); persistGraph(); updateStats(statsMode.value); }
let localNodeCounter=5000;
async function submitCreateNodeLink(){ if(!cy || !currentNodeId.value) return; const categoriaNome=createNodeForm.value.categoriaNome || props.categorias?.[0]?.nome; const catObj=getCategoria(categoriaNome||undefined); const nodeId=(++localNodeCounter).toString(); const nome=createNodeForm.value.nome || `Novo Artefato ${localNodeCounter}`; const tipo=createNodeForm.value.tipo; const tecnologia=createNodeForm.value.tecnologia; cy.add({ data:{ id:nodeId, label:buildNodeLabel({ label:nome, tipo, tecnologia }), categoria:categoriaNome, cor:catObj?.cor, tecnologia, tipo } }); const edgeId='e'+Date.now(); cy.add({ data:{ id:edgeId, source:currentNodeId.value, target:nodeId, tipo:createNodeForm.value.tipoLigacao } }); updateCategoryCounts(); toast.add({ severity:'success', summary:'Artefato criado', life:2500, group:'global' }); showCreateNodeLink.value=false; createNodeForm.value={ nome:'', tipo:'Dataset', tecnologia:'SQL', categoriaNome:null, tipoLigacao:'relacao' }; snapshotBase(); persistGraph(); updateStats(statsMode.value); }
function openEditNode(id:string){ if(!cy) return; const n=cy.getElementById(id); if(!n) return; editNodeForm.value.id=id; editNodeForm.value.nome=n.data('label'); editNodeForm.value.tipo=n.data('tipo')||''; editNodeForm.value.tecnologia=n.data('tecnologia')||''; editNodeForm.value.categoriaNome=n.data('categoria')||null; showEditNode.value=true; }
function saveEditNode(){ if(!cy || !editNodeForm.value.id) return; const n=cy.getElementById(editNodeForm.value.id); if(!n) return; const catObj=getCategoria(editNodeForm.value.categoriaNome||undefined); n.data('label', editNodeForm.value.nome); n.data('categoria', editNodeForm.value.categoriaNome); n.data('tipo', editNodeForm.value.tipo); n.data('tecnologia', editNodeForm.value.tecnologia); n.data('cor', catObj?.cor); rebuildNodeCard(n.id()); setTimeout(()=> logDetachedCards(),60); updateCategoryCounts(); toast.add({ severity:'success', summary:'Artefato atualizado', life:2000, group:'global' }); showEditNode.value=false; snapshotBase(); persistGraph(); updateStats(statsMode.value); }
function rebuildNodeCard(id:string){
  if(!cy) return;
  const n = cy.getElementById(id);
  if(!n || n.empty()) return;
  const data = { ...n.data(), id:n.id() };
  const card = document.querySelector(`.dlm-card[data-node-id="${id}"]`);
  if(card){
    // Preserve the plugin wrapper structure (positioning & transforms) – only swap the card node.
    const newHtml = buildNodeHtml(data);
    // Use a temporary element to parse HTML.
    const temp = document.createElement('div');
    temp.innerHTML = newHtml.trim();
    const newCard = temp.firstElementChild;
    if(newCard){
      card.replaceWith(newCard);
      // wire new button
      const btn = (newCard as HTMLElement).querySelector('.dlm-caret');
      if(btn) btn.addEventListener('click', e=> { e.stopPropagation(); const cardEl=(e.currentTarget as HTMLElement).closest('.dlm-card'); if(cardEl) cardEl.classList.toggle('is-expanded'); });
    }
  }
}
function containerClick(e:Event){
  const t = e.target as HTMLElement;
  const caret = t.closest('.dlm-caret');
  if(caret){
    e.stopPropagation();
    e.preventDefault();
    const card = caret.closest('.dlm-card');
    if(card) card.classList.toggle('is-expanded');
    return;
  }
  // Seleção via clique no card (fora do caret)
  const cardEl = t.closest('.dlm-card');
  if(cardEl){
    const id = cardEl.getAttribute('data-node-id');
    if(id && cy){
      const node = cy.getElementById(id);
      if(node){ if(node.selected()) node.unselect(); else node.select(); }
      syncCardSelections();
      updateStats(cy.$('node:selected').empty()? 'global':'selected');
    }
  }
}
function syncCardSelections(){ if(!cy) return; const selNodes = cy.$('node:selected'); const multi = selNodes.length > 1; const selectedIds=new Set(selNodes.map(n=> n.id())); document.querySelectorAll('.dlm-card').forEach(el=>{ const id=el.getAttribute('data-node-id'); if(!id) return; const isSel = selectedIds.has(id); el.classList.toggle('is-selected', isSel); if(isSel){ el.classList.toggle('multiple', multi); } else { el.classList.remove('multiple'); } }); }
function deleteSelected(){ if(!cy) return; const selEdges = cy.$('edge:selected'); const selNodes = cy.$('node:selected'); if(selEdges.length===0 && selNodes.length===0){ toast.add({ severity:'warn', summary:'Nada selecionado', life:1400, group:'global' }); return; } let removedEdgesCount=0; let removedNodesCount=0; if(selEdges.length){ removedEdgesCount = selEdges.length; selEdges.remove(); }
  if(selNodes.length){ removedNodesCount = selNodes.length; // remover nós (edges saem automaticamente)
    selNodes.remove(); }
  snapshotBase(); persistGraph(); updateStats('global'); const parts=[]; if(removedNodesCount) parts.push(`${removedNodesCount} nó(s)`); if(removedEdgesCount) parts.push(`${removedEdgesCount} ligação(ões)`); toast.add({ severity:'info', summary:`Removido: ${parts.join(' + ')}`, life:1800, group:'global' }); }
function handleKeyDown(e:KeyboardEvent){ if(e.key==='Delete' && cy){ deleteSelected(); } }
function wireCardButtons(){
  const buttons = cyContainer.value?.querySelectorAll('.dlm-caret');
  if(!buttons) return;
  buttons.forEach(btn=>{
    if((btn as any).__wired) return; (btn as any).__wired=true;
    btn.addEventListener('click', e=> { e.stopPropagation(); const card=(e.currentTarget as HTMLElement).closest('.dlm-card'); if(card){ card.classList.toggle('is-expanded'); if((window as any).__DLM_EXPAND_DEBUG) console.log('[DLM] toggle expand', card.getAttribute('data-node-id'), card.classList.contains('is-expanded')); } });
  });
}

function startCardObserver(){
  if(cardObserver) cardObserver.disconnect();
  if(!cyContainer.value) return;
  cardObserver = new MutationObserver((muts)=>{
    let needsWire=false;
    for(const m of muts){
      if(m.addedNodes && m.addedNodes.length){
        m.addedNodes.forEach(n=>{ if(n instanceof HTMLElement && (n.matches('.dlm-card') || n.querySelector('.dlm-caret'))){ needsWire=true; } });
      }
    }
    if(needsWire) wireCardButtons();
  });
  cardObserver.observe(cyContainer.value, { childList:true, subtree:true });
}

// ---------- Notebook builder (paths) ----------
function parsePaths(raw:string){ return raw.split(',').map(s=> s.trim()).filter(Boolean); }
function zoneFromPath(path:string){ const z=path.split(':')[0].trim().toUpperCase(); const known=['PZ','HZ','CZ','DW','SYNAPSE','DATAFLOW','PBI','CUBO','NOTEBOOK','ADF']; if(known.includes(z)) return z==='NOTEBOOK'? 'Notebook' : z; return 'Dataset'; }
function ensureCategory(nome:string){ if(!props.categorias) return; if(!props.categorias.find(c=> c.nome===nome)){ const palette=['#2563eb','#0d9488','#6366f1','#d97706','#db2777','#059669','#6d28d9','#1d4ed8','#7c3aed']; const color=palette[Math.abs(nome.split('').reduce((a,c)=> a+c.charCodeAt(0),0))%palette.length]; try{ props.categorias.push({ nome, cor:color }); emit('update-categorias', [...props.categorias]); }catch{} } }
function findNodeByLabel(label:string){ if(!cy) return null; const found=cy.nodes().filter(n=> n.data('label')===label); return found.length? found[0]:null; }
function createNodeIfAbsent(label:string, categoria:string){ if(!cy) return null; const ex=findNodeByLabel(label); if(ex) return ex; ensureCategory(categoria); const cat=props.categorias?.find(c=> c.nome===categoria); const id='n'+(++localNodeCounter)+'_'+Math.random().toString(36).slice(2,7); const node=cy.add({ data:{ id, label, categoria, cor:cat?.cor, tipo:categoria } }); setTimeout(()=> rebuildNodeCard(id),80); return node; }
function link(a:any,b:any,tipo:string){ if(!cy||!a||!b) return; if(a.edgesTo(b).length>0) return; cy.add({ data:{ id:'e'+Date.now()+Math.random().toString(36).slice(2,5), source:a.id(), target:b.id(), tipo } }); }
function submitAddNotebook(){ if(!cy) return; const name=notebookForm.value.nome.trim()|| 'Notebook_'+(++localNodeCounter); const nb=createNodeIfAbsent(name,'Notebook'); const reads=parsePaths(notebookForm.value.readPaths); const writes=parsePaths(notebookForm.value.writePaths); const readNodes:any[]=[]; const writeNodes:any[]=[]; reads.forEach(p=>{ const zone=zoneFromPath(p); const n=createNodeIfAbsent(p, zone); if(n) readNodes.push(n); }); writes.forEach(p=>{ const zone=zoneFromPath(p); const n=createNodeIfAbsent(p, zone); if(n) writeNodes.push(n); }); readNodes.forEach(r=> link(r, nb,'read')); writeNodes.forEach(w=> link(nb, w,'write')); snapshotBase(); persistGraph(); updateStats(statsMode.value); toast.add({ severity:'success', summary:'Notebook adicionado', life:2200, group:'global' }); showAddNotebook.value=false; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; setTimeout(()=> logDetachedCards(),120); }

// ---------- Complex sample ----------
function loadComplexSample(){ if(!cy) initCy([]); cy!.elements().remove(); cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove()); const chains=[ { pipe:'ADF_Pipeline_Sales', seq:['PZ:/raw/sales.csv','HZ:/stg/sales.parquet','CZ:/curated/sales','DW:Stage.Sales','DW:Core.Sales','Dataflow:SalesModel','PBI:Dashboard.Sales'] }, { pipe:'ADF_Pipeline_Finance', seq:['PZ:/raw/finance.csv','HZ:/stg/finance.parquet','CZ:/curated/finance','Synapse:Pool.Dedicated','PBI:Dashboard.Finance'] }, { pipe:'ADF_Pipeline_Inventory', seq:['PZ:/raw/inventory.csv','HZ:/stg/inventory.parquet','CZ:/curated/inventory','Synapse:Pool.CubePrep','Cubo:SalesCube'] } ]; chains.forEach(c=>{ const p=createNodeIfAbsent(c.pipe,'ADF'); let prev=p; c.seq.forEach(step=>{ const node=createNodeIfAbsent(step, zoneFromPath(step)); link(prev,node,'flow'); prev=node; }); }); chains.forEach(c=>{ const first=c.seq[0]; const second=c.seq[1]; const nb=createNodeIfAbsent('Notebook_'+c.pipe.replace('ADF_Pipeline_',''),'Notebook'); const nFirst=findNodeByLabel(first); const nSecond=findNodeByLabel(second); if(nFirst && nb) link(nFirst, nb,'read'); if(nb && nSecond) link(nb, nSecond,'write'); }); updateCategoryCounts(); snapshotBase(); updateStats('global'); cy!.layout({ name:'breadthfirst', directed:true, padding:120, spacingFactor:1.25 } as any).run(); showDemoHint.value=false; toast.add({ severity:'info', summary:'Exemplo complexo carregado', life:2700, group:'global' }); setTimeout(()=> logDetachedCards(),160); }

// ---------- Sample ----------
function loadSample(){ if(!cy) initCy([]); cy!.elements().remove(); cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove()); const names=['Sales Growth vs Target','Last Year Sales','Average Sale Value','Sales per Customer','Sales YoY %','Performance Rating','New Customers','Customer Acquisition Cost','Avg Revenue per Customer','Customer Lifetime Value']; const catList=props.categorias && props.categorias.length? props.categorias : [{ nome:'Default', cor:'#42a5f5' }]; const nodes=names.map((n,i)=>{ const cat=catList[i%catList.length]; return { data:{ id:(i+1000).toString(), label:n, title:n, subtitle:'Sales Analysis', categoria:cat.nome, cor:cat.cor, tecnologia:cat.nome, tipo:'Sales Analysis' } }; }); const edges:any[]=[]; for(let i=0;i<nodes.length-1;i++){ edges.push({ data:{ id:'se'+i, source:nodes[i].data.id, target:nodes[i+1].data.id, tipo:'demo' } }); } cy!.add(nodes); cy!.add(edges); cy!.layout({ name:'breadthfirst', directed:true, padding:80, spacingFactor:1.15 } as any).run(); setTimeout(()=> logDetachedCards(),50); showDemoHint.value=false; updateCategoryCounts(); toast.add({ severity:'info', summary:'Exemplo gerado', life:2500, group:'global' }); snapshotBase(); emitNodesLoaded(); updateStats('global'); }

// ---------- Layout / Zoom ----------
function reapplyLayout(){ if(!cy) return; let opts:any; if(currentLayout.value==='breadthfirst'){ const spacing=fullMode.value?1.7:1.05; opts={ name:'breadthfirst', directed:true, padding: fullMode.value?120:60, spacingFactor:spacing }; } else if(currentLayout.value==='fcose'){ opts={ name:'fcose', quality:'default', randomize:true, animate:'end', animationDuration:450, idealEdgeLength:170, nodeSeparation:180, nodeRepulsion:9500, gravity:0.30, gravityRange:3.2, gravityCompound:1.0, gravityRangeCompound:2.0, packComponents:true, padding:70 }; } else { opts={ name:'dagre', rankDir:'LR', rankSep:120, nodeSep:60, edgeSep:20, padding:60 }; } cy.layout(opts).run(); if(fullMode.value) cy.fit(undefined,40); }
function toggleGraphMode(){ fullMode.value=!fullMode.value; requestAnimationFrame(()=> reapplyLayout()); }
function setLayout(l:'breadthfirst'|'fcose'|'dagre'){ if(currentLayout.value!==l){ currentLayout.value=l; reapplyLayout(); } }
function cycleLayout(){ const order:('breadthfirst'|'fcose'|'dagre')[]=['breadthfirst','fcose','dagre']; const idx=order.indexOf(currentLayout.value); setLayout(order[(idx+1)%order.length]); }
function zoomIn(){ if(!cy) return; cy.zoom({ level: cy.zoom()*1.15, renderedPosition:{ x:cy.width()/2, y:cy.height()/2 } }); cy.trigger('zoom'); }
function zoomOut(){ if(!cy) return; cy.zoom({ level: cy.zoom()/1.15, renderedPosition:{ x:cy.width()/2, y:cy.height()/2 } }); cy.trigger('zoom'); }
function fitGraph(){ if(!cy) return; cy.fit(undefined,40); zoomPercent.value=Math.round(cy.zoom()*100); }

// ---------- Info Panel ----------
function positionInfoPanelInitial(){ const topBarH=(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dlm-topbar-h'))||92)+8; const c=cyContainer.value; const w=360; const cw=c? c.clientWidth: window.innerWidth; infoPanelPos.value.x=Math.max(12, cw-w-16); infoPanelPos.value.y=topBarH; }
function startDragInfo(e:MouseEvent){ if(infoPanelPinned.value) return; draggingInfo=true; dragDX=e.clientX-infoPanelPos.value.x; dragDY=e.clientY-infoPanelPos.value.y; document.addEventListener('mousemove', onDragInfo); document.addEventListener('mouseup', stopDragInfo); }
function onDragInfo(e:MouseEvent){ if(!draggingInfo) return; const c=cyContainer.value; const cw=c? c.clientWidth: window.innerWidth; const ch=c? c.clientHeight: window.innerHeight; const panel=document.querySelector('.info-panel') as HTMLElement|null; const pw=panel? panel.offsetWidth:360; const ph=panel? panel.offsetHeight:260; let nx=e.clientX-dragDX; let ny=e.clientY-dragDY; const minY=4; const maxX=cw-pw-4; const maxY=ch-ph-4; if(nx<4) nx=4; if(nx>maxX) nx=maxX; if(ny<minY) ny=minY; if(ny>maxY) ny=maxY; infoPanelPos.value.x=nx; infoPanelPos.value.y=ny; }
function clampInfoPanel(){ const c=cyContainer.value; const cw=c? c.clientWidth: window.innerWidth; const ch=c? c.clientHeight: window.innerHeight; const panel=document.querySelector('.info-panel') as HTMLElement|null; if(!panel) return; const pw=panel.offsetWidth; const ph=panel.offsetHeight; const minY=4; const maxX=cw-pw-4; const maxY=ch-ph-4; if(infoPanelPos.value.x>maxX) infoPanelPos.value.x=Math.max(4,maxX); if(infoPanelPos.value.y>maxY) infoPanelPos.value.y=Math.max(minY,maxY); if(infoPanelPos.value.y<minY) infoPanelPos.value.y=minY; if(infoPanelPos.value.x<4) infoPanelPos.value.x=4; }
onUnmounted(()=> { window.removeEventListener('resize', clampInfoPanel); if(globalClickBound){ document.removeEventListener('click', handleGlobalClick, true); globalClickBound=false; } if(cardObserver) { cardObserver.disconnect(); cardObserver=null; } cyContainer.value?.removeEventListener('click', containerClick, true); });
window.addEventListener('resize', clampInfoPanel);
function stopDragInfo(){ draggingInfo=false; document.removeEventListener('mousemove', onDragInfo); document.removeEventListener('mouseup', stopDragInfo); }
function togglePinInfo(){ infoPanelPinned.value=!infoPanelPinned.value; }
async function copyInfoJson(){ try{ await navigator.clipboard.writeText(infoJson.value||''); toast.add({ severity:'success', summary:'Copiado', life:1500, group:'global' }); }catch{ toast.add({ severity:'error', summary:'Falha ao copiar', life:1800, group:'global' }); } }
function buildInfoPanel(){ if(!cy) return; const sel=cy.$('node:selected'); if(sel.empty()){ showInfoPanel.value=false; return; } const node=sel[0]; const activeFilter=props.categoryFilter; const makeItem=(n:any)=> ({ Item:n.data('title')||n.data('label'), Tipo:n.data('categoria')||n.data('tipo')||n.data('tecnologia')||'' }); const filterFn=(n:any)=>{ if(!activeFilter || (Array.isArray(activeFilter)&&activeFilter.length===0)) return true; if(Array.isArray(activeFilter)) return activeFilter.includes(n.data('categoria')); return n.data('categoria')===activeFilter; }; const predecessores=(node as any).incomers('node').filter(filterFn).map((n:any)=> makeItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex(x=> x.Item===v.Item)===i); const sucessores=(node as any).outgoers('node').filter(filterFn).map((n:any)=> makeItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex(x=> x.Item===v.Item)===i); infoJson.value=JSON.stringify({ Item:makeItem(node).Item, Tipo:makeItem(node).Tipo, predecessores, sucessores }, null,2); showInfoPanel.value=true; updateStats('selected'); }
function closeInfoPanel(){ showInfoPanel.value=false; if(cy) cy.$('node:selected').unselect(); updateStats('global'); }

// ---------- Highlight / Animation ----------
function clearHighlights(){ if(!cy) return; cy.elements().removeClass('hl-up hl-down dimmed'); document.querySelectorAll('.dlm-card').forEach(el=> el.classList.remove('hl-up','hl-down','dimmed')); }
function highlightDirection(mode:'up'|'down'){ if(!cy) return; const sel=cy.$('node:selected'); if(sel.empty()) return; clearHighlights(); const visited:Record<string,boolean>={}; const stack=sel.toArray(); while(stack.length){ const node=stack.pop()!; if(visited[node.id()]) continue; visited[node.id()]=true; const edges=(mode==='up'? (node as any).incomers('edge') : (node as any).outgoers('edge')) as any; edges.forEach((e:any)=>{ e.addClass(mode==='up'? 'hl-up':'hl-down'); const next=mode==='up'? e.source(): e.target(); stack.push(next as any); }); node.addClass(mode==='up'? 'hl-up':'hl-down'); const card=document.querySelector(`.dlm-card[data-node-id="${node.id()}"]`); if(card) card.classList.add(mode==='up'? 'hl-up':'hl-down'); } const highlightedNodes=cy.nodes().filter(n=> visited[n.id()]); cy.nodes().not(highlightedNodes).addClass('dimmed'); const highlightedEdges=cy.edges('.hl-up, .hl-down'); cy.edges().not(highlightedEdges).addClass('dimmed'); document.querySelectorAll('.dlm-card').forEach(card=>{ const id=card.getAttribute('data-node-id'); if(id && !visited[id]) card.classList.add('dimmed'); }); }
const highlightUpstream=()=> highlightDirection('up');
const highlightDownstream=()=> highlightDirection('down');
function toggleEdgeAnimation(){ if(!cy) return; edgeAnimationOn.value=!edgeAnimationOn.value; if(edgeAnimationOn.value){ cy.edges().addClass('anim'); startEdgeAnimationLoop(); } else { if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame); edgeAnimFrame=null; cy.edges().removeClass('anim').forEach((e:any)=> e.style('line-dash-offset',0)); } }
function startEdgeAnimationLoop(){ if(!cy) return; const step=()=>{ if(!edgeAnimationOn.value){ edgeAnimFrame=null; return; } edgeDashOffset=(edgeDashOffset-1+40)%40; cy!.edges('.anim').forEach((e:any)=> e.style('line-dash-offset', edgeDashOffset)); edgeAnimFrame=requestAnimationFrame(step); }; if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame); edgeAnimFrame=requestAnimationFrame(step); }

// ---------- Diagnostics ----------
function logDetachedCards(){ try{ const wrappers=Array.from(cyContainer.value?.querySelectorAll('.dlm-html-label')||[]); const probs:any[]=[]; wrappers.forEach(w=>{ if(!cy) return; const card=w.querySelector('.dlm-card') as HTMLElement|null; if(!card) return; const id=card.getAttribute('data-node-id'); if(!id) return; const node=cy.getElementById(id); if(!node || node.empty()) return; const rpos=(node as any).renderedPosition(); const rect=(w as HTMLElement).getBoundingClientRect(); const crect=cyContainer.value!.getBoundingClientRect(); const domCX=rect.left - crect.left + rect.width/2; const domCY=rect.top - crect.top + rect.height/2; const dx=Math.round(domCX-rpos.x); const dy=Math.round(domCY-rpos.y); if(Math.abs(dx)>35 || Math.abs(dy)>35) probs.push({ id, dx, dy }); }); if(probs.length) console.warn('[GraphView] Detached cards', probs); }catch(e){ /* noop */ } }

// ---------- Categories / Filtering ----------
function updateCategoryCounts(){ if(!cy) return; const counts:Record<string,number>={}; cy.nodes().forEach(n=>{ const cat=n.data('categoria'); if(cat) counts[cat]=(counts[cat]||0)+1; }); emit('category-counts', counts); }
function applyCategoryFilter(){ const filter=props.categoryFilter; if(!filter || (Array.isArray(filter)&&filter.length===0)){ if(baseNodes.length) initCy([...baseNodes, ...baseEdges]); return; } if(baseNodes.length===0) snapshotBase(); const selected=new Set(Array.isArray(filter)? filter : [filter]); const visibleNodes=baseNodes.filter(n=> selected.has(n.data.categoria)); const visibleIds=new Set(visibleNodes.map(n=> n.data.id)); const directEdges=baseEdges.filter(e=> visibleIds.has(e.data.source) && visibleIds.has(e.data.target)); const outMap:Record<string,string[]>={}; baseEdges.forEach(e=> { (outMap[e.data.source] ||= []).push(e.data.target); }); const virtualEdges:{ data:any }[]=[]; const added=new Set<string>(); for(const vn of visibleNodes){ const start=vn.data.id; const queue=(outMap[start]||[]).map(t=> [start,t]); const visitedHidden=new Set<string>(); while(queue.length){ const path:any=queue.shift()!; const last=path[path.length-1]; if(visibleIds.has(last)){ if(last!==start){ const key=start+'=>'+last; if(!added.has(key) && !directEdges.some(e=> e.data.source===start && e.data.target===last)){ added.add(key); virtualEdges.push({ data:{ id:'virt_'+key, source:start, target:last, virtual:1, tipo:'virtual' } }); } } continue; } if(visitedHidden.has(last)) continue; visitedHidden.add(last); (outMap[last]||[]).forEach(nx=> queue.push([...path, nx])); } } initCy([...visibleNodes, ...directEdges, ...virtualEdges]); runAllDiagnostics({ cy, baseNodes, baseEdges, selectedCategories: Array.isArray(filter)? filter : [filter] }); setTimeout(()=> logDetachedCards(),120); updateStats('global'); }

// ---------- Global Click (card expander) ----------
function handleGlobalClick(ev:MouseEvent){ const caret=(ev.target as HTMLElement).closest('.dlm-caret'); if(!caret) return; const card=caret.closest('.dlm-card'); if(!card) return; card.classList.toggle('is-expanded'); }
function emitNodesLoaded(){ if(!cy) return; const nodes=cy.nodes().map(n=> ({ id:n.id(), data:n.data() })); emit('nodes-loaded', nodes); }
function focusNodeByLabel(label:string){ if(!cy) return; const node=cy.nodes().filter(n=> n.data('label')===label || n.data('title')===label)[0]; if(!node) return; cy.nodes().unselect(); node.select(); cy.center(node); cy.animate({ fit:{ eles:node, padding:80 }, duration:500 }); node.addClass('hl-up'); setTimeout(()=> node.removeClass('hl-up'), 1500); }
defineExpose({ focusNodeByLabel });
function markLastToastLife(ms:number){ requestAnimationFrame(()=>{ const container=document.querySelector('.p-toast'); if(!container) return; const messages=Array.from(container.querySelectorAll('.p-toast-message')) as HTMLElement[]; if(messages.length===0) return; const last=messages[messages.length-1]; last.style.setProperty('--dlm-life', ms+'ms'); last.setAttribute('data-life', ms.toString()); }); }

// ---------- Overlap / Color helpers ----------
function resolveOverlaps(padding=12, iterations=6){ if(!cy) return; const ns=cy.nodes(); for(let iter=0; iter<iterations; iter++){ let moved=false; for(let i=0;i<ns.length;i++){ const ni=ns[i]; const bi=ni.boundingBox({ includeLabels:false, includeOverlays:false }); for(let j=i+1;j<ns.length;j++){ const nj=ns[j]; const bj=nj.boundingBox({ includeLabels:false, includeOverlays:false }); if(bi.x1 - padding < bj.x2 && bi.x2 + padding > bj.x1 && bi.y1 - padding < bj.y2 && bi.y2 + padding > bj.y1){ const cxI=(bi.x1+bi.x2)/2; const cyI=(bi.y1+bi.y2)/2; const cxJ=(bj.x1+bj.x2)/2; const cyJ=(bj.y1+bj.y2)/2; let dx=cxI-cxJ; let dy=cyI-cyJ; if(dx===0 && dy===0){ dx=(Math.random()-0.5)*2; dy=(Math.random()-0.5)*2; } const overlapX=(bi.w + bj.w)/2 + padding - Math.abs(dx); const overlapY=(bi.h + bj.h)/2 + padding - Math.abs(dy); if(overlapX>0 || overlapY>0){ const shiftX=overlapX>0 ? (dx>0? overlapX/2 : -overlapX/2) : 0; const shiftY=overlapY>0 ? (dy>0? overlapY/2 : -overlapY/2) : 0; ni.position({ x: ni.position('x') + shiftX, y: ni.position('y') + shiftY }); nj.position({ x: nj.position('x') - shiftX, y: nj.position('y') - shiftY }); moved=true; } } } } if(!moved) break; } }
function lighten(hex:string, percent:number){ const num=parseInt(hex.replace('#',''),16); const r=Math.min(255, ((num>>16)&0xff) + Math.round(255*percent/100)); const g=Math.min(255, ((num>>8)&0xff) + Math.round(255*percent/100)); const b=Math.min(255, (num&0xff) + Math.round(255*percent/100)); return '#'+[r,g,b].map(x=> x.toString(16).padStart(2,'0')).join(''); }
function pickReadable(hex:string){ if(!hex) return '#fff'; const c=hex.replace('#',''); const bigint=parseInt(c.length===3? c.split('').map(x=> x+x).join(''): c,16); const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255; const lum=(0.2126*r+0.7152*g+0.0722*b)/255; return lum>0.62? '#1F2937':'#fff'; }
function getNodeSymbol(data:any){ const cat=((data && (data.categoria||data.tipo))? (data.categoria||data.tipo):'').toString().toLowerCase(); const icon=(p:string)=> `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">${p}</svg>`; if(cat.includes('bronze')) return icon('<circle cx="12" cy="12" r="9" stroke="#b87333" fill="#e6b07a" />'); if(cat.includes('silver')) return icon('<circle cx="12" cy="12" r="9" stroke="#aaa" fill="#e0e0e0" /><path d="M8 12h8" stroke="#888" />'); if(cat.includes('gold')) return icon('<circle cx="12" cy="12" r="9" stroke="#ffd700" fill="#fff8dc" /><path d="M9 9h6v6H9z" stroke="#ffd700" />'); if(cat.includes('dash')) return icon('<rect x="4" y="4" width="16" height="16" rx="2" stroke="#888" fill="#f3f4f6" /><path d="M8 10h8M8 14h5" stroke="#888" />'); if(cat.includes('pipe')) return icon('<path d="M4 12h16" stroke="#888" /><path d="M8 8v8M16 8v8" stroke="#888" />'); if(cat.includes('note')) return icon('<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#888" /><path d="M14 3v6h6" stroke="#888" />'); if(cat.includes('sql')||cat.includes('table')) return icon('<ellipse cx="12" cy="5" rx="7" ry="3" stroke="#2563eb" fill="#e0e7ff" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" stroke="#2563eb" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="#2563eb" />'); if(cat.includes('view')) return icon('<circle cx="12" cy="12" r="3" stroke="#10b981" fill="#d1fae5" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="#10b981" />'); return icon('<circle cx="12" cy="12" r="10" stroke="#e5e7eb" fill="#f3f4f6" /><path d="M8 12h8M12 8v8" stroke="#9ca3af" />'); }

// ---------- Watches / Mount ----------
watch(()=> props.categoryFilter, ()=>{ applyCategoryFilter(); updateCategoryCounts(); if(showInfoPanel.value) showInfoPanel.value=false; updateStats('global'); });
function loadCategorias() { /* placeholder */ }
function loadGraph(){
  const loaded = loadStoredGraph();
  if(!loaded){
    initCy([]);
    showDemoHint.value = true;
  }
}
onMounted(()=>{ loadCategorias(); loadGraph(); setTimeout(()=> loadSample(), 300); positionInfoPanelInitial(); nextTick(()=>{ const header=document.querySelector('.topbar') as HTMLElement|null; const h=header? header.offsetHeight:56; document.documentElement.style.setProperty('--dlm-topbar-h', h+'px'); }); });
</script>

<style>
.graph-wrapper { flex:1; position: relative; --tb-h: var(--dlm-topbar-h, 92px); }
.graph-wrapper.fullscreen { position:fixed; inset:0; z-index:2000; background:#ffffff; }
.graph-toolbar { display:none; }
.cy-container { position:absolute; inset:0; background: radial-gradient(circle at 8px 8px,#d9dee2 1px,transparent 1px); background-size:20px 20px; }
.zoom-indicator { font-size:12px; background:#ffffffd9; padding:4px 8px; border:1px solid #d0d7de; border-radius:6px; line-height:1; backdrop-filter:blur(4px); }
.layout-select { font-size:12px; padding:4px 6px; border:1px solid #d0d7de; border-radius:6px; background:#fff; }
.demo-hint { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.demo-card { pointer-events:auto; background:#ffffffee; backdrop-filter:blur(4px); border:1px solid #d0d7de; border-radius:14px; padding:1.4rem 1.8rem; max-width:340px; text-align:center; box-shadow:0 10px 34px -8px rgba(0,0,0,.25); }
.demo-card h3 { margin:0 0 .5rem; font-weight:600; font-size:1.1rem; }
.demo-card p { margin:.25rem 0 1rem; font-size:.85rem; line-height:1.3; }

/* HTML labels para nós */
.dlm-html-label { pointer-events: auto; }
.dlm-card { --dlm-radius:12px; --dlm-border:#DADADA ; --dlm-shadow:0 2px 4px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); --dlm-shadow-hover:0 4px 12px -2px rgba(0,0,0,0.18),0 2px 6px -1px rgba(0,0,0,0.10); width:280px; background:#fff; border:1px solid var(--dlm-border); border-radius:var(--dlm-radius); box-shadow:var(--dlm-shadow); font-family: Inter, system-ui, sans-serif; position:relative; overflow:hidden; transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s, transform .25s; }
.dlm-card:hover { box-shadow:var(--dlm-shadow-hover); }
.dlm-card.is-selected { box-shadow:0 0 0 2px rgba(37,99,235,.30),0 2px 6px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); }
.dlm-card.is-selected.multiple { box-shadow:0 0 0 2px rgba(100,116,139,.55),0 0 0 6px rgba(148,163,184,.25),0 4px 14px -4px rgba(0,0,0,.18); }
.dlm-card.is-expanded { box-shadow:0 8px 26px -6px rgba(0,0,0,.30),0 4px 14px -4px rgba(0,0,0,.14); }
.dlm-bar { height:5px; width:100%; border-top-left-radius:var(--dlm-radius); border-top-right-radius:var(--dlm-radius); }
.dlm-body { padding:16px 16px 14px 16px; }
.dlm-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:2px; }
.dlm-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.35) inset; flex-shrink:0; letter-spacing:.5px; }
.dlm-text-group { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.dlm-title { font-size:14px; font-weight:500; color:#1F2937; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-sub { font-size:12px; color:#6B7280; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-caret { background:#ffffff; border:1px solid #E2E8F0; cursor:pointer; line-height:1; color:#3B82F6; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:8px; transition: background .25s, border-color .25s; flex-shrink:0; width:32px; height:32px; box-shadow:0 1px 2px rgba(0,0,0,.08); }
.dlm-caret:hover { background:#EFF6FF; border-color:#BFDBFE; }
.dlm-caret-svg { transition: transform .35s ease; }
.dlm-card.is-expanded .dlm-caret-svg { transform: rotate(180deg); }
.dlm-details { margin-top:10px; padding-top:10px; border-top:1px solid #F3F4F6; max-height:0; overflow:hidden; transition:max-height .35s ease, padding-top .35s, opacity .35s; opacity:0; }
.dlm-card.is-expanded .dlm-details { max-height:240px; opacity:1; }
.dlm-details pre { background:#F8F9FA; color:#363A42; margin:0; padding:10px 12px; border:1px solid #E9ECEF; border-radius:6px; font-size:11px; line-height:1.35; font-family:'Fira Code','Fira Mono',Consolas,monospace; white-space:pre; overflow:auto; }
.dlm-details code { font-family:inherit; }

/* Highlights upstream / downstream */
.dlm-card.hl-up { box-shadow:0 0 0 2px #2563EB,0 0 0 6px rgba(37,99,235,.25), var(--dlm-shadow-hover); }
.dlm-card.hl-down { box-shadow:0 0 0 2px #10B981,0 0 0 6px rgba(16,185,129,.25), var(--dlm-shadow-hover); }
.dlm-card.dimmed { opacity:0.18; filter:grayscale(0.6); }


/* Ocultar ícones via classe wrapper */
.hide-icons .dlm-icon { display:none !important; }

/* Correção robusta para ícones SVG e IMG nos cards */
.dlm-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  max-width: 36px;
  max-height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  box-shadow: 0 1px 4px 0 #0001;
  overflow: hidden;
  font-size: 18px;
  padding: 0;
}
.dlm-icon svg {
  width: 22px;
  height: 22px;
  display: block;
  margin: 0 auto;
}
.dlm-icon-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

/* Painel lateral de informações (janela flutuante draggable) */
.info-panel { position:absolute; width:360px; max-width:90vw; max-height:70vh; background:#fffffffa; border:1px solid #e2e8f0; backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 8px 28px -6px rgba(0,0,0,.25), 0 4px 16px -4px rgba(0,0,0,.12); padding:12px 14px 16px; display:flex; flex-direction:column; gap:10px; z-index:4200; font-family:Inter,system-ui,sans-serif; border-radius:14px; animation:infoSlide .35s cubic-bezier(.4,0,.2,1); }
@keyframes infoSlide { from { opacity:0; transform:translateY(12px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
.info-header { display:flex; align-items:center; justify-content:space-between; font-size:14px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; user-select:none; }
.info-header.drag-handle { cursor:move; }
.info-actions { display:flex; align-items:center; gap:6px; }
.info-pin { background:#fff; border:1px solid #d0d7de; border-radius:6px; width:26px; height:26px; cursor:pointer; line-height:1; font-size:16px; display:flex; align-items:center; justify-content:center; color:#374151; }
.info-pin.active { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.info-pin:hover { background:#f3f4f6; }
.info-copy { background:#fff; border:1px solid #d0d7de; border-radius:6px; width:26px; height:26px; cursor:pointer; line-height:1; font-size:14px; display:flex; align-items:center; justify-content:center; color:#374151; }
.info-copy:hover { background:#f3f4f6; }
.info-close { background:#fff; border:1px solid #d0d7de; border-radius:6px; width:26px; height:26px; cursor:pointer; line-height:1; font-size:18px; display:flex; align-items:center; justify-content:center; color:#374151; }
.info-close:hover { background:#f3f4f6; }
.info-json { flex:1; margin:0; font-size:12px; background:#0f172a; color:#e2e8f0; border:1px solid #1e293b; border-radius:8px; padding:12px 14px; overflow:auto; line-height:1.4; font-family:'Fira Code','Fira Mono',Consolas,monospace; box-shadow: inset 0 0 0 1px #334155; }

/* Edge highlight colors handled via Cytoscape class styles (set in JS). */
.graph-toast-root { position:absolute !important; top:calc(var(--dlm-topbar-h, 92px) + 16px) !important; right:16px !important; left:auto !important; z-index:5000 !important; }
.graph-toast-root .p-toast-message { backdrop-filter:blur(8px); }

/* Mini control bar */
.mini-controls { position:absolute; bottom:16px; left:16px; display:flex; flex-direction:column; background:#ffffffec; border:1px solid #d0d7de; border-radius:10px; box-shadow:0 4px 14px -4px rgba(0,0,0,.18),0 2px 6px -2px rgba(0,0,0,.08); overflow:visible; backdrop-filter:blur(6px); z-index:60; }
.mini-controls .mc-btn { appearance:none; background:#fff; border:0; border-bottom:1px solid #e5e7eb; width:44px; height:44px; font-size:20px; font-weight:500; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center; color:#374151; transition:background .2s, color .2s; overflow:visible; }
.mini-controls .mc-btn:last-of-type { border-bottom:0; }
.mini-controls .mc-btn:hover { background:#f1f5f9; color:#111827; }
.mini-controls .mc-btn:active { background:#e2e8f0; }
.mini-controls .mc-zoom { font-size:11px; font-weight:500; text-align:center; padding:6px 4px 8px; color:#334155; background:#fff; border-top:1px solid #e5e7eb; letter-spacing:.5px; }
@media (max-width:680px){ .mini-controls { bottom:8px; left:8px; transform:scale(.85); transform-origin:bottom left; } }

/* Secondary controls */
.mini-controls-alt { position:absolute; bottom:16px; left:72px; display:flex; flex-direction:row; gap:6px; z-index:60; }
.mini-controls-alt .mc-btn { width:40px; height:40px; font-size:16px; border:1px solid #d0d7de; background:#ffffffec; backdrop-filter:blur(6px); border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#374151; box-shadow:0 2px 6px -2px rgba(0,0,0,.15); transition:background .2s, color .2s, box-shadow .2s; }
.mini-controls-alt .mc-btn:hover { background:#f1f5f9; }
.mini-controls-alt .mc-btn:active { background:#e2e8f0; }
.mini-controls-alt .mc-btn.active { color:#1d4ed8; background:#eff6ff; box-shadow:0 0 0 2px #bfdbfe inset; }
.mc-select-wrap { position:relative; }
.mc-select { height:40px; font-size:13px; padding:0 6px; border:1px solid #d0d7de; background:#ffffffec; backdrop-filter:blur(6px); border-radius:8px; cursor:pointer; color:#374151; box-shadow:0 2px 6px -2px rgba(0,0,0,.15); appearance:none; font-weight:500; }
.mc-select:hover { background:#f1f5f9; }
.mc-select:focus { outline:2px solid #bfdbfe; outline-offset:1px; }
@media (max-width:680px){ .mini-controls-alt { bottom:8px; left:64px; transform:scale(.85); transform-origin:bottom left; flex-wrap:wrap; } }

/* Simple tooltip via data-tip */
.mc-btn[data-tip], .mc-select[data-tip] { position:relative; }
.mc-btn[data-tip]:hover::after, .mc-select[data-tip]:hover::after { content:attr(data-tip); position:absolute; left:50%; bottom:100%; transform:translate(-50%, -10px); background:#111827; color:#f1f5f9; font-size:11px; padding:4px 8px; border-radius:6px; white-space:nowrap; box-shadow:0 4px 14px -4px rgba(0,0,0,.45); z-index:9999; pointer-events:none; }
.mc-btn[data-tip]:hover::before, .mc-select[data-tip]:hover::before { content:''; position:absolute; left:50%; bottom:100%; transform:translate(-50%, -2px); border:6px solid transparent; border-top:0; border-bottom-color:#111827; z-index:9999; }
.mini-controls-alt.extra-persist { left:auto; right:16px; bottom:16px; }
</style>
