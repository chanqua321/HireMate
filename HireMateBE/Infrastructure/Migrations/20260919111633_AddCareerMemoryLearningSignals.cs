using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCareerMemoryLearningSignals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Confidence",
                table: "CareerMemoryEvents",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "CareerMemoryEvents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MemoryKey",
                table: "CareerMemoryEvents",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OccurrenceCount",
                table: "CareerMemoryEvents",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<Guid>(
                name: "SourceAnswerId",
                table: "CareerMemoryEvents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "CareerMemoryEvents",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CareerMemoryEvents_UserId_MemoryKey",
                table: "CareerMemoryEvents",
                columns: new[] { "UserId", "MemoryKey" },
                unique: true,
                filter: "[MemoryKey] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CareerMemoryEvents_UserId_MemoryKey",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "Confidence",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "MemoryKey",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "OccurrenceCount",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "SourceAnswerId",
                table: "CareerMemoryEvents");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "CareerMemoryEvents");
        }
    }
}
