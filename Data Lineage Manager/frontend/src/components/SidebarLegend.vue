<template>
  <div class="sidebar">
    <div class="sidebar-head">
      <h3>Categorias</h3>
      <button class="toggle-btn" @click="$emit('toggle-icons')" :title="showIcons ? 'Ocultar ícones' : 'Mostrar ícones'">
        <span v-if="showIcons">🙈</span><span v-else>👁</span>
      </button>
    </div>
    <ul>
      <li v-for="c in categorias" :key="c.nome">
        <span class="color-box" :style="{ background: c.cor }"></span>{{ c.nome }}
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
defineProps<{ categorias: { nome: string; cor: string }[]; showIcons: boolean }>();
</script>
<style scoped>
.sidebar {
  width: 180px;
  border-right: 1px solid #ddd;
  padding: .75rem;
  font-size: .85rem;
  background: #fafafa;
  overflow-y: auto;
}
.sidebar-head { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.sidebar h3 { margin:0; font-size: .9rem; }
.sidebar ul { list-style:none; margin:0; padding:0; }
.sidebar li { display:flex; align-items:center; gap:.5rem; padding:.25rem 0; }
.color-box { width:16px; height:16px; border-radius:4px; box-shadow:0 0 0 1px #0001 inset; }
.toggle-btn { background:#fff; border:1px solid #d0d7de; padding:2px 6px; border-radius:6px; cursor:pointer; font-size:14px; line-height:1; box-shadow:0 1px 2px rgba(0,0,0,.06); }
.toggle-btn:hover { background:#f3f4f6; }
</style>
