export interface LessonMediaInfo {
  lessonId: number;
  mediaId: number | null;
  sourceType: 'azure' | 'youtube' | 'vimeo' | 'direct_url' | 'demo';
  streamUrl: string;
  externalUrl?: string | null;
  embedUrl?: string | null;
  contentType: string;
  fileSizeBytes: number;
}

export interface LinkExternalMediaRequest {
  lessonId: number;
  url: string;
  title?: string;
  durationSeconds?: number;
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
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      sourceType: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`,
      videoId,
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

  // 3. Direct URL (MP4, WebM, MOV, v.v.)
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
