namespace Microlearning.Areas.Admin.DTOs
{
    public record UserListItemDto(
        string Id,
        string FullName,
        string PhoneNumber,
        string? Email,
        List<string> Roles,
        bool IsLockedOut,
        DateTimeOffset? LockoutEnd,
        bool PhoneNumberConfirmed
    );

    public record UserDetailDto(
        string Id,
        string FullName,
        string PhoneNumber,
        string? Email,
        List<string> Roles,
        bool IsLockedOut,
        DateTimeOffset? LockoutEnd,
        bool PhoneNumberConfirmed,
        int AccessFailedCount
    );

    public record CreateUserRequest(
        string FullName,
        string PhoneNumber,
        string Password,
        string Role
    );

    public record AdminChangePasswordRequest(
        string NewPassword
    );

    public record AdminToggleLockoutRequest(
        bool Lock,
        int? LockMinutes
    );

    public record UpdateUserRoleRequest(
        string Role
    );
}
