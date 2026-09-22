using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.AiDto;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using System.Text;
namespace HireMate.Modules.Ai;

public interface IAiTextAssistService
{
    Task<IServiceResult> AssistAsync(Guid userId, AiTextAssistRequestDto dto);
}

public sealed class AiTextAssistService(
    IAiQuotaService aiQuota,
    UserManager<UserAccount> users) : IAiTextAssistService
{
    public async Task<IServiceResult> AssistAsync(Guid userId, AiTextAssistRequestDto dto)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var text = (dto.Text ?? "").Trim();
        if (text.Length < 8)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Nhập ít nhất vài câu (tối thiểu ~8 ký tự) để AI hỗ trợ.");

        if (text.Length > 4000)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Đoạn văn quá dài (tối đa 4000 ký tự).");

        var mode = (dto.Mode ?? "polish").Trim().ToLowerInvariant();
        var targetLang = (dto.TargetLang ?? "").Trim().ToLowerInvariant();
        if (mode == "translate" && targetLang is not ("vi" or "en"))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Dịch cần targetLang = vi hoặc en.");

        var (system, userPrompt) = BuildPrompts(dto, mode, targetLang, text);

        await aiQuota.RefreshExpiryAsync(user);
        var featureBlock = await aiQuota.EnsureFeatureQuotaAsync(user, AiQuotaFeature.CvEmailGeneration);
        if (featureBlock != null)
            return featureBlock;

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var consumeBlock = await aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
        if (consumeBlock != null)
            return consumeBlock;

        try
        {
            var aiResult = await aiQuota.CompleteAndLogAsync(
                user, system, userPrompt, "cv_text_assist", null, SettingKeys.AiMaxOutputChars);

            var cleaned = CleanOutput(aiResult.Content);
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI không trả về nội dung hợp lệ. Thử lại.");
            }

            // Proposed-only: never persist. FE must show preview; user accepts explicitly.
            var changed = !string.Equals(cleaned.Trim(), text.Trim(), StringComparison.Ordinal);
            return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new AiTextAssistResultDto
            {
                Text = cleaned,
                OriginalContent = text,
                ProposedContent = cleaned,
                Changed = changed,
                Mode = mode,
                TargetLang = mode == "translate" ? targetLang : null,
                Provider = aiResult.Provider
            });
        }
        catch
        {
            await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
            throw;
        }
    }

    private static (string system, string userPrompt) BuildPrompts(
        AiTextAssistRequestDto dto, string mode, string targetLang, string text)
    {
        var field = string.IsNullOrWhiteSpace(dto.Field) ? "bio" : dto.Field.Trim().ToLowerInvariant();
        var ctx = string.IsNullOrWhiteSpace(dto.Context) ? "" : dto.Context.Trim();

        var sb = new StringBuilder();
        sb.AppendLine($"Field type: {field}.");
        if (!string.IsNullOrEmpty(ctx))
            sb.AppendLine($"Career context (role/industry): {ctx}.");
        sb.AppendLine("User draft:");
        sb.AppendLine(text);

        return mode switch
        {
            "expand" => (
                "You help Vietnamese job seekers write CV text. Expand the draft into a clearer, slightly longer professional paragraph. " +
                "STRICT: Keep only facts present in the draft. Do NOT invent employers, companies, degrees, certificates, projects, metrics, user counts, or skills not mentioned. Return ONLY the improved text, no quotes/markdown.",
                sb.ToString()),
            "shorten" => (
                "You help Vietnamese job seekers write CV text. Shorten the draft to a concise professional bio (2–4 sentences). " +
                "STRICT: Keep key facts only; do NOT invent experience/projects/certificates/metrics/skills. Return ONLY the shortened text.",
                sb.ToString()),
            "translate" when targetLang == "en" => (
                "Translate the user's CV/profile text into clear professional English for a CV. Keep meaning; do NOT invent facts, metrics, employers, or skills. Return ONLY the English text.",
                sb.ToString()),
            "translate" when targetLang == "vi" => (
                "Dịch đoạn văn CV/hồ sơ sang tiếng Việt chuyên nghiệp, mạch lạc. Giữ nguyên ý; KHÔNG bịa thêm kinh nghiệm, dự án, chứng chỉ, số liệu hay kỹ năng. Chỉ trả về đoạn tiếng Việt, không markdown.",
                sb.ToString()),
            _ => (
                "You help Vietnamese students/job seekers express themselves better on a CV. Rewrite the draft to be more professional, clear, and ATS-friendly while keeping the original language of the draft (if mixed, prefer Vietnamese). " +
                "STRICT RULES: Do NOT invent employers, companies, degrees, certificates, projects, achievements, numbers/metrics, or skills that are not already in the draft. " +
                "You MAY improve grammar, wording, ATS phrasing, sentence order, and highlight existing skills for the target role in context. " +
                "Return ONLY the rewritten text, no explanations or markdown.",
                sb.ToString())
        };
    }

    private static string CleanOutput(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        var s = raw.Trim();
        if (s.StartsWith("```", StringComparison.Ordinal))
        {
            var nl = s.IndexOf('\n');
            if (nl > 0) s = s[(nl + 1)..];
            var fence = s.LastIndexOf("```", StringComparison.Ordinal);
            if (fence >= 0) s = s[..fence];
            s = s.Trim();
        }
        if ((s.StartsWith('"') && s.EndsWith('"')) || (s.StartsWith('“') && s.EndsWith('”')))
            s = s[1..^1].Trim();
        return s.Trim();
    }
}
