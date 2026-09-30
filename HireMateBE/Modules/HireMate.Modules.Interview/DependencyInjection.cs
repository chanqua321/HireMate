using HireMate.Modules.Interview.Abstractions;
using HireMate.Modules.Interview.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Interview;

public static class DependencyInjection
{
    public static IServiceCollection AddInterviewModule(this IServiceCollection services)
    {
        services.AddSingleton<InterviewSpeechAudioCache>();
        services.AddScoped<IInterviewService, InterviewService>();
        return services;
    }
}

