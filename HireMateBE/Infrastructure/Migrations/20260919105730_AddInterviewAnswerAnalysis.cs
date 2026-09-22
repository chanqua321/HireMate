using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewAnswerAnalysis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AnalysisAvailable",
                table: "InterviewAnswers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AnalysisJson",
                table: "InterviewAnswers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CommunicationScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CompletenessScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CvConsistencyScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceJson",
                table: "InterviewAnswers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceStatus",
                table: "InterviewAnswers",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FollowUpReason",
                table: "InterviewAnswers",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFollowUp",
                table: "InterviewAnswers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ProblemSolvingScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuestionCategory",
                table: "InterviewAnswers",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelevanceScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "StarHasAction",
                table: "InterviewAnswers",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "StarHasResult",
                table: "InterviewAnswers",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "StarHasSituation",
                table: "InterviewAnswers",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "StarHasTask",
                table: "InterviewAnswers",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StarScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TechnicalKnowledgeScore",
                table: "InterviewAnswers",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnalysisAvailable",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "AnalysisJson",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "CommunicationScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "CompletenessScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "CvConsistencyScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "EvidenceJson",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "EvidenceStatus",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "FollowUpReason",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "IsFollowUp",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "ProblemSolvingScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "QuestionCategory",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "RelevanceScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "StarHasAction",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "StarHasResult",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "StarHasSituation",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "StarHasTask",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "StarScore",
                table: "InterviewAnswers");

            migrationBuilder.DropColumn(
                name: "TechnicalKnowledgeScore",
                table: "InterviewAnswers");
        }
    }
}
