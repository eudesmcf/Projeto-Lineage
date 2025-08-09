# Data Lineage Manager - Frontend

## Requisitos
- Node.js 18+

## Instalação
```bash
npm install
npm run dev
```
App: http://localhost:5173

Configure a API em `.env` se necessário:
```
VITE_API_BASE_URL=http://localhost:5243/api
```

## Funções
- Visualização de grafo (Cytoscape) com categorias
- Context menu para criar ligação ou novo nó + ligação
- Toasts de feedback (offline / sucesso)

## Próximos Passos
- Autenticação
- Edição avançada de metadados
- Export / Import do grafo
- Layouts adicionais (dagre)
