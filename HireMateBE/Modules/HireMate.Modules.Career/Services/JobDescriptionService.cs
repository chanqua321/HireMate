using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.JdDto;
using HireMate.Modules.Career.Abstractions;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Career.Services;

public class JobDescriptionService(IUnitOfWork uow) : IJobDescriptionService
{
    public async Task<IServiceResult> CreateAsync(Guid userId, CreateJobDescriptionDto dto)
    {
        var validation = ValidateContent(dto.Title, dto.Content, dto.SourceUrl);
        if (validation != null) return validation;

        var row = new JobDescription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = dto.Title.Trim(),
            CompanyName = NullIfEmpty(dto.CompanyName),
            Position = NullIfEmpty(dto.Position),
            Content = dto.Content.Trim(),
            SourceUrl = NormalizeUrl(dto.SourceUrl),
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await uow.JobDescriptionRepository.CreateAsync(row);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, MapDetail(row));
    }

    public async Task<IServiceResult> ListAsync(Guid userId, bool includeArchived = false)
    {
        var q = uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
            .Where(j => j.UserId == userId);
        if (!includeArchived)
            q = q.Where(j => !j.IsArchived);

        var list = await q.OrderByDescending(j => j.UpdatedAt).Take(100).ToListAsync();
        var ids = list.Select(j => j.Id).ToList();
        var latestScores = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId && m.JobDescriptionId != null && ids.Contains(m.JobDescriptionId.Value))
            .GroupBy(m => m.JobDescriptionId!.Value)
            .Select(g => new { JdId = g.Key, Score = g.OrderByDescending(x => x.CreatedAt).Select(x => x.OverallScore).FirstOrDefault() })
            .ToListAsync();
        var scoreMap = latestScores.ToDictionary(x => x.JdId, x => (int?)x.Score);

        var data = list.Select(j => MapSummary(j, scoreMap.GetValueOrDefault(j.Id))).ToList();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var row = await uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (row == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");

        var latest = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId && m.JobDescriptionId == id)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => (int?)m.OverallScore)
            .FirstOrDefaultAsync();

        var detail = MapDetail(row);
        detail.LatestMatchScore = latest;
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, detail);
    }

    public async Task<IServiceResult> UpdateAsync(Guid userId, Guid id, UpdateJobDescriptionDto dto)
    {
        var validation = ValidateContent(dto.Title, dto.Content, dto.SourceUrl);
        if (validation != null) return validation;

        var row = await uow.JobDescriptionRepository.GetQueryable()
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (row == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");
        if (row.IsArchived)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "JD đã lưu trữ — khôi phục trước khi sửa.");

        row.Title = dto.Title.Trim();
        row.CompanyName = NullIfEmpty(dto.CompanyName);
        row.Position = NullIfEmpty(dto.Position);
        row.Content = dto.Content.Trim();
        row.SourceUrl = NormalizeUrl(dto.SourceUrl);
        row.UpdatedAt = DateTime.UtcNow;
        await uow.JobDescriptionRepository.UpdateAsync(row);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, MapDetail(row));
    }

    public async Task<IServiceResult> ArchiveAsync(Guid userId, Guid id)
    {
        var row = await uow.JobDescriptionRepository.GetQueryable()
            .FirstOrDefaultAsync(j => j.Id == id && j.UserId == userId);
        if (row == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");

        row.IsArchived = true;
        row.UpdatedAt = DateTime.UtcNow;
        await uow.JobDescriptionRepository.UpdateAsync(row);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã lưu trữ JD (match history vẫn giữ).", MapSummary(row, null));
    }

    public async Task<IServiceResult> ListMatchesAsync(Guid userId, Guid jdId)
    {
        var owned = await uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
            .AnyAsync(j => j.Id == jdId && j.UserId == userId);
        if (!owned)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");

        var rows = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId && m.JobDescriptionId == jdId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(50)
            .ToListAsync();

        var cvIds = rows.Where(r => r.CvDocumentId.HasValue).Select(r => r.CvDocumentId!.Value).Distinct().ToList();
        var cvNames = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId && cvIds.Contains(c.Id))
            .Select(c => new { c.Id, c.FileName })
            .ToListAsync();
        var nameMap = cvNames.ToDictionary(x => x.Id, x => x.FileName);

        var jd = await uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
            .FirstAsync(j => j.Id == jdId);
        var data = rows.Select(r => MatchResultMapper.Map(r, jd.Title, nameMap.GetValueOrDefault(r.CvDocumentId ?? Guid.Empty))).ToList();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    private static IServiceResult? ValidateContent(string title, string content, string? sourceUrl)
    {
        if (string.IsNullOrWhiteSpace(title))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Tiêu đề JD là bắt buộc.");
        if (string.IsNullOrWhiteSpace(content) || content.Trim().Length < 30)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Nội dung JD quá ngắn hoặc trống (tối thiểu 30 ký tự).");
        if (content.Trim().Length > 20000)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Nội dung JD vượt quá 20.000 ký tự.");
        if (!string.IsNullOrWhiteSpace(sourceUrl))
        {
            if (!Uri.TryCreate(sourceUrl.Trim(), UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                return new ServiceResult(Const.FAIL_CREATE_CODE, "SourceUrl không hợp lệ (cần http/https).");
        }
        return null;
    }

    private static string? NullIfEmpty(string? s)
        => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string? NormalizeUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        return url.Trim();
    }

    private static JobDescriptionSummaryDto MapSummary(JobDescription j, int? latestScore) => new()
    {
        Id = j.Id,
        Title = j.Title,
        CompanyName = j.CompanyName,
        Position = j.Position,
        IsArchived = j.IsArchived,
        CreatedAt = j.CreatedAt,
        UpdatedAt = j.UpdatedAt,
        ContentLength = j.Content?.Length ?? 0,
        LatestMatchScore = latestScore
    };

    private static JobDescriptionDetailDto MapDetail(JobDescription j) => new()
    {
        Id = j.Id,
        Title = j.Title,
        CompanyName = j.CompanyName,
        Position = j.Position,
        Content = j.Content,
        SourceUrl = j.SourceUrl,
        IsArchived = j.IsArchived,
        CreatedAt = j.CreatedAt,
        UpdatedAt = j.UpdatedAt,
        ContentLength = j.Content?.Length ?? 0
    };
}
