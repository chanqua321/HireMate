using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace BusinessLogic.Payments;

public class VnPayOptions
{
    public const string SectionName = "VnPay";
    public bool Enabled { get; set; }
    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public string ReturnUrl { get; set; } = "https://localhost:7080/api/Billing/vnpay-return";
    public string IpnUrl { get; set; } = "https://localhost:7080/api/Billing/vnpay-ipn";
    public string FrontendReturnUrl { get; set; } = "http://localhost:3000/billing-result";
}

public static class VnPayHelper
{
    public static string BuildPaymentUrl(VnPayOptions opts, string txnRef, long amountVnd, string orderInfo, string ipAddress, DateTime createDateUtc)
    {
        var vnTime = TimeZoneInfo.ConvertTimeFromUtc(createDateUtc,
            TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows() ? "SE Asia Standard Time" : "Asia/Ho_Chi_Minh"));

        var data = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = opts.TmnCode,
            ["vnp_Amount"] = (amountVnd * 100).ToString(CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = txnRef,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = opts.ReturnUrl,
            ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
            ["vnp_CreateDate"] = vnTime.ToString("yyyyMMddHHmmss")
        };

        var signData = string.Join("&", data.Select(kv => $"{kv.Key}={WebUtility.UrlEncode(kv.Value)}"));
        var secureHash = HmacSha512(opts.HashSecret, signData);
        return $"{opts.PaymentUrl}?{signData}&vnp_SecureHash={secureHash}";
    }

    public static bool ValidateSignature(IDictionary<string, string> query, string hashSecret)
    {
        if (!query.TryGetValue("vnp_SecureHash", out var secureHash) || string.IsNullOrWhiteSpace(secureHash))
            return false;

        var data = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, value) in query)
        {
            if (key.StartsWith("vnp_", StringComparison.OrdinalIgnoreCase)
                && !key.Equals("vnp_SecureHash", StringComparison.OrdinalIgnoreCase)
                && !key.Equals("vnp_SecureHashType", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrEmpty(value))
            {
                data[key] = value;
            }
        }

        var signData = string.Join("&", data.Select(kv => $"{kv.Key}={WebUtility.UrlEncode(kv.Value)}"));
        var check = HmacSha512(hashSecret, signData);
        return string.Equals(check, secureHash, StringComparison.OrdinalIgnoreCase);
    }

    private static string HmacSha512(string key, string input)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var inputBytes = Encoding.UTF8.GetBytes(input);
        using var hmac = new HMACSHA512(keyBytes);
        var hash = hmac.ComputeHash(inputBytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
