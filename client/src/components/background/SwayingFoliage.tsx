import React from 'react';

export const SwayingFoliage: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 pointer-events-none z-30 overflow-visible">
      {/* Primary Top-Left Branch with Leaves */}
      <div className="relative animate-branch-sway origin-top-left">
        <svg
          width="420"
          height="320"
          viewBox="0 0 420 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
        >
          {/* Main Woody Branch */}
          <path
            d="M-20 -10 C40 30, 110 50, 190 60 C260 70, 310 95, 360 140"
            stroke="#2e2115"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M-20 -10 C40 30, 110 50, 190 60 C260 70, 310 95, 360 140"
            stroke="#4a3522"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Sub-branch 1 */}
          <path
            d="M130 52 C160 90, 180 140, 205 190"
            stroke="#3a2a1b"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Sub-branch 2 */}
          <path
            d="M230 65 C270 100, 300 130, 320 175"
            stroke="#3a2a1b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Cluster of fluttering leaves (Group 1) */}
          <g className="animate-leaf-flutter" style={{ transformOrigin: '80px 40px' }}>
            {/* Leaf 1 */}
            <path
              d="M60 30 C50 15, 75 -5, 100 10 C105 25, 80 40, 60 30 Z"
              fill="url(#leafGrad1)"
            />
            {/* Leaf 2 */}
            <path
              d="M95 20 C110 5, 140 15, 135 40 C115 50, 95 35, 95 20 Z"
              fill="url(#leafGrad2)"
            />
            {/* Leaf 3 */}
            <path
              d="M75 42 C70 65, 95 80, 115 65 C120 45, 95 35, 75 42 Z"
              fill="url(#leafGrad3)"
            />
          </g>

          {/* Cluster of fluttering leaves (Group 2) */}
          <g className="animate-leaf-flutter" style={{ animationDelay: '-1.2s', transformOrigin: '170px 60px' }}>
            <path
              d="M150 50 C140 30, 175 20, 195 45 C190 70, 165 70, 150 50 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M185 55 C210 40, 240 60, 230 85 C205 95, 185 75, 185 55 Z"
              fill="url(#leafGrad2)"
            />
            <path
              d="M165 75 C160 105, 195 125, 215 100 C215 75, 185 65, 165 75 Z"
              fill="url(#leafGrad3)"
            />
          </g>

          {/* Cluster of fluttering leaves (Group 3 - Branch Tip) */}
          <g className="animate-leaf-flutter" style={{ animationDelay: '-2.4s', transformOrigin: '280px 100px' }}>
            <path
              d="M260 85 C260 60, 300 65, 310 95 C295 115, 265 110, 260 85 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M295 100 C325 85, 355 110, 345 140 C320 150, 295 125, 295 100 Z"
              fill="url(#leafGrad2)"
            />
            <path
              d="M330 130 C360 120, 385 145, 370 175 C340 180, 320 155, 330 130 Z"
              fill="url(#leafGrad1)"
            />
            <path
              d="M280 120 C270 150, 305 175, 325 150 C330 125, 300 115, 280 120 Z"
              fill="url(#leafGrad3)"
            />
          </g>

          {/* Sub-branch Leaves */}
          <g className="animate-leaf-flutter" style={{ animationDelay: '-0.7s', transformOrigin: '190px 160px' }}>
            <path
              d="M180 140 C165 165, 185 195, 210 185 C220 160, 195 140, 180 140 Z"
              fill="url(#leafGrad2)"
            />
            <path
              d="M195 180 C185 210, 215 235, 235 210 C240 185, 210 175, 195 180 Z"
              fill="url(#leafGrad1)"
            />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4d7c0f" />
              <stop offset="50%" stopColor="#365314" />
              <stop offset="100%" stopColor="#1a2e05" />
            </linearGradient>
            <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84cc16" />
              <stop offset="40%" stopColor="#4d7c0f" />
              <stop offset="100%" stopColor="#142602" />
            </linearGradient>
            <linearGradient id="leafGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#65a30d" />
              <stop offset="60%" stopColor="#2e4a0d" />
              <stop offset="100%" stopColor="#0f1d03" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Secondary Foreground Twig with delicate leaves */}
      <div className="absolute top-2 -left-6 animate-branch-sway-strong origin-top-left opacity-90">
        <svg width="240" height="260" viewBox="0 0 240 260" fill="none">
          <path
            d="M-10 10 C30 50, 70 90, 110 140"
            stroke="#23170e"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <g className="animate-leaf-flutter" style={{ animationDelay: '-1.8s', transformOrigin: '70px 80px' }}>
            <path
              d="M50 65 C40 85, 65 105, 85 95 C90 75, 70 60, 50 65 Z"
              fill="#527918"
            />
            <path
              d="M75 90 C70 115, 95 135, 115 115 C120 90, 95 80, 75 90 Z"
              fill="#6ea322"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
