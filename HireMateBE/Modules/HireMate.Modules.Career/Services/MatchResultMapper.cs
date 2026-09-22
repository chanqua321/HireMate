using Common.DTOs.JdDto;
using Infrastructure.Models;
using System.Text.Json;

namespace HireMate.Modules.Career.Services;

public static class MatchResultMapper
{
    public static JdMatchResultDto Map(JdMatchResult row, string? jdTitle = null, string? cvFileName = null)
    {
        var dto = new JdMatchResultDto
        {
            Id = row.Id,
            JobDescriptionId = row.JobDescriptionId,
            JdTitle = jdTitle,
            CvDocumentId = row.CvDocumentId,
            CvFileName = cvFileName,
            OverallScore = row.OverallScore,
            AiProvider = row.AiProvider,
            CreatedAt = row.CreatedAt,
            ResultJson = row.ResultJson
        };
        FillFromJson(dto, row.ResultJson);
        return dto;
    }

    public static void FillFromJson(JdMatchResultDto dto, string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            dto.MatchedSkills = ReadStringList(root, "matchedSkills", "skills", "matchingSkills");
            dto.MissingSkills = ReadStringList(root, "missingSkills", "gaps");
            dto.ExperienceGaps = ReadStringList(root, "experienceGaps");
            dto.KeywordGaps = ReadStringList(root, "keywordGaps", "keywords");
            dto.Strengths = ReadStringList(root, "strengths");
            dto.Recommendations = ReadStringList(root, "recommendations", "suggestions");

            // Prefer semantic wording for missing skills if AI used harsh phrasing — FE can show as-is;
            // keywordGaps stay separate from skill deficiency.
        }
        catch { /* malformed — leave lists empty; caller should have rejected persist */ }
    }

    private static List<string> ReadStringList(JsonElement root, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!root.TryGetProperty(key, out var el)) continue;
            if (el.ValueKind == JsonValueKind.Array)
            {
                return el.EnumerateArray()
                    .Select(x => x.ValueKind == JsonValueKind.String ? x.GetString() : x.ToString())
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s!.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(30)
                    .ToList();
            }
            if (el.ValueKind == JsonValueKind.String)
            {
                var s = el.GetString();
                if (!string.IsNullOrWhiteSpace(s)) return [s.Trim()];
            }
        }
        return [];
    }
}
