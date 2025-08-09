<template>
  <div class="graph-wrapper" :class="{ fullscreen: fullMode, 'hide-icons': !internalShowIcons }">
    <div class="mini-controls">
      <button class="mc-btn" data-tip="Zoom in" @click="zoomIn">+</button>
      <button class="mc-btn" data-tip="Zoom out" @click="zoomOut">−</button>
      <button class="mc-btn" :data-tip="fullMode ? 'Sair fullscreen' : 'Entrar fullscreen'" @click="toggleGraphMode">
        <span v-if="!fullMode">⤢</span><span v-else>⤡</span>
      </button>
      <button class="mc-btn" data-tip="Fit (ajustar)" @click="fitGraph">⌂</button>
      <div class="mc-zoom">{{ zoomPercent }}%</div>
    </div>
    <div class="mini-controls-alt">
      <button class="mc-btn" data-tip="Highlight Upstream" @click="highlightUpstream">↑</button>
      <button class="mc-btn" data-tip="Highlight Downstream" @click="highlightDownstream">↓</button>
      <button class="mc-btn" data-tip="Limpar destaques" @click="clearHighlights">✕</button>
      <button class="mc-btn" :class="{ active: edgeAnimationOn }" :data-tip="edgeAnimationOn ? 'Parar animação de edges' : 'Animar edges'" @click="toggleEdgeAnimation">⚡</button>
      <button class="mc-btn" :data-tip="'Layout: ' + layoutLabel + ' (clique para alternar)'" @click="cycleLayout">{{ layoutIcon }}</button>
      <button class="mc-btn" :class="{ active: internalShowIcons }" :data-tip="internalShowIcons ? 'Ocultar ícones' : 'Mostrar ícones'" @click="toggleIcons">👁</button>
    </div>
    
    <div ref="cyContainer" class="cy-container" />
    <ContextMenu ref="cm" :model="contextItems" />

    <div v-if="showDemoHint" class="demo-hint">
      <div class="demo-card">
        <h3>Sem dados</h3>
        <p>Nenhum artefato retornado. Gere um exemplo local para testar.</p>
        <Button size="small" label="Gerar exemplo" icon="pi pi-magic" @click="loadSample" />
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
        <div class="p-field">
          <label>Nome</label>
          <InputText v-model="createNodeForm.nome" />
        </div>
        <div class="p-field">
          <label>Tipo</label>
          <InputText v-model="createNodeForm.tipo" />
        </div>
        <div class="p-field">
          <label>Tecnologia</label>
          <InputText v-model="createNodeForm.tecnologia" />
        </div>
        <div class="p-field">
          <label>Categoria</label>
          <Dropdown
            v-model="createNodeForm.categoriaNome"
            :options="sortedCategorias"
            optionLabel="nome"
            optionValue="nome"
            placeholder="Escolha"
          >
            <template #option="slotProps">
              <span v-if="slotProps.option.icon" v-html="slotProps.option.icon" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></span>
              <span>{{ slotProps.option.nome }}</span>
            </template>
          </Dropdown>
        </div>
        <div class="p-field">
          <label>Tipo ligação</label>
          <InputText v-model="createNodeForm.tipoLigacao" />
        </div>
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

  <div v-if="showInfoPanel" class="info-panel">
      <div class="info-header">
        <strong>Relações do nó</strong>
        <button class="info-close" @click="closeInfoPanel" title="Fechar">×</button>
      </div>
      <pre class="info-json">{{ infoJson }}</pre>
    </div>
  <!-- Toast localizado dentro da área do grafo para não invadir TopBar -->
  <Toast group="global" :pt="{ root: { class: 'graph-toast-root' } }" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ showIcons?: boolean; categoryFilter?: string[]|string|null; categorias?: { nome:string; cor:string; icon?:string }[] }>();
const emit = defineEmits(['toggle-icons','category-counts','update-categorias']);
import { ref, onMounted, computed, nextTick } from 'vue';
import cytoscape, { Core, EventObjectNode } from 'cytoscape';
import nodeHtmlLabel from 'cytoscape-node-html-label';
// plugins de layout / navegação
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import dagre from 'cytoscape-dagre';
// @ts-ignore
import navigator from 'cytoscape-navigator';

// registra plugins uma vez
// @ts-ignore
if(!(cytoscape as any).__dlmPlugins){
  nodeHtmlLabel(cytoscape);
  cytoscape.use(fcose);
  cytoscape.use(dagre);
  cytoscape.use(navigator);
  // @ts-ignore
  (cytoscape as any).__dlmPlugins = true;
}
import ContextMenu from 'primevue/contextmenu';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';

const cyContainer = ref<HTMLDivElement | null>(null);
// controle interno de ícones (para funcionar mesmo se o pai não sincronizar de volta)
const internalShowIcons = ref(props.showIcons !== false);
function toggleIcons(){
  internalShowIcons.value = !internalShowIcons.value;
  emit('toggle-icons', internalShowIcons.value);
}
let cy: Core | null = null;
let globalClickBound = false;
const toast = useToast();

const cm = ref();
const contextItems = ref<any[]>([]);
const currentNodeId = ref<string | null>(null);

const showCreateLink = ref(false);
const showCreateNodeLink = ref(false);
const showEditNode = ref(false);
const showDemoHint = ref(false);
const fullMode = ref(false);
const zoomPercent = ref(100);
const currentLayout = ref<'breadthfirst'|'fcose'|'dagre'>('fcose');
const layoutLabel = computed(()=> currentLayout.value === 'breadthfirst' ? 'Hierárquico' : currentLayout.value === 'fcose' ? 'Force (fCoSE)' : 'Dagre');
const layoutIcon = computed(()=> currentLayout.value === 'breadthfirst' ? '⤓' : currentLayout.value === 'fcose' ? '◎' : '⇄');
let navInstance: any = null;
const edgeAnimationOn = ref(false);
let edgeAnimFrame: number | null = null;
let edgeDashOffset = 0;

// Painel de informações
const showInfoPanel = ref(false);
const infoJson = ref('');

const createLinkForm = ref({ destinoId: null as number | null, tipoLigacao: 'relacao' });
const createNodeForm = ref({ nome:'', tipo:'Dataset', tecnologia:'SQL', categoriaNome: null as string | null, tipoLigacao:'relacao' });
const editNodeForm = ref({ id:null as string|null, nome:'', tipo:'', tecnologia:'', categoriaNome: null as string | null });

const nodeOptions = ref<{ id:number; label:string }[]>([]);
// helper para obter categoria por nome
function getCategoria(nome?:string){
  if(!nome) return undefined;
  return props.categorias?.find(c=> c.nome === nome);
}

function buildNodeLabel(d:any) { return d.label; }

function buildNodeHtml(data:any){
  const nome = data.title || data.label;
  const second = data.subtitle || data.tipo || data.tecnologia || '';
  const catObj = getCategoria(data.categoria);
  const baseColor = catObj?.cor || data.cor || '#42a5f5';
  const gradient = `linear-gradient(to right, ${baseColor}, ${lighten(baseColor,25)})`;
  const code = data.formula || 'DIVIDE(\n  [Total Sales],\n  [Total Units],\n  0\n)';
  const fg = pickReadable(baseColor);
  let iconHtml = '';
  if (catObj?.icon) {
    if (catObj.icon.trim().startsWith('<svg')) {
      iconHtml = catObj.icon; // SVG inline
    } else {
      iconHtml = `<img src="${catObj.icon}" alt="${data.categoria}" style="width:16px;height:16px;object-fit:contain;display:block;" />`;
    }
  } else {
    iconHtml = getNodeSymbol(data);
  }
  if(!internalShowIcons.value){
    return `<div class="dlm-card" style="width:280px" data-node-id="${data.id}">
      <div class="dlm-bar" style="background:${gradient}"></div>
      <div class="dlm-body">
        <div class="dlm-head">
          <div class="dlm-text-group">
            <div class="dlm-title" title="${nome}">${nome}</div>
            <div class="dlm-sub">Table: ${second}</div>
          </div>
          <button class="dlm-caret" data-expander aria-label="Expandir" title="Expandir">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dlm-caret-svg"><path d="m6 9 6 6 6-6"></path></svg>
          </button>
        </div>
        <div class="dlm-details">
          <pre><code>${code}</code></pre>
        </div>
      </div>
    </div>`;
  }
  return `<div class="dlm-card" style="width:280px" data-node-id="${data.id}">
    <div class="dlm-bar" style="background:${gradient}"></div>
    <div class="dlm-body">
      <div class="dlm-head">
        <div class="dlm-icon" style="background:${baseColor};color:${fg}" title="${data.categoria || data.tipo || ''}">${iconHtml}</div>
        <div class="dlm-text-group">
          <div class="dlm-title" title="${nome}">${nome}</div>
          <div class="dlm-sub">Table: ${second}</div>
        </div>
        <button class="dlm-caret" data-expander aria-label="Expandir" title="Expandir">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dlm-caret-svg"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
      </div>
      <div class="dlm-details">
        <pre><code>${code}</code></pre>
      </div>
    </div>
  </div>`;
}

// Sem backend: categorias e grafo serão locais
function loadCategorias() { /* categorias recebidas via props */ }
function loadGraph() { initCy([]); showDemoHint.value = true; }

function initCy(elements:any[]) {
  // limpeza de instância anterior
  if(cy){
    try { cy.destroy(); } catch(e) { /* noop */ }
    cy = null;
  }
  // remove listener global anterior
  if(globalClickBound){
    document.removeEventListener('click', handleGlobalClick);
    globalClickBound = false;
  }
  // limpar qualquer HTML residual do plugin
  if(cyContainer.value){
  // se já marcado como inicializado e não estamos forçando, prosseguir limpeza mesmo assim
    cyContainer.value.querySelectorAll('.dlm-html-label').forEach(el=> el.remove());
    cyContainer.value.innerHTML = '';
  cyContainer.value.setAttribute('data-cy-init','1');
  }
  cy = cytoscape({
    container: cyContainer.value!,
    elements,
  layout: { name: 'fcose', quality:'default', randomize:true, animate:'end', animationDuration:450, idealEdgeLength:170, nodeSeparation:180, nodeRepulsion:9500, gravity:0.30, gravityRange:3.2, gravityCompound:1.0, gravityRangeCompound:2.0, packComponents:true, padding:70 } as any,
    style: [
      { selector: 'node', style: {
          shape: 'round-rectangle',
      width: 280, // igual ao card para evitar sobra lateral
      height: 42,
      'background-opacity': 0,
      'border-width': 0,
      label: '',
      'text-opacity': 0,
      'overlay-opacity': 0
        } as any },
  { selector: 'edge', style: { width: 1.8, 'line-color': '#b0b9c2', 'target-arrow-color': '#5a6470', 'target-arrow-shape': 'vee', 'curve-style': 'bezier', 'arrow-scale': 1.15, 'line-cap': 'round', 'target-distance-from-node': 25, 'source-distance-from-node': 8, 'opacity':0.97 } as any },
      { selector: 'edge.hover', style: { 'line-color': '#1f7ae0', 'target-arrow-color': '#1f7ae0', width: 2.4 } as any },
  { selector: 'edge.hl-up', style: { 'line-color':'#2563EB', 'target-arrow-color':'#2563EB', width:2.8, 'arrow-scale':1.6 } as any },
  { selector: 'edge.hl-down', style: { 'line-color':'#10B981', 'target-arrow-color':'#10B981', width:2.8, 'arrow-scale':1.6 } as any },
  { selector: 'node.hl-up', style: { 'background-color':'#2563EB' } as any },
  { selector: 'node.hl-down', style: { 'background-color':'#10B981' } as any },
  { selector: 'edge.anim', style: { 'line-style':'dashed', 'line-dash-pattern':[8,5], 'line-dash-offset': 0, 'target-arrow-shape':'vee', 'arrow-scale':5 } as any },
    // removido estilo node:selected para evitar borda fora do card
    ] as any
  });

  // pós-processamento para remover sobreposições após layouts (especialmente fCoSE)
  cy.on('layoutstop', () => {
    if(currentLayout.value === 'fcose') {
      resolveOverlaps(16, 7);
      if(fullMode.value) cy!.fit(undefined, 40);
      zoomPercent.value = Math.round(cy!.zoom()*100);
    }
  });

  // aplica HTML labels
  // @ts-ignore
  cy.nodeHtmlLabel([{
    query: 'node',
    halign: 'center',
    valign: 'center',
    halignBox: 'center',
    valignBox: 'center',
    cssClass: 'dlm-html-label',
    tpl: (data:any) => buildNodeHtml(data)
  }]);

  cy.on('cxttap', 'node', (evt: EventObjectNode) => {
    const nodeId = evt.target.id();
    currentNodeId.value = nodeId;
    nodeOptions.value = cy!.nodes().filter(n=> n.id() !== nodeId).map(n=>({ id: parseInt(n.id()), label: n.data('label') }));
    contextItems.value = [
      { label: 'Criar ligação', icon: 'pi pi-link', command: () => { showCreateLink.value = true; } },
  { label: 'Criar + ligar novo', icon: 'pi pi-plus', command: () => { showCreateNodeLink.value = true; } },
  { label: 'Editar artefato', icon: 'pi pi-pencil', command: () => { openEditNode(nodeId); } }
    ];
    (cm.value as any)?.show(evt.originalEvent);
  });

  cy.on('mouseover', 'node', evt => evt.target.connectedEdges().addClass('hover'));
  cy.on('mouseout', 'node', evt => evt.target.connectedEdges().removeClass('hover'));
  // listener de zoom para atualizar indicador
  cy.on('zoom', () => {
    zoomPercent.value = Math.round(cy!.zoom()*100);
  });
  // inicial: aplicar zoom 75%
  cy.zoom(0.75);
  cy.center();
  zoomPercent.value = Math.round(cy.zoom()*100);
  // garantir que nenhum label fallback esteja visível
  cy.nodes().forEach(n=> { n.style('label',''); });
  // abrir painel com duplo clique
  cy.on('dbltap', 'node', e => {
    cy!.nodes().removeClass('is-selected');
    const node = e.target;
    node.addClass('is-selected');
    const card = document.querySelector(`.dlm-card[data-node-id="${node.id()}"]`);
    if(card) card.classList.add('is-selected');
    buildInfoPanel();
  });
  cy.on('tap', evt => {
    if(evt.target === cy) { // clique em área vazia fecha painel
      showInfoPanel.value = false;
      document.querySelectorAll('.dlm-card.is-selected').forEach(el=> el.classList.remove('is-selected'));
      cy!.nodes().removeClass('is-selected');
    }
  });
  document.addEventListener('click', handleGlobalClick);
  globalClickBound = true;
  if(cyContainer.value){
    const canv = cyContainer.value.querySelectorAll('canvas').length;
    const labels = cyContainer.value.querySelectorAll('.dlm-html-label').length;
    // eslint-disable-next-line no-console
    console.debug('[GraphView] initCy -> canvases:', canv, 'labelsWrappers:', labels);
  }
}

async function submitCreateLink() {
  if (!cy || !currentNodeId.value || !createLinkForm.value.destinoId) return;
  const id = 'e'+Date.now();
  cy.add({ data: { id, source: currentNodeId.value, target: createLinkForm.value.destinoId!.toString(), tipo: createLinkForm.value.tipoLigacao } });
  toast.add({ severity:'success', summary:'Ligação criada (local)', life:4000, group:'global', closable:true });
  markLastToastLife(4000);
  showCreateLink.value = false;
  createLinkForm.value = { destinoId:null, tipoLigacao:'relacao' };
}

let localNodeCounter = 5000;
async function submitCreateNodeLink() {
  if (!cy || !currentNodeId.value) return;
  const categoriaNome = createNodeForm.value.categoriaNome || props.categorias?.[0]?.nome;
  const catObj = getCategoria(categoriaNome || undefined);
  const nodeId = (++localNodeCounter).toString();
  const nome = createNodeForm.value.nome || `Novo Artefato ${localNodeCounter}`;
  const tipo = createNodeForm.value.tipo;
  const tecnologia = createNodeForm.value.tecnologia;
  cy.add({ data: { id: nodeId, label: buildNodeLabel({ label: nome, tipo, tecnologia }), categoria: categoriaNome, cor: catObj?.cor, tecnologia, tipo } });
  const edgeId = 'e'+Date.now();
  cy.add({ data: { id: edgeId, source: currentNodeId.value, target: nodeId, tipo: createNodeForm.value.tipoLigacao } });
  updateCategoryCounts();
  toast.add({ severity:'success', summary:'Artefato e ligação (local)', life:4000, group:'global', closable:true });
  markLastToastLife(4000);
  showCreateNodeLink.value = false;
  createNodeForm.value = { nome:'', tipo:'Dataset', tecnologia:'SQL', categoriaNome:null, tipoLigacao:'relacao' };
}

function openEditNode(id:string){
  if(!cy) return;
  const n = cy.getElementById(id);
  if(!n) return;
  editNodeForm.value.id = id;
  editNodeForm.value.nome = n.data('label');
  editNodeForm.value.tipo = n.data('tipo') || '';
  editNodeForm.value.tecnologia = n.data('tecnologia') || '';
  editNodeForm.value.categoriaNome = n.data('categoria') || null;
  showEditNode.value = true;
}

function saveEditNode(){
  if(!cy || !editNodeForm.value.id) return;
  const n = cy.getElementById(editNodeForm.value.id);
  if(!n) return;
  const catObj = getCategoria(editNodeForm.value.categoriaNome || undefined);
  n.data('label', editNodeForm.value.nome);
  n.data('categoria', editNodeForm.value.categoriaNome);
  n.data('tipo', editNodeForm.value.tipo);
  n.data('tecnologia', editNodeForm.value.tecnologia);
  n.data('cor', catObj?.cor);
  rebuildNodeCard(n.id());
  updateCategoryCounts();
  toast.add({ severity:'success', summary:'Artefato atualizado', life:3000, group:'global', closable:true });
  markLastToastLife(3000);
  showEditNode.value = false;
}

function rebuildNodeCard(id:string){
  const n = cy!.getElementById(id);
  const data = { ...n.data(), id: n.id() };
  const card = document.querySelector(`.dlm-card[data-node-id="${id}"]`);
  if(card){
    const wrapper = card.parentElement?.parentElement; // plugin structure -> wrapper holds card
    if(wrapper){ wrapper.innerHTML = buildNodeHtml(data); }
  }
}

function loadSample() {
  if (!cy) initCy([]);
  // limpar nós prévios para evitar resíduos de labels antigos
  cy!.elements().remove();
  // remover HTML labels órfãs (caso plugin não limpe)
  cyContainer.value?.querySelectorAll('.dlm-html-label').forEach(el=> el.remove());
  const names = [
    'Sales Growth vs Target','Last Year Sales','Average Sale Value','Sales per Customer','Sales YoY %',
    'Performance Rating','New Customers','Customer Acquisition Cost','Avg Revenue per Customer','Customer Lifetime Value'
  ];
  const catList = props.categorias && props.categorias.length ? props.categorias : [ { nome:'Default', cor:'#42a5f5' } ];
  const nodes = names.map((n, idx) => {
    const cat = catList[idx % catList.length];
    return { data: { id: (idx+1000).toString(), label: n, title: n, subtitle: 'Sales Analysis', categoria: cat.nome, cor: cat.cor, tecnologia: cat.nome, tipo: 'Sales Analysis' } };
  });
  const edges:any[] = [];
  for (let i=0;i<nodes.length-1;i++) {
    if (i+1 < nodes.length) edges.push({ data: { id: 'se'+i, source: nodes[i].data.id, target: nodes[i+1].data.id, tipo: 'demo' } });
  }
  cy!.add(nodes);
  cy!.add(edges);
  // limpar estados de highlight/hover residuais
  cy!.edges().removeClass('hl-up hl-down hover');
  cy!.nodes().forEach(n=> { n.style('label',''); }); // reforça ocultação
  cy!.layout({ name:'breadthfirst', directed:true, padding:80, spacingFactor:1.15 } as any).run();
  showDemoHint.value = false;
  updateCategoryCounts();
  toast.add({ severity:'info', summary:'Exemplo gerado', detail:'Dados locais', life:4500, group:'global', closable:true });
  markLastToastLife(4500);
}

function reapplyLayout() {
  if(!cy) return;
  let opts:any;
  if(currentLayout.value === 'breadthfirst') {
    const spacing = fullMode.value ? 1.7 : 1.05;
    opts = { name:'breadthfirst', directed:true, padding: fullMode.value ? 120 : 60, spacingFactor: spacing };
  } else if(currentLayout.value === 'fcose') {
  opts = { name:'fcose', quality:'default', randomize:true, animate:'end', animationDuration:450, idealEdgeLength:170, nodeSeparation:180, nodeRepulsion:9500, gravity:0.30, gravityRange:3.2, gravityCompound:1.0, gravityRangeCompound:2.0, packComponents:true, padding:70 };
  } else if(currentLayout.value === 'dagre') {
    opts = { name:'dagre', rankDir:'LR', rankSep:120, nodeSep:60, edgeSep:20, padding:60 };
  }
  cy.layout(opts).run();
  if(fullMode.value) cy.fit(undefined, 40);
}

function toggleGraphMode() {
  fullMode.value = !fullMode.value;
  // pequeno timeout para CSS aplicar antes de fit
  requestAnimationFrame(()=> reapplyLayout());
}

function setLayout(l:'breadthfirst'|'fcose'|'dagre'){
  if(currentLayout.value === l) return;
  currentLayout.value = l;
  reapplyLayout();
}
function cycleLayout(){
  const order: ('breadthfirst'|'fcose'|'dagre')[] = ['breadthfirst','fcose','dagre'];
  const idx = order.indexOf(currentLayout.value);
  const next = order[(idx+1)%order.length];
  setLayout(next);
}

function zoomIn(){ if(!cy) return; cy.zoom({ level: cy.zoom()*1.15, renderedPosition: { x: cy.width()/2, y: cy.height()/2 } }); cy.trigger('zoom'); }
function zoomOut(){ if(!cy) return; cy.zoom({ level: cy.zoom()/1.15, renderedPosition: { x: cy.width()/2, y: cy.height()/2 } }); cy.trigger('zoom'); }
function fitGraph(){ if(!cy) return; cy.fit(undefined, 40); zoomPercent.value = Math.round(cy.zoom()*100); }

function compactAndFit() {
  if(!cy) return;
  let opts:any;
  if(currentLayout.value === 'breadthfirst') opts = { name:'breadthfirst', directed:true, padding: 40, spacingFactor: 0.8 };
  else if(currentLayout.value === 'fcose') opts = { name:'fcose', quality:'draft', randomize:false, animate:'end', animationDuration:320, idealEdgeLength:120, nodeSeparation:140, nodeRepulsion:8000, gravity:0.32, packComponents:true, padding:50 };
  else opts = { name:'dagre', rankDir:'LR', rankSep:90, nodeSep:40, edgeSep:10, padding:40 };
  cy.layout(opts).run();
  cy.fit(undefined, 25);
  zoomPercent.value = Math.round(cy.zoom()*100);
}

function handleGlobalClick(ev: MouseEvent) {
  const caret = (ev.target as HTMLElement).closest('.dlm-caret');
  if(!caret) return;
  const card = caret.closest('.dlm-card');
  if(!card) return;
  card.classList.toggle('is-expanded');
}

function toggleNavigator(){
  if(!cy) return;
  if(navInstance){ navInstance.destroy(); navInstance = null; return; }
  // @ts-ignore
  navInstance = cy.navigator({ viewLiveFramerate: 30, thumbnailEventFramerate:30, intoViewport:true });
}

function clearHighlights(){
  if(!cy) return;
  cy.elements().removeClass('hl-up hl-down dimmed');
  document.querySelectorAll('.dlm-card.hl-up, .dlm-card.hl-down, .dlm-card.dimmed').forEach(el=> el.classList.remove('hl-up','hl-down','dimmed'));
}

function highlightUpstream(){ highlightDirection('up'); }
function highlightDownstream(){ highlightDirection('down'); }

function highlightDirection(mode:'up'|'down') {
  if(!cy) return;
  const sel = cy.$('node:selected');
  if(sel.empty()) return;
  clearHighlights();
  const visited:Record<string,boolean> = {};
  const stack = sel.toArray();
  while(stack.length){
    const node = stack.pop()!;
    if(visited[node.id()]) continue;
    visited[node.id()] = true;
    // cast para acessar incomers/outgoers sem erro TS
    const edges = (mode==='up'? (node as any).incomers('edge'): (node as any).outgoers('edge')) as any;
    edges.forEach((e:any)=>{
      e.addClass(mode==='up'? 'hl-up':'hl-down');
      const next = mode==='up'? e.source(): e.target();
      stack.push(next as any);
    });
    node.addClass(mode==='up'? 'hl-up':'hl-down');
    const card = document.querySelector(`.dlm-card[data-node-id="${node.id()}"]`);
    if(card) card.classList.add(mode==='up'? 'hl-up':'hl-down');
  }
  // dim non-visited
  const highlightedNodes = cy.nodes().filter(n=> visited[n.id()]);
  cy.nodes().not(highlightedNodes).addClass('dimmed');
  const highlightedEdges = cy.edges('.hl-up, .hl-down');
  cy.edges().not(highlightedEdges).addClass('dimmed');
  document.querySelectorAll('.dlm-card').forEach(card=>{
    const id = card.getAttribute('data-node-id');
    if(id && !visited[id]) card.classList.add('dimmed');
  });
}

function toggleEdgeAnimation(){
  if(!cy) return;
  edgeAnimationOn.value = !edgeAnimationOn.value;
  if(edgeAnimationOn.value){
    cy.edges().addClass('anim');
    startEdgeAnimationLoop();
  } else {
    if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame);
    edgeAnimFrame = null;
  cy.edges().removeClass('anim').forEach((e:any)=> { e.style('line-dash-offset', 0); });
  }
}

function startEdgeAnimationLoop(){
  if(!cy) return;
  const step = () => {
    if(!edgeAnimationOn.value){ edgeAnimFrame = null; return; }
  edgeDashOffset = (edgeDashOffset - 1 + 40) % 40; // reverse direction
  cy!.edges('.anim').forEach((e:any)=> { e.style('line-dash-offset', edgeDashOffset); });
    edgeAnimFrame = requestAnimationFrame(step);
  };
  if(edgeAnimFrame) cancelAnimationFrame(edgeAnimFrame);
  edgeAnimFrame = requestAnimationFrame(step);
}

function updateCategoryCounts(){
  if(!cy) return;
  const counts: Record<string, number> = {};
  cy.nodes().forEach(n=>{ const cat = n.data('categoria'); if(cat) counts[cat] = (counts[cat]||0)+1; });
  emit('category-counts', counts);
}

function buildInfoPanel(){
  if(!cy) return;
  const sel = cy.$('node:selected');
  if(sel.empty()) { showInfoPanel.value = false; return; }
  const node = sel[0];
  const activeFilter = props.categoryFilter;
  const makeItem = (n:any) => ({ Item: n.data('title') || n.data('label'), Tipo: n.data('categoria') || n.data('tipo') || n.data('tecnologia') || '' });
  const filterFn = (n:any) => {
    if(!activeFilter || (Array.isArray(activeFilter) && activeFilter.length===0)) return true;
    if(Array.isArray(activeFilter)) return activeFilter.includes(n.data('categoria'));
    return n.data('categoria') === activeFilter;
  };
  const predecessores = (node as any).incomers('node').filter(filterFn).map((n:any)=> makeItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex((x:any)=> x.Item===v.Item)===i);
  const sucessores = (node as any).outgoers('node').filter(filterFn).map((n:any)=> makeItem(n)).filter((v:any,i:number,a:any[])=> a.findIndex((x:any)=> x.Item===v.Item)===i);
  const payload = { Item: makeItem(node).Item, Tipo: makeItem(node).Tipo, predecessores, sucessores };
  infoJson.value = JSON.stringify(payload, null, 2);
  showInfoPanel.value = true;
}

function closeInfoPanel(){
  showInfoPanel.value = false;
  if(cy){ cy.$('node:selected').unselect(); }
}

function markLastToastLife(ms:number){
  // aguarda próximo frame para elemento ser inserido
  requestAnimationFrame(()=>{
    const container = document.querySelector('.p-toast');
    if(!container) return;
    const messages = Array.from(container.querySelectorAll('.p-toast-message')) as HTMLElement[];
    if(messages.length===0) return;
    const last = messages[messages.length-1];
    last.style.setProperty('--dlm-life', ms+'ms');
    last.setAttribute('data-life', ms.toString());
    // progress bar física
    let bar = last.querySelector('.dlm-progress-bar') as HTMLElement | null;
    if(!bar){
      bar = document.createElement('div');
      bar.className = 'dlm-progress-bar';
      last.appendChild(bar);
    }
    bar.style.setProperty('--dlm-life', ms+'ms');
    bar.classList.remove('run');
    void bar.offsetWidth;
    bar.classList.add('run');
  });
}

// Detecta e resolve sobreposições de bounding boxes movendo nós (pequena relaxação)
function resolveOverlaps(padding=12, iterations=6){
  if(!cy) return;
  const ns = cy.nodes();
  for(let iter=0; iter<iterations; iter++) {
    let moved = false;
    for(let i=0;i<ns.length;i++){
      const ni = ns[i];
      const bi = ni.boundingBox({ includeLabels:false, includeOverlays:false });
      for(let j=i+1;j<ns.length;j++){
        const nj = ns[j];
        const bj = nj.boundingBox({ includeLabels:false, includeOverlays:false });
        if(bi.x1 - padding < bj.x2 && bi.x2 + padding > bj.x1 && bi.y1 - padding < bj.y2 && bi.y2 + padding > bj.y1){
          const cxI = (bi.x1 + bi.x2)/2; const cyI = (bi.y1 + bi.y2)/2;
            const cxJ = (bj.x1 + bj.x2)/2; const cyJ = (bj.y1 + bj.y2)/2;
          let dx = cxI - cxJ; let dy = cyI - cyJ;
          if(dx === 0 && dy === 0) { dx = (Math.random()-0.5)*2; dy = (Math.random()-0.5)*2; }
          const overlapX = (bi.w + bj.w)/2 + padding - Math.abs(dx);
          const overlapY = (bi.h + bj.h)/2 + padding - Math.abs(dy);
          if(overlapX > 0 || overlapY > 0){
            const shiftX = overlapX > 0 ? (dx>0? overlapX/2 : -overlapX/2) : 0;
            const shiftY = overlapY > 0 ? (dy>0? overlapY/2 : -overlapY/2) : 0;
            ni.position({ x: ni.position('x') + shiftX, y: ni.position('y') + shiftY });
            nj.position({ x: nj.position('x') - shiftX, y: nj.position('y') - shiftY });
            moved = true;
          }
        }
      }
    }
    if(!moved) break;
  }
}

function lighten(hex:string, percent:number) {
  const num = parseInt(hex.replace('#',''),16);
  const r = Math.min(255, ((num>>16)&0xff) + Math.round(255*percent/100));
  const g = Math.min(255, ((num>>8)&0xff) + Math.round(255*percent/100));
  const b = Math.min(255, (num&0xff) + Math.round(255*percent/100));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function pickReadable(hex:string){
  if(!hex) return '#fff';
  const c = hex.replace('#','');
  const bigint = parseInt(c.length===3 ? c.split('').map(x=>x+x).join('') : c,16);
  const r = (bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  // luminância relativa simples
  const lum = (0.2126*r + 0.7152*g + 0.0722*b)/255;
  return lum > 0.62 ? '#1F2937' : '#fff';
}

function getNodeSymbol(data:any){
  const cat = (data.categoria || data.tipo || '').toString().toLowerCase();
  // Inline minimal SVG icons (placeholders) - can later swap with official brand assets
  const icon = (svgPath:string)=> `\n<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">${svgPath}</svg>`;
  if(cat.includes('bronze')) return icon('<circle cx="12" cy="12" r="9" />');
  if(cat.includes('silver')) return icon('<circle cx="12" cy="12" r="9" /><path d="M8 12h8" />');
  if(cat.includes('gold')) return icon('<circle cx="12" cy="12" r="9" /><path d="M9 9h6v6H9z" />');
  if(cat.includes('dash')) return icon('<rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 10h8M8 14h5" />');
  if(cat.includes('pipe')) return icon('<path d="M4 12h16" /><path d="M8 8v8M16 8v8" />');
  if(cat.includes('note')) return icon('<path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v6h6" />');
  if(cat.includes('sql')||cat.includes('table')) return icon('<ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />');
  if(cat.includes('view')) return icon('<circle cx="12" cy="12" r="3" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />');
  return icon('<path d="M12 5v14M5 12h14" />');
}

onMounted(() => {
  loadCategorias();
  loadGraph();
  // gera exemplo automaticamente
  setTimeout(()=> loadSample(), 300);
  // medir altura do TopBar para ajustar offset dos elementos flutuantes
  nextTick(()=>{
    const header = document.querySelector('.topbar') as HTMLElement | null;
    const h = header ? header.offsetHeight : 56;
    document.documentElement.style.setProperty('--dlm-topbar-h', h + 'px');
  });
});

// Watch para aplicar filtro visual (simples: esconder cards de outra categoria)
import { watch } from 'vue';
watch(()=> props.categoryFilter, (val)=>{
  if(!cy) return;
  cy.nodes().forEach(n=>{
  let match:boolean;
  if(!val || (Array.isArray(val) && val.length===0)) match = true; else if(Array.isArray(val)) match = val.includes(n.data('categoria')); else match = n.data('categoria') === val;
    const card = document.querySelector(`.dlm-card[data-node-id="${n.id()}"]`) as HTMLElement | null;
    if(card) card.style.display = match ? '' : 'none';
    n.style('display', match ? 'element':'none');
  });
  if(showInfoPanel.value) buildInfoPanel();
  updateCategoryCounts();
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

/* HTML labels para nós */
.dlm-html-label { pointer-events: auto; }
.dlm-card { --dlm-radius:12px; --dlm-border:#E5E7EB; --dlm-shadow:0 2px 4px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); --dlm-shadow-hover:0 4px 12px -2px rgba(0,0,0,0.18),0 2px 6px -1px rgba(0,0,0,0.10); width:280px; background:#fff; border:1px solid var(--dlm-border); border-radius:var(--dlm-radius); box-shadow:var(--dlm-shadow); font-family: Inter, system-ui, sans-serif; position:relative; overflow:hidden; transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s, transform .25s; }
.dlm-card:hover { box-shadow:var(--dlm-shadow-hover); }
.dlm-card.is-selected { box-shadow:0 0 0 2px rgba(37,99,235,.30),0 2px 6px -1px rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.04); }
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

/* Painel lateral de informações (janela flutuante fixa) */
.info-panel { position:absolute; top:calc(var(--dlm-topbar-h, 92px) + 8px); right:16px; width:360px; max-width:90vw; height:calc(100% - (var(--dlm-topbar-h, 92px) + 24px)); background:#fffffffa; border:1px solid #e2e8f0; backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 8px 28px -6px rgba(0,0,0,.25), 0 4px 16px -4px rgba(0,0,0,.12); padding:14px 16px 18px; display:flex; flex-direction:column; gap:10px; z-index:4000; font-family:Inter,system-ui,sans-serif; border-radius:14px; animation:infoSlide .4s cubic-bezier(.4,0,.2,1); }
@keyframes infoSlide { from { opacity:0; transform:translateX(40px) scale(.98); } to { opacity:1; transform:translateX(0) scale(1); } }
.info-header { display:flex; align-items:center; justify-content:space-between; font-size:14px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; }
.info-close { background:#fff; border:1px solid #d0d7de; border-radius:6px; width:26px; height:26px; cursor:pointer; line-height:1; font-size:18px; display:flex; align-items:center; justify-content:center; color:#374151; }
.info-close:hover { background:#f3f4f6; }
.info-json { flex:1; margin:0; font-size:12px; background:#0f172a; color:#e2e8f0; border:1px solid #1e293b; border-radius:8px; padding:12px 14px; overflow:auto; line-height:1.4; font-family:'Fira Code','Fira Mono',Consolas,monospace; box-shadow: inset 0 0 0 1px #334155; }

/* Edge highlight colors handled via Cytoscape class styles (set in JS). */
.graph-toast-root { position:absolute !important; top:calc(var(--dlm-topbar-h, 92px) + 16px) !important; right:16px !important; left:auto !important; }
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
</style>
