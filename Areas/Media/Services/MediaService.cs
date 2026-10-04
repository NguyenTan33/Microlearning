using Microlearning.Areas.Media.Interfaces;
using Microlearning.Exceptions;
using Microlearning.Model;
using Microsoft.EntityFrameworkCore;

namespace Microlearning.Areas.Media.Services
{
    public class MediaService : IMediaService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IWebHostEnvironment _env;

        public MediaService(ApplicationDbContext dbContext, IWebHostEnvironment evn)
        {
            _dbContext = dbContext;
            _env = evn;
        }

        public async Task<(Stream stream, string contentType, long fileLength, string fileName)> GetVideoStreamAsync(int mediaId)
        {
            var mediaAsset = await _dbContext.MediaAssets.AsNoTracking().FirstOrDefaultAsync(m => m.Id == mediaId);

            if (mediaAsset == null)
            {
                throw new BusinessException($"Không tìm thấy tệp video {mediaId}.");
            }

            var filePath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "videos", mediaAsset.FileName);
            if (!File.Exists(filePath))
            {
                throw new BusinessException($"Tệp video vật lý không tồn tại trên máy chủ: {mediaAsset.FileName}");
            }

            var fileInfo = new FileInfo(filePath);

            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

            var contentType = string.IsNullOrWhiteSpace(mediaAsset.ContentType) ? "video/mp4" : mediaAsset.ContentType;

            return (stream, contentType, fileInfo.Length, mediaAsset.FileName);
        }


    }
}
