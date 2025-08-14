<template>
  <div class="layout">
  <TopBar
    :categorias="categorias"
    :nodeNames="nodeNames"
    :totalNodes="stats.totalNodes"
    :visibleNodes="stats.visibleNodes"
    :selectedNodes="stats.selectedNodes"
    :totalEdges="stats.totalEdges"
    :visibleEdges="stats.visibleEdges"
    :selectedEdges="stats.selectedEdges"
    @change-category="categoriasAtivas = $event"
    @update-categorias="onCategoriasUpdated"
    @focus-node="label => graphRef?.focusNodeByLabel && graphRef.focusNodeByLabel(label)"
    @toggle-info="toggleInfoPanel" />
    <div class="content">
  <GraphView ref="graphRef" :showIcons="showIcons" :categoryFilter="categoriasAtivas" :categorias="categorias" @nodes-loaded="updateNodeNamesFromGraph" @graph-stats="onGraphStats" @category-counts="updateCategoryCounts" />
  <CategoryTreePanel :visible="infoVisible" :x="infoPos.x" :y="infoPos.y" :categorias="categorias" :counts="categoryCounts" @close="infoVisible=false" @focus-categoria="focusCategoria" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TopBar from './components/TopBar.vue';
import GraphView from './components/GraphView.vue';
import CategoryTreePanel from './components/CategoryTreePanel.vue';
import { ref, onMounted } from 'vue';
import { api } from './services/api';

const nodeNames = ref<string[]>([]);
const categoryCounts = ref<Record<string, number>>({});
const infoVisible = ref(false);
const infoPos = ref({ x: 260, y: 70 });

function updateNodeNamesFromGraph(nodes: any[]) {
  const graphLabels = nodes.map(n => n.data && n.data.label ? n.data.label : n.data?.nome || n.id || '');
  const catExtras = categorias.value.flatMap(c=> [c.nome, c.grupo, c.subcategoria].filter(Boolean) as string[]);
  const set = new Set<string>();
  [...graphLabels, ...catExtras].forEach(n=> { const t=n.trim(); if(t) set.add(t); });
  nodeNames.value = Array.from(set).sort((a,b)=> a.localeCompare(b,'pt-BR'));
}

let graphRef = ref<any>(null);
const stats = ref({
  mode:'global',
  nodes:0, edges:0,
  visibleNodes:0, visibleEdges:0,
  totalNodes:0, totalEdges:0,
  selectedNodes:0, selectedEdges:0
});

function onGraphStats(payload:any){ stats.value = { ...stats.value, ...payload }; }
// Receber contagens do GraphView (já emit via category-counts se for necessário – adicionar listener no componente GraphView se ainda não)
function updateCategoryCounts(counts:Record<string,number>){ categoryCounts.value = counts; }
function toggleInfoPanel(){ infoVisible.value = !infoVisible.value; }
function focusCategoria(nome:string){ categoriasAtivas.value = [nome]; }

interface Categoria { id?:number; nome:string; cor:string; icon?:string; grupo?:string; subcategoria?:string }
const defaultCategorias: Categoria[] = [
  { nome:'Bronze', cor:'#8d6e63', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>' },
  { nome:'Silver', cor:'#90a4ae', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>' },
  { nome:'Gold', cor:'#ffd54f', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%231f2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>' },
  { nome:'Dashboard', cor:'#42a5f5', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10h8M8 14h5"/></svg>' },
  { nome:'Pipeline', cor:'#4c97f7', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M8 8v8M16 8v8"/></svg>' },
  { nome:'Notebook', cor:'#f35b04', icon:'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v6h6"/></svg>' }
];
const categorias = ref<Categoria[]>([...defaultCategorias]);
const showIcons = ref(true);
const categoriasAtivas = ref<string[]|null>(null);

function mergeDefaults(list:Categoria[]){
  const merged:Categoria[] = [...list];
  defaultCategorias.forEach(def=>{
    const existing = merged.find(c=> c.nome.toLowerCase() === def.nome.toLowerCase());
    if(!existing) merged.push(def); else { if(!existing.icon) existing.icon = def.icon; if(!existing.cor) existing.cor = def.cor; }
  });
  return merged;
}

onMounted(async () => {
  try {
    const res = await api.get('/categorias');
    const backendCats:Categoria[] = res.data.map((c: any) => ({ id: c.id || c.Id, nome: c.nome || c.Nome, cor: c.cor || c.Cor, icon: undefined, grupo: c.grupo || c.Grupo, subcategoria: c.subcategoria || c.Subcategoria }));
    categorias.value = mergeDefaults(backendCats).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
  } catch (e) {
  categorias.value = mergeDefaults(defaultCategorias).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
  }
});

async function onCategoriasUpdated(list:Categoria[]){
  // Determine removidos
  const removed = categorias.value.filter(c=> c.id && !list.some(n=> n.id===c.id));
  for(const r of removed){
    try { if(r.id) await api.delete(`/categorias/${r.id}`); } catch {}
  }
  for(const c of list){
    if(!c.id){
      try {
        const payload = { nome:c.nome, cor:c.cor, grupo:c.grupo, subCategoria:c.subcategoria };
        const res = await api.post('/categorias', payload);
        c.id = res.data.id || res.data.Id;
      } catch {}
    } else {
      try {
        await api.put(`/categorias/${c.id}`, { id:c.id, nome:c.nome, cor:c.cor, grupo:c.grupo, subCategoria:c.subcategoria });
      } catch {}
    }
  }
  categorias.value = list.sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
  // refresh search names
  updateNodeNamesFromGraph((graphRef.value?.getCurrentNodes && graphRef.value.getCurrentNodes()) || []);
}
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.content { flex:1; display:flex; overflow:hidden; }
</style>
<style>
/* Toast progress bar (barra física) */
.p-toast { font-family: Inter, system-ui, sans-serif; z-index:10000; }
.p-toast-message { position:relative; overflow:visible; --dlm-life:4500ms; padding-bottom:10px; }
.dlm-progress-bar { position:absolute; left:0; bottom:2px; height:4px; width:100%; background:linear-gradient(90deg,#3b82f6,#60a5fa); transform-origin:right center; transform:scaleX(1); border-radius:2px; box-shadow:0 0 0 1px #ffffff66 inset; }
.p-toast-message-success > .dlm-progress-bar { background:linear-gradient(90deg,#059669,#10b981); }
.p-toast-message-info > .dlm-progress-bar { background:linear-gradient(90deg,#2563eb,#3b82f6); }
.p-toast-message-warn > .dlm-progress-bar { background:linear-gradient(90deg,#d97706,#f59e0b); }
.p-toast-message-error > .dlm-progress-bar { background:linear-gradient(90deg,#dc2626,#ef4444); }
.dlm-progress-bar.run { animation: dlm-toast-width linear forwards; animation-duration: var(--dlm-life,4500ms); }
@keyframes dlm-toast-width { from { transform:scaleX(1);} to { transform:scaleX(0);} }
/* Barra física fallback (caso pseudo-elemento não renderize) */
.p-toast-message { position:relative; }
.dlm-progress-bar { position:absolute; left:0; bottom:0; height:3px; width:100%; background:linear-gradient(90deg,#3b82f6,#60a5fa); transform-origin:right center; }
.p-toast-message-success > .dlm-progress-bar { background:linear-gradient(90deg,#059669,#10b981); }
.p-toast-message-info > .dlm-progress-bar { background:linear-gradient(90deg,#2563eb,#3b82f6); }
.p-toast-message-warn > .dlm-progress-bar { background:linear-gradient(90deg,#d97706,#f59e0b); }
.p-toast-message-error > .dlm-progress-bar { background:linear-gradient(90deg,#dc2626,#ef4444); }
.dlm-progress-bar.run { animation: dlm-toast-width linear forwards; animation-duration: var(--dlm-life,4500ms); }
@keyframes dlm-toast-width { from { transform:scaleX(1);} to { transform:scaleX(0);} }
</style>
