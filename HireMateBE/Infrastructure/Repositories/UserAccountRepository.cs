using Infrastructure.Base;
using Infrastructure.Data;
using Infrastructure.IRepositories;
using Infrastructure.Models;

namespace Infrastructure.Repositories;

public class UserAccountRepository(HireMateContext context)
    : GenericRepository<UserAccount>(context), IUserAccountRepository
{
}
