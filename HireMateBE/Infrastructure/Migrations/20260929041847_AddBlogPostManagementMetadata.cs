using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBlogPostManagementMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "PublishedAt",
                table: "BlogPosts",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AddColumn<Guid>(
                name: "AuthorId",
                table: "BlogPosts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverImageKey",
                table: "BlogPosts",
                type: "nvarchar(240)",
                maxLength: 240,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "BlogPosts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "BlogPosts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_AuthorId",
                table: "BlogPosts",
                column: "AuthorId");

            migrationBuilder.AddForeignKey(
                name: "FK_BlogPosts_AspNetUsers_AuthorId",
                table: "BlogPosts",
                column: "AuthorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The old schema cannot represent drafts without a publication date.
            // Refuse rollback rather than inventing a historical timestamp.
            migrationBuilder.Sql("IF EXISTS (SELECT 1 FROM [BlogPosts] WHERE [PublishedAt] IS NULL) THROW 51000, 'Rollback requires resolving nullable publication dates from a verified backup; no dates will be fabricated.', 1;");
            migrationBuilder.DropForeignKey(
                name: "FK_BlogPosts_AspNetUsers_AuthorId",
                table: "BlogPosts");

            migrationBuilder.DropIndex(
                name: "IX_BlogPosts_AuthorId",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "AuthorId",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "CoverImageKey",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "BlogPosts");

            migrationBuilder.AlterColumn<DateTime>(
                name: "PublishedAt",
                table: "BlogPosts",
                type: "datetime2",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);
        }
    }
}
