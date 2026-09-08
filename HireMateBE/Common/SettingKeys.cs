namespace Common;

/// <summary>Khóa cấu hình hệ thống — admin sửa trên DB, không hard-code giá/cổng/AI.</summary>
public static class SettingKeys
{
    public const string PaymentsAllowMock = "payments.allow_mock";
    public const string PaymentsDefaultProvider = "payments.default_provider";
    public const string AiMaxOutputChars = "ai.max_output_chars";
    public const string AiCvAnalyzeMaxOutputChars = "ai.cv_analyze_max_output_chars";
    public const string AiInterviewMaxOutputChars = "ai.interview_max_output_chars";
}

