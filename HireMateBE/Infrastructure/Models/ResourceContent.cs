using System.Text.Json;

namespace Infrastructure.Models;

public sealed class ResourceExtras
{
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool Free { get; set; } = true;
    public bool Featured { get; set; }
    public string? RawText { get; set; }
}

public static class ResourceContent
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public static string Pack(string? url, string? type, bool free, bool featured)
        => JsonSerializer.Serialize(new ResourceExtras
        {
            Url = url?.Trim() ?? string.Empty,
            Type = string.IsNullOrWhiteSpace(type) ? "Guide" : type.Trim(),
            Free = free,
            Featured = featured
        }, Json);

    public static ResourceExtras Unpack(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return new ResourceExtras { Type = "Guide" };
        if (!body.TrimStart().StartsWith('{'))
            return new ResourceExtras { Type = "Guide", RawText = body };
        try
        {
            return JsonSerializer.Deserialize<ResourceExtras>(body, Json) ?? new ResourceExtras { Type = "Guide" };
        }
        catch (JsonException)
        {
            return new ResourceExtras { Type = "Guide", RawText = body };
        }
    }

    public static object ToView(ResourceItem item)
    {
        var extra = Unpack(item.Body);
        var description = string.IsNullOrWhiteSpace(item.Summary) ? extra.RawText ?? string.Empty : item.Summary;
        return new
        {
            id = item.Id,
            title = item.Title,
            category = item.Category,
            summary = item.Summary,
            description,
            type = string.IsNullOrWhiteSpace(extra.Type) ? item.Industry ?? "Guide" : extra.Type,
            url = extra.Url,
            free = extra.Free,
            featured = extra.Featured,
            isPublished = item.IsPublished,
            industry = item.Industry,
            createdAt = item.CreatedAt
        };
    }
}
