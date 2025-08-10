using Microsoft.EntityFrameworkCore.Migrations;

namespace DataLineageManager.Api.Migrations
{
    public partial class AddGrupoSubCategoria : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Grupo",
                table: "categorias",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubCategoria",
                table: "categorias",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Grupo",
                table: "categorias");

            migrationBuilder.DropColumn(
                name: "SubCategoria",
                table: "categorias");
        }
    }
}
