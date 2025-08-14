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

    <!-- Hint quando não há dados -->
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

    <!-- Dialog: criar ligação -->
    <Dialog v-model:visible="showCreateLink" header="Criar ligação" :modal="true" style="width:400px">
      <div class="p-fluid form-grid">
        <div class="p-field">
          <label>Destino</label>
          <Dropdown v-model="createLinkForm.destinoId" :options="nodeOptions" optionLabel="label" optionValue="id" placeholder="Selecione" filter />
        </div>
        <div class="p-field">
          <label>Tipo ligação</label>
          <InputText v-model="createLinkForm.tipoLigacao" placeholder="Ex: relacao, flow, write, read" />
        </div>
        <Button label="Salvar" @click="submitCreateLink" />
      </div>
    </Dialog>

    <!-- Dialog: criar + ligar novo -->
    <Dialog v-model:visible="showCreateNodeLink" header="Criar artefato & ligar" :modal="true" style="width:420px">
      <div class="p-fluid form-grid">
        <div class="p-field"><label>Nome</label><InputText v-model="createNodeForm.nome" /></div>
        <div class="p-field"><label>Tipo</label><InputText v-model="createNodeForm.tipo" /></div>
        <div class="p-field"><label>Tecnologia</label><InputText v-model="createNodeForm.tecnologia" /></div>
        <div class="p-field">
          <label>Categoria</label>
          <Dropdown v-model="createNodeForm.categoriaNome" :options="props.categorias || []" optionLabel="nome" optionValue="nome" placeholder="Escolha">
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

    <!-- Dialog: editar nó -->
    <Dialog v-model:visible="showEditNode" header="Editar artefato" :modal="true" style="width:420px">
      <div v-if="editNodeForm.id" class="p-fluid form-grid">
        <div class="p-field"><label>Nome</label><InputText v-model="editNodeForm.nome" /></div>
        <div class="p-field"><label>Tipo</label><InputText v-model="editNodeForm.tipo" /></div>
        <div class="p-field"><label>Tecnologia</label><InputText v-model="editNodeForm.tecnologia" /></div>
        <div class="p-field"><label>Categoria</label>
          <Dropdown v-model="editNodeForm.categoriaNome" :options="props.categorias || []" optionLabel="nome" optionValue="nome" placeholder="Escolha" />
        </div>
        <div class="edit-actions">
          <Button label="Salvar" @click="saveEditNode" />
          <Button label="Cancelar" severity="secondary" text @click="showEditNode=false" />
        </div>
      </div>
    </Dialog>

    <!-- Dialog: adicionar notebook (paths) -->
    <Dialog v-model:visible="showAddNotebook" header="Adicionar Notebook (paths)" :modal="true" style="width:480px">
      <div class="p-fluid form-grid notebook-form">
        <div class="p-field"><label>Notebook</label><InputText v-model="notebookForm.nome" placeholder="Ex: Notebook_Ingest" /></div>
        <div class="p-field"><label>Read Paths (predecessores)</label><InputText v-model="notebookForm.readPaths" placeholder="PZ:/raw/arquivo1.csv, PZ:/raw/arquivo2.csv" /></div>
        <div class="p-field"><label>Write Paths (sucessores)</label><InputText v-model="notebookForm.writePaths" placeholder="HZ:/stg/tabela1, HZ:/stg/tabela2" /></div>
        <small class="hint">Separe múltiplos caminhos por vírgula. Zona inferida pelo prefixo antes de ':' (PZ:, HZ:, CZ:, DW:, Synapse:, Dataflow:, PBI:, Cubo:, Notebook:)</small>
        <div class="edit-actions">
          <Button label="Adicionar" @click="submitAddNotebook" />
          <Button label="Cancelar" severity="secondary" text @click="showAddNotebook=false" />
        </div>
      </div>
    </Dialog>

    <!-- Painel de informações -->
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
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
import cytoscape, { Core, EventObjectNode } from 'cytoscape';
import nodeHtmlLabel from 'cytoscape-node-html-label';
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import dagre from 'cytoscape-dagre';
// @ts-ignore
import cyNavigator from 'cytoscape-navigator';

import ContextMenu from 'primevue/contextmenu';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

import { attachGlobalAPI, runAllDiagnostics } from '../debug/graphDiagnostics';
import { buildSafeIconHtml, buildCardHtml, pickReadable } from '../utils/cardUtils';

/** Props **/
const props = defineProps<{
  showIcons?: boolean;
  categoryFilter?: string[] | string | null;
  categorias?: { nome: string; cor: string; icon?: string; grupo?: string; subcategoria?: string }[];
  autoLoadSample?: boolean;
  initialZoom?: number;
  initialCenter?: boolean;
}>();
const emit = defineEmits(['toggle-icons','category-counts','update-categorias','nodes-loaded','graph-stats']);

/** Registrar plugins uma única vez */
if(!(cytoscape as any).__dlmPlugins){
  nodeHtmlLabel(cytoscape);
  cytoscape.use(fcose);
  cytoscape.use(dagre);
  cytoscape.use(cyNavigator);
  (cytoscape as any).__dlmPlugins = true;
}

/** Core / estado **/
const cyContainer = ref<HTMLDivElement|null>(null);
let cy: Core | null = null;

const toast = useToast();
const internalShowIcons = ref(props.showIcons !== false);

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

const fullMode = ref(false);
const zoomPercent = ref(100);
const currentLayout = ref<'breadthfirst'|'fcose'|'dagre'|'grid'|'circle'|'concentric'>('fcose');
const layoutLabel = computed(()=> currentLayout.value==='breadthfirst' ? 'Hierárquico' : currentLayout.value==='fcose' ? 'Force (fCoSE)' : currentLayout.value==='dagre' ? 'Dagre' : currentLayout.value);
const layoutIcon = computed(()=> currentLayout.value==='breadthfirst' ? '⤓' : currentLayout.value==='fcose' ? '◎' : currentLayout.value==='dagre' ? '⇄' : '◯');

const edgeAnimationOn = ref(false);
let edgeAnimFrame: number | null = null;
let edgeDashOffset = 0;

/** Painel de info (draggable) */
const showInfoPanel = ref(false);
const infoJson = ref('');
const infoPanelPos = ref({ x:0, y:0 });
const infoPanelPinned = ref(false);
let draggingInfo = false, dragDX = 0, dragDY = 0;

/** Persistência */
const STORAGE_KEY = 'dlmGraphV1';
let persistGraphTimeout: number | null = null;
function persistGraph(){
  if (persistGraphTimeout !== null) clearTimeout(persistGraphTimeout);
  persistGraphTimeout = window.setTimeout(() => {
    if(!cy) return;
    const nodes = cy.nodes().map(n=> ({
      data:{ id:n.id(), label:n.data('label'), title:n.data('title'), subtitle:n.data('subtitle'),
        categoria:n.data('categoria'), cor:n.data('cor'), tecnologia:n.data('tecnologia'), tipo:n.data('tipo'), formula:n.data('formula') }
    }));
    const edges = cy.edges().filter(e=> !e.data('virtual')).map(e=> ({
      data:{ id:e.id(), source:e.data('source'), target:e.data('target'), tipo:e.data('tipo') }
    }));
    const expanded = Array.from(expandedCardIds);
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:1, savedAt:Date.now(), nodes, edges, expanded })); }catch{}
    persistGraphTimeout = null;
  }, 400);
}
function loadStoredGraph(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return false;
    const parsed=JSON.parse(raw);
    if(!parsed || !Array.isArray(parsed.nodes)) return false;
    initCy([ ...parsed.nodes, ...parsed.edges ]);
    showDemoHint.value=false;
    snapshotBase();
    // restaurar expansões
    expandedCardIds.clear();
    if(Array.isArray(parsed.expanded)) parsed.expanded.forEach((id:string)=> expandedCardIds.add(id));
    requestAnimationFrame(()=> parsed.expanded?.forEach((id:string)=> applyExpansionStateToDom(id)));
    updateStats('global');
    return true;
  }catch{
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}
function clearStoredGraph(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  if(cy){
    cy.elements().remove();
    cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove());
  }
  showDemoHint.value=true;
  snapshotBase();
  updateStats('global');
  toast.add({ severity:'info', summary:'Grafo limpo', life:1600, group:'global' });
}
function forceShowExamples(){
  showDemoHint.value=true;
  toast.add({ severity:'info', summary:'Exemplos disponíveis', life:1600, group:'global' });
}

/** Helpers básicos */
let baseNodes: { data:any }[] = [];
let baseEdges: { data:any }[] = [];
function snapshotBase(){ if(!cy) return; baseNodes = cy.nodes().map(n=> ({ data:{ ...n.data(), id:n.id() } })); baseEdges = cy.edges().filter(e=> !e.data('virtual')).map(e=> ({ data:{ ...e.data(), id:e.id(), source:e.data('source'), target:e.data('target'), tipo:e.data('tipo') } })); }
function getCategoria(nome?:string){ if(!nome) return undefined; return props.categorias?.find(c=> c.nome===nome); }
function buildNodeLabel(d:any){ return d.label; }

/** Estatísticas **/
const statsMode = ref<'global'|'selected'>('global');
const stats = ref<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 });
function updateStats(mode:'global'|'selected'){
  if(!cy) return;
  statsMode.value = mode;
  if(mode==='global'){
    stats.value.nodes = cy.nodes().length;
    stats.value.edges = cy.edges().filter(e=> !e.data('virtual')).length;
  } else {
    const sel = cy.$('node:selected');
    if(sel.empty()){ updateStats('global'); return; }
    const visited:Record<string,boolean>={};
    const stack=[sel[0]];
    const edgeSet=new Set<string>();
    while(stack.length){
      const nd=stack.pop()!; if(visited[nd.id()]) continue; visited[nd.id()]=true;
      (nd as any).incomers('edge').forEach((e:any)=>{ if(!e.data('virtual')) edgeSet.add(e.id()); stack.push(e.source()); });
      (nd as any).outgoers('edge').forEach((e:any)=>{ if(!e.data('virtual')) edgeSet.add(e.id()); stack.push(e.target()); });
    }
    stats.value.nodes=Object.keys(visited).length; stats.value.edges=edgeSet.size;
  }
  const visibleNodes = cy.nodes().length;
  const visibleEdges = cy.edges().filter(e=> !e.data('virtual')).length;
  const totalNodes = baseNodes.length ? baseNodes.length : visibleNodes;
  const totalEdges = baseEdges.length ? baseEdges.filter(e=> !e.data.virtual).length : visibleEdges;
  const selectedNodesCount = cy.$('node:selected').length;
  const selectedEdgesCount = cy.$('edge:selected').filter(e=> !e.data('virtual')).length;
  emit('graph-stats', {
    mode: statsMode.value, nodes: stats.value.nodes, edges: stats.value.edges,
    visibleNodes, visibleEdges, totalNodes, totalEdges,
    selectedNodes: selectedNodesCount, selectedEdges: selectedEdgesCount
  });
}

/** Cards (expansão centralizada) **/
const expandedCardIds = new Set<string>();
function applyExpansionStateToDom(id:string){
  const cards = document.querySelectorAll(`.dlm-card[data-node-id="${id}"]`);
  const should = expandedCardIds.has(id);
  cards.forEach(card => {
    if(should) card.classList.add('is-expanded'); else card.classList.remove('is-expanded');
  });
}
function toggleCardExpansion(id:string, origin='unknown'){
  if(expandedCardIds.has(id)) expandedCardIds.delete(id); else expandedCardIds.add(id);
  applyExpansionStateToDom(id);
}

/** Seleção -> DOM (borda escura) **/
function syncCardSelectionsStrict(){
  if(!cy) return;
  const selectedIds = new Set(cy.$('node:selected').map(n => n.id()));
  const multi = selectedIds.size > 1;
  const cards = cyContainer.value?.querySelectorAll('.dlm-card') || [];
  cards.forEach(el => {
    const card = el as HTMLElement;
    const id = card.getAttribute('data-node-id') || '';
    if(selectedIds.has(id)){
      card.classList.add('is-selected');
      if(multi) card.classList.add('multiple'); else card.classList.remove('multiple');
    } else {
      card.classList.remove('is-selected','multiple');
    }
  });
}

/** Flags de supressão p/ evitar “limpezas” indesejadas após caret */
let suppressNextNodeTap = false;
let suppressAutoReselectUntil = 0;
let lastSelectEventTime = 0;
let lastSelectNodeIds: string[] = [];
let lastTapNodeId: string | null = null;
let lastTapTime = 0;
let lastInteractionTs = 0;

/** Context menu disparado via card */
function openContextMenuFor(nodeId:string, originalEvent: MouseEvent){
  if(!cy) return;
  currentNodeId.value = nodeId;
  nodeOptions.value = cy.nodes().filter(n=> n.id()!==nodeId)
    .map(n=>({ id: parseInt(n.id()), label: n.data('label') }));
  contextItems.value = [
    { label:'Criar ligação', icon:'pi pi-link', command:()=> showCreateLink.value=true },
    { label:'Criar + ligar novo', icon:'pi pi-plus', command:()=> showCreateNodeLink.value=true },
    { label:'Editar artefato', icon:'pi pi-pencil', command:()=> openEditNode(nodeId) },
    { label:'Adicionar Notebook (paths)', icon:'pi pi-book', command:()=> { showAddNotebook.value=true; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; } },
    { label:'Apagar selecionados', icon:'pi pi-trash', command:()=> deleteSelected() }
  ];
  (cm.value as any)?.show(originalEvent);
}

/** Init Cytoscape **/
function initCy(elements:any[]){
  // limpar instância anterior
  if (cy) {
    try { cy.removeAllListeners && cy.removeAllListeners(); } catch {}
    try { cy.destroy && cy.destroy(); } catch {}
    cy = null;
  }
  if(cyContainer.value){ cyContainer.value.innerHTML=''; }

  cy = cytoscape({
    container: cyContainer.value!,
    boxSelectionEnabled: true,
    selectionType: 'additive',
    elements,
    layout: {
      name: 'fcose',
      quality: 'default',
      randomize: true,
      animate: 'end',
      animationDuration: 450,
      idealEdgeLength: 170,
      nodeSeparation: 180,
      nodeRepulsion: 9500,
      gravity: 0.30,
      packComponents: true,
      padding: 70
    } as any,
    style: [
      { selector:'node', style:{ shape:'round-rectangle', width:280, height:42, 'background-opacity':0, 'border-width':0, label:'', 'text-opacity':0, 'overlay-opacity':0 } as any },
      { selector:'edge', style:{ width:1.8,'line-color':'#b0b9c2','target-arrow-color':'#5a6470','target-arrow-shape':'vee','curve-style':'bezier','arrow-scale':1.15,'line-cap':'round','target-distance-from-node':38,'source-distance-from-node':34,opacity:0.97 } as any },
      { selector:'edge.hover', style:{ 'line-color':'#1f7ae0','target-arrow-color':'#1f7ae0', width:2.4 } as any },
      { selector:'edge.hl-up', style:{ 'line-color':'#2563EB','target-arrow-color':'#2563EB', width:2.8,'arrow-scale':1.6 } as any },
      { selector:'edge.hl-down', style:{ 'line-color':'#10B981','target-arrow-color':'#10B981', width:2.8,'arrow-scale':1.6 } as any },
      { selector:'edge.anim', style:{ 'line-style':'dashed','line-dash-pattern':[8,5],'line-dash-offset':0,'target-arrow-shape':'vee','arrow-scale':5 } as any },
      { selector:'edge.virtual', style:{ 'line-style':'dashed','line-color':'#94a3b8','target-arrow-color':'#94a3b8', width:1.4, opacity:0.75, 'arrow-scale':1.1 } as any },
      { selector:'edge:selected', style:{ 'line-color':'#f97316','target-arrow-color':'#f97316', width:6, 'z-index':999, 'arrow-scale':2.1, opacity:1 } as any }
    ] as any
  });

  attachGlobalAPI(()=> ({ cy, baseNodes, baseEdges, selectedCategories: Array.isArray(props.categoryFilter)? props.categoryFilter : props.categoryFilter? [props.categoryFilter] : null }));
  runAllDiagnostics({ cy, baseNodes, baseEdges, selectedCategories: Array.isArray(props.categoryFilter)? props.categoryFilter : props.categoryFilter? [props.categoryFilter] : null });

  cy.on('layoutstop', ()=> {
    if(currentLayout.value==='fcose'){
      resolveOverlaps(16,7);
      if(fullMode.value) cy!.fit(undefined,40);
      zoomPercent.value=Math.round(cy!.zoom()*100);
    }
    // reaplicar expansão
    requestAnimationFrame(()=> expandedCardIds.forEach(id=> applyExpansionStateToDom(id)));
  });

  // HTML label (cards)
  // @ts-ignore
  cy.nodeHtmlLabel([{
    query:'node',
    halign:'center', valign:'center', halignBox:'center', valignBox:'center',
    cssClass:'dlm-html-label',
    tpl:(d:any) => {
      const expanded = expandedCardIds.has(d.id);
      const nome = d.title || d.label || '';
      const second = d.subtitle || d.tipo || d.tecnologia || '';
      const catObj = getCategoria(d.categoria);
      const baseColor = catObj?.cor || d.cor || '#42a5f5';
      const code = d.formula || 'DIVIDE(\n  [Total Sales],\n  [Total Units],\n  0\n)';
      const fg = pickReadable(baseColor);
      const iconHtml = buildSafeIconHtml(catObj?.icon, d, baseColor);
      return buildCardHtml({
        showIcons: internalShowIcons.value,
        expanded,
        nome,
        second,
        code,
        baseColor,
        fg,
        iconHtml,
        id: d.id,
        categoria: d.categoria || d.tipo
      });
    }
  }]);

  // Context menu nativo (cxttap) no nó
  cy.on('cxttap','node',(evt:EventObjectNode)=> {
    const nodeId=evt.target.id();
    currentNodeId.value=nodeId;
    nodeOptions.value = cy!.nodes().filter(n=> n.id()!==nodeId).map(n=>({ id:parseInt(n.id()), label:n.data('label') }));
    contextItems.value=[
      { label:'Criar ligação', icon:'pi pi-link', command:()=> showCreateLink.value=true },
      { label:'Criar + ligar novo', icon:'pi pi-plus', command:()=> showCreateNodeLink.value=true },
      { label:'Editar artefato', icon:'pi pi-pencil', command:()=> openEditNode(nodeId) },
      { label:'Adicionar Notebook (paths)', icon:'pi pi-book', command:()=> { showAddNotebook.value=true; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; } },
      { label:'Apagar selecionados', icon:'pi pi-trash', command:()=> deleteSelected() }
    ];
    (cm.value as any)?.show(evt.originalEvent);
  });

  // Context menu no fundo
  cy.on('cxttap', (evt:any)=> {
    if(evt.target===cy){
      currentNodeId.value=null;
      contextItems.value=[
        { label:'Gerar exemplo simples', icon:'pi pi-magic', command:()=> loadSample() },
        { label:'Gerar exemplo complexo', icon:'pi pi-sitemap', command:()=> loadComplexSample() },
        { label:'Limpar destaques', icon:'pi pi-filter-slash', command:()=> clearHighlights() },
        { label:'Apagar selecionados', icon:'pi pi-trash', command:()=> deleteSelected() },
        { label:'Adicionar Notebook', icon:'pi pi-book', command:()=> { showAddNotebook.value=true; notebookForm.value={ nome:'', readPaths:'', writePaths:'' }; } }
      ];
      (cm.value as any)?.show(evt.originalEvent);
    }
  });

  cy.on('mouseover','node',evt=> evt.target.connectedEdges().addClass('hover'));
  cy.on('mouseout','node',evt=> evt.target.connectedEdges().removeClass('hover'));

  cy.on('zoom', ()=> zoomPercent.value=Math.round(cy!.zoom()*100));

  // zoom/center iniciais
  const initialZoom = typeof props.initialZoom === 'number' ? props.initialZoom : 0.75;
  cy.zoom(initialZoom);
  if (props.initialCenter !== false) cy.center();
  zoomPercent.value = Math.round(cy.zoom() * 100);

  cy.nodes().forEach(n => { n.style('label', ''); });

  // TAP em nó (seleção consistente)
  cy.on('tap','node', e=> {
    const oe = e.originalEvent as any;
    if (oe) (oe as any)._dlmHandled = true;
    lastInteractionTs = performance.now();

    if(suppressNextNodeTap){
      suppressNextNodeTap = false;
      return;
    }

    const n = e.target;
    const me = e.originalEvent as MouseEvent | undefined;
    const multi = !!(me && (me.ctrlKey || me.metaKey || me.shiftKey));

    if(!multi){
      if(!n.selected() || cy!.$('node:selected').length>1){
        markProgrammaticClear();
        cy!.$('node:selected').unselect();
        n.select();
      }
    } else {
      if(n.selected()){ markProgrammaticClear(); n.unselect(); }
      else n.select();
    }

    lastTapNodeId = n.id();
    lastTapTime = performance.now();

    syncCardSelectionsStrict();
    updateStats(cy!.$('node:selected').empty()? 'global':'selected');
    lastSelectEventTime = performance.now();
    lastSelectNodeIds = cy!.$('node:selected').map(x=> x.id());
  });

  // Duplo clique => abrir painel info
  cy.on('dbltap','node', e=> {
    const n=e.target;
    if(!n.selected()){
      cy!.$('node:selected').unselect();
      n.select();
      syncCardSelectionsStrict();
    }
    buildInfoPanel();
  });

  // TAP no fundo => limpar seleção (com proteções)
  cy.on('tap', evt=> {
    if(evt.target===cy){
      const oe = evt.originalEvent as any;
      if (oe && (oe as any)._dlmHandled) return;

      const now=performance.now();
      const deltaSinceInteraction = now - lastInteractionTs;
      if(deltaSinceInteraction < 200) return;

      if(cy!.$('node:selected').length===0) return;

      markProgrammaticClear();
      closeInfoPanel();
      cy!.nodes().unselect();
      syncCardSelectionsStrict();
      updateStats('global');
    }
  });

  cy.on('tap','edge', e=> { const ed=e.target; if(ed.selected()) ed.unselect(); else ed.select(); updateStats(statsMode.value); });

  cy.on('select unselect','node', ()=> {
    syncCardSelectionsStrict();
    const sel=cy!.$('node:selected');
    updateStats(sel.empty()? 'global':'selected');
  });

  cy.on('select','node', e=> {
    lastSelectEventTime = performance.now();
    lastSelectNodeIds = cy!.$('node:selected').map(x=> x.id());
  });

  cy.on('unselect','node', ()=> {
    if(cy!.$('node:selected').length===0){
      const now=performance.now();
      if (now < suppressAutoReselectUntil) return;
      const sinceSelect = now - lastSelectEventTime;
      const sinceTap = now - lastTapTime;
      const candidateIds = lastSelectNodeIds.length ? lastSelectNodeIds : (lastTapNodeId? [lastTapNodeId] : []);
      if(candidateIds.length && ((sinceTap < 120 && sinceSelect < 120) || (sinceSelect < 260 && sinceTap < 260))){
        candidateIds.forEach(id=> { const el=cy!.getElementById(id); if(el && el.length) el.select(); });
        syncCardSelectionsStrict();
      }
    }
  });

  // Tecla Delete => excluir selecionados
  window.addEventListener('keydown', handleKeyDown);

  // Listeners do container para caret/foco/seleção por card/contextmenu
  mountCardEventListeners();

  emitNodesLoaded();
  updateStats('global');
}

/** Listeners do container (caret, foco, seleção, context menu) **/
function mountCardEventListeners(){
  // 1) pointerdown no caret (expand/colapse)
  cyContainer.value?.addEventListener('pointerdown', (e:PointerEvent) => {
    const target = e.target as HTMLElement;

    // caret (expandir/fechar)
    const caret = target.closest('.dlm-caret, [data-action="expand"]') as HTMLElement | null;
    if(caret){
      e.preventDefault(); e.stopPropagation();
      const nodeId = caret.getAttribute('data-node-id') ||
                     caret.closest('.dlm-card')?.getAttribute('data-node-id') || '';
      if(nodeId) toggleCardExpansion(nodeId, 'caret-pointerdown');

      suppressNextNodeTap = true;
      suppressAutoReselectUntil = performance.now() + 250;
      lastSelectNodeIds = [];
      lastTapNodeId = null;
      return;
    }

    // botão de foco (lupa)
    const focusBtn = target.closest('.dlm-search, [data-action="focus"]') as HTMLElement | null;
    if(focusBtn){
      e.preventDefault(); e.stopPropagation();
      const nodeId = focusBtn.closest('.dlm-card')?.getAttribute('data-node-id') || '';
      if(nodeId && cy){
        const node = cy.getElementById(nodeId);
        if(node && node.length){
          markProgrammaticClear();
          cy.$('node:selected').unselect();
          node.select();
          cy.center(node);
          cy.animate({ fit:{ eles:node, padding:80 }, duration:400 });
          syncCardSelectionsStrict();
          updateStats('selected');
        }
      }
      suppressNextNodeTap = true;
      return;
    }
  }, true);

  // 2) click no corpo do card => seleção
  cyContainer.value?.addEventListener('click', (e:MouseEvent) => {
    const target = e.target as HTMLElement;
    if(target.closest('.dlm-caret, [data-action="expand"], .dlm-search, [data-action="focus"]')) return;

    const card = target.closest('.dlm-card') as HTMLElement | null;
    if(card){
      e.preventDefault(); e.stopPropagation();
      const nodeId = card.getAttribute('data-node-id') || '';
      if(!nodeId || !cy) return;

      const node = cy.getElementById(nodeId);
      if(!node || !node.length) return;

      (window as any).__DLM_LAST_CARD_TS = performance.now();
      lastInteractionTs = (window as any).__DLM_LAST_CARD_TS;

      const multi = (e.ctrlKey || e.metaKey || e.shiftKey);
      suppressNextNodeTap = true;

      if(!multi){
        if(!node.selected() || cy.$('node:selected').length>1){
          markProgrammaticClear();
          cy.$('node:selected').unselect();
          node.select();
        }
      } else {
        if(node.selected()){ markProgrammaticClear(); node.unselect(); }
        else node.select();
      }
      syncCardSelectionsStrict();
      updateStats(cy.$('node:selected').empty()? 'global':'selected');
    }
  }, true);

  // 3) botão direito no card => context menu
  cyContainer.value?.addEventListener('contextmenu', (e:MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest('.dlm-card') as HTMLElement | null;
    if(card){
      e.preventDefault(); e.stopPropagation();
      const nodeId = card.getAttribute('data-node-id') || '';
      if(nodeId) openContextMenuFor(nodeId, e);
    }
  }, true);
}

/** CRUD **/
async function submitCreateLink(){
  if(!cy || !currentNodeId.value) return;
  const destinoId = createLinkForm.value.destinoId;
  if (typeof destinoId !== 'number' || isNaN(destinoId)) {
    toast.add({ severity: 'error', summary: 'Destino inválido', detail: 'Selecione um destino válido.', life: 2200, group: 'global' });
    return;
  }
  const id = 'e' + Date.now();
  cy.add({ data: { id, source: currentNodeId.value, target: destinoId.toString(), tipo: createLinkForm.value.tipoLigacao } });
  toast.add({ severity:'success', summary:'Ligação criada', life:2500, group:'global' });
  showCreateLink.value=false;
  createLinkForm.value={ destinoId:null, tipoLigacao:'relacao' };
  snapshotBase(); persistGraph(); updateStats(statsMode.value);
}

let localNodeCounter=5000;
async function submitCreateNodeLink(){
  if(!cy || !currentNodeId.value) return;
  const categoriaNome=createNodeForm.value.categoriaNome || props.categorias?.[0]?.nome;
  const catObj=getCategoria(categoriaNome||undefined);
  const nodeId=(++localNodeCounter).toString();
  const nome=createNodeForm.value.nome || `Novo Artefato ${localNodeCounter}`;
  const tipo=createNodeForm.value.tipo;
  const tecnologia=createNodeForm.value.tecnologia;
  cy.add({ data:{ id:nodeId, label:buildNodeLabel({ label:nome, tipo, tecnologia }), categoria:categoriaNome, cor:catObj?.cor, tecnologia, tipo } });
  const edgeId='e'+Date.now();
  cy.add({ data:{ id:edgeId, source:currentNodeId.value, target:nodeId, tipo:createNodeForm.value.tipoLigacao } });
  updateCategoryCounts();
  toast.add({ severity:'success', summary:'Artefato criado', life:2500, group:'global' });
  showCreateNodeLink.value=false;
  createNodeForm.value={ nome:'', tipo:'Dataset', tecnologia:'SQL', categoriaNome:null, tipoLigacao:'relacao' };
  snapshotBase(); persistGraph(); updateStats(statsMode.value);
}

function openEditNode(id:string){
  if(!cy) return; const n=cy.getElementById(id); if(!n) return;
  editNodeForm.value.id=id;
  editNodeForm.value.nome=n.data('label');
  editNodeForm.value.tipo=n.data('tipo')||'';
  editNodeForm.value.tecnologia=n.data('tecnologia')||'';
  editNodeForm.value.categoriaNome=n.data('categoria')||null;
  showEditNode.value=true;
}

function saveEditNode(){
  if(!cy || !editNodeForm.value.id) return;
  const n=cy.getElementById(editNodeForm.value.id); if(!n) return;
  const catObj=getCategoria(editNodeForm.value.categoriaNome||undefined);
  n.data('label', editNodeForm.value.nome);
  n.data('categoria', editNodeForm.value.categoriaNome);
  n.data('tipo', editNodeForm.value.tipo);
  n.data('tecnologia', editNodeForm.value.tecnologia);
  n.data('cor', catObj?.cor);
  rebuildNodeCard(n.id());
  setTimeout(()=> logDetachedCards(),60);
  updateCategoryCounts();
  toast.add({ severity:'success', summary:'Artefato atualizado', life:2000, group:'global' });
  showEditNode.value=false;
  snapshotBase(); persistGraph(); updateStats(statsMode.value);
}

function rebuildNodeCard(id:string){
  if(!cy) return;
  const n = cy.getElementById(id); if(!n || n.empty()) return;
  const data = { ...n.data(), id:n.id() };
  const card = document.querySelector(`.dlm-card[data-node-id="${id}"]`);
  if(!card) return;

  const keepExpanded = expandedCardIds.has(id) || card.classList.contains('is-expanded');
  if(keepExpanded) expandedCardIds.add(id); else expandedCardIds.delete(id);

  const nome = data.title || data.label || '';
  const second = data.subtitle || data.tipo || data.tecnologia || '';
  const catObj = getCategoria(data.categoria);
  const baseColor = catObj?.cor || data.cor || '#42a5f5';
  const code = data.formula || 'DIVIDE(\n  [Total Sales],\n  [Total Units],\n  0\n)';
  const fg = pickReadable(baseColor);
  const iconHtml = buildSafeIconHtml(catObj?.icon, data, baseColor);

  const newHtml = buildCardHtml({ showIcons: internalShowIcons.value, expanded: keepExpanded, nome, second, code, baseColor, fg, iconHtml, id, categoria: data.categoria || data.tipo });
  const temp = document.createElement('div');
  temp.innerHTML = newHtml.trim();
  const newCard = temp.firstElementChild as HTMLElement | null;
  if(!newCard) return;

  card.replaceWith(newCard);
  if(n.selected()){
    newCard.classList.add('is-selected');
    if (cy && cy.$('node:selected').length > 1) newCard.classList.add('multiple');
  }
  applyExpansionStateToDom(id);
}

function deleteSelected(){
  if(!cy) return;
  const selEdges = cy.$('edge:selected');
  const selNodes = cy.$('node:selected');
  if(selEdges.length===0 && selNodes.length===0){
    toast.add({ severity:'warn', summary:'Nada selecionado', life:1400, group:'global' });
    return;
  }
  let removedEdgesCount=0, removedNodesCount=0;
  if(selEdges.length){ removedEdgesCount = selEdges.length; selEdges.remove(); }
  if(selNodes.length){ removedNodesCount = selNodes.length; selNodes.remove(); }
  snapshotBase(); persistGraph(); updateStats('global');
  const parts=[];
  if(removedNodesCount) parts.push(`${removedNodesCount} nó(s)`);
  if(removedEdgesCount) parts.push(`${removedEdgesCount} ligação(ões)`);
  toast.add({ severity:'info', summary:`Removido: ${parts.join(' + ')}`, life:1800, group:'global' });
}

function handleKeyDown(e:KeyboardEvent){ if(e.key==='Delete' && cy){ deleteSelected(); } }

/** Notebook (paths) **/
function parsePaths(raw:string){ return raw.split(',').map(s=> s.trim()).filter(Boolean); }
function zoneFromPath(path:string){
  const z=path.split(':')[0].trim().toUpperCase();
  const known=['PZ','HZ','CZ','DW','SYNAPSE','DATAFLOW','PBI','CUBO','NOTEBOOK','ADF'];
  if(known.includes(z)) return z==='NOTEBOOK'? 'Notebook' : z;
  return 'Dataset';
}
function ensureCategory(nome:string){
  if(!props.categorias) return;
  if(!props.categorias.find(c=> c.nome===nome)){
    const palette=['#2563eb','#0d9488','#6366f1','#d97706','#db2777','#059669','#6d28d9','#1d4ed8','#7c3aed'];
    const color=palette[Math.abs(nome.split('').reduce((a,c)=> a+c.charCodeAt(0),0))%palette.length];
    try{
      props.categorias.push({ nome, cor:color });
      emit('update-categorias', [...props.categorias]);
    }catch{}
  }
}
function findNodeByLabel(label:string){
  if(!cy) return null;
  const found=cy.nodes().filter(n=> n.data('label')===label);
  return found.length? found[0]:null;
}
function createNodeIfAbsent(label:string, categoria:string){
  if(!cy) return null;
  const ex=findNodeByLabel(label); if(ex) return ex;
  ensureCategory(categoria);
  const cat=props.categorias?.find(c=> c.nome===categoria);
  let id = 'n'+(++localNodeCounter)+'_'+Math.random().toString(36).slice(2,7);
  while(cy.getElementById(id).length){ id = 'n'+(++localNodeCounter)+'_'+Math.random().toString(36).slice(2,7); }
  const node=cy.add({ data:{ id, label, categoria, cor:cat?.cor, tipo:categoria } });
  setTimeout(()=> rebuildNodeCard(id),80);
  return node;
}
function link(a:any,b:any,tipo:string){
  if(!cy||!a||!b) return;
  if(a.edgesTo(b).length>0) return;
  cy.add({ data:{ id:'e'+Date.now()+Math.random().toString(36).slice(2,5), source:a.id(), target:b.id(), tipo } });
}
function submitAddNotebook(){
  if(!cy) return;
  const name=notebookForm.value.nome.trim()|| 'Notebook_'+(++localNodeCounter);
  const nb=createNodeIfAbsent(name,'Notebook');
  const reads=parsePaths(notebookForm.value.readPaths);
  const writes=parsePaths(notebookForm.value.writePaths);
  const readNodes:any[]=[]; const writeNodes:any[]=[];
  reads.forEach(p=>{ const zone=zoneFromPath(p); const n=createNodeIfAbsent(p, zone); if(n) readNodes.push(n); });
  writes.forEach(p=>{ const zone=zoneFromPath(p); const n=createNodeIfAbsent(p, zone); if(n) writeNodes.push(n); });
  readNodes.forEach(r=> link(r, nb,'read'));
  writeNodes.forEach(w=> link(nb, w,'write'));
  snapshotBase(); persistGraph(); updateStats(statsMode.value);
  toast.add({ severity:'success', summary:'Notebook adicionado', life:2200, group:'global' });
  showAddNotebook.value=false; notebookForm.value={ nome:'', readPaths:'', writePaths:'' };
  setTimeout(()=> logDetachedCards(),120);
}

/** Exemplos **/
function loadComplexSample(){
  expandedCardIds.clear();
  if(!cy) initCy([]);
  cy!.elements().remove();
  cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove());

  const chains=[
    { pipe:'ADF_Pipeline_Sales', seq:['PZ:/raw/sales.csv','HZ:/stg/sales.parquet','CZ:/curated/sales','DW:Stage.Sales','DW:Core.Sales','Dataflow:SalesModel','PBI:Dashboard.Sales'] },
    { pipe:'ADF_Pipeline_Finance', seq:['PZ:/raw/finance.csv','HZ:/stg/finance.parquet','CZ:/curated/finance','Synapse:Pool.Dedicated','PBI:Dashboard.Finance'] },
    { pipe:'ADF_Pipeline_Inventory', seq:['PZ:/raw/inventory.csv','HZ:/stg/inventory.parquet','CZ:/curated/inventory','Synapse:Pool.CubePrep','Cubo:SalesCube'] }
  ];
  chains.forEach(c=>{ const p=createNodeIfAbsent(c.pipe,'ADF'); let prev=p; c.seq.forEach(step=>{ const node=createNodeIfAbsent(step, zoneFromPath(step)); link(prev,node,'flow'); prev=node; }); });
  chains.forEach(c=>{ const first=c.seq[0]; const second=c.seq[1]; const nb=createNodeIfAbsent('Notebook_'+c.pipe.replace('ADF_Pipeline_',''),'Notebook'); const nFirst=findNodeByLabel(first); const nSecond=findNodeByLabel(second); if(nFirst && nb) link(nFirst, nb,'read'); if(nb && nSecond) link(nb, nSecond,'write'); });

  updateCategoryCounts();
  snapshotBase();
  updateStats('global');

  const layout = cy!.layout({ name:'breadthfirst', directed:true, padding:120, spacingFactor:1.25 } as any);
  layout.run();

  cy!.one('layoutstop', () => applyInitialView());
  showDemoHint.value=false;
  toast.add({ severity:'info', summary:'Exemplo complexo carregado', life:2700, group:'global' });
  setTimeout(()=> logDetachedCards(),160);
}

function loadSample(){
  expandedCardIds.clear();
  if(!cy) initCy([]);
  cy!.elements().remove();
  cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove());

  const names=['Sales Growth vs Target','Last Year Sales','Average Sale Value','Sales per Customer','Sales YoY %','Performance Rating','New Customers','Customer Acquisition Cost','Avg Revenue per Customer','Customer Lifetime Value'];
  const catList=props.categorias && props.categorias.length? props.categorias : [{ nome:'Default', cor:'#42a5f5' }];
  const nodes=names.map((n,i)=>{ const cat=catList[i%catList.length]; return { data:{ id:(i+1000).toString(), label:n, title:n, subtitle:'Sales Analysis', categoria:cat.nome, cor:cat.cor, tecnologia:cat.nome, tipo:'Sales Analysis' } }; });
  const edges:any[]=[]; for(let i=0;i<nodes.length-1;i++){ edges.push({ data:{ id:'se'+i, source:nodes[i].data.id, target:nodes[i+1].data.id, tipo:'demo' } }); }

  cy!.add(nodes); cy!.add(edges);

  const layout = cy!.layout({ name:'breadthfirst', directed:true, padding:80, spacingFactor:1.15 } as any);
  layout.run();

  cy!.one('layoutstop', () => applyInitialView());
  setTimeout(()=> logDetachedCards(),50);

  showDemoHint.value=false;
  updateCategoryCounts();
  toast.add({ severity:'info', summary:'Exemplo gerado', life:2500, group:'global' });

  snapshotBase(); emitNodesLoaded(); updateStats('global');
}

/** Layout / Zoom **/
function reapplyLayout() {
  if (!cy) return;
  const l = currentLayout.value;
  const opts =
    l === 'breadthfirst' ? { name: 'breadthfirst', directed: true, padding: 80, spacingFactor: 1.25, nodeDimensionsIncludeLabels: true, avoidOverlap: true, avoidOverlapPadding: 40, animate: 'end', animationDuration: 450 } :
    l === 'fcose' ? { name: 'fcose', quality: 'default', animate: 'end', animationDuration: 450, idealEdgeLength: 180, nodeSeparation: 120, nodeRepulsion: 9500, gravity: 0.25, packComponents: false, padding: 70, nodeDimensionsIncludeLabels: true, fit: false, randomize: true } :
    l === 'dagre' ? { name: 'dagre', rankDir: 'LR', rankSep: 120, nodeSep: 80, edgeSep: 60, padding: 60, nodeDimensionsIncludeLabels: true, fit: false, randomize: true } :
    l === 'grid' ? { name: 'grid', padding: 60, avoidOverlap: true, avoidOverlapPadding: 40, spacingFactor: 1.2, nodeDimensionsIncludeLabels: true, fit: false, randomize: true } :
    l === 'circle' ? { name: 'circle', padding: 60, avoidOverlap: true, avoidOverlapPadding: 40, spacingFactor: 1.2, nodeDimensionsIncludeLabels: true, fit: false, randomize: true } :
    l === 'concentric' ? { name: 'concentric', padding: 60, avoidOverlap: true, avoidOverlapPadding: 40, spacingFactor: 1.2, nodeDimensionsIncludeLabels: true, fit: false, randomize: true } :
    { name: 'dagre', rankDir: 'LR', rankSep: 120, nodeSep: 80, edgeSep: 60, padding: 60, nodeDimensionsIncludeLabels: true, fit: false, randomize: true };
  cy.layout(opts as any).run();
}
function applyInitialView() {
  if (!cy) return;
  const zoomLevel = typeof props.initialZoom === 'number' ? props.initialZoom : 0.75;
  cy.zoom(zoomLevel);
  if (props.initialCenter !== false) cy.center();
  zoomPercent.value = Math.round(cy.zoom() * 100);
}
function toggleGraphMode(){ fullMode.value=!fullMode.value; requestAnimationFrame(()=> reapplyLayout()); }
function setLayout(l:'breadthfirst'|'fcose'|'dagre'|'grid'|'circle'|'concentric'){ if(currentLayout.value!==l){ currentLayout.value=l; reapplyLayout(); } }
function cycleLayout(){ const order:('breadthfirst'|'fcose'|'dagre'|'grid'|'circle'|'concentric')[]=['breadthfirst','fcose','dagre','grid','circle','concentric']; const idx=order.indexOf(currentLayout.value); setLayout(order[(idx+1)%order.length]); }
function zoomIn(){ if(!cy) return; cy.zoom({ level: cy.zoom()*1.15, renderedPosition:{ x:cy.width()/2, y:cy.height()/2 } }); cy.trigger('zoom'); }
function zoomOut(){ if(!cy) return; cy.zoom({ level: cy.zoom()/1.15, renderedPosition:{ x:cy.width()/2, y:cy.height()/2 } }); cy.trigger('zoom'); }
function fitGraph(){ if(!cy) return; cy.fit(undefined,40); zoomPercent.value=Math.round(cy.zoom()*100); }

/** Painel de Info **/
function positionInfoPanelInitial(){
  const topBarH=(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--dlm-topbar-h'))||92)+8;
  const c=cyContainer.value; const w=360; const cw=c? c.clientWidth: window.innerWidth;
  infoPanelPos.value.x=Math.max(12, cw-w-16); infoPanelPos.value.y=topBarH;
}
function startDragInfo(e:MouseEvent){ if(infoPanelPinned.value) return; draggingInfo=true; dragDX=e.clientX-infoPanelPos.value.x; dragDY=e.clientY-infoPanelPos.value.y; document.addEventListener('mousemove', onDragInfo); document.addEventListener('mouseup', stopDragInfo); }
function onDragInfo(e:MouseEvent){
  if(!draggingInfo) return;
  const c=cyContainer.value; const cw=c? c.clientWidth: window.innerWidth; const ch=c? c.clientHeight: window.innerHeight;
  const panel=document.querySelector('.info-panel') as HTMLElement|null; const pw=panel? panel.offsetWidth:360; const ph=panel? panel.offsetHeight:260;
  let nx=e.clientX-dragDX; let ny=e.clientY-dragDY;
  const minY=4; const maxX=cw-pw-4; const maxY=ch-ph-4;
  if(nx<4) nx=4; if(nx>maxX) nx=maxX; if(ny<minY) ny=minY; if(ny>maxY) ny=maxY;
  infoPanelPos.value.x=nx; infoPanelPos.value.y=ny;
}
function stopDragInfo(){ draggingInfo=false; document.removeEventListener('mousemove', onDragInfo); document.removeEventListener('mouseup', stopDragInfo); }
function clampInfoPanel(){
  const c=cyContainer.value; const cw=c? c.clientWidth: window.innerWidth; const ch=c? c.clientHeight: window.innerHeight;
  const panel=document.querySelector('.info-panel') as HTMLElement|null; if(!panel) return;
  const pw=panel.offsetWidth; const ph=panel.offsetHeight; const minY=4; const maxX=cw-pw-4; const maxY=ch-ph-4;
  if(infoPanelPos.value.x>maxX) infoPanelPos.value.x=Math.max(4,maxX);
  if(infoPanelPos.value.y>maxY) infoPanelPos.value.y=Math.max(minY,maxY);
  if(infoPanelPos.value.y<minY) infoPanelPos.value.y=minY;
  if(infoPanelPos.value.x<4) infoPanelPos.value.x=4;
}
function togglePinInfo(){ infoPanelPinned.value=!infoPanelPinned.value; }
async function copyInfoJson(){
  try{ await navigator.clipboard.writeText(infoJson.value||''); toast.add({ severity:'success', summary:'Copiado', life:1500, group:'global' }); }
  catch{ toast.add({ severity:'error', summary:'Falha ao copiar', life:1800, group:'global' }); }
}
function makeInfoItem(n:any){ return ({ Item:n.data('title')||n.data('label'), Tipo:n.data('categoria')||n.data('tipo')||n.data('tecnologia')||'' }); }
function buildInfoPanel(){
  if(!cy) return; const sel=cy.$('node:selected'); if(sel.empty()){ showInfoPanel.value=false; return; }
  const node=sel[0];
  const predecessores=(node as any).incomers('node').map((n:any)=> makeInfoItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex(x=> x.Item===v.Item)===i);
  const sucessores=(node as any).outgoers('node').map((n:any)=> makeInfoItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex(x=> x.Item===v.Item)===i);
  infoJson.value=JSON.stringify({ Item:makeInfoItem(node).Item, Tipo:makeInfoItem(node).Tipo, predecessores, sucessores }, null,2);
  showInfoPanel.value=true; updateStats('selected');
}
function closeInfoPanel(){ showInfoPanel.value=false; if(cy) cy.$('node:selected').unselect(); updateStats('global'); }

/** Highlights / Animação **/
function clearHighlights(){ if(!cy) return; cy.elements().removeClass('hl-up hl-down dimmed'); document.querySelectorAll('.dlm-card').forEach(el=> el.classList.remove('hl-up','hl-down','dimmed')); }
function highlightDirection(mode:'up'|'down'){
  if(!cy) return;
  const sel=cy.$('node:selected'); if(sel.empty()) return;
  clearHighlights();
  const visited:Record<string,boolean>={}; const stack=sel.toArray();
  while(stack.length){
    const node=stack.pop()!; if(visited[node.id()]) continue; visited[node.id()]=true;
    const edges=(mode==='up'? (node as any).incomers('edge') : (node as any).outgoers('edge')) as any;
    edges.forEach((e:any)=>{ e.addClass(mode==='up'? 'hl-up':'hl-down'); const next=mode==='up'? e.source(): e.target(); stack.push(next as any); });
    node.addClass(mode==='up'? 'hl-up':'hl-down');
    const card=document.querySelector(`.dlm-card[data-node-id="${node.id()}"]`);
    if(card) card.classList.add(mode==='up'? 'hl-up':'hl-down');
  }
  const highlightedNodes=cy.nodes().filter(n=> visited[n.id()]);
  cy.nodes().not(highlightedNodes).addClass('dimmed');
  const highlightedEdges=cy.edges('.hl-up, .hl-down');
  cy.edges().not(highlightedEdges).addClass('dimmed');
  document.querySelectorAll('.dlm-card').forEach(card=>{
    const id=(card as HTMLElement).getAttribute('data-node-id');
    if(id && !visited[id]) (card as HTMLElement).classList.add('dimmed');
  });
}
const highlightUpstream=()=> highlightDirection('up');
const highlightDownstream=()=> highlightDirection('down');

function toggleEdgeAnimation(){
  if(!cy) return;
  edgeAnimationOn.value=!edgeAnimationOn.value;
  if(edgeAnimationOn.value){
    cy.edges().addClass('anim');
    startEdgeAnimationLoop();
  } else {
    if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame);
    edgeAnimFrame=null;
    cy.edges().removeClass('anim').forEach((e:any)=> e.style('line-dash-offset',0));
  }
}
function startEdgeAnimationLoop(){
  if(!cy) return;
  const step=()=> {
    if(!edgeAnimationOn.value){ edgeAnimFrame=null; return; }
    edgeDashOffset=(edgeDashOffset-1+40)%40;
    cy!.edges('.anim').forEach((e:any)=> e.style('line-dash-offset', edgeDashOffset));
    edgeAnimFrame=requestAnimationFrame(step);
  };
  if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame);
  edgeAnimFrame=requestAnimationFrame(step);
}

/** Diagnostics **/
function logDetachedCards(){
  try{
    const wrappers=Array.from(cyContainer.value?.querySelectorAll('.dlm-html-label')||[]);
    const probs:any[]=[];
    wrappers.forEach(w=>{
      if(!cy) return;
      const card=w.querySelector('.dlm-card') as HTMLElement|null;
      if(!card) return;
      const id=card.getAttribute('data-node-id'); if(!id) return;
      const node=cy.getElementById(id); if(!node || node.empty()) return;
      const rpos=(node as any).renderedPosition();
      const rect=(w as HTMLElement).getBoundingClientRect();
      const crect=cyContainer.value!.getBoundingClientRect();
      const domCX=rect.left - crect.left + rect.width/2;
      const domCY=rect.top - crect.top + rect.height/2;
      const dx=Math.round(domCX-rpos.x); const dy=Math.round(domCY-rpos.y);
      if(Math.abs(dx)>35 || Math.abs(dy)>35) probs.push({ id, dx, dy });
    });
    if(probs.length) console.warn('[GraphView] Detached cards', probs);
  }catch{}
}

/** Categorias / Filtro **/
function updateCategoryCounts(){
  if(!cy) return;
  const counts:Record<string,number>={};
  cy.nodes().forEach(n=>{ const cat=n.data('categoria'); if(cat) counts[cat]=(counts[cat]||0)+1; });
  emit('category-counts', counts);
}

function applyCategoryFilter(){
  const filter=props.categoryFilter;
  if(!cy) return;
  if(!filter || (Array.isArray(filter)&&filter.length===0)){
    // restaurar base
    if(baseNodes.length){
      initCy([...baseNodes, ...baseEdges]);
      requestAnimationFrame(()=> expandedCardIds.forEach(id=> applyExpansionStateToDom(id)));
    }
    updateStats('global');
    return;
  }
  if(baseNodes.length===0) snapshotBase();

  const selected=new Set(Array.isArray(filter)? filter : [filter]);
  const visibleNodes=baseNodes.filter(n=> selected.has(n.data.categoria));
  const visibleIds=new Set(visibleNodes.map(n=> n.data.id));
  const directEdges=baseEdges.filter(e=> visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

  // Recriar com apenas nós/arestas diretas (simples e rápido)
  initCy([...visibleNodes, ...directEdges]);

  // reaplicar expansões válidas
  setTimeout(()=>{
    const toDelete: string[] = [];
    expandedCardIds.forEach(id=> { if(!cy?.getElementById(id)?.length) toDelete.push(id); });
    toDelete.forEach(id=> expandedCardIds.delete(id));
    expandedCardIds.forEach(id=> applyExpansionStateToDom(id));
  }, 120);

  updateStats('global');
}

watch(()=> props.categoryFilter, ()=>{ applyCategoryFilter(); updateCategoryCounts(); if(showInfoPanel.value) showInfoPanel.value=false; });

/** Expose p/ TopBar */
function emitNodesLoaded(){ if(!cy) return; const nodes=cy.nodes().map(n=> ({ id:n.id(), data:n.data() })); emit('nodes-loaded', nodes); }
function focusNodeByLabel(label:string){
  if(!cy) return; const node=cy.nodes().filter(n=> n.data('label')===label || n.data('title')===label)[0];
  if(!node) return;
  cy.nodes().unselect(); node.select();
  cy.center(node);
  cy.animate({ fit:{ eles:node, padding:80 }, duration:500 });
  node.addClass('hl-up'); setTimeout(()=> node.removeClass('hl-up'), 1500);
}
function getCurrentNodes(){ if(!cy) return []; return cy.nodes().map(n=> ({ id:n.id(), data:n.data() })); }
defineExpose({ focusNodeByLabel, getCurrentNodes });

/** Overlaps **/
function resolveOverlaps(padding=12, iterations=6){
  if(!cy) return; const ns=cy.nodes();
  for(let iter=0; iter<iterations; iter++){
    let moved=false;
    for(let i=0;i<ns.length;i++){
      const ni=ns[i]; const bi=ni.boundingBox({ includeLabels:false, includeOverlays:false });
      for(let j=i+1;j<ns.length;j++){
        const nj=ns[j]; const bj=nj.boundingBox({ includeLabels:false, includeOverlays:false });
        if(bi.x1 - padding < bj.x2 && bi.x2 + padding > bj.x1 && bi.y1 - padding < bj.y2 && bi.y2 + padding > bj.y1){
          const cxI=(bi.x1+bi.x2)/2, cyI=(bi.y1+bi.y2)/2;
          const cxJ=(bj.x1+bj.x2)/2, cyJ=(bj.y1+bj.y2)/2;
          let dx=cxI-cxJ, dy=cyI-cyJ;
          if(dx===0 && dy===0){ dx=(Math.random()-0.5)*2; dy=(Math.random()-0.5)*2; }
          const overlapX=(bi.w + bj.w)/2 + padding - Math.abs(dx);
          const overlapY=(bi.h + bj.h)/2 + padding - Math.abs(dy);
          if(overlapX>0 || overlapY>0){
            const shiftX=overlapX>0 ? (dx>0? overlapX/2 : -overlapX/2) : 0;
            const shiftY=overlapY>0 ? (dy>0? overlapY/2 : -overlapY/2) : 0;
            ni.position({ x: ni.position('x') + shiftX, y: ni.position('y') + shiftY });
            nj.position({ x: nj.position('x') - shiftX, y: nj.position('y') - shiftY });
            moved=true;
          }
        }
      }
    }
    if(!moved) break;
  }
}

/** Lifecycle **/
function loadCategorias(){ /* noop */ }
function loadGraph(){
  const loaded = loadStoredGraph();
  if(!loaded){
    initCy([]);
    showDemoHint.value = true;
  }
}
onMounted(()=> {
  loadCategorias();
  loadGraph();
  if (props.autoLoadSample !== false) setTimeout(()=> loadSample(), 300);
  positionInfoPanelInitial();
  nextTick(()=> {
    const header=document.querySelector('.topbar') as HTMLElement|null;
    const h=header? header.offsetHeight:56;
    document.documentElement.style.setProperty('--dlm-topbar-h', h+'px');
  });
  window.addEventListener('resize', clampInfoPanel);
});
onUnmounted(()=> {
  window.removeEventListener('resize', clampInfoPanel);
  window.removeEventListener('keydown', handleKeyDown);
});
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

/* HTML labels */
.dlm-html-label { pointer-events: none; z-index: 20; }
.dlm-card { --dlm-radius:12px; --dlm-border:#DADADA; --dlm-shadow:0 2px 4px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); --dlm-shadow-hover:0 4px 12px -2px rgba(0,0,0,0.18),0 2px 6px -1px rgba(0,0,0,0.10);
  width:280px; background:#fff; border:1px solid var(--dlm-border); border-radius:var(--dlm-radius); box-shadow:var(--dlm-shadow); font-family: Inter, system-ui, sans-serif; position:relative; overflow:hidden; transition: box-shadow .25s, border-color .25s, transform .25s; }
.dlm-card, .dlm-card * { pointer-events: auto; }
.dlm-card:hover { box-shadow:var(--dlm-shadow-hover); }

/* feedback de interação */
.dlm-card { cursor: grab; }
.dlm-card:active { cursor: grabbing; }
.dlm-caret, .dlm-search { cursor: pointer; }

.dlm-card.is-selected { border-color:#1d4ed8 !important; box-shadow:0 0 0 2px #1d4ed8,0 0 0 6px rgba(29,78,216,.28),0 6px 16px -6px rgba(0,0,0,.30); }
.dlm-card.is-selected.multiple { border-color:#475569 !important; box-shadow:0 0 0 2px #475569,0 0 0 6px rgba(71,85,105,.28),0 6px 16px -6px rgba(0,0,0,.30); }
.dlm-card.is-selected::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(29,78,216,0.14),rgba(29,78,216,0.04)); pointer-events:none; }
.dlm-card.is-selected.multiple::before { background:linear-gradient(90deg,rgba(71,85,105,0.18),rgba(71,85,105,0.05)); }
.dlm-card.is-selected .dlm-bar { height:6px; filter:brightness(1.15); }
.dlm-card.is-selected.multiple .dlm-bar { height:6px; }
.dlm-card.is-expanded { box-shadow:0 8px 26px -6px rgba(0,0,0,.30),0 4px 14px -4px rgba(0,0,0,.14); }

.dlm-bar { height:5px; width:100%; border-top-left-radius:var(--dlm-radius); border-top-right-radius:var(--dlm-radius); }
.dlm-body { padding:16px 16px 14px 16px; }
.dlm-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:2px; }
.dlm-icon { width:36px; height:36px; min-width:36px; min-height:36px; max-width:36px; max-height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.35) inset; flex-shrink:0; letter-spacing:.5px; overflow: hidden; }
.dlm-icon svg { width: 22px; height: 22px; display:block; margin: 0 auto; }
.dlm-icon-img { width: 22px; height: 22px; object-fit: contain; display:block; margin: 0 auto; }
.dlm-text-group { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.dlm-title { font-size:14px; font-weight:500; color:#1F2937; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-sub { font-size:12px; color:#6B7280; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-caret { background:#ffffff; border:1px solid #E2E8F0; line-height:1; color:#3B82F6; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:8px; transition: background .25s, border-color .25s; flex-shrink:0; width:32px; height:32px; box-shadow:0 1px 2px rgba(0,0,0,.08); }
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

/* Painel lateral de informações */
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

/* Toast */
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
@media (max-width:680px){ .mini-controls-alt { bottom:8px; left:64px; transform:scale(.85); transform-origin:bottom left; flex-wrap:wrap; } }

/* Tooltip simples */
.mc-btn[data-tip], .mc-select[data-tip] { position:relative; }
.mc-btn[data-tip]:hover::after, .mc-select[data-tip]:hover::after {
  content:attr(data-tip); position:absolute; left:50%; bottom:100%; transform:translate(-50%, -10px);
  background:#111827; color:#f1f5f9; font-size:11px; padding:4px 8px; border-radius:6px; white-space:nowrap; box-shadow:0 4px 14px -4px rgba(0,0,0,.45); z-index:9999; pointer-events:none;
}
.mc-btn[data-tip]:hover::before, .mc-select[data-tip]:hover::before {
  content:''; position:absolute; left:50%; bottom:100%; transform:translate(-50%, -2px);
  border:6px solid transparent; border-top:0; border-bottom-color:#111827; z-index:9999;
}

.mini-controls-alt.extra-persist { left:auto; right:16px; bottom:16px; }

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

/* HTML labels */
.dlm-html-label { pointer-events: none; z-index: 20; }
.dlm-card { --dlm-radius:12px; --dlm-border:#DADADA; --dlm-shadow:0 2px 4px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); --dlm-shadow-hover:0 4px 12px -2px rgba(0,0,0,0.18),0 2px 6px -1px rgba(0,0,0,0.10);
  width:280px; background:#fff; border:1px solid var(--dlm-border); border-radius:var(--dlm-radius); box-shadow:var(--dlm-shadow); font-family: Inter, system-ui, sans-serif; position:relative; overflow:hidden; transition: box-shadow .25s, border-color .25s, transform .25s; }
.dlm-card, .dlm-card * { pointer-events: auto; }
.dlm-card:hover { box-shadow:var(--dlm-shadow-hover); }

/* feedback de interação */
.dlm-card { cursor: grab; }
.dlm-card:active { cursor: grabbing; }
.dlm-caret, .dlm-search { cursor: pointer; }

.dlm-card.is-selected { border-color:#1d4ed8 !important; box-shadow:0 0 0 2px #1d4ed8,0 0 0 6px rgba(29,78,216,.28),0 6px 16px -6px rgba(0,0,0,.30); }
.dlm-card.is-selected.multiple { border-color:#475569 !important; box-shadow:0 0 0 2px #475569,0 0 0 6px rgba(71,85,105,.28),0 6px 16px -6px rgba(0,0,0,.30); }
.dlm-card.is-selected::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg,rgba(29,78,216,0.14),rgba(29,78,216,0.04)); pointer-events:none; }
.dlm-card.is-selected.multiple::before { background:linear-gradient(90deg,rgba(71,85,105,0.18),rgba(71,85,105,0.05)); }
.dlm-card.is-selected .dlm-bar { height:6px; filter:brightness(1.15); }
.dlm-card.is-selected.multiple .dlm-bar { height:6px; }
.dlm-card.is-expanded { box-shadow:0 8px 26px -6px rgba(0,0,0,.30),0 4px 14px -4px rgba(0,0,0,.14); }

.dlm-bar { height:5px; width:100%; border-top-left-radius:var(--dlm-radius); border-top-right-radius:var(--dlm-radius); }
.dlm-body { padding:16px 16px 14px 16px; }
.dlm-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:2px; }
.dlm-icon { width:36px; height:36px; min-width:36px; min-height:36px; max-width:36px; max-height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.35) inset; flex-shrink:0; letter-spacing:.5px; overflow: hidden; }
.dlm-icon svg { width: 22px; height: 22px; display:block; margin: 0 auto; }
.dlm-icon-img { width: 22px; height: 22px; object-fit: contain; display:block; margin: 0 auto; }
.dlm-text-group { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.dlm-title { font-size:14px; font-weight:500; color:#1F2937; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-sub { font-size:12px; color:#6B7280; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dlm-caret { background:#ffffff; border:1px solid #E2E8F0; line-height:1; color:#3B82F6; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:8px; transition: background .25s, border-color .25s; flex-shrink:0; width:32px; height:32px; box-shadow:0 1px 2px rgba(0,0,0,.08); }
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

/* Painel lateral de informações */
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

/* Toast */
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
@media (max-width:680px){ .mini-controls-alt { bottom:8px; left:64px; transform:scale(.85); transform-origin:bottom left; flex-wrap:wrap; } }

/* Tooltip simples */
.mc-btn[data-tip], .mc-select[data-tip] { position:relative; }
.mc-btn[data-tip]:hover::after, .mc-select[data-tip]:hover::after {
  content:attr(data-tip); position:absolute; left:50%; bottom:100%; transform:translate(-50%, -10px);
  background:#111827; color:#f1f5f9; font-size:11px; padding:4px 8px; border-radius:6px; white-space:nowrap; box-shadow:0 4px 14px -4px rgba(0,0,0,.45); z-index:9999; pointer-events:none;
}
.mc-btn[data-tip]:hover::before, .mc-select[data-tip]:hover::before {
  content:''; position:absolute; left:50%; bottom:100%; transform:translate(-50%, -2px);
  border:6px solid transparent; border-top:0; border-bottom-color:#111827; z-index:9999;
}

.mini-controls-alt.extra-persist { left:auto; right:16px; bottom:16px; }
</style>
