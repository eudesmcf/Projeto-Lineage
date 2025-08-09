# Backend Dockerfile - Data Lineage Manager
# Multi-stage build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app .
# Expose HTTP port (matching docker-compose mapping 5243)
ENV ASPNETCORE_URLS=http://+:5243
EXPOSE 5243
ENTRYPOINT ["dotnet", "DataLineageManager.Api.dll"]
