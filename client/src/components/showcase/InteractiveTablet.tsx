import React, { useState } from 'react';
import {
  Calendar,
  Play,
  CheckCircle2,
  Circle,
  X,
  Volume2,
  Maximize2,
} from 'lucide-react';

interface SubjectInfo {
  id: string;
  name: string;
  symbol: string;
  badgeColor: string;
  borderHover: string;
  lessonTitle: string;
  formula: string;
  lessonDesc: string;
  duration: string;
}

const subjects: SubjectInfo[] = [
  {
    id: 'toan',
    name: 'Toán học',
    symbol: 'π',
    badgeColor: 'from-[#8E1B1D] to-[#580B0C]',
    borderHover: 'hover:border-red-500',
    lessonTitle: 'Phương trình bậc hai',
    formula: 'ax² + bx + c = 0',
    lessonDesc: 'Phương pháp giải & định lý Viète ứng dụng thực chiến.',
    duration: '04:20',
  },
  {
    id: 'van',
    name: 'Ngữ văn',
    symbol: '✒',
    badgeColor: 'from-[#7A4B1A] to-[#432608]',
    borderHover: 'hover:border-amber-500',
    lessonTitle: 'Nghệ thuật Tuyên ngôn Độc lập',
    formula: 'Phong cách lập luận sắc bén',
    lessonDesc: 'Phân tích văn phong chính luận và tư tưởng độc lập dân tộc.',
    duration: '05:15',
  },
  {
    id: 'anh',
    name: 'Tiếng Anh',
    symbol: '🌐',
    badgeColor: 'from-[#1B4B8E] to-[#0A264F]',
    borderHover: 'hover:border-blue-500',
    lessonTitle: 'Relative Clauses in Action',
    formula: 'Who / Which / That / Whose',
    lessonDesc: 'Mệnh đề quan hệ trong bài thi chứng chỉ và giao tiếp chuẩn.',
    duration: '03:45',
  },
  {
    id: 'ly',
    name: 'Vật lý',
    symbol: '⚛',
    badgeColor: 'from-[#5C2386] to-[#300E4A]',
    borderHover: 'hover:border-purple-500',
    lessonTitle: 'Dao động điều hòa',
    formula: 'x = A cos(ωt + φ)',
    lessonDesc: 'Khảo sát chu kỳ, tần số và pha dao động con lắc lò xo.',
    duration: '04:50',
  },
  {
    id: 'su',
    name: 'Lịch sử',
    symbol: '🏛',
    badgeColor: 'from-[#6E4F18] to-[#3C2A0B]',
    borderHover: 'hover:border-yellow-600',
    lessonTitle: 'Chiến dịch Điện Biên Phủ',
    formula: 'Lừng lẫy năm châu, chấn động địa cầu',
    lessonDesc: 'Nghệ thuật quân sự và tinh thần quyết chiến quyết thắng 1954.',
    duration: '06:10',
  },
  {
    id: 'sinh',
    name: 'Sinh học',
    symbol: '🌱',
    badgeColor: 'from-[#22632B] to-[#0F3514]',
    borderHover: 'hover:border-emerald-500',
    lessonTitle: 'Cơ chế di truyền phân tử',
    formula: 'DNA → mRNA → Protein',
    lessonDesc: 'Quá trình phiên mã và dịch mã tổng hợp chuỗi polypeptide.',
    duration: '04:30',
  },
];

export const InteractiveTablet: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo>(subjects[0]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    toan: true,
    van: true,
    anh: true,
    ly: false,
    su: false,
    sinh: false,
  });
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / subjects.length) * 100);

  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none">
      {/* 1. Sleek Tablet Bezel & Metallic Chassis */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-[#2A2B2E] via-[#161719] to-[#0D0E10] p-2.5 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_20px_rgba(212,175,55,0.15)] border border-[#C5A059]/40 backdrop-blur-xl">
        {/* Front Camera Dot */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#050505] border border-stone-700/60" />

        {/* Tablet Display Screen */}
        <div className="relative rounded-[20px] bg-[#0E1513]/95 border border-[#C5A059]/30 p-3 sm:p-4 overflow-hidden text-slate-100 shadow-inner">
          {/* Ambient Screen Glare sweep */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-white/8 via-white/2 to-transparent pointer-events-none rounded-tr-[20px]" />

          {/* Top Bar: "Bài học hôm nay" & Dynamic Date */}
          <div className="flex items-center justify-between border-b border-[#C5A059]/25 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E6C687]" />
              <span className="text-xs sm:text-sm font-bold text-[#FFF3C4] font-serif">
                Bài học hôm nay
              </span>
            </div>
            <span className="text-[11px] font-medium text-stone-300">
              Thứ Hai, 26/05/2025
            </span>
          </div>

          {/* Center Main Split: Hero Lesson Card & Progress Ring */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch mb-3">
            {/* Left: Featured Subject Lesson */}
            <div className="sm:col-span-7 relative rounded-xl bg-gradient-to-br from-black/70 to-[#121A15]/90 border border-[#C5A059]/40 p-3 flex flex-col justify-between overflow-hidden shadow-md group">
              {/* Background watermark/thumbnail */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('/assets/microlearning-reference.jpg')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="relative z-10 space-y-1">
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#8E1B1D]/80 border border-[#C5A059]/60 text-amber-200">
                  ★ {selectedSubject.name}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {selectedSubject.lessonTitle}
                </h4>
                <div className="inline-block text-xs sm:text-sm font-serif font-bold text-amber-200 italic tracking-wider py-0.5">
                  {selectedSubject.formula}
                </div>
              </div>

              {/* Pulsing Red Play Button */}
              <div className="relative z-10 flex items-center justify-between pt-2">
                <span className="text-[10px] text-stone-300">
                  Thời lượng: {selectedSubject.duration}
                </span>

                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#941B1D] to-[#D92323] border border-amber-300/80 flex items-center justify-center text-white shadow-[0_0_12px_rgba(217,35,35,0.7)] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title="Phát bài giảng mẫu"
                >
                  <div className="absolute -inset-1 rounded-full border border-red-500 animate-radar-ping pointer-events-none" />
                  <div className="absolute -inset-2 rounded-full border border-red-500 animate-radar-ping-delayed pointer-events-none" />
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </button>
              </div>
            </div>

            {/* Right: Circular Progress Ring & Checklist */}
            <div className="sm:col-span-5 rounded-xl bg-black/60 border border-[#C5A059]/30 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#E6C687] font-serif">
                  Tiến độ học tập
                </span>
                <span className="text-[10px] text-stone-400">
                  {completedCount}/{subjects.length} bài
                </span>
              </div>

              {/* Circular Ring Gauge */}
              <div className="flex items-center gap-2.5 my-1.5">
                <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#1e2923"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="url(#progressGold)"
                      strokeWidth="3.5"
                      strokeDasharray="94.2"
                      strokeDashoffset={94.2 - (94.2 * progressPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                    <defs>
                      <linearGradient id="progressGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFDD55" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-[11px] font-bold text-white">
                    {progressPercent}%
                  </span>
                </div>

                <div className="text-[10px] text-stone-300 leading-tight">
                  <span className="font-semibold text-emerald-400">Hoàn thành</span>
                  <br />
                  tiến độ mục tiêu
                </div>
              </div>

              {/* Checklist for subjects */}
              <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                {subjects.slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => toggleCheck(sub.id)}
                    className="flex items-center justify-between text-[10px] text-stone-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <span>{sub.name}</span>
                    {checkedItems[sub.id] ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-stone-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Grid: 6 Subjects Tiles */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
            {subjects.map((sub) => {
              const isActive = selectedSubject.id === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`relative p-2 rounded-xl bg-gradient-to-b ${sub.badgeColor} border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    isActive
                      ? 'border-amber-300 ring-2 ring-amber-400/40 shadow-md scale-105'
                      : 'border-white/15 hover:border-[#C5A059]/60 hover:scale-[1.02]'
                  }`}
                >
                  <span className="text-sm">{sub.symbol}</span>
                  <span className="text-[10px] font-bold text-[#FFF3C4] truncate w-full">
                    {sub.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Realistic Desk Sticky Note pinned next to tablet */}
      <div className="hidden sm:block absolute -top-4 -right-6 z-20 rotate-3 transform hover:rotate-0 transition-transform duration-300">
        <div className="relative bg-[#FFFBEA] text-stone-800 p-2.5 rounded-lg shadow-lg border border-amber-200/80 max-w-[150px]">
          {/* Red Paperclip */}
          <div className="absolute -top-2.5 left-4 w-3.5 h-6 rounded-full border-2 border-red-600 bg-transparent" />
          <p className="font-cursive text-xs font-bold text-[#8E1B1D] leading-tight">
            Mỗi bài học nhỏ là một bước tiến lớn hơn! ❤️
          </p>
        </div>
      </div>

      {/* Video Preview Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0F1612] border border-[#C5A059] p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#C5A059]/30 pb-2">
              <h3 className="font-serif font-bold text-white text-base flex items-center gap-2">
                <span>★ {selectedSubject.name}:</span>
                <span className="text-amber-300">{selectedSubject.lessonTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Mockup */}
            <div className="relative aspect-video rounded-xl bg-black border border-stone-800 flex flex-col items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{ backgroundImage: `url('/assets/microlearning-reference.jpg')` }}
              />
              <div className="relative z-10 text-center space-y-2 p-4">
                <div className="w-12 h-12 rounded-full bg-red-600/90 border border-amber-300 mx-auto flex items-center justify-center shadow-lg shadow-red-900/60 animate-pulse">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <p className="text-sm font-semibold text-white">
                  Đang phát bài giảng cô đọng 5 phút
                </p>
                <p className="text-xs text-amber-200/90 italic font-serif">
                  {selectedSubject.formula}
                </p>
              </div>

              {/* Mock video controls bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <Volume2 className="w-3.5 h-3.5 text-stone-300" />
                  <span className="text-[10px] text-stone-300">01:15 / {selectedSubject.duration}</span>
                </div>
                <Maximize2 className="w-3.5 h-3.5 text-stone-300" />
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {selectedSubject.lessonDesc}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
