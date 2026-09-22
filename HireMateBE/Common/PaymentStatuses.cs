namespace Common;

/// <summary>Payment.Status values used by BillingService.</summary>
public static class PaymentStatuses
{
    public const string Pending = "Pending";
    /// <summary>Completed / paid successfully.</summary>
    public const string Success = "Success";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
}

/// <summary>Invoice.Status values.</summary>
public static class InvoiceStatuses
{
    public const string Pending = "Pending";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}
