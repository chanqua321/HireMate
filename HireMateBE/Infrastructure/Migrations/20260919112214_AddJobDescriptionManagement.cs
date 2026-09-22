using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJobDescriptionManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JobDescriptionId",
                table: "JdMatchResults",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "JobDescriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Position = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobDescriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobDescriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JdMatchResults_CvDocumentId",
                table: "JdMatchResults",
                column: "CvDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_JdMatchResults_JobDescriptionId_CreatedAt",
                table: "JdMatchResults",
                columns: new[] { "JobDescriptionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_JdMatchResults_UserId_CreatedAt",
                table: "JdMatchResults",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_JobDescriptions_UserId_IsArchived_UpdatedAt",
                table: "JobDescriptions",
                columns: new[] { "UserId", "IsArchived", "UpdatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults",
                column: "CvDocumentId",
                principalTable: "CvDocuments",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);

            migrationBuilder.AddForeignKey(
                name: "FK_JdMatchResults_JobDescriptions_JobDescriptionId",
                table: "JdMatchResults",
                column: "JobDescriptionId",
                principalTable: "JobDescriptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JdMatchResults_CvDocuments_CvDocumentId",
                table: "JdMatchResults");

            migrationBuilder.DropForeignKey(
                name: "FK_JdMatchResults_JobDescriptions_JobDescriptionId",
                table: "JdMatchResults");

            migrationBuilder.DropTable(
                name: "JobDescriptions");

            migrationBuilder.DropIndex(
                name: "IX_JdMatchResults_CvDocumentId",
                table: "JdMatchResults");

            migrationBuilder.DropIndex(
                name: "IX_JdMatchResults_JobDescriptionId_CreatedAt",
                table: "JdMatchResults");

            migrationBuilder.DropIndex(
                name: "IX_JdMatchResults_UserId_CreatedAt",
                table: "JdMatchResults");

            migrationBuilder.DropColumn(
                name: "JobDescriptionId",
                table: "JdMatchResults");
        }
    }
}
