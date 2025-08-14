// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import GraphView from '../src/components/GraphView.vue';

// --- Mocks base compartilhados ---
vi.mock('primevue/contextmenu', ()=> ({ default:{ name:'ContextMenu', render:()=>null } }));
vi.mock('primevue/dialog', ()=> ({ default:{ name:'Dialog', render:()=>null } }));
vi.mock('primevue/dropdown', ()=> ({ default:{ name:'Dropdown', render:()=>null } }));
vi.mock('primevue/inputtext', ()=> ({ default:{ name:'InputText', render:()=>null } }));
vi.mock('primevue/button', ()=> ({ default:{ name:'Button', render:()=>null } }));
vi.mock('primevue/toast', ()=> ({ default:{ name:'Toast', render:()=>null } }));
vi.mock('primevue/usetoast', ()=> ({ useToast: ()=> ({ add: ()=>{} }) }));
vi.mock('../src/debug/graphDiagnostics', ()=> ({ runAllDiagnostics: ()=>{}, attachGlobalAPI: ()=>{} }));

// Cytoscape mock especializado para seleção
vi.mock('cytoscape', () => {
  const nodeStore: Record<string, any> = {};
  function makeNode(id:string){
    const n:any = {
      id:()=>id,
      data:(k?:string)=> (k? n._data[k] : n._data),
      _data:{ id, label:id, categoria: id.startsWith('a')? 'CatA':'CatB' },
      selected:()=>!!n.__sel,
      __sel:false,
      empty:()=>false,
      style:()=>n,
      select:()=>{ n.__sel=true; return n; },
      unselect:()=>{ n.__sel=false; return n; },
      connectedEdges:()=>({ addClass:()=>{}, removeClass:()=>{} }),
      position:()=>({ x:0, y:0 }),
      renderedPosition:()=>({ x:0, y:0 })
    };
    nodeStore[id]=n; return n;
  }
  ['a1','a2','b1'].forEach(makeNode);
  function collection(ids:string[]){
    const items = ids.map(i=> nodeStore[i]).filter(Boolean);
    return {
      length: items.length,
      map:(fn:any)=> items.map(fn),
      forEach:(fn:any)=> { items.forEach(fn); },
      filter:(fn:any)=> collection(items.filter(fn).map(i=> i.id())),
      addClass: ()=> collection(ids),
      removeClass: ()=> collection(ids),
      unselect: ()=> { items.forEach(i=> i.__sel=false); return collection(ids); },
      select: ()=> { items.forEach(i=> i.__sel=true); return collection(ids); },
      empty: ()=> items.length===0,
      some:(fn:any)=> items.some(fn),
      toArray:()=> items
    };
  }
  const cyObj:any = {
    on: ()=>{},
  one: ()=>{},
    destroy: ()=>{},
    nodes: ()=> collection(Object.keys(nodeStore)),
    edges: ()=> collection([]),
    getElementById:(id:string)=> nodeStore[id] || makeNode(id),
    layout:()=> ({ run:()=>{} }),
    zoom:()=> 0.75,
    center:()=>{},
    fit:()=>{},
    $:(sel?:string)=> {
      if(sel==='node:selected') return collection(Object.values(nodeStore).filter(n=> n.__sel).map(n=> n.id()));
      return collection([]);
    },
    add:(e:any)=> { if(e.data?.id && !nodeStore[e.data.id]) makeNode(e.data.id); },
    elements:()=> ({ remove:()=>{} }),
    nodeHtmlLabel: ()=>{}
  };
  const factory:any = ()=> cyObj;
  factory.use = ()=>{};
  return { default: factory };
});

// Plugins mocks
vi.mock('cytoscape-node-html-label', ()=> ({ default: ()=>{} }));
vi.mock('cytoscape-fcose', ()=> ({ default: ()=>{} }));
vi.mock('cytoscape-dagre', ()=> ({ default: ()=>{} }));
vi.mock('cytoscape-navigator', ()=> ({ default: ()=>{} }));

const store: Record<string,string> = {};
const ls = { getItem:(k:string)=> store[k] ?? null, setItem:(k:string,v:string)=> { store[k]=v; }, removeItem:(k:string)=> { delete store[k]; } };
Object.defineProperty(globalThis, 'localStorage', { value: ls });

function mountGV(filter?: string[]){
  return mount(GraphView, { props:{ categorias:[{ nome:'CatA', cor:'#123456'},{ nome:'CatB', cor:'#654321'}], categoryFilter: filter } });
}

describe('GraphView seleção e filtro', () => {
  beforeEach(()=> { Object.keys(store).forEach(k=> delete store[k]); });

  it('toggleCardExpansion preservado após filtro', async () => {
    const w = mountGV();
    const api = (window as any).__DLM_TEST_API;
    api.toggleCardExpansion('a1','test');
    expect(api.isExpanded('a1')).toBe(true);
    // Simula persistência
    (window as any).localStorage.setItem('dlmGraphV1', JSON.stringify({ version:1, savedAt:Date.now(), nodes:[], edges:[], expanded:['a1'] }));
    await w.setProps({ categoryFilter:['CatA'] });
    // aguarda microtask
    await new Promise(r=> setTimeout(r, 20));
    expect(api.isExpanded('a1')).toBe(true);
    w.unmount();
  });

  it('expansão removida se id não existe após filtro', async () => {
    const w = mountGV();
    const api = (window as any).__DLM_TEST_API;
    api.toggleCardExpansion('b1','test');
    expect(api.isExpanded('b1')).toBe(true);
    // Aplica filtro que exclui b1
    await w.setProps({ categoryFilter:['CatA'] });
    await new Promise(r=> setTimeout(r, 160));
    expect(api.isExpanded('b1')).toBe(false);
    w.unmount();
  });

  it('clique em caret expande e seleciona nó', async () => {
    const w = mountGV();
    const api = (window as any).__DLM_TEST_API;
    // Injeta card fake no container
    const container = w.element.querySelector('.cy-container') as HTMLElement;
    const card = document.createElement('div');
    card.className = 'dlm-card';
    card.setAttribute('data-node-id','a1');
    card.innerHTML = '<button class="dlm-caret" data-node-id="a1"></button>';
    container.appendChild(card);
    const caret = card.querySelector('.dlm-caret') as HTMLElement;
    caret.dispatchEvent(new MouseEvent('click', { bubbles:true }));
    expect(api.isExpanded('a1')).toBe(true);
    w.unmount();
  });
});
