namespace Common.DTOs.DashboardDto;

public class DashboardDto
{
    public double? InterviewScore { get; set; }
    public int SessionsCount { get; set; }
    public int SessionsThisMonth { get; set; }
    public InterviewRecentDto? RecentSession { get; set; }
    public List<WeeklyScoreDto> WeeklyScores { get; set; } = [];
    public CompetencySummaryDto? CompetencySummary { get; set; }
    public int RemainingFreeSessionsThisMonth { get; set; }
    public bool IsPremium { get; set; }
}

public class InterviewRecentDto
{
    public Guid Id { get; set; }
    public string Position { get; set; } = string.Empty;
    public int? OverallScore { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class WeeklyScoreDto
{
    public string WeekLabel { get; set; } = string.Empty;
    public double AverageScore { get; set; }
    public int Count { get; set; }
}

public class CompetencySummaryDto
{
    public double AvgS { get; set; }
    public double AvgT { get; set; }
    public double AvgA { get; set; }
    public double AvgR { get; set; }
    public double AvgClarity { get; set; }
}
