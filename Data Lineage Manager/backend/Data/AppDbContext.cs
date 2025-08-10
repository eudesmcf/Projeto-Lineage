using DataLineageManager.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DataLineageManager.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Artefato> Artefatos => Set<Artefato>();
    public DbSet<Ligacao> Ligacoes => Set<Ligacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Categoria>(ConfigureCategoria);
        modelBuilder.Entity<Artefato>(ConfigureArtefato);
        modelBuilder.Entity<Ligacao>(ConfigureLigacao);
    }

    private void ConfigureCategoria(EntityTypeBuilder<Categoria> builder)
    {
        builder.ToTable("categorias");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Nome).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Cor).IsRequired().HasMaxLength(20);
    builder.Property(c => c.Grupo).HasMaxLength(100);
    builder.Property(c => c.SubCategoria).HasMaxLength(100);
    }

    private void ConfigureArtefato(EntityTypeBuilder<Artefato> builder)
    {
        builder.ToTable("artefatos");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Nome).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Tipo).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Tecnologia).IsRequired().HasMaxLength(100);
        builder.Property(a => a.MetadataJson).HasColumnType("jsonb");
        builder.Property(a => a.CriadoEm).HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        builder.Property(a => a.AtualizadoEm).HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        builder.HasOne(a => a.Categoria)
               .WithMany(c => c.Artefatos)
               .HasForeignKey(a => a.CategoriaId)
               .OnDelete(DeleteBehavior.Restrict);
    }

    private void ConfigureLigacao(EntityTypeBuilder<Ligacao> builder)
    {
        builder.ToTable("ligacoes");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.TipoLigacao).IsRequired().HasMaxLength(150);
        builder.Property(l => l.MetadataJson).HasColumnType("jsonb");
        builder.Property(l => l.CriadoEm).HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        builder.HasOne(l => l.Origem)
               .WithMany(a => a.LigacoesOrigem)
               .HasForeignKey(l => l.OrigemId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(l => l.Destino)
               .WithMany(a => a.LigacoesDestino)
               .HasForeignKey(l => l.DestinoId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
