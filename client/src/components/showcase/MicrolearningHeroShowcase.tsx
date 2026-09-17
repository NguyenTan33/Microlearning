import React from 'react';
import { Play, ClipboardCheck, BarChart3, Users, Star, BookOpen } from 'lucide-react';

export const MicrolearningHeroShowcase: React.FC = () => {
  return (
    <div className="flex flex-col justify-between py-2 sm:py-4 lg:pr-6 h-full relative z-10 select-none">
      {/* 1. Header: Logo, Emblem & Slogan */}
      <div className="space-y-4">
        <div className="flex items-center gap-3.5">
          {/* Vietnamese Academy / Military Shield Emblem */}
          <div className="relative group cursor-pointer">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#8E1B1D] via-[#681416] to-[#400B0D] p-[1.5px] shadow-[0_4px_16px_rgba(185,28,28,0.45)] border border-[#C5A059]/80 flex items-center justify-center relative overflow-hidden">
              {/* Inner Crest SVG */}
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shield background */}
                <path
                  d="M20 3L34 8V18C34 26.5 28 34 20 37C12 34 6 26.5 6 18V8L20 3Z"
                  fill="url(#crestRed)"
                  stroke="#E6C687"
                  strokeWidth="1.5"
                />
                {/* Gold Star */}
                <path
                  d="M20 9L22.2 14.5L28 14.8L23.5 18.5L25.2 24.2L20 20.8L14.8 24.2L16.5 18.5L12 14.8L17.8 14.5L20 9Z"
                  fill="#FFDD55"
                  stroke="#C5A059"
                  strokeWidth="0.5"
                />
                {/* Open Book */}
                <path
                  d="M13 26C16.5 24.5 19 25.5 20 26.5C21 25.5 23.5 24.5 27 26V30C23.5 28.5 21 29.5 20 30.5C19 29.5 16.5 28.5 13 30V26Z"
                  fill="#FFF8E7"
                  stroke="#C5A059"
                  strokeWidth="0.8"
                />
                <defs>
                  <linearGradient id="crestRed" x1="6" y1="3" x2="34" y2="37">
                    <stop offset="0%" stopColor="#C02626" />
                    <stop offset="100%" stopColor="#660E0E" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl font-extrabold tracking-tight font-serif text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                MicroLearn
              </span>
              <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-[#8E1B1D]/90 border border-[#C5A059]/70 text-[#FFF3C4] shadow-md shadow-red-950/40">
                Nền tảng học tập đa môn
              </span>
            </div>
            <p className="text-xs text-[#E6C687] font-medium tracking-wide italic font-serif">
              Học tốt hơn. Vươn xa hơn.
            </p>
          </div>
        </div>

        {/* 2. Main Title */}
        <div className="space-y-1 pt-2">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight font-serif leading-[1.18] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]">
            Học tập kỷ luật.
            <br />
            <span className="text-gold-gradient font-serif">
              Rèn chí vươn cao.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-200/90 leading-relaxed max-w-xl font-normal pt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            MicroLearn giúp bạn học đa môn qua các video bài giảng ngắn gọn, kiểm tra tương tác và theo dõi tiến độ học tập. Kiến thức hôm nay, bản lĩnh ngày mai.
          </p>
        </div>
      </div>

      {/* 3. Three Golden Military Feature Cards */}
      <div className="grid grid-cols-1 gap-3 my-5 max-w-xl">
        {/* Feature 1 */}
        <div className="group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/75 border border-[#C5A059]/40 hover:border-[#E6C687] backdrop-blur-md transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
          {/* Red/Gold Hexagon Badge Icon */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#A81F22] to-[#580B0C] border border-[#E6C687]/70 flex items-center justify-center text-amber-200 shadow-md shadow-red-950/60 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
            <Play className="w-5 h-5 fill-amber-200 ml-0.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FFF3C4] group-hover:text-white transition-colors tracking-wide">
              Bài học ngắn, trọng tâm
            </h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              Video bài giảng sinh động, tóm tắt kiến thức trọng tâm, giúp bạn nắm vững bài học chỉ trong vài phút mỗi ngày.
            </p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/75 border border-[#C5A059]/40 hover:border-[#E6C687] backdrop-blur-md transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
          {/* Bronze/Gold Badge Icon */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D3016] to-[#1A1408] border border-[#C5A059]/70 flex items-center justify-center text-[#E6C687] shadow-md shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
            <ClipboardCheck className="w-5 h-5 text-[#E6C687]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FFF3C4] group-hover:text-white transition-colors tracking-wide">
              Kiểm tra tương tác
            </h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              Bài tập và quiz đa dạng, chấm điểm tức thì, giúp bạn ôn luyện hiệu quả và ghi nhớ kiến thức lâu hơn.
            </p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-black/60 hover:bg-black/75 border border-[#C5A059]/40 hover:border-[#E6C687] backdrop-blur-md transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
          {/* Bronze/Gold Badge Icon */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D3016] to-[#1A1408] border border-[#C5A059]/70 flex items-center justify-center text-[#E6C687] shadow-md shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5 text-[#E6C687]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#FFF3C4] group-hover:text-white transition-colors tracking-wide">
              Lộ trình học đa môn
            </h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              Cá nhân hoá lộ trình học tập cho từng học sinh, theo dõi tiến độ chi tiết, giúp bạn tiến bộ mỗi ngày.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Trust & Stats Bar */}
      <div className="p-3.5 rounded-2xl bg-black/60 border border-[#C5A059]/40 backdrop-blur-md grid grid-cols-3 gap-2 max-w-xl text-center shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
        {/* Stat 1 */}
        <div className="flex flex-col items-center justify-center border-r border-[#C5A059]/20 pr-2">
          <div className="flex items-center gap-1.5 text-[#FFF3C4]">
            <Users className="w-4 h-4 text-[#E6C687]" />
            <span className="font-bold text-sm sm:text-base font-serif">500K+</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-stone-300 font-medium mt-0.5">
            Học viên tin tưởng
          </span>
        </div>

        {/* Stat 2 */}
        <div className="flex flex-col items-center justify-center border-r border-[#C5A059]/20 px-2">
          <div className="flex items-center gap-1.5 text-[#FFF3C4]">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-bold text-sm sm:text-base font-serif">4.9/5</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-stone-300 font-medium mt-0.5">
            Đánh giá từ học sinh
          </span>
        </div>

        {/* Stat 3 */}
        <div className="flex flex-col items-center justify-center pl-2">
          <div className="flex items-center gap-1.5 text-[#FFF3C4]">
            <BookOpen className="w-4 h-4 text-[#E6C687]" />
            <span className="font-bold text-sm sm:text-base font-serif">6+</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-stone-300 font-medium mt-0.5">
            Môn học chính
          </span>
        </div>
      </div>

      {/* 5. Cursive Gold Quote & Desk Calligraphy */}
      <div className="pt-4 flex items-center justify-between max-w-xl">
        <p className="text-xl sm:text-2xl font-cursive text-[#FFF3C4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wide">
          Tri thức hôm nay, kiến tạo ngày mai!
        </p>
      </div>
    </div>
  );
};
