using Common;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using BusinessLogic.Base;

namespace APIs;

public static class ApiResultExtensions
{
    public static bool TryGetUserId(this ControllerBase controller, out Guid userId)
    {
        userId = Guid.Empty;
        var claim = controller.User.FindFirstValue("userId")
            ?? controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }

    public static IActionResult FromService(this ControllerBase controller, IServiceResult result, int successStatus = 200)
    {
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return controller.NotFound(new { message = result.Message });
        if (result.Status == Const.FAIL_QUOTA_CODE)
            return controller.StatusCode(403, new { message = result.Message });
        if (result.Status < 0)
            return controller.BadRequest(new { message = result.Message, errors = result.Errors });
        if (successStatus == 201)
            return controller.Created(string.Empty, new { data = result.Data, message = result.Message });
        return controller.Ok(new { data = result.Data, message = result.Message });
    }
}
