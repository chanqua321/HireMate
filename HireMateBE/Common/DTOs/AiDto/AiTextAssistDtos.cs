namespace Common.DTOs.AiDto;

public class AiTextAssistRequestDto
{
    /// <summary>Nội dung người dùng đang soạn.</summary>
    public string Text { get; set; } = "";

    /// <summary>polish | expand | shorten | translate</summary>
    public string Mode { get; set; } = "polish";

    /// <summary>vi | en — bắt buộc khi mode=translate.</summary>
    public string? TargetLang { get; set; }

    /// <summary>bio | experience | skill | general</summary>
    public string? Field { get; set; }

    /// <summary>Vị trí / ngành để AI diễn đạt sát ngữ cảnh.</summary>
    public string? Context { get; set; }
}

public class AiTextAssistResultDto
{
    /// <summary>Proposed text (backward-compatible alias of ProposedContent).</summary>
    public string Text { get; set; } = "";

    public string OriginalContent { get; set; } = "";
    public string ProposedContent { get; set; } = "";
    public bool Changed { get; set; }

    public string Mode { get; set; } = "polish";
    public string? TargetLang { get; set; }
    public string? Provider { get; set; }
}
