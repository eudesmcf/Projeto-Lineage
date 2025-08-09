<template>
  <div class="layout">
  <TopBar :categorias="categorias" @change-category="categoriasAtivas = $event" @update-categorias="categorias = $event" />
    <div class="content">
  <SidebarLegend :categorias="categorias" :showIcons="showIcons" @toggle-icons="showIcons = !showIcons" />
  <GraphView :showIcons="showIcons" :categoryFilter="categoriasAtivas" :categorias="categorias" />
    </div>
  </div>
</template>

<script setup lang="ts">
import TopBar from './components/TopBar.vue';
import GraphView from './components/GraphView.vue';
import SidebarLegend from './components/SidebarLegend.vue';
import { ref, onMounted } from 'vue';
import { api } from './services/api';

interface Categoria { nome:string; cor:string; icon?:string }
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
    const backendCats:Categoria[] = res.data.map((c: any) => ({ nome: c.nome || c.Nome, cor: c.cor || c.Cor, icon: undefined }));
  categorias.value = mergeDefaults(backendCats).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
  } catch (e) {
  categorias.value = mergeDefaults(defaultCategorias).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'));
  }
});
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
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
