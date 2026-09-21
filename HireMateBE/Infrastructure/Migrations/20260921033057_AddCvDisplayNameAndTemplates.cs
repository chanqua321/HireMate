using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCvDisplayNameAndTemplates : Migration
    {
        private static readonly Guid Modern01Id = Guid.Parse("a1111111-1111-4111-8111-111111111101");
        private static readonly Guid Modern02Id = Guid.Parse("a1111111-1111-4111-8111-111111111102");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CvTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PreviewUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TemplateType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, defaultValue: "Modern"),
                    LayoutKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, defaultValue: "modern-01"),
                    LayoutDefinitionJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsSystemTemplate = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SourceCvDocumentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CvTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CvTemplates_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            var now = new DateTime(2026, 9, 21, 0, 0, 0, DateTimeKind.Utc);
            var modern01Json =
                "{\"layoutKey\":\"modern-01\",\"sections\":[\"personal\",\"objective\",\"education\",\"experience\",\"skills\",\"projects\"],\"typography\":{\"fontFamily\":\"Arial\",\"titleSize\":20,\"bodySize\":11,\"sectionTitleSize\":12},\"spacing\":{\"margin\":40,\"sectionGap\":10},\"style\":{\"accentHex\":\"#0284C7\",\"headerRule\":true,\"twoColumn\":false}}";
            var modern02Json =
                "{\"layoutKey\":\"modern-02\",\"sections\":[\"personal\",\"objective\",\"skills\",\"experience\",\"projects\",\"education\",\"certifications\",\"activities\",\"interests\"],\"typography\":{\"fontFamily\":\"Arial\",\"titleSize\":18,\"bodySize\":10,\"sectionTitleSize\":11},\"spacing\":{\"margin\":32,\"sectionGap\":8},\"style\":{\"accentHex\":\"#0F766E\",\"headerRule\":true,\"twoColumn\":true}}";

            migrationBuilder.InsertData(
                table: "CvTemplates",
                columns: new[]
                {
                    "Id", "Name", "Description", "PreviewUrl", "TemplateType", "LayoutKey",
                    "LayoutDefinitionJson", "IsSystemTemplate", "UserId", "SourceCvDocumentId",
                    "IsActive", "CreatedAt", "UpdatedAt"
                },
                values: new object[,]
                {
                    {
                        Modern01Id,
                        "Modern 01",
                        "Layout chuẩn HireMate: header rõ, tóm tắt, kỹ năng, kinh nghiệm/dự án, học vấn.",
                        null,
                        "Modern",
                        "modern-01",
                        modern01Json,
                        true,
                        null,
                        null,
                        true,
                        now,
                        now
                    },
                    {
                        Modern02Id,
                        "Modern 02",
                        "Layout nhấn mạnh kỹ năng trước, header màu accent, phù hợp marketing/data.",
                        null,
                        "Modern",
                        "modern-02",
                        modern02Json,
                        true,
                        null,
                        null,
                        true,
                        now,
                        now
                    }
                });

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "CvDocuments",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            // Backfill DisplayName from FileName without extension (preserve existing CVs).
            migrationBuilder.Sql("""
                UPDATE CvDocuments
                SET DisplayName = LEFT(
                    CASE
                        WHEN FileName IS NULL OR LTRIM(RTRIM(FileName)) = N'' THEN N'CV chưa đặt tên'
                        WHEN CHARINDEX('.', REVERSE(FileName)) > 0
                             AND CHARINDEX('.', REVERSE(FileName)) < LEN(FileName)
                            THEN LEFT(FileName, LEN(FileName) - CHARINDEX('.', REVERSE(FileName)))
                        ELSE FileName
                    END, 120)
                WHERE DisplayName IS NULL OR LTRIM(RTRIM(DisplayName)) = N'';
                """);

            migrationBuilder.AddColumn<Guid>(
                name: "TemplateId",
                table: "CvDocuments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql($"""
                UPDATE CvDocuments
                SET TemplateId = '{Modern01Id}'
                WHERE TemplateId IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_CvDocuments_TemplateId",
                table: "CvDocuments",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_CvTemplates_IsSystemTemplate_IsActive",
                table: "CvTemplates",
                columns: new[] { "IsSystemTemplate", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_CvTemplates_UserId_IsActive",
                table: "CvTemplates",
                columns: new[] { "UserId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_CvDocuments_CvTemplates_TemplateId",
                table: "CvDocuments",
                column: "TemplateId",
                principalTable: "CvTemplates",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CvDocuments_CvTemplates_TemplateId",
                table: "CvDocuments");

            migrationBuilder.DropTable(
                name: "CvTemplates");

            migrationBuilder.DropIndex(
                name: "IX_CvDocuments_TemplateId",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "TemplateId",
                table: "CvDocuments");
        }
    }
}
