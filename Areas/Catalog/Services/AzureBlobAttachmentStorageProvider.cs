using System.Security.Cryptography;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microlearning.Areas.Catalog.DTOs;
using Microlearning.Areas.Catalog.Interfaces;

namespace Microlearning.Areas.Catalog.Services
{
    public class AzureBlobAttachmentStorageProvider : IAttachmentStorageProvider
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<AzureBlobAttachmentStorageProvider> _logger;
        private const string CONTAINER_NAME = "attachments";

        public AzureBlobAttachmentStorageProvider(
            IConfiguration configuration,
            IWebHostEnvironment env,
            ILogger<AzureBlobAttachmentStorageProvider> logger)
        {
            _configuration = configuration;
            _env = env;
            _logger = logger;
        }

        public async Task<UploadFileResult> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken cancellationToken = default)
        {
            var uniqueFileName = $"{Guid.NewGuid():N}_{fileName}";
            long fileSizeBytes = stream.Length;

            // Calculate SHA-256 Checksum
            stream.Position = 0;
            string sha256Checksum;
            using (var sha = SHA256.Create())
            {
                var hashBytes = await sha.ComputeHashAsync(stream, cancellationToken);
                sha256Checksum = Convert.ToHexString(hashBytes).ToLowerInvariant();
            }
            stream.Position = 0;

            var connectionString = _configuration["AzureBlobStorage:ConnectionString"];
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                try
                {
                    var blobServiceClient = new BlobServiceClient(connectionString);
                    var containerClient = blobServiceClient.GetBlobContainerClient(CONTAINER_NAME);
                    await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);

                    var blobClient = containerClient.GetBlobClient(uniqueFileName);
                    var blobHttpHeaders = new BlobHttpHeaders { ContentType = contentType };
                    await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = blobHttpHeaders }, cancellationToken);

                    return new UploadFileResult(
                        blobClient.Uri.ToString(),
                        uniqueFileName,
                        fileSizeBytes,
                        sha256Checksum
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể tải file lên Azure Blob Storage, chuyển hướng lưu cục bộ wwwroot.");
                }
            }

            // Local fallback
            stream.Position = 0;
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var localDir = Path.Combine(webRoot, "Attachments");
            if (!Directory.Exists(localDir))
            {
                Directory.CreateDirectory(localDir);
            }

            var localFilePath = Path.Combine(localDir, uniqueFileName);
            using (var fileStream = new FileStream(localFilePath, FileMode.Create, FileAccess.Write))
            {
                await stream.CopyToAsync(fileStream, cancellationToken);
            }

            var localUrl = $"/Attachments/{uniqueFileName}";
            return new UploadFileResult(localUrl, uniqueFileName, fileSizeBytes, sha256Checksum);
        }

        public async Task DeleteAsync(string fileUrl, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(fileUrl)) return;

            var connectionString = _configuration["AzureBlobStorage:ConnectionString"];
            if (!string.IsNullOrWhiteSpace(connectionString) && fileUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var blobUri = new Uri(fileUrl);
                    var blobServiceClient = new BlobServiceClient(connectionString);
                    var containerClient = blobServiceClient.GetBlobContainerClient(CONTAINER_NAME);
                    var blobName = Path.GetFileName(blobUri.LocalPath);
                    var blobClient = containerClient.GetBlobClient(blobName);
                    await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Lỗi khi xóa tệp khỏi Azure Blob: {Url}", fileUrl);
                }
            }

            // Local file delete
            var fileName = Path.GetFileName(fileUrl);
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var localFilePath = Path.Combine(webRoot, "Attachments", fileName);
            if (File.Exists(localFilePath))
            {
                File.Delete(localFilePath);
            }
        }
    }
}
