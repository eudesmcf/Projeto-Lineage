using DataLineageManager.Api.Data;
using DataLineageManager.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DataLineageManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LigacoesController : ControllerBase
{
    private readonly AppDbContext _db;
    public LigacoesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Ligacao>>> GetAll() => await _db.Ligacoes.AsNoTracking().ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Ligacao>> Get(int id)
    {
        var item = await _db.Ligacoes.FindAsync(id);
        return item is null ? NotFound() : item;
    }

    public record CreateLigacaoDto(int OrigemId, int DestinoId, string TipoLigacao, string? MetadataJson);

    [HttpPost]
    public async Task<ActionResult<Ligacao>> Create(CreateLigacaoDto dto)
    {
        if (dto.OrigemId == dto.DestinoId)
            return BadRequest("Origem e destino não podem ser o mesmo.");
        var origemExists = await _db.Artefatos.AnyAsync(a => a.Id == dto.OrigemId);
        var destinoExists = await _db.Artefatos.AnyAsync(a => a.Id == dto.DestinoId);
        if (!origemExists || !destinoExists)
            return BadRequest("Origem ou destino inexistente.");
        var lig = new Ligacao
        {
            OrigemId = dto.OrigemId,
            DestinoId = dto.DestinoId,
            TipoLigacao = dto.TipoLigacao,
            MetadataJson = dto.MetadataJson,
            CriadoEm = DateTime.UtcNow
        };
        _db.Ligacoes.Add(lig);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = lig.Id }, lig);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _db.Ligacoes.FindAsync(id);
        if (item is null) return NotFound();
        _db.Ligacoes.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
