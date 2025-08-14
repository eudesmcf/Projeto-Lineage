<template>
  <div class="cat-tree-panel" v-show="visible" :style="panelStyle" @mousedown.stop>
    <div class="ctp-header">
      <strong>Grupos & Categorias</strong>
      <div class="spacer" />
      <button class="mini-btn" @click="close" title="Fechar">×</button>
    </div>
    <div class="ctp-body">
      <ul class="tree-root">
        <li v-for="g in grouped" :key="g.nome" class="group-node">
          <div class="row group" @click="toggleOpen(g.nome)">
            <span class="caret" :class="{open: openGroups.includes(g.nome)}">▸</span>
            <span class="g-name">{{ g.nome }}</span>
            <span class="count">({{ g.total }})</span>
          </div>
          <transition name="fade">
            <ul v-if="openGroups.includes(g.nome)" class="child-list">
              <li v-for="c in g.categorias" :key="c.nome" class="cat-node" @click.stop="emitFocusCategoria(c.nome)">
                <span class="swatch" :style="{background:c.cor}" />
                <span class="c-name">{{ c.nome }}</span>
                <span class="count">{{ c.count }}</span>
              </li>
            </ul>
          </transition>
        </li>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
const props = defineProps<{ visible:boolean; x?:number; y?:number; categorias?: { nome:string; cor:string; grupo?:string; subcategoria?:string }[]; counts?: Record<string,number> }>();
const emit = defineEmits(['close','focus-categoria']);
const openGroups = ref<string[]>([]);
function toggleOpen(nome:string){ const i=openGroups.value.indexOf(nome); if(i===-1) openGroups.value.push(nome); else openGroups.value.splice(i,1); }
const grouped = computed(()=>{
  const map: Record<string, { nome:string; categorias: any[]; total:number }> = {};
  (props.categorias||[]).forEach(c=>{
    const g = c.grupo?.trim() || c.nome.split(/[.:]/)[0];
    const count = props.counts?.[c.nome] || 0;
    (map[g] ||= { nome:g, categorias:[], total:0 });
    map[g].categorias.push({ ...c, count });
    map[g].total += count;
  });
  return Object.values(map).sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR'))
    .map(g=> ({ ...g, categorias: g.categorias.sort((a,b)=> (a.subcategoria||a.nome).localeCompare(b.subcategoria||b.nome,'pt-BR')) }));
});
function emitFocusCategoria(nome:string){ emit('focus-categoria', nome); }
function close(){ emit('close'); }
const panelStyle = computed(()=> ({ left: (props.x||0)+ 'px', top: (props.y||0)+'px' }));
function handleEsc(e:KeyboardEvent){ if(e.key==='Escape') close(); }
function handleClickOutside(e:MouseEvent){ const el=e.target as HTMLElement; if(!el.closest('.cat-tree-panel')) close(); }
onMounted(()=>{ document.addEventListener('keydown', handleEsc); document.addEventListener('mousedown', handleClickOutside); });
onUnmounted(()=>{ document.removeEventListener('keydown', handleEsc); document.removeEventListener('mousedown', handleClickOutside); });
</script>
<style scoped>
.cat-tree-panel { position:absolute; z-index:4500; width:320px; max-height:70vh; background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 10px 28px -6px rgba(0,0,0,.28),0 4px 14px -4px rgba(0,0,0,.14); display:flex; flex-direction:column; backdrop-filter:blur(8px) saturate(1.1); }
.ctp-header { display:flex; align-items:center; gap:8px; padding:10px 14px 8px; border-bottom:1px solid #e2e8f0; font-size:13px; }
.ctp-header strong { font-weight:600; color:#1e293b; }
.ctp-body { padding:8px 10px 12px; overflow:auto; font-size:12px; }
.tree-root, .child-list { list-style:none; margin:0; padding:0; }
.group-node > .row { cursor:pointer; user-select:none; display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:6px; }
.group-node > .row:hover { background:#f1f5f9; }
.caret { transition:transform .25s; display:inline-block; width:14px; }
.caret.open { transform:rotate(90deg); }
.cat-node { display:flex; align-items:center; gap:6px; padding:4px 6px; cursor:pointer; border-radius:6px; }
.cat-node:hover { background:#eff6ff; }
.cat-node .swatch { width:14px; height:14px; border-radius:4px; box-shadow:0 0 0 1px #cbd5e1 inset; }
.count { margin-left:auto; font-weight:500; color:#475569; font-size:11px; }
.child-list { margin:2px 0 6px 18px; border-left:1px dashed #e2e8f0; padding-left:8px; }
.mini-btn { background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; width:24px; height:24px; font-size:14px; cursor:pointer; color:#334155; display:flex; align-items:center; justify-content:center; }
.mini-btn:hover { background:#e2e8f5; }
.fade-enter-active,.fade-leave-active { transition:all .25s ease; }
.fade-enter-from,.fade-leave-to { opacity:0; transform:translateY(-4px); }
</style>
