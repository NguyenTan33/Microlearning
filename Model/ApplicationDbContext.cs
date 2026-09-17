using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microlearning.Model.Entities;

namespace Microlearning.Model
{
    public class ApplicationDbContext : IdentityDbContext<Account>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Account>(entity =>
            {
                entity.Property(e => e.FullName).HasMaxLength(150);
            });

            builder.Entity<RefreshToken>(entity =>
            {
                entity.ToTable("RefreshTokens");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.AccountId).IsRequired().HasMaxLength(450);
                entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(256);
                entity.HasIndex(e => e.TokenHash);
                entity.HasOne(e => e.Account)
                      .WithMany()
                      .HasForeignKey(e => e.AccountId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<OtpVerification>(entity =>
            {
                entity.ToTable("OtpVerifications");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Purpose).IsRequired().HasMaxLength(50);
                entity.Property(e => e.OtpHash).IsRequired().HasMaxLength(256);
                entity.HasIndex(e => new { e.PhoneNumber, e.Purpose });
            });
        }
    }
}
