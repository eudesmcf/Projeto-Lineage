using DataLineageManager.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DataLineageManager.Api.Data;

public static class SeedData
{
    public static void EnsureSeedData(AppDbContext db)
    {
        if (db.Categorias.Any()) return; // assume seeded

        var bronze = new Categoria { Nome = "Bronze", Cor = "#8d6e63" };
        var silver = new Categoria { Nome = "Silver", Cor = "#90a4ae" };
        var gold = new Categoria { Nome = "Gold", Cor = "#ffd54f" };
        var dashboard = new Categoria { Nome = "Dashboard", Cor = "#42a5f5" };

        db.Categorias.AddRange(bronze, silver, gold, dashboard);
        db.SaveChanges();

        var aBronze = new Artefato { Nome = "Dataset Bronze", Tipo = "Dataset", Tecnologia = "SQL", CategoriaId = bronze.Id, CriadoEm = DateTime.UtcNow, AtualizadoEm = DateTime.UtcNow };
        var aSilver = new Artefato { Nome = "Dataset Silver", Tipo = "Dataset", Tecnologia = "SQL", CategoriaId = silver.Id, CriadoEm = DateTime.UtcNow, AtualizadoEm = DateTime.UtcNow };
        var aAdf = new Artefato { Nome = "Pipeline ADF", Tipo = "Pipeline", Tecnologia = "ADF", CategoriaId = gold.Id, CriadoEm = DateTime.UtcNow, AtualizadoEm = DateTime.UtcNow }; // using Gold just for color variety
        var aNotebook = new Artefato { Nome = "Notebook Databricks", Tipo = "Notebook", Tecnologia = "Databricks", CategoriaId = gold.Id, CriadoEm = DateTime.UtcNow, AtualizadoEm = DateTime.UtcNow };
        var aDashboard = new Artefato { Nome = "Dashboard Power BI", Tipo = "Dashboard", Tecnologia = "Power BI", CategoriaId = dashboard.Id, CriadoEm = DateTime.UtcNow, AtualizadoEm = DateTime.UtcNow };

        db.Artefatos.AddRange(aBronze, aSilver, aAdf, aNotebook, aDashboard);
        db.SaveChanges();

        db.Ligacoes.AddRange(
            new Ligacao { OrigemId = aBronze.Id, DestinoId = aSilver.Id, TipoLigacao = "dataset→dataset", CriadoEm = DateTime.UtcNow },
            new Ligacao { OrigemId = aSilver.Id, DestinoId = aAdf.Id, TipoLigacao = "dataset→pipeline", CriadoEm = DateTime.UtcNow },
            new Ligacao { OrigemId = aAdf.Id, DestinoId = aNotebook.Id, TipoLigacao = "pipeline→notebook", CriadoEm = DateTime.UtcNow },
            new Ligacao { OrigemId = aNotebook.Id, DestinoId = aDashboard.Id, TipoLigacao = "notebook→dashboard", CriadoEm = DateTime.UtcNow }
        );
        db.SaveChanges();
    }
}
