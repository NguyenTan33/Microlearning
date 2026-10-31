import React from 'react';
import {
  GraduationCap,
  Play,
  FileCheck2,
  TrendingUp,
  Calculator,
  BookOpen,
  Globe2,
  Atom,
  Landmark,
  Leaf,
  Calendar,
  Check,
  Users,
  Star,
  Zap,
} from 'lucide-react';

export const EducationHeroShowcase: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col justify-between py-2 lg:py-4 select-none">
      {/* 1. Header Brand & Slogan */}
      <div className="space-y-4">
        {/* Brand Logo Row */}
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            {/* Ambient Logo Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-700 animate-pulse-glow" />
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-2xl shadow-indigo-500/30">
              <div className="w-full h-full bg-[#080D1A] rounded-[14px] flex items-center justify-center">
                <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-300" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                EduSync
              </span>
              <span className="text-[11px] font-semibold px-3 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 shadow-sm backdrop-blur-md">
                Nền tảng học tập thông minh
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">
              Học tốt hơn. Vươn xa hơn.
            </p>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="space-y-2.5 pt-1">
          <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight text-white leading-tight">
            Học đa môn thông minh.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Tiến bộ mỗi ngày.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
            Những bài học ngắn gọn, dễ hiểu, cùng bài kiểm tra tương tác và theo dõi tiến độ học tập. EduSync đồng hành cùng học sinh trên mọi môn học, từ Toán, Ngữ văn, Tiếng Anh đến Khoa học, Lịch sử và nhiều lĩnh vực kiến thức khác.
          </p>
        </div>
      </div>

      {/* 2. Visual Education Showcase: 3 Feature Cards (Left) & Tablet Mockup + Books (Right) */}
      <div className="relative my-6">
        {/* Handwritten callout pointing to the tablet */}
        <div className="hidden xl:flex items-center gap-2 absolute -top-8 right-32 z-20 opacity-85">
          <span className="font-handwriting text-lg text-cyan-300 -rotate-3 drop-shadow">
            Mỗi môn học mở ra một thế giới mới ✨
          </span>
          <svg className="w-8 h-6 text-cyan-400 -rotate-12" viewBox="0 0 40 30" fill="none">
            <path
              d="M 5 5 C 20 8, 30 18, 32 28"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
            <path d="M 28 26 L 33 29 L 34 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
          {/* Left Column: 3 Feature Cards */}
          <div className="xl:col-span-5 space-y-3">
            {/* Feature 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all duration-300 backdrop-blur-xl shadow-lg group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Play className="w-4 h-4 fill-purple-400/30 text-purple-400 ml-0.5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Bài Học Ngắn, Dễ Hiểu
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Video bài giảng sinh động, tóm tắt kiến thức trọng tâm, giúp bạn nắm vững bài học chỉ trong vài phút mỗi ngày.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-xl shadow-lg group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Kiểm Tra Tương Tác
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Bài tập và quiz đa dạng, chấm điểm tức thì, giúp bạn ôn luyện hiệu quả và ghi nhớ kiến thức lâu hơn.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-violet-500/40 transition-all duration-300 backdrop-blur-xl shadow-lg group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    Lộ Trình Học Đa Môn &amp; Theo Dõi Tiến Độ
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Cá nhân hóa lộ trình học tập cho từng học sinh, theo dõi tiến độ chi tiết, giúp bạn tiến bộ mỗi ngày.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Education Tablet Mockup & Textbooks */}
          <div className="xl:col-span-7 relative flex flex-col items-center">
            {/* Tablet Mockup Shell */}
            <div className="w-full max-w-[430px] rounded-[24px] p-2.5 sm:p-3 bg-gradient-to-b from-slate-700/60 via-slate-800/40 to-slate-950/90 border border-slate-600/50 shadow-2xl backdrop-blur-2xl relative z-10">
              {/* Tablet Screen */}
              <div className="w-full rounded-[18px] bg-[#0A0F1D] p-3 border border-white/10 space-y-3">
                {/* Tablet Topbar */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Bài học hôm nay
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400/90 font-semibold hover:underline cursor-pointer">
                    Xem tất cả →
                  </span>
                </div>

                {/* Sub-grid inside tablet: Lesson Card & Progress Card */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
                  {/* Lesson Card */}
                  <div className="sm:col-span-7 rounded-xl bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-cyan-950/70 border border-white/15 p-3 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Toán học
                      </div>
                      <h5 className="text-xs font-bold text-white">
                        Phương trình bậc hai
                      </h5>
                      <p className="font-mono text-[11px] text-cyan-300 italic font-semibold mt-1">
                        ax² + bx + c = 0
                      </p>
                    </div>

                    {/* Bottom Play Action & Background Curve */}
                    <div className="flex items-center justify-between pt-2 relative z-10">
                      <span className="text-[10px] text-slate-400">10 phút</span>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 p-[1px] shadow-md shadow-cyan-500/20">
                        <div className="w-full h-full bg-[#080E1C] hover:bg-indigo-600 rounded-full flex items-center justify-center transition-colors cursor-pointer">
                          <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Decorative hills & wave SVG behind */}
                    <svg className="absolute -bottom-1 -right-2 w-32 h-20 opacity-20 pointer-events-none" viewBox="0 0 120 80" fill="none">
                      <path d="M 0 60 Q 40 20 80 50 T 120 40 L 120 80 L 0 80 Z" fill="currentColor" className="text-cyan-400" />
                    </svg>
                  </div>

                  {/* Progress Panel */}
                  <div className="sm:col-span-5 rounded-xl bg-slate-900/80 border border-white/10 p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Tiến độ học tập
                      </div>

                      {/* Circular Progress & Text */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-slate-800"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray="94.2"
                              strokeDashoffset="20.7"
                              strokeLinecap="round"
                              className="text-cyan-400"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-bold text-white">
                            78%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium leading-tight">
                          Hoàn thành <br />
                          <span className="text-cyan-300 font-bold">12/15 bài</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Checklist */}
                    <div className="space-y-1 text-[9px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                        <span className="truncate">Toán, Văn, Anh</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                        <span className="truncate">Vật lý, Lịch sử</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <div className="w-3 h-3 rounded-full border border-slate-600 flex items-center justify-center" />
                        <span className="truncate">Sinh học</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3x2 Subject Icons Grid */}
                <div className="pt-1">
                  <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                    Các môn học nổi bật
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* 1. Toán học */}
                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:border-purple-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Calculator className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Toán học</span>
                    </div>

                    {/* 2. Ngữ văn */}
                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 hover:border-amber-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Ngữ văn</span>
                    </div>

                    {/* 3. Tiếng Anh */}
                    <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Globe2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Tiếng Anh</span>
                    </div>

                    {/* 4. Vật lý */}
                    <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 hover:border-blue-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Atom className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Vật lý</span>
                    </div>

                    {/* 5. Lịch sử */}
                    <div className="p-2 rounded-xl bg-yellow-950/40 border border-yellow-500/30 hover:border-yellow-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Landmark className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Lịch sử</span>
                    </div>

                    {/* 6. Sinh học */}
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex flex-col items-center text-center cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Leaf className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200">Sinh học</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Realistic Study Desk Still-life under the Tablet */}
            <div className="w-full max-w-[430px] flex items-end justify-between -mt-3 relative z-20 px-2 pointer-events-none">
              {/* Left: Pen Holder Cup */}
              <div className="flex flex-col items-center -mb-2">
                {/* Pencil tips */}
                <div className="flex gap-1 -mb-1 z-10">
                  <div className="w-1.5 h-6 bg-yellow-500 rounded-t-sm -rotate-6 transform" />
                  <div className="w-1.5 h-8 bg-cyan-400 rounded-t-sm" />
                  <div className="w-1.5 h-7 bg-red-400 rounded-t-sm rotate-6 transform" />
                </div>
                {/* Mug / Pen Cup */}
                <div className="w-14 h-12 rounded-b-xl rounded-t-sm bg-gradient-to-b from-slate-700 to-slate-900 border border-white/20 shadow-lg flex flex-col items-center justify-center text-[7px] text-slate-300 font-semibold text-center leading-tight px-1">
                  <span>Small Steps</span>
                  <span className="text-cyan-300 font-bold">Big Future</span>
                </div>
              </div>

              {/* Center: Textbook Stack */}
              <div className="flex flex-col items-center space-y-[2px] w-48 shadow-2xl">
                {/* Top Book: TOÁN HỌC */}
                <div className="w-44 h-5 rounded-sm bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 border-t border-l border-white/30 shadow-md flex items-center justify-between px-3 text-[9px] font-extrabold text-white tracking-wider">
                  <span>TOÁN HỌC</span>
                  <span className="text-[7px] text-blue-200 font-mono">LỚP 10-12</span>
                </div>
                {/* Middle Book: NGỮ VĂN */}
                <div className="w-46 h-5 rounded-sm bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 border-t border-l border-white/30 shadow-md flex items-center justify-between px-3 text-[9px] font-extrabold text-white tracking-wider">
                  <span>NGỮ VĂN</span>
                  <span className="text-[7px] text-pink-200 font-mono">TẬP 1 &amp; 2</span>
                </div>
                {/* Bottom Book: TIẾNG ANH */}
                <div className="w-48 h-6 rounded-sm bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 border-t border-l border-white/30 shadow-lg flex items-center justify-between px-3 text-[9px] font-extrabold text-white tracking-wider">
                  <span>TIẾNG ANH</span>
                  <span className="text-[7px] text-indigo-300 font-mono">GLOBAL</span>
                </div>
              </div>

              {/* Right: Pastel Sticky Note */}
              <div className="w-32 p-2.5 rounded-lg bg-gradient-to-br from-cyan-950 via-slate-900 to-cyan-900 border border-cyan-400/40 shadow-xl rotate-3 transform relative -mb-1 pointer-events-auto hover:rotate-0 transition-transform">
                {/* Pin dot */}
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm mx-auto mb-1 opacity-80" />
                <p className="font-handwriting text-xs text-cyan-200 leading-snug text-center">
                  Học hôm nay <br />
                  để tạo nên <br />
                  <span className="text-white font-bold">phiên bản tốt hơn</span> <br />
                  của chính mình ! :)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Trust & Stats Summary Bar */}
      <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-3 max-w-2xl">
        {/* Stat 1 */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight">500K+</div>
            <div className="text-[10px] text-slate-400">Học sinh tin tưởng</div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight">4.9 / 5</div>
            <div className="text-[10px] text-slate-400">Đánh giá từ học sinh</div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-tight">Học mọi lúc</div>
            <div className="text-[10px] text-slate-400">Trên mọi thiết bị</div>
          </div>
        </div>
      </div>
    </div>
  );
};
