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
      </div>
    </div>
    <div class="tb-meta">
      <div class="meta-left">
        <i class="pi pi-share-alt meta-icon" />
        <span>{{ metaText }}</span>
      </div>
      <div class="meta-right">
        <div class="filter-pill" title="Filtro" @click="toggleTypes">{{ currentTypeLabel }} <i class="pi pi-angle-down" /></div>
        <div v-if="showTypes" class="types-pop multi advanced">
          <div class="types-header">Tables & Measures <button class="bulk-btn" @click.stop="bulkToggle">{{ bulkLabel }}</button></div>
          <div class="type-item all" :class="{ active: selectedCategories.length===0 }" @click.stop="clearTypes"><input type="checkbox" :checked="selectedCategories.length===0" /> <span>All Types</span></div>
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
                  <span v-if="c.icon" class="type-icon-preview"><img :src="c.icon" alt="" /></span>
                  <span>{{ c.nome }}</span>
                </div>
              </div>
            </transition>
          </div>
          <div class="types-actions">
            <Button size="small" label="Aplicar" @click="applyMulti" />
          </div>
        </div>
        <div class="filter-pill ghost" title="Gerenciar categorias" @click="openSettings">Settings</div>
  <div class="filter-pill ghost" title="Mostrar desconectados">Show Disconnected</div>
        <div class="search-box">
          <i class="pi pi-search" />
          <input type="text" placeholder="Search Measures..." v-model="search" />
        </div>
      </div>
    </div>
  </header>
  <Dialog v-model:visible="showSettings" header="Categorias" :modal="true" style="width:520px">
    <div class="cats-list">
      <div v-for="c in categorias" :key="c.nome" class="cat-row">
        <span class="swatch" :style="{ background:c.cor }" />
        <span class="name">{{ c.nome }}</span>
        <span v-if="c.icon" class="icon-preview"><img :src="c.icon" alt="" /></span>
        <label class="icon-repl">
          <input type="file" accept="image/*" @change="e=>replaceIcon(c.nome, e)" />Trocar Ícone
        </label>
        <button class="del-btn" title="Remover" @click="deleteCategoria(c.nome)">✕</button>
      </div>
    </div>
    <div class="add-form">
      <input v-model="newCatName" type="text" placeholder="Nova categoria" />
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
import { ref, computed, watch } from 'vue';

const props = defineProps<{ categorias?: { nome:string; cor:string; icon?: string }[] }>();
const emit = defineEmits(['change-category','update-categorias']);

// futura integração: valores dinâmicos; placeholder por enquanto
const measures = ref(31);
const deps = ref(39);
const search = ref('');
const metaText = computed(()=> `${measures.value} measures, ${deps.value} dependencies`);
const showTypes = ref(false);
const selectedCategories = ref<string[]>([]);
const openGroups = ref<string[]>([]);
// agrupa categorias simples por prefixo antes do primeiro espaço (ex: "Sales Dashboard" -> "Sales")
const groupedCategorias = computed(()=>{
  const groups: Record<string, any[]> = {};
  (props.categorias||[]).forEach(c=> {
    const key = c.nome.split(/[.:]/)[0].trim();
    if(!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return Object.keys(groups).sort().map(k=> ({ nome:k, items: groups[k].sort((a,b)=> a.nome.localeCompare(b.nome)) }));
});
function toggleGroup(nome:string){
  const i = openGroups.value.indexOf(nome); if(i===-1) openGroups.value.push(nome); else openGroups.value.splice(i,1);
}
const bulkLabel = computed(()=> selectedCategories.value.length ? 'Deselect All' : 'Select All');
function bulkToggle(){
  if(selectedCategories.value.length){ selectedCategories.value = []; }
  else selectedCategories.value = (props.categorias||[]).map(c=> c.nome);
}
const appliedCategories = ref<string[]>([]); // last applied set
const currentTypeLabel = computed(()=> {
  if(appliedCategories.value.length===0) return 'All Types';
  if(appliedCategories.value.length<=2) return appliedCategories.value.join(', ');
  return appliedCategories.value.length + ' Types';
});
function toggleTypes(){ showTypes.value = !showTypes.value; }
function toggleType(nome:string){
  const idx = selectedCategories.value.indexOf(nome);
  if(idx===-1) selectedCategories.value.push(nome); else selectedCategories.value.splice(idx,1);
}
function clearTypes(){ selectedCategories.value = []; }
function applyMulti(){ appliedCategories.value = [...selectedCategories.value]; emit('change-category', [...appliedCategories.value]); showTypes.value = false; }
// fechar popup ao clicar fora
function handleDoc(e:MouseEvent){ if(!(e.target as HTMLElement).closest('.filter-pill, .types-pop')) showTypes.value=false; }
document.addEventListener('click', handleDoc);

// Settings dialog state
const showSettings = ref(false);
function openSettings(){ showSettings.value = true; }
const newCatName = ref('');
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
  const nova = { nome: name, cor: newCatColor.value, icon: newCatIcon.value };
  const lista = [...(props.categorias||[]), nova];
  emit('update-categorias', lista);
  newCatName.value=''; newCatIcon.value=undefined; newCatColor.value='#64748b';
}
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
.cats-list { max-height:220px; overflow:auto; display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.cat-row { display:flex; align-items:center; gap:10px; font-size:13px; padding:4px 6px; border:1px solid #e2e8f0; border-radius:6px; background:#f8fafc; }
.swatch { width:18px; height:18px; border-radius:5px; box-shadow:0 0 0 1px #cbd5e1 inset; }
.icon-preview img { width:20px; height:20px; object-fit:contain; display:block; }
.icon-upload, .icon-repl { font-size:11px; background:#e2e8f0; color:#334155; padding:4px 6px; border-radius:6px; cursor:pointer; position:relative; overflow:hidden; line-height:1; }
.icon-upload input, .icon-repl input { position:absolute; inset:0; opacity:0; cursor:pointer; }
.del-btn { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; border-radius:6px; padding:4px 6px; cursor:pointer; font-size:12px; }
.del-btn:hover { background:#fecaca; }
.add-form { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.add-form input[type=text] { flex:1; padding:6px 8px; font-size:12px; border:1px solid #cbd5e1; border-radius:6px; }
.hint { display:block; margin-top:4px; font-size:11px; color:#64748b; }
.search-box { display:flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #e2e8f0; padding:4px 8px; border-radius:8px; font-size:12px; min-width:220px; }
.search-box i { font-size:12px; color:#64748b; }
.search-box input { border:none; outline:none; font-size:12px; flex:1; background:transparent; color:#334155; }
@media (max-width: 820px){
  .tb-meta { flex-direction:column; align-items:stretch; }
  .meta-right { width:100%; flex-wrap:wrap; }
  .search-box { flex:1; min-width:140px; }
}
</style>
