using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PreserveJdMatchHistoryWhenDeletingCv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults");

            migrationBuilder.AddForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults",
                column: "CvDocumentId",
                principalTable: "CvDocuments",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults");

            migrationBuilder.AddForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults",
                column: "CvDocumentId",
                principalTable: "CvDocuments",
                principalColumn: "Id");
        }
    }
}
