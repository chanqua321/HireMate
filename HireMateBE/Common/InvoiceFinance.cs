namespace Common;

/// <summary>
/// A financial transaction is a paid-plan invoice with a positive amount.
/// Free-plan activation writes an audit invoice (0 VND, method Free) and is not one.
/// </summary>
public static class InvoiceFinance
{
    public const string FreeMethod = "Free";

    public static bool IsFinancial(decimal amountVnd, string? paymentMethod)
        => amountVnd > 0
           && !string.Equals(paymentMethod?.Trim(), FreeMethod, StringComparison.OrdinalIgnoreCase);
}
