using Common.Helper;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers;

[ApiController]
public abstract class HireMateControllerBase : ControllerBase
{
    protected Guid UserId => User.GetUserId();
}

