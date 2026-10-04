import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, Loader2, Sparkles, Mic2 } from 'lucide-react';
import { ttsApi } from '../../services/ttsApi';

interface AudioTtsPlayerProps {
  lessonTitle: string;
  lessonDescription?: string;
  isOnline: boolean;
}

export const AudioTtsPlayer: React.FC<AudioTtsPlayerProps> = ({
  lessonTitle,
  lessonDescription,
  isOnline,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<string>('vi-VN-HoaiMyNeural');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const textToRead = lessonDescription
    ? `${lessonTitle}. Tóm tắt nội dung bài học: ${lessonDescription}`
    : `Bài học: ${lessonTitle}. Chúc bạn có một buổi học tập hiệu quả.`;

  const handleSynthesize = async () => {
    if (!isOnline) {
      setErrorMessage('Tính năng tạo giọng đọc AI yêu cầu kết nối mạng trực tuyến.');
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const response = await ttsApi.synthesizeSpeech(textToRead, selectedVoice);
      setAudioUrl(response.audioUrl);
      setIsPlaying(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể tạo âm thanh AI.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#090D1A] border border-white/10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Mic2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Trợ lý Giọng đọc AI</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h4>
            <p className="text-[11px] text-slate-400">
              Nghe tóm tắt nội dung bài học với giọng đọc tự nhiên
            </p>
          </div>
        </div>

        {/* Cụm chọn giọng & Nút phát */}
        <div className="flex items-center gap-2">
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            disabled={isSynthesizing}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="vi-VN-HoaiMyNeural">Hoài My (Nữ)</option>
            <option value="vi-VN-NamMinhNeural">Nam Minh (Nam)</option>
          </select>

          {!audioUrl ? (
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !isOnline}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tổng hợp...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe tóm tắt</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={togglePlayAudio}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Phát âm thanh</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {errorMessage && (
        <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
