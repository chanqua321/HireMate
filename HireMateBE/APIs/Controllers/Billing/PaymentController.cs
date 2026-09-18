using HireMate.Modules.Billing.Abstractions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace APIs.Controllers.Billing;

/// <summary>VNPay / PayOS callback — phải public; xác thực bằng chữ ký provider.</summary>
[AllowAnonymous]
[Route("api/[controller]")]
[ApiController]
public class PaymentController(IBillingService billing, IConfiguration config) : ControllerBase
{
    [HttpGet("vnpay/ipn")]
    public async Task<IActionResult> VNPayIpn()
    {
        var queryParams = Request.Query.ToDictionary(q => q.Key, q => q.Value.ToString());
        var response = await billing.ProcessVNPayIpnAsync(queryParams);

        using var doc = JsonDocument.Parse(response);
        var root = doc.RootElement;
        var rspCode = root.TryGetProperty("RspCode", out var rc) ? rc.GetString() ?? "99" : "99";

        var feBase = config["VnPay:FEPaymentResultPage"] ?? "http://localhost:3000/billing-result";
        feBase = feBase.TrimEnd('/');

        var redirectUrl = rspCode switch
        {
            "00" => $"{feBase}/success",
            "02" => $"{feBase}/failed",
            "97" => $"{feBase}/invalid",
            _ => $"{feBase}/error"
        };

        return Redirect(redirectUrl);
    }

    [HttpPost("payos-webhook")]
    public async Task<IActionResult> PayOsWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var result = await billing.HandlePayOsWebhookAsync(body);
        return Ok(new { error = result.Status > 0 ? (int?)null : 1, message = result.Message });
    }
}

