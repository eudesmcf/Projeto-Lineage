// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import GraphView from '../src/components/GraphView.vue';

// Mock cytoscape minimal para montagem (evita layout real)
vi.mock('cytoscape', () => {
  const onHandlers: Record<string, any[]> = {};
  const elements: any[] = [];
  const nodeStore: Record<string, any> = {};

  function makeCollection(items:any[]): any {
    return {
      length: items.length,
      map: (fn:(x:any)=>any)=> items.map(fn),
      forEach: (fn:(x:any)=>void)=> { items.forEach(fn); return undefined; },
      filter: (fn:(x:any)=>boolean)=> makeCollection(items.filter(fn)),
      addClass: ()=> makeCollection(items),
      removeClass: ()=> makeCollection(items),
      unselect: ()=> makeCollection(items.map(it=> (it.__sel=false, it))),
      select: ()=> makeCollection(items.map(it=> (it.__sel=true, it))),
      empty: ()=> items.length===0,
      toArray: ()=> items,
      some: (fn:(x:any)=>boolean)=> items.some(fn),
    };
  }

  function createNode(id:string){
    const n:any = { id: ()=> id, data:(k?:string)=> (k? undefined: {}), selected: ()=> !!n.__sel, __sel:false };
    nodeStore[id]=n; return n;
  }

  // Seed with no nodes; GraphView tests only expansion set not tied to real nodes.

  const factory: any = (opts:any)=> ({
    on:(ev:string, ...rest:any[])=> { (onHandlers[ev] ||= []).push(rest); },
    destroy:()=>{},
    nodes:()=> makeCollection(Object.values(nodeStore)),
    edges:()=> makeCollection([]),
    getElementById:(id:string)=> nodeStore[id] || createNode(id),
    layout:()=> ({ run:()=>{} }),
    zoom:()=>0.75,
    center:()=>{},
    fit:()=>{},
    $:(sel?:string)=> { if(sel==='node:selected'){ return makeCollection(Object.values(nodeStore).filter(n=> n.__sel)); } return makeCollection([]); },
    add:(e:any)=> { if(e.data?.id && !nodeStore[e.data.id]) createNode(e.data.id); elements.push(e); },
    elements:()=> ({ remove:()=>{} }),
    nodeHtmlLabel: ()=>{}
  });
  factory.use = ()=>{};
  return { default: factory };
});
// Mock diagnostics para evitar acessos reais
vi.mock('../src/debug/graphDiagnostics', ()=> ({
  runAllDiagnostics: ()=>{},
  attachGlobalAPI: ()=>{}
}));

// PrimeVue component stubs
vi.mock('primevue/contextmenu', ()=> ({ default:{ name:'ContextMenu', render:()=>null } }));
vi.mock('primevue/dialog', ()=> ({ default:{ name:'Dialog', render:()=>null } }));
vi.mock('primevue/dropdown', ()=> ({ default:{ name:'Dropdown', render:()=>null } }));
vi.mock('primevue/inputtext', ()=> ({ default:{ name:'InputText', render:()=>null } }));
vi.mock('primevue/button', ()=> ({ default:{ name:'Button', render:()=>null } }));
vi.mock('primevue/toast', ()=> ({ default:{ name:'Toast', render:()=>null } }));
vi.mock('primevue/usetoast', ()=> ({ useToast: ()=> ({ add: ()=>{} }) }));

// Plugins mocks
vi.mock('cytoscape-node-html-label', ()=> ({ default: (cy:any)=>{} }));
vi.mock('cytoscape-fcose', ()=> ({ default: (cy:any)=>{} }));
vi.mock('cytoscape-dagre', ()=> ({ default: (cy:any)=>{} }));
vi.mock('cytoscape-navigator', ()=> ({ default: (cy:any)=>{} }));

// LocalStorage mock
const store: Record<string,string> = {};
const ls = {
  getItem: (k:string)=> store[k] ?? null,
  setItem: (k:string,v:string)=> { store[k]=v; },
  removeItem: (k:string)=> { delete store[k]; }
};
Object.defineProperty(globalThis, 'localStorage', { value: ls });

// Env stub desnecessário para vitest; GraphView usa cast seguro.

describe('GraphView expansion persistence', () => {
  beforeAll(()=>{
    // limpa storage
    Object.keys(store).forEach(k=> delete store[k]);
  });

  it('saves and restores expanded ids', async () => {
    const wrapper = mount(GraphView, { props: { categorias: [] }});
    // injeta alguns nós no storage simulando persistGraph anterior
    const saved = { version:1, savedAt:Date.now(), nodes:[], edges:[], expanded:['a','b'] };
    window.localStorage.setItem('dlmGraphV1', JSON.stringify(saved));
    // força reload chamando loadStoredGraph indiretamente via método privado: recriar componente
    await wrapper.unmount();
    const wrapper2 = mount(GraphView, { props: { categorias: [] }});
    // aguarda frame
    await new Promise(r=> setTimeout(r, 30));
    const testApi = (window as any).__DLM_TEST_API;
    expect(testApi).toBeTruthy();
    expect(testApi.listExpanded().sort()).toEqual(['a','b']);
    wrapper2.unmount();
  });

  it('toggleCardExpansion updates set', async () => {
    const w = mount(GraphView, { props: { categorias: [] }});
    const api = (window as any).__DLM_TEST_API;
    api.toggleCardExpansion('x1','test');
    expect(api.isExpanded('x1')).toBe(true);
    api.toggleCardExpansion('x1','test');
    expect(api.isExpanded('x1')).toBe(false);
    w.unmount();
  });
});
