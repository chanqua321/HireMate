using System.IO.Compression;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.AspNetCore.Http;
using UglyToad.PdfPig;

namespace HireMate.Modules.Onboarding.Cv;

/// <summary>Only PDF and DOCX are part of the CV upload contract.</summary>
public static class CvUploadValidator
{
    public const long MaxFileBytes = 10_000_000;

    public static async Task<CvUploadValidationResult> ValidateAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return CvUploadValidationResult.Invalid("File CV trống hoặc không tồn tại.");
        if (file.Length > MaxFileBytes)
            return CvUploadValidationResult.Invalid("File CV vượt quá giới hạn 10 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".pdf" or ".docx"))
            return CvUploadValidationResult.Invalid("Chỉ hỗ trợ CV định dạng PDF hoặc DOCX.");

        var mime = (file.ContentType ?? string.Empty).Split(';', 2)[0].Trim().ToLowerInvariant();
        var expectedMime = extension == ".pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (mime != expectedMime)
            return CvUploadValidationResult.Invalid("Content-Type không khớp định dạng CV được hỗ trợ.");

        try
        {
            await using var buffer = new MemoryStream((int)file.Length);
            await file.CopyToAsync(buffer);
            if (buffer.Length != file.Length || buffer.Length > MaxFileBytes)
                return CvUploadValidationResult.Invalid("Kích thước file CV không hợp lệ.");

            var bytes = buffer.ToArray();
            if (extension == ".pdf")
            {
                if (bytes.Length < 5 || !bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8))
                    return CvUploadValidationResult.Invalid("File PDF không có chữ ký hợp lệ.");
                using var pdf = PdfDocument.Open(new MemoryStream(bytes));
                if (pdf.NumberOfPages < 1)
                    return CvUploadValidationResult.Invalid("File PDF không có trang hợp lệ.");
            }
            else
            {
                if (bytes.Length < 4 || !bytes.AsSpan(0, 4).SequenceEqual("PK\u0003\u0004"u8))
                    return CvUploadValidationResult.Invalid("File DOCX không có chữ ký ZIP hợp lệ.");
                using (var zip = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read))
                {
                    if (zip.Entries.Count > 2_000 || zip.Entries.Sum(entry => entry.Length) > 40_000_000
                        || zip.GetEntry("[Content_Types].xml") == null || zip.GetEntry("word/document.xml") == null)
                        return CvUploadValidationResult.Invalid("File DOCX không phải gói Office Open XML hợp lệ.");
                }
                using var doc = WordprocessingDocument.Open(new MemoryStream(bytes), false);
                if (doc.MainDocumentPart?.Document?.Body == null)
                    return CvUploadValidationResult.Invalid("File DOCX thiếu nội dung tài liệu hợp lệ.");
            }

            return new CvUploadValidationResult(bytes, null);
        }
        catch (Exception ex) when (ex is not OutOfMemoryException and not OperationCanceledException)
        {
            return CvUploadValidationResult.Invalid("File CV bị hỏng hoặc không đúng định dạng PDF/DOCX.");
        }
    }
}

public sealed record CvUploadValidationResult(byte[]? Bytes, string? Error)
{
    public bool IsValid => Bytes != null;
    public static CvUploadValidationResult Invalid(string error) => new(null, error);
}
