namespace DataLineageManager.Api.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cor { get; set; } = string.Empty;
    public ICollection<Artefato> Artefatos { get; set; } = new List<Artefato>();
}

public class Artefato
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty; // ex: Dataset, Pipeline, Notebook, Dashboard
    public string Tecnologia { get; set; } = string.Empty; // ex: SQL, ADF, Databricks, PowerBI
    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
    public ICollection<Ligacao> LigacoesOrigem { get; set; } = new List<Ligacao>();
    public ICollection<Ligacao> LigacoesDestino { get; set; } = new List<Ligacao>();
}

public class Ligacao
{
    public int Id { get; set; }
    public int OrigemId { get; set; }
    public Artefato? Origem { get; set; }
    public int DestinoId { get; set; }
    public Artefato? Destino { get; set; }
    public string TipoLigacao { get; set; } = string.Empty; // dataset->dataset, dataset->job etc
    public string? MetadataJson { get; set; }
    public DateTime CriadoEm { get; set; }
}
