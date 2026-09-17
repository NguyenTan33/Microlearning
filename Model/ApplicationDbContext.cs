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

            builder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.TokenHash);
                entity.HasOne(e => e.Account)
                      .WithMany()
                      .HasForeignKey(e => e.AccountId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<OtpVerification>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.PhoneNumber, e.Purpose });
            });
        }
    }
}
