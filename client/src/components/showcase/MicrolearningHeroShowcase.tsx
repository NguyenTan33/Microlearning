import React from 'react';
import { Video, Zap, BrainCircuit, Target, CheckCircle2 } from 'lucide-react';

export const MicrolearningHeroShowcase: React.FC = () => {
  return (
    <div className="hidden lg:flex flex-col justify-between py-6 px-4 lg:pr-10 h-full relative z-10 select-none">
      {/* Top Brand Logo & Platform Title */}
      <div className="space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {/* Ambient Logo Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse-glow" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-[1.5px] shadow-2xl shadow-indigo-500/30">
              <div className="w-full h-full bg-[#080C16] rounded-[14px] flex items-center justify-center">
                <Video className="w-7 h-7 text-indigo-400" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                MicroLearn
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                Nền tảng học vi mô
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Bite-sized Video Learning Platform
            </p>
          </div>
        </div>

        {/* Slogan Section */}
        <div className="space-y-3 pt-2">
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Kiến thức cô đọng.{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
              Bứt phá tương lai.
            </span>
          </h1>
          <p className="text-sm xl:text-base text-slate-300 leading-relaxed max-w-lg font-normal">
            Phương pháp học tập vi mô qua các video bài giảng ngắn gọn, tương tác thông minh, giúp bạn tiếp thu kiến thức sâu sắc chỉ với 5 phút mỗi ngày.
          </p>
        </div>
      </div>

      {/* Feature Highlights Grid (Giới thiệu nền tảng) */}
      <div className="grid grid-cols-1 gap-3.5 my-8 max-w-xl">
        {/* Item 1 */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Video Bài Giảng 2 – 5 Phút</h4>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Mỗi video tập trung vào một khái niệm hoặc kỹ năng cụ thể, loại bỏ nội dung dàn trải, tối đa hóa khả năng tập trung.
            </p>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl hover:border-purple-500/30 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Tương Tác Tức Thì Trong Video</h4>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Video tự động dừng tại các điểm mấu chốt để kiểm tra kiến thức nhanh, giúp khắc sâu thông tin vào trí nhớ dài hạn.
            </p>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl hover:border-cyan-500/30 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Lộ Trình Học & Theo Dõi Tiến Độ</h4>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Hệ thống streak hàng ngày, mở khóa huy hiệu và tích lũy điểm kinh nghiệm để xây dựng thói quen học tập bền bỉ.
            </p>
          </div>
        </div>
      </div>

      {/* Trust / Stats Summary Bar */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between max-w-xl text-slate-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">Học mọi lúc, mọi thiết bị</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <div>
            <span className="font-bold text-white text-sm">5 Phút</span> / bài
          </div>
          <div>
            <span className="font-bold text-white text-sm">100%</span> trọng tâm
          </div>
        </div>
      </div>
    </div>
  );
};
