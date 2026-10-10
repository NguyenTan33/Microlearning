import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Maximize2, AlertCircle, PictureInPicture, Youtube } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { catalogApi } from '../../services/catalogApi';
import { parseVideoUrl } from '../../types/media.types';

interface HybridVideoPlayerProps {
  lessonId: number;
  onlineStreamUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  seekTimestamp?: number;
  onCompleted?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

type PlayerMode = 'native' | 'youtube';

function generateYouTubeHtml(videoId: string, startSeconds: number = 0, initialDuration: number = 180): string {
  const safeStart = Math.max(0, Math.floor(startSeconds));
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #player { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    var player = null;
    var progressTimer = null;

    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        width: '100%',
        height: '100%',
        videoId: '${videoId}',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          fs: 1,
          start: ${safeStart}
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    }

    function onPlayerReady(event) {
      if (${safeStart} > 0 && player && typeof player.seekTo === 'function') {
        player.seekTo(${safeStart}, true);
      }
      if (player && typeof player.playVideo === 'function') {
        player.playVideo();
      }
    }

    function onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        if (!progressTimer) {
          progressTimer = setInterval(function() {
            if (player && typeof player.getCurrentTime === 'function') {
              var cur = Math.round(player.getCurrentTime());
              var dur = (typeof player.getDuration === 'function' ? Math.round(player.getDuration()) : 0) || ${initialDuration};
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'timeUpdate',
                  currentTime: cur,
                  duration: dur
                }));
              }
            }
          }, 1000);
        }
      } else {
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      }

      if (event.data === YT.PlayerState.ENDED) {
        var endDur = (player && typeof player.getDuration === 'function' ? Math.round(player.getDuration()) : 0) || ${initialDuration};
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'playToEnd',
            currentTime: endDur,
            duration: endDur
          }));
        }
      }
    }
  </script>
</body>
</html>`;
}

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  lessonId,
  onlineStreamUrl,
  videoUrl,
  durationSeconds = 120,
  seekTimestamp,
  onCompleted,
  onProgress,
}) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('native');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastRecordedTimeRef = useRef<number>(0);
  const videoViewRef = useRef<VideoView | null>(null);
  const webViewRef = useRef<WebView | null>(null);

  // 1. Phân giải nguồn phát: Ưu tiên file offline -> YouTube link -> Azure Media Stream
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSource(true);
    setLoadError(null);

    const resolveStream = async () => {
      try {
        // Ưu tiên 1: Kiểm tra ngay file tải ngoại tuyến trong máy (0ms, không phụ thuộc mạng)
        const offlineCheck = await downloadManager.resolvePlayableVideoUri(lessonId);
        if (offlineCheck.isOffline && offlineCheck.uri) {
          if (isMounted) {
            setPlayerMode('native');
            setYoutubeVideoId(null);
            setSourceUri(offlineCheck.uri);
            setIsLoadingSource(false);
          }
          return;
        }

        // Ưu tiên 2: Kiểm tra nguồn từ props (onlineStreamUrl hoặc videoUrl)
        let streamTargetUrl = onlineStreamUrl || videoUrl;

        // Nếu props chứa link YouTube trực tiếp
        if (streamTargetUrl) {
          const parsed = parseVideoUrl(streamTargetUrl);
          if (parsed.sourceType === 'youtube' && parsed.videoId) {
            if (isMounted) {
              setPlayerMode('youtube');
              setYoutubeVideoId(parsed.videoId);
              setSourceUri(null);
              setIsLoadingSource(false);
            }
            return;
          }
        }

        // Nếu chưa có hoặc chưa rõ, truy vấn chi tiết nguồn Media từ Backend API
        let mediaInfoResult = null;
        try {
          mediaInfoResult = await catalogApi.getLessonMediaInfo(lessonId);
        } catch {
          // Bỏ qua lỗi mạng
        }

        if (mediaInfoResult) {
          // Kiểm tra sourceType từ Media Info
          if (mediaInfoResult.sourceType === 'youtube') {
            const ytUrl = mediaInfoResult.externalUrl || mediaInfoResult.streamUrl || streamTargetUrl;
            const parsed = ytUrl ? parseVideoUrl(ytUrl) : null;
            const resolvedId = parsed?.videoId || mediaInfoResult.embedUrl?.split('embed/')?.[1]?.split('?')?.[0];
            if (resolvedId && isMounted) {
              setPlayerMode('youtube');
              setYoutubeVideoId(resolvedId);
              setSourceUri(null);
              setIsLoadingSource(false);
              return;
            }
          }

          // Quét tất cả URL liên quan xem có link YouTube không
          const testUrls = [mediaInfoResult.externalUrl, mediaInfoResult.streamUrl, streamTargetUrl].filter(Boolean) as string[];
          for (const testUrl of testUrls) {
            const parsed = parseVideoUrl(testUrl);
            if (parsed.sourceType === 'youtube' && parsed.videoId) {
              if (isMounted) {
                setPlayerMode('youtube');
                setYoutubeVideoId(parsed.videoId);
                setSourceUri(null);
                setIsLoadingSource(false);
              }
              return;
            }
          }

          if (!streamTargetUrl) {
            streamTargetUrl = mediaInfoResult.streamUrl || mediaInfoResult.externalUrl || undefined;
          }
        }

        // Tự động phân giải endpoint stream Azure chuẩn nếu chưa có URL
        if (!streamTargetUrl) {
          streamTargetUrl = `https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api/media/lesson/${lessonId}/stream`;
        }

        const resolved = await downloadManager.resolvePlayableVideoUri(lessonId, streamTargetUrl);
        if (isMounted) {
          if (resolved.uri) {
            setPlayerMode('native');
            setYoutubeVideoId(null);
            setSourceUri(resolved.uri);
          } else {
            setLoadError('Bài học này chưa có video hoặc đang được xử lý.');
          }
          setIsLoadingSource(false);
        }
      } catch {
        if (isMounted) {
          setLoadError('Không thể nạp nguồn video bài học.');
          setIsLoadingSource(false);
        }
      }
    };

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [lessonId, onlineStreamUrl, videoUrl]);

  // 2. Khởi tạo native player với expo-video (chỉ nạp URI khi playerMode === 'native')
  const nativePlayerUri = playerMode === 'native' ? sourceUri : null;
  const player = useVideoPlayer(nativePlayerUri, (p: { loop: boolean; timeUpdateEventInterval?: number }) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1;
  });

  // 3. Xử lý tua video tới mốc đánh dấu cho Native Video (Seek to bookmark timestamp chính xác)
  useEffect(() => {
    if (playerMode !== 'native' || !player || typeof seekTimestamp !== 'number' || seekTimestamp < 0) return;

    let hasSeeked = false;
    const performSeek = () => {
      if (hasSeeked) return;
      hasSeeked = true;
      try {
        player.currentTime = seekTimestamp;
        player.play();
      } catch (err) {
        console.warn('[HybridVideoPlayer] Seek timestamp error:', err);
      }
    };

    if (player.status === 'readyToPlay' || player.duration > 0) {
      performSeek();
      return;
    }

    const statusSub = (player as unknown as { addListener: (event: string, callback: (payload: { status: string }) => void) => { remove: () => void } }).addListener('statusChange', (payload: { status: string }) => {
      if (payload?.status === 'readyToPlay') {
        performSeek();
      }
    });

    return () => {
      if (statusSub && typeof statusSub.remove === 'function') {
        statusSub.remove();
      }
    };
  }, [playerMode, player, seekTimestamp]);

  // 4. Xử lý tua video cho YouTube WebView
  useEffect(() => {
    if (playerMode !== 'youtube' || !webViewRef.current || typeof seekTimestamp !== 'number' || seekTimestamp < 0) return;
    const safeSeek = Math.floor(seekTimestamp);
    webViewRef.current.injectJavaScript(`
      if (typeof player !== 'undefined' && player && typeof player.seekTo === 'function') {
        player.seekTo(${safeSeek}, true);
        player.playVideo();
      }
      true;
    `);
  }, [playerMode, seekTimestamp]);

  // 5. Theo dõi tiến trình phát cho Native Player
  useEffect(() => {
    if (playerMode !== 'native' || !player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      const totalDur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;
      autoSyncEngine.recordLessonProgress(lessonId, totalDur, totalDur).catch(() => {});
      if (onCompleted) onCompleted();
    });

    // Lắng nghe cập nhật thời gian phát liên tục mỗi giây
    const timeUpdateSub = (player as unknown as { addListener: (event: string, callback: (payload: { currentTime: number }) => void) => { remove: () => void } }).addListener('timeUpdate', (payload: { currentTime: number }) => {
      const cur = Math.round(payload.currentTime);
      const dur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;

      if (onProgress) {
        onProgress(cur, dur);
      }

      if (cur > 0 && Math.abs(cur - lastRecordedTimeRef.current) >= 5) {
        lastRecordedTimeRef.current = cur;
        autoSyncEngine.recordLessonProgress(lessonId, cur, dur).catch(() => {});
      }
    });

    return () => {
      playToEndSub.remove();
      timeUpdateSub.remove();
    };
  }, [playerMode, player, lessonId, durationSeconds, onCompleted, onProgress]);

  // 6. Xử lý sự kiện từ YouTube WebView bridge
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'timeUpdate') {
        const cur = Number(data.currentTime) || 0;
        const dur = Number(data.duration) || durationSeconds;
        if (onProgress) {
          onProgress(cur, dur);
        }
        if (cur > 0 && Math.abs(cur - lastRecordedTimeRef.current) >= 5) {
          lastRecordedTimeRef.current = cur;
          autoSyncEngine.recordLessonProgress(lessonId, cur, dur).catch(() => {});
        }
      } else if (data.type === 'playToEnd') {
        const totalDur = Number(data.duration) || durationSeconds;
        autoSyncEngine.recordLessonProgress(lessonId, totalDur, totalDur).catch(() => {});
        if (onCompleted) {
          onCompleted();
        }
      }
    } catch {
      // ignore JSON parse error
    }
  };

  const handleToggleFullscreen = () => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  };

  if (isLoadingSource) {
    return (
      <View style={styles.videoContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.resolvingText}>Đang kết nối luồng phát video...</Text>
      </View>
    );
  }

  if (loadError || (playerMode === 'native' && !sourceUri) || (playerMode === 'youtube' && !youtubeVideoId)) {
    return (
      <View style={styles.videoContainer}>
        <AlertCircle color="#F59E0B" size={28} />
        <Text style={styles.errorText}>{loadError || 'Chưa gắn tệp video cho bài học này.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      {playerMode === 'youtube' && youtubeVideoId ? (
        <View style={styles.webViewWrapper}>
          <WebView
            ref={webViewRef}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            originWhitelist={['*']}
            source={{
              html: generateYouTubeHtml(youtubeVideoId, seekTimestamp, durationSeconds),
              baseUrl: 'https://www.youtube.com',
            }}
            onMessage={handleWebViewMessage}
          />
          <View style={styles.platformBadge}>
            <Youtube color="#EF4444" size={14} />
            <Text style={styles.platformBadgeText}>YouTube</Text>
          </View>
        </View>
      ) : (
        <>
          <VideoView
            ref={videoViewRef}
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={true}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture={true}
            startsPictureInPictureAutomatically={true}
          />

          {/* Cụm nút điều khiển PiP & Toàn màn hình */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => {
                if (videoViewRef.current) {
                  try {
                    videoViewRef.current.startPictureInPicture();
                  } catch (err) {
                    console.warn('[HybridVideoPlayer] Start PiP error:', err);
                  }
                }
              }}
              activeOpacity={0.8}
              accessibilityLabel="Thu nhỏ màn hình PiP"
            >
              <PictureInPicture color="#FFFFFF" size={14} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleToggleFullscreen}
              activeOpacity={0.8}
              accessibilityLabel="Phóng to toàn màn hình"
            >
              <Maximize2 color="#FFFFFF" size={14} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  webViewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  platformBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    pointerEvents: 'none',
  },
  platformBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  resolvingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  controlsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  controlBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
