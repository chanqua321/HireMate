using System.Text.Json;

namespace HireMate.Modules.Onboarding.Cv;

public static class CvAnalysisSchema
{
    public static JsonElement ResponseSchema { get; } = Build();

    private static JsonElement Build()
    {
        object Text() => new { type = new[] { "string", "null" } };
        object Strings() => new { type = "array", items = new { type = "string" } };
        object Obj(Dictionary<string, object> properties) => new
        {
            type = "object", properties, required = properties.Keys.ToArray(), additionalProperties = false
        };
        var extract = new Dictionary<string, object>();
        foreach (var key in new[] { "fullName", "university", "major", "desiredIndustry",
                     "desiredPosition", "experienceLevel", "bio" })
            extract[key] = Text();
        extract["graduationYear"] = new { type = new[] { "integer", "null" } };
        foreach (var key in new[] { "skills", "hobbies", "education", "projects", "certifications" })
            extract[key] = Strings();
        extract["experiences"] = new { type = "array", items = Obj(new()
        {
            ["title"] = Text(), ["org"] = Text(), ["period"] = Text(), ["description"] = Text()
        }) };
        var root = new Dictionary<string, object>
        {
            ["parseSucceeded"] = new { type = "boolean" },
            ["extract"] = Obj(extract), ["suggestions"] = Strings()
        };
        foreach (var key in new[] { "format", "keywords", "readability", "professionalism", "readinessScore", "fitT1" })
            root[key] = new { type = new[] { "integer", "null" }, minimum = 0, maximum = 100 };
        return JsonSerializer.SerializeToElement(Obj(root));
    }
}
