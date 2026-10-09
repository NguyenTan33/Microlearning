using Microlearning.Areas.Admin.Interfaces;
using Microlearning.Areas.Admin.Services;
using Microlearning.Areas.Auth.Interfaces;
using Microlearning.Areas.Auth.Seeders;
using Microlearning.Areas.Auth.Services;
using Microlearning.Areas.Catalog.Interfaces;
using Microlearning.Areas.Catalog.Seeders;
using Microlearning.Areas.Catalog.Services;
using Microlearning.Areas.Device.Interfaces;
using Microlearning.Areas.Device.Services;
using Microlearning.Areas.Enrollment.Interfaces;
using Microlearning.Areas.Enrollment.Services;
using Microlearning.Areas.Gamification.Interfaces;
using Microlearning.Areas.Gamification.Services;
using Microlearning.Areas.Media.Interfaces;
using Microlearning.Areas.Media.Services;
using Microlearning.Areas.Progress.Interfaces;
using Microlearning.Areas.Progress.Services;
using Microlearning.Areas.Progress.Strategies;
using Microlearning.Areas.Quiz.Interfaces;
using Microlearning.Areas.Quiz.Services;
using Microlearning.Areas.Sync.Interfaces;
using Microlearning.Areas.Sync.Services;
using Microlearning.Infrastructure.Factory;
using Microlearning.Middlewares;
using Microlearning.Model;
using Microlearning.Model.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình giới hạn kích thước tải tệp tin video lên tới 500 MB cho Kestrel và Form
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 524288000; // 500 MB
});
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 524288000; // 500 MB
});

// 1. Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Add Identity
builder.Services.AddIdentity<Account, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = false;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// 3. Add Authentication & JWT Bearer
var jwtKey = builder.Configuration["Jwt:Key"] ?? "Microlearning_Secret_Key_For_Jwt_Authentication_Must_Be_Long_Enough_2024!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = !string.IsNullOrEmpty(builder.Configuration["Jwt:Issuer"]),
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = !string.IsNullOrEmpty(builder.Configuration["Jwt:Audience"]),
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 4. Rate Limiting policies for Auth
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("AuthPolicy", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 2;
    });

    options.AddFixedWindowLimiter("VerifyOtpPolicy", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("SendOtpPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });

    options.AddFixedWindowLimiter("SyncPolicy", opt =>
    {
        opt.PermitLimit = 60;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 5;
    });
});

// 5. Dependency Injections
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

// Auth Services
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IFacebookAuthService, FacebookAuthService>();
builder.Services.AddScoped<IPhoneService, PhoneService>();
builder.Services.AddScoped<ISmsService, SmsService>();
builder.Services.AddScoped<IHashService, HashService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// Catalog Services (Thắng)
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ILessonService, LessonService>();

// Quiz Services (Thắng)
builder.Services.AddScoped<IQuizService, QuizService>();

// Enrollment Services (Thắng)
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();

// Progress Services Online (Thắng)
builder.Services.AddScoped<IProgressService, ProgressService>();

// Upgrade Features Services (SOLID & Thin Architecture)
builder.Services.AddScoped<IAttachmentStorageProvider, AzureBlobAttachmentStorageProvider>();
builder.Services.AddScoped<ILessonAttachmentService, LessonAttachmentService>();
builder.Services.AddScoped<ICourseAccessService, CourseAccessService>();
builder.Services.AddSingleton<IVideoCompletionStrategy, StrictCoverageVideoCompletionStrategy>();
builder.Services.AddScoped<IVideoProgressService, VideoProgressService>();
builder.Services.AddScoped<IUserStreakService, UserStreakService>();
builder.Services.AddScoped<IQuizMistakeVaultService, QuizMistakeVaultService>();
builder.Services.AddScoped<IFavoriteSubjectService, FavoriteSubjectService>();
builder.Services.AddScoped<IMediaBookmarkService, MediaBookmarkService>();
builder.Services.AddScoped<IStudentProgressAnalyticsService, StudentProgressAnalyticsService>();

// Sync, Device & Media Services (Tân)
builder.Services.AddScoped<IContentChangeTracker, ContentChangeTracker>();
builder.Services.AddScoped<IDeviceService, DeviceService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<ISyncOperationHandler, LessonProgressSyncHandler>();
builder.Services.AddScoped<ISyncOperationHandler, QuizAttemptSyncHandler>();
builder.Services.AddScoped<ITombstoneService, TombstoneService>();
builder.Services.AddScoped<ITtsService, TtsService>();
builder.Services.AddScoped<IMediaProcessingService, MediaProcessingService>();

// Auto-register validation factory and rules
builder.Services.AddAppValidation();
builder.Services.AddHostedService<MediaJobBackgroundWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Microlearning API",
        Version = "v1",
        Description = "Hệ thống Backend Microlearning Video App - Hỗ trợ Offline-First Sync"
    });

    // Định nghĩa chuẩn Bearer Authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token JWT theo định dạng: Bearer {token} hoặc chỉ cần paste chuỗi token vào ô bên dưới."
    });

    // Yêu cầu Swagger áp dụng Bearer token cho các endpoint có [Authorize]
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks();

var app = builder.Build();

// Đăng ký Middleware bắt lỗi tập trung ở đầu Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseCors("AllowFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Tự động khởi tạo CSDL (Migration & Seeding) với cơ chế Retry cho Azure SQL Serverless
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var dbContext = services.GetRequiredService<ApplicationDbContext>();

    int maxRetries = 5;
    for (int retry = 1; retry <= maxRetries; retry++)
    {
        try
        {
            logger.LogInformation("Đang kết nối và khởi tạo CSDL Azure SQL (Lần thử {Retry}/{Max})...", retry, maxRetries);

            // 1. Tự động tạo bảng & chạy Migration
            await dbContext.Database.MigrateAsync();

            // 2. Tự động nạp vai trò, tài khoản Admin/Teacher và dữ liệu mẫu
            await IdentityDbSeeder.SeedRolesAndAdminAsync(services);
            await CatalogDbSeeder.SeedAsync(services);

            logger.LogInformation("Khởi tạo CSDL Azure SQL thành công!");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Lần thử {Retry}/{Max} khởi tạo CSDL thất bại: {Message}", retry, maxRetries, ex.Message);
            if (retry == maxRetries)
            {
                logger.LogError(ex, "Đã thử {Max} lần nhưng không thể khởi tạo CSDL Azure SQL.", maxRetries);
            }
            else
            {
                await Task.Delay(TimeSpan.FromSeconds(5)); // Đợi 5s cho Azure SQL Serverless tỉnh dậy
            }
        }
    }
}

app.Run();
