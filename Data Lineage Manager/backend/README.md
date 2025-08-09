# Data Lineage Manager - Backend

## Requisitos
- .NET 8 SDK
- PostgreSQL em execução (localhost:5432) com usuário `postgres` e senha `postgres` (ou ajuste em `appsettings.json`).

## Instalação
```bash
# Instalar ferramenta EF Core
dotnet tool install --global dotnet-ef

# Restaurar pacotes
dotnet restore

# Criar migration inicial
dotnet ef migrations add InitialCreate

# Aplicar migration ao banco
dotnet ef database update

# Executar a API
dotnet run
```

A API subirá em:
- HTTP: http://localhost:5243
- HTTPS: https://localhost:7243

Swagger (dev): http://localhost:5243/swagger

## Notas
- Semente inicial cria categorias Bronze, Silver, Gold, Dashboard e cadeia de artefatos/ ligações.
- Para reinserir a semente, apague o banco ou as tabelas e execute novamente.
- CORS liberado para http://localhost:5173.
- `Npgsql.EnableLegacyTimestampBehavior` ativado para evitar warnings de timezone.
