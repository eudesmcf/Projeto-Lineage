using DataLineageManager.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DataLineageManager.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GrafoController : ControllerBase
{
    private readonly AppDbContext _db;
    public GrafoController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var artefatos = await _db.Artefatos.Include(a=>a.Categoria).ToListAsync();
        var ligacoes = await _db.Ligacoes.ToListAsync();

        var nodes = artefatos.Select(a => new {
            data = new {
                id = a.Id.ToString(),
                label = a.Nome,
                categoria = a.Categoria?.Nome,
                cor = a.Categoria?.Cor,
                tecnologia = a.Tecnologia,
                tipo = a.Tipo
            }
        });

        var edges = ligacoes.Select(l => new {
            data = new {
                id = $"e{l.Id}",
                source = l.OrigemId.ToString(),
                target = l.DestinoId.ToString(),
                tipo = l.TipoLigacao
            }
        });

        return Ok(new { nodes, edges });
    }
}
