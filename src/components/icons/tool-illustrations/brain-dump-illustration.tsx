
import type { SVGProps } from 'react';

export function BrainDumpIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 400"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <defs>
        <linearGradient id="gradBD1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.1 }} />
        </linearGradient>
        <filter id="glowBD" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradBD1)" rx="10"/>

      {/* Stylized Brain/Cloud */}
      <path d="M150 100 Q100 150 150 200 Q100 250 150 300 Q200 350 250 300 Q300 350 350 300 Q400 250 350 200 Q400 150 350 100 Q300 50 250 100 Q200 50 150 100 Z"
            fill="hsl(207 88% 68% / 0.4)" stroke="hsl(207 88% 68%)" strokeWidth="3" filter="url(#glowBD)"/>
      
      {/* Thoughts flowing out */}
      <circle cx="300" cy="150" r="15" fill="hsl(125 33% 75%)" opacity="0.8">
        <animateTransform attributeName="transform" type="translate" values="0 0; 150 50; 0 0" dur="5s" repeatCount="indefinite" />
        <animate attributeName="r" values="15;5;15" dur="5s" repeatCount="indefinite" />
      </circle>
      <ellipse cx="280" cy="250" rx="20" ry="12" fill="hsl(125 33% 75%)" opacity="0.7">
        <animateTransform attributeName="transform" type="translate" values="0 0; 180 -30; 0 0" dur="4.5s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="rx" values="20;8;20" dur="4.5s" begin="0.5s" repeatCount="indefinite" />
      </ellipse>
      <rect x="320" y="200" width="25" height="25" rx="5" fill="hsl(125 33% 75%)" opacity="0.75">
        <animateTransform attributeName="transform" type="translate" values="0 0; 120 20; 0 0" dur="5.5s" begin="0.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.75;0.3;0.75" dur="5.5s" begin="0.2s" repeatCount="indefinite" />
      </rect>
       <path d="M350 120 Q370 100 390 120 T430 120" stroke="hsl(125 33% 75%)" strokeWidth="4" fill="none" opacity="0.6">
        <animateTransform attributeName="transform" type="translate" values="0 0; 100 80; 0 0" dur="6s" begin="0.8s" repeatCount="indefinite" />
      </path>

      {/* Receiving area / organization metaphor (e.g. a notebook or structured lines) */}
      <rect x="450" y="80" width="100" height="240" fill="hsl(210 20% 20% / 0.05)" rx="5" />
      <line x1="460" y1="100" x2="540" y2="100" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="130" x2="540" y2="130" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="160" x2="540" y2="160" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="190" x2="540" y2="190" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="220" x2="540" y2="220" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="250" x2="540" y2="250" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />
      <line x1="460" y1="280" x2="540" y2="280" stroke="hsl(210 20% 20% / 0.3)" strokeWidth="2" />

      <text x="300" y="360" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Décharge de Pensées</text>
    </svg>
  );
}
