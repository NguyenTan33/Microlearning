# 1. Giai đoạn Build ứng dụng
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Microlearning.csproj", "./"]
RUN dotnet restore "Microlearning.csproj"

COPY . .
RUN dotnet publish "Microlearning.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 2. Giai đoạn Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Cài đặt FFmpeg cho môi trường Linux container
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Microlearning.dll"]