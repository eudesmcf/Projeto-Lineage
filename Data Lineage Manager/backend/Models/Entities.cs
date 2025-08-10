namespace DataLineageManager.Api.Models;

/// <summary>
/// Representa uma categoria/tipo de artefato (ex.: Bronze, Silver, Pipeline) usada para agrupar nós no grafo.
/// </summary>
public class Categoria
{
    /// <summary>Identificador único da categoria.</summary>
    public int Id { get; set; }
    /// <summary>Nome legível da categoria.</summary>
    public string Nome { get; set; } = string.Empty;
    /// <summary>Cor base (hex) utilizada na renderização do nó.</summary>
    public string Cor { get; set; } = string.Empty;
    /// <summary>Grupo lógico superior para agrupamento (ex.: Zona, Camada).</summary>
    public string? Grupo { get; set; }
    /// <summary>Subcategoria adicional para refinamento dentro do grupo.</summary>
    public string? SubCategoria { get; set; }
    /// <summary>Artefatos associados a esta categoria.</summary>
    public ICollection<Artefato> Artefatos { get; set; } = new List<Artefato>();
}

/// <summary>
/// Entidade que representa um artefato (dataset, pipeline, notebook, dashboard, etc) participante da linhagem.
/// </summary>
public class Artefato
{
    /// <summary>Identificador único do artefato.</summary>
    public int Id { get; set; }
    /// <summary>Nome legível do artefato.</summary>
    public string Nome { get; set; } = string.Empty;
    /// <summary>Tipo de artefato (Dataset, Pipeline, Notebook, Dashboard...).</summary>
    public string Tipo { get; set; } = string.Empty; // ex: Dataset, Pipeline, Notebook, Dashboard
    /// <summary>Tecnologia associada (SQL, ADF, Databricks, PowerBI...).</summary>
    public string Tecnologia { get; set; } = string.Empty; // ex: SQL, ADF, Databricks, PowerBI
    /// <summary>Chave estrangeira para a categoria vinculada.</summary>
    public int CategoriaId { get; set; }
    /// <summary>Navegação para a categoria.</summary>
    public Categoria? Categoria { get; set; }
    /// <summary>Campo livre para metadados adicionais em JSON.</summary>
    public string? MetadataJson { get; set; }
    /// <summary>Data/hora de criação (UTC).</summary>
    public DateTime CriadoEm { get; set; }
    /// <summary>Data/hora da última atualização (UTC).</summary>
    public DateTime AtualizadoEm { get; set; }
    /// <summary>Ligações onde este artefato é origem.</summary>
    public ICollection<Ligacao> LigacoesOrigem { get; set; } = new List<Ligacao>();
    /// <summary>Ligações onde este artefato é destino.</summary>
    public ICollection<Ligacao> LigacoesDestino { get; set; } = new List<Ligacao>();
}

/// <summary>
/// Relação dirigida entre dois artefatos compondo a linhagem (ex.: dataset A alimenta pipeline B).
/// </summary>
public class Ligacao
{
    /// <summary>Identificador único da ligação.</summary>
    public int Id { get; set; }
    /// <summary>Id do artefato de origem.</summary>
    public int OrigemId { get; set; }
    /// <summary>Navegação para o artefato de origem.</summary>
    public Artefato? Origem { get; set; }
    /// <summary>Id do artefato de destino.</summary>
    public int DestinoId { get; set; }
    /// <summary>Navegação para o artefato de destino.</summary>
    public Artefato? Destino { get; set; }
    /// <summary>Tipo lógico da ligação (dataset->dataset, dataset->job, etc.).</summary>
    public string TipoLigacao { get; set; } = string.Empty; // dataset->dataset, dataset->job etc
    /// <summary>Metadados adicionais em JSON.</summary>
    public string? MetadataJson { get; set; }
    /// <summary>Data/hora de criação (UTC).</summary>
    public DateTime CriadoEm { get; set; }
}
