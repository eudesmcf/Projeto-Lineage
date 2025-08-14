<template>
  <header class="topbar">
    <div class="tb-inner">
      <div class="brand">
        <div class="brand-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M9 9h6v6H9z" />
          </svg>
        </div>
        <div class="brand-text">
          <h1>Lineage Explorer</h1>
          <small class="tag">Beta</small>
        </div>
      </div>
      <div class="actions">
        <Button size="small" label="Add TMDL" icon="pi pi-plus" class="act" outlined />
        <Button size="small" label="Export" icon="pi pi-upload" class="act" outlined />
        <!-- Botão Info reforçado (label visível) -->
        <Button
          size="small"
          label="Info"
          icon="pi pi-info-circle"
          class="act info-btn"
          outlined
          @click="emit('toggle-info')"
          @keydown.enter.prevent="emit('toggle-info')"
          aria-label="Abrir painel de grupos e categorias"
          v-tooltip.bottom="'Grupos & Categorias'"
        />
      </div>
    </div>
    <div class="tb-meta">
      <div class="meta-left">
        <i class="pi pi-share-alt meta-icon" />
        <span>{{ metaText }}</span>
        <div class="search-box" ref="searchBox">
          <i class="pi pi-search" />
          <input
            type="text"
            placeholder="Search Items..."
            v-model="search"
            @focus="onSearchFocus"
            @keydown.down.prevent="moveSuggestion(1); ensureVisible()"
            @keydown.up.prevent="moveSuggestion(-1); ensureVisible()"
            @keydown.enter.prevent="selectSuggestion()"
            @keydown.esc="hideSuggestions"
            @input="onSearchInput"
          />
          <ul v-if="showSuggestions && filteredSuggestions.length" class="suggestions" role="listbox">
            <li
              v-for="(s, idx) in filteredSuggestions"
              :key="s + idx"
              :class="{ active: idx === suggestionIndex }"
              role="option"
              @mousedown.prevent="selectSuggestion(idx)"
              @mousemove="hoverIndex(idx)"
              v-html="highlightSuggestion(s)"
            />
          </ul>
        </div>
      </div>
      <div class="meta-right">
        <div class="filter-wrapper">
          <div class="filter-pill" title="Filtro" @click="toggleTypes">{{ currentTypeLabel }} <i class="pi pi-angle-down" /></div>
          <div v-if="showTypes" class="types-pop multi advanced">
          <div class="types-header">Categories Filter</div>
          <div
            class="type-item all"
            :class="{ active: selectedCategories.length === (props.categorias ? props.categorias.length : 0) && (props.categorias && props.categorias.length > 0) }"
            @click.stop="toggleAllTypes"
          >
            <input type="checkbox" :checked="selectedCategories.length === (props.categorias ? props.categorias.length : 0) && (props.categorias && props.categorias.length > 0)" />
            <span>Select All</span>
          </div>
          <div class="group" v-for="group in groupedCategorias" :key="group.nome">
            <div class="group-head" @click.stop="toggleGroup(group.nome)">
              <span class="caret" :class="{ open: openGroups.includes(group.nome) }">▸</span>
              <span class="g-name">{{ group.nome }}</span>
              <span class="g-count">({{ group.items.length }})</span>
            </div>
            <transition name="fade">
              <div class="group-items" v-if="openGroups.includes(group.nome)">
                <div class="type-item" v-for="c in group.items" :key="c.nome" :class="{ active: selectedCategories.includes(c.nome) }" @click.stop="toggleType(c.nome)">
                  <input type="checkbox" :checked="selectedCategories.includes(c.nome)" />
                  <template v-if="c.icon">
                    <span v-if="c.icon.startsWith('<svg')" class="type-icon-preview inline-svg" v-html="c.icon" />
                    <span v-else class="type-icon-preview"><img :src="c.icon" alt="" /></span>
                  </template>
                  <span>{{ c.nome }}</span>
                </div>
              </div>
            </transition>
          </div>
          <div class="types-actions">
            <Button size="small" label="Aplicar" @click="applyMulti" />
          </div>
          </div>
        </div>
  <div class="filter-pill ghost" title="Gerenciar categorias" @click="openSettings">Settings</div>
  <div class="filter-pill ghost" title="Mostrar desconectados">Show Disconnected</div>
      </div>
    </div>
  </header>
  <Dialog v-model:visible="showSettings" header="Categorias" :modal="true" style="width:520px">
    <div class="cats-list">
      <div v-for="c in categorias" :key="c.nome" class="cat-row">
        <span class="swatch" :style="{ background:c.cor }" />
        <span class="name">{{ c.nome }}</span>
        <template v-if="c.icon">
          <span v-if="c.icon.startsWith('<svg')" class="icon-preview inline-svg" v-html="c.icon" />
          <span v-else class="icon-preview"><img :src="c.icon" alt="" /></span>
        </template>
        <label class="icon-repl">
          <input type="file" accept="image/*" @change="e=>replaceIcon(c.nome, e)" />Trocar Ícone
        </label>
        <button class="del-btn" title="Remover" @click="deleteCategoria(c.nome)">✕</button>
        <div class="mini-fields">
          <input class="mini" v-model="c.grupo" placeholder="Grupo" @change="emitUpdateCategorias()" />
          <input class="mini" v-model="c.subcategoria" placeholder="Sub" @change="emitUpdateCategorias()" />
        </div>
      </div>
    </div>
    <div class="add-form">
  <input v-model="newCatName" type="text" placeholder="Nova categoria" />
  <input v-model="newCatGroup" type="text" placeholder="Grupo" class="mini" />
  <input v-model="newCatSub" type="text" placeholder="Sub" class="mini" />
      <input v-model="newCatColor" type="color" />
      <label class="icon-upload">
        <input type="file" accept="image/*" @change="onIconChange" /> Ícone
      </label>
      <Button label="Adicionar" size="small" @click="addCategoria" />
    </div>
    <small class="hint">As novas categorias (e ícones) são mantidas em memória somente nesta sessão.</small>
  </Dialog>
</template>
<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps<{
  categorias?: { id?:number; nome:string; cor:string; icon?: string; grupo?:string; subcategoria?:string }[];
  nodeNames?: string[];
  totalNodes?: number; visibleNodes?: number; selectedNodes?: number;
  totalEdges?: number; visibleEdges?: number; selectedEdges?: number;
}>();
const emit = defineEmits(['change-category','update-categorias','focus-node','toggle-info']);

// contadores dinâmicos vindos do GraphView via props
const measures = computed(()=> props.visibleNodes ?? 0);
const deps = computed(()=> props.visibleEdges ?? 0);
// nodeNames vêm via props; manter cópia reativa simples se precisar manipular
const internalNodeNames = computed(()=> (props.nodeNames||[]).filter(n=> !!n));

const search = ref('');
const showSuggestions = ref(true);
const suggestionIndex = ref(-1);
const filteredSuggestions = computed(() => {
  const valRaw = search.value.trim();
  const val = valRaw.toLowerCase();
  if(!val) return [];
  const pool = internalNodeNames.value;
  const starts: string[] = [];
  const contains: string[] = [];
  for(const n of pool){
    const ln = n.toLowerCase();
    if(ln.startsWith(val)) starts.push(n); else if(ln.includes(val)) contains.push(n);
  }
  // Ordenar internamente por comprimento e depois alfabético para estabilidade
  const sortFn = (a:string,b:string) => a.length===b.length ? a.localeCompare(b) : a.length - b.length;
  starts.sort(sortFn);
  contains.sort(sortFn);
  return [...starts, ...contains].slice(0,20);
});

function moveSuggestion(dir:number){
  if(!filteredSuggestions.value.length) return;
  suggestionIndex.value = (suggestionIndex.value + dir + filteredSuggestions.value.length) % filteredSuggestions.value.length;
}
function selectSuggestion(idx?:number){
  const i = typeof idx === 'number' ? idx : suggestionIndex.value;
  if(i<0 || !filteredSuggestions.value[i]) return;
  const nome = filteredSuggestions.value[i];
  search.value = '';
  showSuggestions.value = false;
  suggestionIndex.value = -1;
  emit('focus-node', nome);
}
function hideSuggestions(){
  setTimeout(()=>{ showSuggestions.value = false; }, 120);
}
function onSearchFocus(){ if(filteredSuggestions.value.length) showSuggestions.value = true; }
function onSearchInput(){
  const has = !!search.value.trim();
  showSuggestions.value = has && filteredSuggestions.value.length>0;
  suggestionIndex.value = filteredSuggestions.value.length ? 0 : -1;
}
function escapeHtml(str:string){
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]);
}
function highlightSuggestion(name:string){
  const q = search.value.trim();
  if(!q) return escapeHtml(name);
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if(idx === -1) return escapeHtml(name);
  const before = escapeHtml(name.slice(0,idx));
  const mid = escapeHtml(name.slice(idx, idx+q.length));
  const after = escapeHtml(name.slice(idx+q.length));
  return `${before}<strong class="hl">${mid}</strong>${after}`;
}
function hoverIndex(i:number){ suggestionIndex.value = i; }
function ensureVisible(){
  const list = document.querySelector('.suggestions');
  if(!list) return;
  const active = list.querySelector('li.active') as HTMLElement | null;
  if(active){
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if(list.scrollTop > top) list.scrollTop = top;
    else if(bottom > list.scrollTop + (list as HTMLElement).clientHeight) list.scrollTop = bottom - (list as HTMLElement).clientHeight;
  }
}
document.addEventListener('click', (e:MouseEvent)=>{
  const target = e.target as HTMLElement;
  if(!target.closest('.search-box')){ hideSuggestions(); }
});

const metaText = computed(()=> {
  const totalN = props.totalNodes ?? measures.value;
  const totalE = props.totalEdges ?? deps.value;
  const selN = props.selectedNodes ?? 0;
  const selE = props.selectedEdges ?? 0;
  const visN = measures.value; const visE = deps.value;
  const selPart = selN>0 ? ` | ${selN} sel` : '';
  return `${visN}/${totalN} nodes${selPart} • ${visE}/${totalE} edges${selE>0? ' ('+selE+' sel)':''}`;
});
const showTypes = ref(false);
const selectedCategories = ref<string[]>([]);
const openGroups = ref<string[]>([]);
// agrupamento usando campo grupo se existir, senão prefixo do nome
const groupedCategorias = computed(()=>{
  const groups: Record<string, any[]> = {};
  (props.categorias||[]).forEach(c=> {
    const key = (c.grupo && c.grupo.trim()) ? c.grupo.trim() : c.nome.split(/[.:]/)[0].trim();
    (groups[key] ||= []).push(c);
  });
  return Object.keys(groups).sort().map(k=> ({ nome:k, items: groups[k].sort((a,b)=> (a.subcategoria||a.nome).localeCompare(b.subcategoria||b.nome)) }));
});
function toggleGroup(nome:string){
  const i = openGroups.value.indexOf(nome); if(i===-1) openGroups.value.push(nome); else openGroups.value.splice(i,1);
}
const appliedCategories = ref<string[]>([]); // last applied set
const currentTypeLabel = computed(()=> {
  if(appliedCategories.value.length===0) return 'Categories';
  if(appliedCategories.value.length<=2) return appliedCategories.value.join(', ');
  return appliedCategories.value.length + ' Types';
});
function toggleTypes(){ showTypes.value = !showTypes.value; if(showTypes.value) nextTick(()=> adjustPopoverPosition()); }
function toggleAllTypes() {
  const all = (props.categorias || []).map(c => c.nome);
  if (selectedCategories.value.length === all.length) {
    selectedCategories.value = [];
  } else {
    selectedCategories.value = [...all];
  }
}

function toggleType(nome: string) {
  const idx = selectedCategories.value.indexOf(nome);
  if (idx === -1) {
    selectedCategories.value.push(nome);
  } else {
    selectedCategories.value.splice(idx, 1);
  }
}
function clearTypes(){ selectedCategories.value = []; }
function applyMulti(){ appliedCategories.value = [...selectedCategories.value]; emit('change-category', [...appliedCategories.value]); showTypes.value = false; }
// fechar popup ao clicar fora
function handleDoc(e:MouseEvent){
  const target = e.target as HTMLElement;
  if(target.closest('.types-pop')) return; // clique interno
  const pill = target.closest('.filter-pill');
  if(pill && pill === (document.querySelector('.filter-wrapper .filter-pill'))){
    // clique na pill já tratado por toggleTypes; aqui apenas reposiciona
    nextTick(()=> adjustPopoverPosition());
    return;
  }
  showTypes.value = false;
}

function adjustPopoverPosition(){
  const pop = document.querySelector('.filter-wrapper .types-pop') as HTMLElement | null;
  const wrapper = document.querySelector('.filter-wrapper') as HTMLElement | null;
  if(!pop || !wrapper) return;
  pop.classList.remove('types-pop-up');
  const rect = pop.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.top;
  if(spaceBelow < rect.height + 16){
    pop.classList.add('types-pop-up');
  }
}
document.addEventListener('click', handleDoc);

// Settings dialog state
const showSettings = ref(false);
function openSettings(){ showSettings.value = true; }
const newCatName = ref('');
const newCatGroup = ref('');
const newCatSub = ref('');
const newCatColor = ref('#64748b');
const newCatIcon = ref<string|undefined>(undefined);
function onIconChange(e:Event){
  const file = (e.target as HTMLInputElement).files?.[0];
  if(!file) return; const reader = new FileReader();
  reader.onload = () => { newCatIcon.value = reader.result as string; };
  reader.readAsDataURL(file);
}
function addCategoria(){
  const name = newCatName.value.trim();
  if(!name || props.categorias?.some(c=> c.nome.toLowerCase()===name.toLowerCase())) return;
  const nova = { nome: name, cor: newCatColor.value, icon: newCatIcon.value, grupo: newCatGroup.value.trim()||undefined, subcategoria: newCatSub.value.trim()||undefined };
  const lista = [...(props.categorias||[]), nova];
  emit('update-categorias', lista);
  newCatName.value=''; newCatIcon.value=undefined; newCatColor.value='#64748b'; newCatGroup.value=''; newCatSub.value='';
}
function emitUpdateCategorias(){ emit('update-categorias', [...(props.categorias||[])]); }
function deleteCategoria(nome:string){
  const lista = (props.categorias||[]).filter(c=> c.nome!==nome);
  emit('update-categorias', lista);
  // remove selection if necessary
  selectedCategories.value = selectedCategories.value.filter(n=> n!==nome);
  appliedCategories.value = appliedCategories.value.filter(n=> n!==nome);
  emit('change-category', [...appliedCategories.value]);
}
function replaceIcon(nome:string, e:Event){
  const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return;
  const reader = new FileReader(); reader.onload = ()=>{
  const lista = (props.categorias||[]).map(c=> c.nome===nome ? { ...c, icon: reader.result as string } : c);
    emit('update-categorias', lista);
  }; reader.readAsDataURL(file);
}
</script>
<style scoped>
.topbar { position:relative; background:#ffffff; border-bottom:1px solid #e5e7eb; box-shadow:0 1px 2px rgba(0,0,0,.06),0 0 0 1px #e5e7eb; display:flex; flex-direction:column; gap:0; z-index:3000; }
.tb-inner { height:54px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; }
.brand { display:flex; align-items:center; gap:10px; }
.brand-icon { width:34px; height:34px; border-radius:50%; background:radial-gradient(circle at 30% 30%, #4f9ded, #1e88e5); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px -1px rgba(0,0,0,.25),0 0 0 1px #ffffff55 inset; }
.brand-text { display:flex; align-items:baseline; gap:8px; }
.brand-text h1 { font-size:16px; font-weight:600; color:#111827; margin:0; letter-spacing:.5px; }
.tag { background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:600; letter-spacing:.5px; }
.actions { display:flex; align-items:center; gap:10px; }
.act:deep(button) { font-weight:500; }
.tb-meta { display:flex; align-items:center; justify-content:space-between; padding:4px 20px 8px; gap:16px; }
.meta-left { font-size:12px; color:#475569; display:flex; align-items:center; gap:6px; }
.meta-icon { font-size:12px; opacity:.8; }
.meta-right { display:flex; align-items:center; gap:10px; }
.filter-wrapper { position:relative; display:flex; }
.filter-wrapper .types-pop { top:100%; left:0; transform:translateY(6px); }
.filter-wrapper .types-pop.types-pop-up { /* se no futuro precisar inverter */ top:auto; bottom:100%; transform:translateY(-6px); }
.filter-pill { font-size:12px; background:#f1f5f9; padding:6px 10px; border-radius:8px; display:flex; align-items:center; gap:4px; color:#334155; cursor:pointer; border:1px solid #e2e8f0; }
.filter-pill:hover { background:#e2e8f5; }
.filter-pill.ghost { background:#fff; color:#64748b; }
.filter-pill.ghost:hover { background:#f8fafc; }
.types-pop { position:absolute; margin-top:4px; background:#fff; border:1px solid #e2e8f0; box-shadow:0 6px 18px -6px rgba(0,0,0,.18); border-radius:10px; padding:6px 0; display:flex; flex-direction:column; gap:2px; min-width:160px; z-index:4000; }
.types-pop.multi { padding-bottom:8px; }
.types-pop.advanced { width:260px; max-height:360px; overflow:auto; }
.types-header { font-size:11px; font-weight:600; padding:4px 12px 6px; text-transform:uppercase; letter-spacing:.5px; color:#475569; display:flex; justify-content:space-between; align-items:center; }
.bulk-btn { background:#fff; border:1px solid #cbd5e1; font-size:10px; padding:2px 6px; border-radius:6px; cursor:pointer; color:#334155; }
.bulk-btn:hover { background:#f1f5f9; }
.group { border-top:1px solid #f1f5f9; }
.group-head { font-size:12px; padding:6px 12px; display:flex; align-items:center; gap:6px; cursor:pointer; color:#334155; font-weight:500; }
.group-head:hover { background:#f1f5f9; }
.caret { transition:transform .25s ease; display:inline-block; }
.caret.open { transform:rotate(90deg); }
.g-count { font-weight:400; opacity:.7; }
.group-items { padding:2px 0 4px; }
.type-item.all { border-bottom:1px solid #f1f5f9; }
.fade-enter-active,.fade-leave-active { transition: all .25s ease; }
.fade-enter-from,.fade-leave-to { opacity:0; transform:translateY(-4px); }
.type-item { padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:6px; color:#334155; }
.type-item:hover { background:#f1f5f9; }
.type-item.active { background:#eff6ff; color:#1d4ed8; font-weight:600; }
.types-actions { padding:4px 12px 0; display:flex; justify-content:flex-end; }
.type-icon-preview img { width:14px; height:14px; display:block; object-fit:contain; }
.type-icon-preview.inline-svg svg { width:14px; height:14px; display:block; }
.cats-list { max-height:220px; overflow:auto; display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.cat-row { display:flex; align-items:center; gap:10px; font-size:13px; padding:4px 6px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; }
.cat-row .mini-fields { display:flex; gap:4px; margin-left:auto; }
.cat-row .mini { width:70px; padding:4px 4px; font-size:11px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; }
.swatch { width:18px; height:18px; border-radius:5px; box-shadow:0 0 0 1px #cbd5e1 inset; }
.icon-preview img { width:20px; height:20px; object-fit:contain; display:block; }
.icon-preview.inline-svg svg { width:20px; height:20px; display:block; }
.icon-upload, .icon-repl { font-size:11px; background:#e2e8f0; color:#334155; padding:4px 6px; border-radius:6px; cursor:pointer; position:relative; overflow:hidden; line-height:1; }
.icon-upload input, .icon-repl input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.del-btn { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:6px; padding:4px 6px; cursor:pointer; font-size:12px; }
.del-btn:hover { background:#fecaca; }
.add-form { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.add-form input[type=text] { flex:1; padding:6px 8px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px; }
.add-form .mini { width:84px; flex:0 0 auto; padding:6px 6px; font-size:11px; }
.hint { display:block; margin-top:4px; font-size:11px; color:#64748b; }
.search-box { display:flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #e2e8f0; padding:4px 8px; border-radius:8px; font-size:12px; min-width:220px; }
.search-box i { font-size:12px; color:#64748b; }
.search-box input { border:none; outline:none; font-size:12px; flex:1; background:transparent; color:#334155; }
.search-box { position:relative; }
.suggestions { position:absolute; top:100%; left:0; right:0; margin:4px 0 0; background:#fff; border:1px solid #e2e8f0; border-radius:8px; max-height:240px; overflow:auto; list-style:none; padding:4px 0; box-shadow:0 6px 18px -6px rgba(0,0,0,.18); z-index:5000; }
.suggestions li { padding:6px 10px; font-size:12px; cursor:pointer; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; color:#334155; }
.suggestions li:hover, .suggestions li.active { background:#eff6ff; color:#1d4ed8; font-weight:500; }
.suggestions li strong.hl { font-weight:600; color:#0f4ccf; }
@media (max-width: 820px){
  .tb-meta { flex-direction:column; align-items:stretch; }
  .meta-right { width:100%; flex-wrap:wrap; }
  .search-box { flex:1; min-width:140px; }
}
</style>
