using Microlearning.Areas.Auth.DTOs;
using Microlearning.Model.Entities;

namespace Microlearning.Areas.Auth.Interfaces;

public interface ITokenService
{
    // Generate Access Token (JWT) from Account entity
    Task<string> GenerateAccessTokenAsync(Account account);

    // Generate random Refresh Token string
    string GenerateRefreshToken();

    // Validate Refresh Token, rotate tokens and return new token pair
    Task<RefreshTokenResponse> RefreshTokenAsync(RefreshTokenRequest request);
}