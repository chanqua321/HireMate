using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CvFirstOnboardingT1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CvDocuments_UserId",
                table: "CvDocuments");

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "CvDocuments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FitT1Score",
                table: "CvDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsConfirmed",
                table: "CvDocuments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ParseSucceeded",
                table: "CvDocuments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ReadinessScore",
                table: "CvDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "CvDocuments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Upload");

            migrationBuilder.AddColumn<string>(
                name: "WizardAnswersJson",
                table: "CvDocuments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "CareerProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConfirmedCvDocumentId",
                table: "CareerProfiles",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExperiencesJson",
                table: "CareerProfiles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsJson",
                table: "CareerProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentPlanCode",
                table: "AspNetUsers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlanSelectedAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CvDocuments_UserId_OneConfirmed",
                table: "CvDocuments",
                column: "UserId",
                unique: true,
                filter: "[IsConfirmed] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_CvDocuments_UserId_UploadedAt",
                table: "CvDocuments",
                columns: new[] { "UserId", "UploadedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CareerProfiles_ConfirmedCvDocumentId",
                table: "CareerProfiles",
                column: "ConfirmedCvDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CurrentPlanCode",
                table: "AspNetUsers",
                column: "CurrentPlanCode");

            migrationBuilder.AddForeignKey(
                name: "FK_CareerProfiles_CvDocuments_ConfirmedCvDocumentId",
                table: "CareerProfiles",
                column: "ConfirmedCvDocumentId",
                principalTable: "CvDocuments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CareerProfiles_CvDocuments_ConfirmedCvDocumentId",
                table: "CareerProfiles");

            migrationBuilder.DropIndex(
                name: "IX_CvDocuments_UserId_OneConfirmed",
                table: "CvDocuments");

            migrationBuilder.DropIndex(
                name: "IX_CvDocuments_UserId_UploadedAt",
                table: "CvDocuments");

            migrationBuilder.DropIndex(
                name: "IX_CareerProfiles_ConfirmedCvDocumentId",
                table: "CareerProfiles");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_CurrentPlanCode",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "FitT1Score",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "IsConfirmed",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "ParseSucceeded",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "ReadinessScore",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "WizardAnswersJson",
                table: "CvDocuments");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "CareerProfiles");

            migrationBuilder.DropColumn(
                name: "ConfirmedCvDocumentId",
                table: "CareerProfiles");

            migrationBuilder.DropColumn(
                name: "ExperiencesJson",
                table: "CareerProfiles");

            migrationBuilder.DropColumn(
                name: "SkillsJson",
                table: "CareerProfiles");

            migrationBuilder.DropColumn(
                name: "CurrentPlanCode",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "PlanSelectedAt",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_CvDocuments_UserId",
                table: "CvDocuments",
                column: "UserId");
        }
    }
}
