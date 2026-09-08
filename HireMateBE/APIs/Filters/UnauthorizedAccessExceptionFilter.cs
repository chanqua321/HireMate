using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace APIs.Filters;

public sealed class UnauthorizedAccessExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not UnauthorizedAccessException ex)
            return;

        context.Result = new UnauthorizedObjectResult(new { message = ex.Message });
        context.ExceptionHandled = true;
    }
}

