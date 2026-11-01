export interface LessonMediaInfo {
  lessonId: number;
  mediaId: number | null;
  sourceType: 'azure' | 'youtube' | 'vimeo' | 'direct_url' | 'demo';
  streamUrl: string;
  externalUrl?: string | null;
  embedUrl?: string | null;
  contentType: string;
  fileSizeBytes: number;
  slideUrl?: string | null;
  slideType?: string | null;
}

export interface LinkExternalMediaRequest {
  lessonId: number;
  url: string;
  title?: string;
  durationSeconds?: number;
}

/**
 * Trích xuất Video ID 11 ký tự của YouTube từ bất kỳ định dạng liên kết nào
 */
export function extractYoutubeVideoId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];
  const pathMatch = trimmed.match(/youtube\.com\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/i);
  if (pathMatch) return pathMatch[1];
  const watchMatch = trimmed.match(/youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];
  return null;
}

/**
 * Trích xuất loại nguồn và đường dẫn Embed của video từ URL
 */
export function parseVideoUrl(rawUrl: string): {
  sourceType: 'youtube' | 'vimeo' | 'direct_url' | 'unknown';
  embedUrl: string | null;
  videoId: string | null;
  platformName: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { sourceType: 'unknown', embedUrl: null, videoId: null, platformName: 'Không xác định' };
  }

  const url = rawUrl.trim();

  // 1. YouTube
  const ytId = extractYoutubeVideoId(url);
  if (ytId) {
    return {
      sourceType: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}?enablejsapi=1&rel=0`,
      videoId: ytId,
      platformName: 'YouTube',
    };
  }

  // 2. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return {
      sourceType: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0`,
      videoId,
      platformName: 'Vimeo',
    };
  }

  // 3. Direct URL (MP4, WebM, MOV, Azure Blob, v.v.)
  const lower = url.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.includes('.mp4?') || lower.includes('blob.core.windows.net')) {
      return {
        sourceType: 'direct_url',
        embedUrl: null,
        videoId: null,
        platformName: 'Tệp Video Trực Tiếp (Direct URL)',
      };
    }

    return {
      sourceType: 'direct_url',
      embedUrl: null,
      videoId: null,
      platformName: 'Liên kết Video Trực tuyến',
    };
  }

  return { sourceType: 'unknown', embedUrl: null, videoId: null, platformName: 'Không hợp lệ' };
}
