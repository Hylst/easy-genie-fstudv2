
import type { SVGProps } from 'react';

export function TimeFocusIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradTF1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.15 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.1 }} />
        </linearGradient>
         <filter id="glowTF" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradTF1)" rx="10" />

      {/* Hourglass Structure */}
      <path d="M200 80 H400 L320 200 L400 320 H200 L280 200 L200 80 Z" 
            fill="hsl(207 88% 68% / 0.3)" 
            stroke="hsl(207 88% 68%)" 
            strokeWidth="8"
            filter="url(#glowTF)" />
      
      {/* Top Sand */}
      <path d="M220 90 H380 L300 190 L220 90 Z" 
            fill="hsl(125 33% 75%)" 
            opacity="0.7" />
            
      {/* Bottom Sand */}
      <path d="M220 310 H380 L300 210 L220 310 Z" 
            fill="hsl(125 33% 75%)" 
            opacity="0.9" />
            
      {/* Flowing Sand */}
      <line x1="300" y1="190" x2="300" y2="210" stroke="hsl(125 33% 75%)" strokeWidth="10" strokeLinecap="round" />
      
      {/* Sparkles around */}
      <circle cx="150" cy="120" r="6" fill="hsl(207 88% 68%)" opacity="0.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="450" cy="280" r="6" fill="hsl(207 88% 68%)" opacity="0.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin="1s" repeatCount="indefinite"/></circle>
      <circle cx="180" cy="250" r="4" fill="hsl(125 33% 75%)" opacity="0.6"><animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.5s" repeatCount="indefinite"/></circle>
      <circle cx="420" cy="150" r="4" fill="hsl(125 33% 75%)" opacity="0.6"><animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.5s" begin="0.5s" repeatCount="indefinite"/></circle>

      <text x="300" y="360" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Concentration Temporelle</text>
    </svg>
  );
}
