import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
  Presentation,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

interface SlidePresentationViewerProps {
  slideUrl: string;
  slideType?: string;
  lessonTitle?: string;
  onCompleted?: () => void;
  onProgress?: (watchedPercent: number) => void;
}

export const SlidePresentationViewer: React.FC<SlidePresentationViewerProps> = ({
  slideUrl,
  slideType = 'Canva',
  lessonTitle,
  onCompleted,
  onProgress,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(1);
  const [totalEstimatedSlides] = useState<number>(10);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [loadingWeb, setLoadingWeb] = useState<boolean>(true);
  const [isDone, setIsDone] = useState<boolean>(false);

  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chuẩn hóa URL hiển thị (Canva embed hoặc Office Online Viewer cho PPT)
  const getEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    if (trimmed.includes('canva.com')) {
      if (trimmed.includes('/view?embed')) return trimmed;
      if (trimmed.includes('?')) return `${trimmed}&embed`;
      return `${trimmed}/view?embed`;
    }
    if (trimmed.endsWith('.ppt') || trimmed.endsWith('.pptx') || trimmed.endsWith('.pdf')) {
      return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  };

  const finalUrl = getEmbedUrl(slideUrl);

  const calculatePercent = (page: number): number => {
    return Math.min(100, Math.round((page / totalEstimatedSlides) * 100));
  };

  const updateProgress = (page: number) => {
    const percent = calculatePercent(page);
    if (onProgress) {
      onProgress(percent);
    }
    if (percent >= 60 && !isDone) {
      setIsDone(true);
      if (onCompleted) {
        onCompleted();
      }
    }
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => {
      const next = Math.min(totalEstimatedSlides, prev + 1);
      updateProgress(next);
      return next;
    });
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => {
      const next = Math.max(1, prev - 1);
      updateProgress(next);
      return next;
    });
  };

  const toggleAutoPlay = () => {
    setIsPlayingAuto((prev) => !prev);
  };

  useEffect(() => {
    if (isPlayingAuto) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          if (prev >= totalEstimatedSlides) {
            setIsPlayingAuto(false);
            if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
            return totalEstimatedSlides;
          }
          const next = prev + 1;
          updateProgress(next);
          return next;
        });
      }, 4000);
    } else {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [isPlayingAuto, totalEstimatedSlides, isDone]);

  const currentPercent = calculatePercent(currentSlideIndex);

  return (
    <View style={styles.container}>
      {/* Header trạng thái Slide */}
      <View style={styles.headerBar}>
        <View style={styles.badgeBox}>
          <Presentation size={14} color="#A78BFA" />
          <Text style={styles.badgeText}>
            {slideType === 'Canva' ? 'Slide Canva Trình Chiếu' : 'Slide PowerPoint (.PPT)'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL(slideUrl).catch(() => {})}
          style={styles.openExternalBtn}
          activeOpacity={0.7}
        >
          <ExternalLink size={12} color="#94A3B8" />
          <Text style={styles.openExternalText}>Mở toàn màn hình</Text>
        </TouchableOpacity>
      </View>

      {/* Trình hiển thị Web View */}
      <View style={styles.webContainer}>
        {loadingWeb && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#818CF8" />
            <Text style={styles.loadingText}>Đang tải slide trình chiếu...</Text>
          </View>
        )}
        <WebView
          source={{ uri: finalUrl }}
          style={styles.webView}
          onLoadEnd={() => setLoadingWeb(false)}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          scalesPageToFit
        />
      </View>

      {/* Thanh Điều Khiển Slide Trực Quan */}
      <View style={styles.controlBar}>
        {/* Nút lùi */}
        <TouchableOpacity
          onPress={handlePrevSlide}
          disabled={currentSlideIndex <= 1}
          style={[styles.navBtn, currentSlideIndex <= 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={currentSlideIndex <= 1 ? '#475569' : '#FFFFFF'} />
        </TouchableOpacity>

        {/* Thông tin trang & tiến độ */}
        <View style={styles.infoBox}>
          <Text style={styles.pageText}>
            Trang {currentSlideIndex} / {totalEstimatedSlides} ({currentPercent}%)
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${currentPercent}%` },
                currentPercent >= 60 && styles.progressBarFillPassed,
              ]}
            />
          </View>
        </View>

        {/* Nút tiến */}
        <TouchableOpacity
          onPress={handleNextSlide}
          disabled={currentSlideIndex >= totalEstimatedSlides}
          style={[styles.navBtn, currentSlideIndex >= totalEstimatedSlides && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color={currentSlideIndex >= totalEstimatedSlides ? '#475569' : '#FFFFFF'} />
        </TouchableOpacity>

        {/* Nút Tự động chạy */}
        <TouchableOpacity
          onPress={toggleAutoPlay}
          style={[styles.autoPlayBtn, isPlayingAuto && styles.autoPlayBtnActive]}
          activeOpacity={0.7}
        >
          {isPlayingAuto ? (
            <>
              <Pause size={14} color="#FFFFFF" />
              <Text style={styles.autoPlayText}>Tạm dừng</Text>
            </>
          ) : (
            <>
              <Play size={14} color="#FFFFFF" />
              <Text style={styles.autoPlayText}>Tự chạy</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Thông báo tiến độ mở khóa Quiz */}
      <View style={styles.unlockBanner}>
        {currentPercent >= 60 ? (
          <View style={styles.unlockedRow}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.unlockedText}>Đạt {currentPercent}% - Đã mở khóa đề trắc nghiệm!</Text>
          </View>
        ) : (
          <View style={styles.lockedRow}>
            <Sparkles size={14} color="#F59E0B" />
            <Text style={styles.lockedText}>Lướt hoặc tự chạy slide đạt ≥60% để mở khóa bài thi trắc nghiệm.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0A0E1A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  badgeText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openExternalText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  webContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070B17',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    gap: 8,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: '#0F172A',
    opacity: 0.5,
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pageText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  progressBarFillPassed: {
    backgroundColor: '#10B981',
  },
  autoPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  autoPlayBtnActive: {
    backgroundColor: '#EF4444',
  },
  autoPlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unlockBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0A0E1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unlockedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockedText: {
    color: '#F59E0B',
    fontSize: 11,
  },
});
