using System.Security.Cryptography;
using System.Text;

namespace Common.Helper;

public static class PaymentHelper
{
    public static string CreateHmac512(string key, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToUpperInvariant();
    }

    public static string GenerateTxnRef(Guid refId)
    {
        var ts17 = DateTime.UtcNow.ToString("yyyyMMddHHmmssfff");
        var rand3 = Guid.NewGuid().ToString("N")[..3];
        return $"{ts17}{rand3}{refId:N}";
    }

    public static string GenerateReferenceCode(string transactionType)
    {
        var prefix = transactionType?.ToUpperInvariant() switch
        {
            "ONLINEPAYMENT" or "VNPAY" => "ONL",
            "MOCK" => "MCK",
            "FREE" => "FRE",
            _ => "GEN"
        };
        var datePart = DateTime.UtcNow.ToString("yyyyMMdd");
        var randomPart = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"{prefix}-{datePart}-{randomPart}";
    }

    public static string CreateVnPayUrl(string baseUrl, Dictionary<string, string> parameters, string secret)
    {
        var sortedParams = new SortedDictionary<string, string>(parameters);
        var encodedForHash = string.Join('&', sortedParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
        var secureHash = CreateHmac512(secret, encodedForHash);
        var query = string.Join('&', sortedParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
        return $"{baseUrl}?{query}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash={secureHash}";
    }

    public static Dictionary<string, string> CreateVnPayParameters(
        string tmnCode,
        long amount,
        string txnRef,
        string orderInfo,
        string returnUrl,
        string ipAddress,
        string locale = "vn")
    {
        return new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_Amount"] = amount.ToString(),
            ["vnp_CreateDate"] = DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
            ["vnp_CurrCode"] = "VND",
            ["vnp_ExpireDate"] = DateTime.UtcNow.AddDays(1).ToString("yyyyMMddHHmmss"),
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_Locale"] = locale,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_TxnRef"] = txnRef
        };
    }

    public static string CreateDataString(IDictionary<string, string> queryParams)
    {
        if (queryParams == null || queryParams.Count == 0)
            return string.Empty;

        var sorted = new SortedDictionary<string, string>(queryParams, StringComparer.Ordinal);
        var parts = sorted
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .Select(kv => $"{kv.Key}={kv.Value}");
        return string.Join("&", parts);
    }
}

