# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY HireMateBE.sln ./
COPY APIs/APIs.csproj APIs/
COPY BusinessLogic/BusinessLogic.csproj BusinessLogic/
COPY Infrastructure/Infrastructure.csproj Infrastructure/
COPY Common/Common.csproj Common/
RUN dotnet restore HireMateBE.sln
COPY . .
RUN dotnet publish APIs/APIs.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "APIs.dll"]
