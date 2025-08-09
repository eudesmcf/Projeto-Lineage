using DataLineageManager.Api.Data;
using DataLineageManager.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DataLineageManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArtefatosController : ControllerBase
{
    private readonly AppDbContext _db;
    public ArtefatosController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Artefato>>> GetAll() => await _db.Artefatos.Include(a=>a.Categoria).AsNoTracking().ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Artefato>> Get(int id)
    {
        var item = await _db.Artefatos.Include(a=>a.Categoria).FirstOrDefaultAsync(a=>a.Id==id);
        return item is null ? NotFound() : item;
    }

    [HttpPost]
    public async Task<ActionResult<Artefato>> Create(Artefato artefato)
    {
        artefato.CriadoEm = DateTime.UtcNow;
        artefato.AtualizadoEm = DateTime.UtcNow;
        _db.Artefatos.Add(artefato);
        await _db.SaveChangesAsync();
        await _db.Entry(artefato).Reference(a=>a.Categoria).LoadAsync();
        return CreatedAtAction(nameof(Get), new { id = artefato.Id }, artefato);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Artefato artefato)
    {
        if (id != artefato.Id) return BadRequest();
        var existing = await _db.Artefatos.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Nome = artefato.Nome;
        existing.Tipo = artefato.Tipo;
        existing.Tecnologia = artefato.Tecnologia;
        existing.CategoriaId = artefato.CategoriaId;
        existing.MetadataJson = artefato.MetadataJson;
        existing.AtualizadoEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _db.Artefatos.FindAsync(id);
        if (item is null) return NotFound();
        _db.Artefatos.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
