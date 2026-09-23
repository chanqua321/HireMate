using HireMate.BuildingBlocks;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.Modules.Onboarding.Cv;
using Common;
using Common.DTOs.OnboardingDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HireMate.Modules.Onboarding.Services;

public class CvTemplateService(IUnitOfWork uow) : ICvTemplateService
{
    public async Task<IServiceResult> ListAvailableAsync(Guid userId)
    {
        var list = await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
            .Where(t => t.IsActive && (t.IsSystemTemplate || t.UserId == userId))
            .OrderByDescending(t => t.IsSystemTemplate)
            .ThenBy(t => t.Name)
            .ToListAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list.Select(t => Map(t)).ToList());
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var t = await FindAccessibleAsync(userId, id);
        if (t == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, Map(t));
    }

    public async Task<IServiceResult> CreateFromCvAsync(Guid userId, Guid cvDocumentId, CreateCustomTemplateDto dto)
    {
        var cv = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cvDocumentId && c.UserId == userId);
        if (cv == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        // Base layout from the CV's current template (or Modern 01).
        // LIMITATION: we do NOT parse/clone the PDF binary into a pixel-perfect reusable layout.
        CvTemplate? baseTemplate = null;
        if (cv.TemplateId.HasValue)
        {
            baseTemplate = await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.Id == cv.TemplateId.Value
                    && t.IsActive
                    && (t.IsSystemTemplate || t.UserId == userId));
        }
        baseTemplate ??= await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == CvSystemTemplateIds.Modern01);

        var layoutJson = baseTemplate?.LayoutDefinitionJson
            ?? CvLayoutDefinition.Serialize(CvLayoutDefinition.Modern01());
        var layoutKey = baseTemplate?.LayoutKey ?? "modern-01";
        var templateType = baseTemplate?.TemplateType ?? "Modern";

        var display = CvDisplayNameHelper.Resolve(cv.DisplayName, cv.FileName);
        string name;
        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            name = dto.Name.Trim();
            if (name.Length > 100) name = name[..100];
        }
        else
        {
            name = $"Mẫu từ {display}";
            if (name.Length > 100) name = name[..100];
        }

        var entity = new CvTemplate
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"Custom template dựa trên layout metadata của «{display}». Không clone 100% PDF."
                : dto.Description.Trim(),
            PreviewUrl = baseTemplate?.PreviewUrl,
            TemplateType = templateType,
            LayoutKey = layoutKey,
            LayoutDefinitionJson = layoutJson,
            IsSystemTemplate = false,
            UserId = userId,
            SourceCvDocumentId = cv.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await uow.CvTemplateRepository.CreateAsync(entity);
        await uow.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã lưu làm mẫu CV (layout metadata)", Map(entity, limitationNoted: true));
    }

    public async Task<IServiceResult> UpdateAsync(Guid userId, Guid id, UpdateCvTemplateDto dto)
    {
        var t = await uow.CvTemplateRepository.GetQueryable()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsSystemTemplate && x.UserId == userId);
        if (t == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");

        if (!string.IsNullOrWhiteSpace(dto.Name))
            t.Name = dto.Name.Trim().Length > 100 ? dto.Name.Trim()[..100] : dto.Name.Trim();
        if (dto.Description != null)
            t.Description = dto.Description.Trim().Length > 500 ? dto.Description.Trim()[..500] : dto.Description.Trim();
        if (dto.IsActive.HasValue)
            t.IsActive = dto.IsActive.Value;
        t.UpdatedAt = DateTime.UtcNow;

        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã cập nhật template", Map(t));
    }

    public async Task<IServiceResult> DeleteAsync(Guid userId, Guid id)
    {
        var t = await uow.CvTemplateRepository.GetQueryable()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsSystemTemplate && x.UserId == userId);
        if (t == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");

        // Detach CVs that reference this template → fall back to Modern 01 (do not delete CVs).
        var linked = await uow.CvDocumentRepository.GetQueryable()
            .Where(c => c.TemplateId == t.Id)
            .ToListAsync();
        foreach (var c in linked)
            c.TemplateId = CvSystemTemplateIds.Modern01;

        await uow.CvTemplateRepository.RemoveAsync(t);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã xóa template", new { id, detachedCvCount = linked.Count });
    }

    private async Task<CvTemplate?> FindAccessibleAsync(Guid userId, Guid id)
        => await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(t =>
                t.Id == id
                && t.IsActive
                && (t.IsSystemTemplate || t.UserId == userId));

    private static object Map(CvTemplate t, bool limitationNoted = false)
    {
        var publicName = CvTemplateDisplay.Name(t.IsSystemTemplate, t.LayoutKey, t.Name);
        var publicDescription = CvTemplateDisplay.Description(t.LayoutKey, t.Description);
        return new
        {
        t.Id,
        name = publicName,
        description = publicDescription,
        t.PreviewUrl,
        t.TemplateType,
        t.LayoutKey,
        layoutDefinition = SafeParseLayout(t.LayoutDefinitionJson),
        t.IsSystemTemplate,
        t.UserId,
        t.SourceCvDocumentId,
        t.IsActive,
        t.CreatedAt,
        t.UpdatedAt,
        pdfLayoutCloneSupported = false,
        note = limitationNoted
            ? "Custom template lưu layout metadata từ template gốc của CV; không clone pixel-perfect từ file PDF."
            : null
        };
    }

    private static object? SafeParseLayout(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch { return null; }
    }
}
