using Common.DTOs.PublicDto;
using Infrastructure.Models;

namespace Infrastructure.Queries;

public static class BlogQueries
{
    public static IQueryable<BlogReadDto> ReadBlogs(this IQueryable<BlogPost> posts,
        IQueryable<UserAccount> users, bool admin = false)
        => from p in posts
           join u in users on p.AuthorId equals (Guid?)u.Id into authors
           from author in authors.DefaultIfEmpty()
           select new BlogReadDto(p.Id, p.Title, p.Slug, p.Tag, p.Summary, p.Body,
               p.IsPublished, p.PublishedAt, p.CreatedAt, p.UpdatedAt,
               author == null ? null : author.FullName,
               p.CoverImageKey == null ? null : (admin ? "/api/Admin/blog/" + p.Id : "/api/Blog/" + p.Slug) + "/cover");
}
