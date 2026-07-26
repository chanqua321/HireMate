using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BusinessLogic.Payments;

public class PayOsOptions
{
    public const string SectionName = "PayOS";
    public bool Enabled { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ChecksumKey { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://api-merchant.payos.vn";
    public string ReturnUrl { get; set; } = "http://localhost:3000/billing-result.html?status=success";
    public string CancelUrl { get; set; } = "http://localhost:3000/billing-result.html?status=cancel";
    public string FrontendReturnUrl { get; set; } = "http://localhost:3000/billing-result.html";
}

public class PayOsCreateResult
{
    public bool Ok { get; set; }
    public string? CheckoutUrl { get; set; }
    public string? PaymentLinkId { get; set; }
    public string? QrCode { get; set; }
    public long OrderCode { get; set; }
    public string? Error { get; set; }
}

public static class PayOsHelper
{
    public static string SignPaymentRequest(long orderCode, int amount, string description, string cancelUrl, string returnUrl, string checksumKey)
    {
        var raw =
            $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}";
        return HmacSha256(checksumKey, raw);
    }

    public static bool VerifyWebhookSignature(JsonElement data, string signature, string checksumKey)
    {
        if (string.IsNullOrWhiteSpace(signature) || data.ValueKind != JsonValueKind.Object)
            return false;
        var expected = SignDataObject(data, checksumKey);
        return string.Equals(expected, signature, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>payOS webhook: sort keys of data object, join key=value, HMAC-SHA256.</summary>
    public static string SignDataObject(JsonElement data, string checksumKey)
    {
        var pairs = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var prop in data.EnumerateObject())
        {
            pairs[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
                JsonValueKind.Object or JsonValueKind.Array => prop.Value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Number => prop.Value.TryGetInt64(out var n)
                    ? n.ToString(CultureInfo.InvariantCulture)
                    : prop.Value.GetRawText(),
                _ => prop.Value.ToString()
            };
        }
        var raw = string.Join("&", pairs.Select(kv => $"{kv.Key}={kv.Value}"));
        return HmacSha256(checksumKey, raw);
    }

    public static string HmacSha256(string key, string data)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(dataBytes)).ToLowerInvariant();
    }
}

public class PayOsClient(HttpClient http, Microsoft.Extensions.Options.IOptions<PayOsOptions> options)
{
    private readonly PayOsOptions _opts = options.Value;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<PayOsCreateResult> CreatePaymentLinkAsync(long orderCode, int amountVnd, string description, CancellationToken ct = default)
    {
        if (!_opts.Enabled || string.IsNullOrWhiteSpace(_opts.ClientId) || string.IsNullOrWhiteSpace(_opts.ApiKey) || string.IsNullOrWhiteSpace(_opts.ChecksumKey))
            return new PayOsCreateResult { Ok = false, Error = "PayOS is not configured. Set PayOS:Enabled + ClientId + ApiKey + ChecksumKey." };

        // description: tài khoản không liên kết PayOS giới hạn ~9 ký tự
        var desc = string.IsNullOrWhiteSpace(description) ? "HireMate" : description.Trim();
        if (desc.Length > 9) desc = desc[..9];

        var signature = PayOsHelper.SignPaymentRequest(orderCode, amountVnd, desc, _opts.CancelUrl, _opts.ReturnUrl, _opts.ChecksumKey);
        var body = new
        {
            orderCode,
            amount = amountVnd,
            description = desc,
            cancelUrl = _opts.CancelUrl,
            returnUrl = _opts.ReturnUrl,
            signature
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "v2/payment-requests");
        req.Headers.TryAddWithoutValidation("x-client-id", _opts.ClientId);
        req.Headers.TryAddWithoutValidation("x-api-key", _opts.ApiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(body, JsonOpts), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req, ct);
        var raw = await res.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(raw) ? "{}" : raw);
        var root = doc.RootElement;
        var code = root.TryGetProperty("code", out var c) ? c.GetString() : null;
        if (!res.IsSuccessStatusCode || code != "00" || !root.TryGetProperty("data", out var data) || data.ValueKind == JsonValueKind.Null)
        {
            var descErr = root.TryGetProperty("desc", out var d) ? d.GetString() : raw;
            return new PayOsCreateResult { Ok = false, OrderCode = orderCode, Error = descErr ?? "PayOS create failed" };
        }

        return new PayOsCreateResult
        {
            Ok = true,
            OrderCode = orderCode,
            CheckoutUrl = data.TryGetProperty("checkoutUrl", out var u) ? u.GetString() : null,
            PaymentLinkId = data.TryGetProperty("paymentLinkId", out var id) ? id.GetString() : null,
            QrCode = data.TryGetProperty("qrCode", out var qr) ? qr.GetString() : null
        };
    }
}
