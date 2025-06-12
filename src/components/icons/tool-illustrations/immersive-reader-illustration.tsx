
import type { SVGProps } from 'react';

export function ImmersiveReaderIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradIR1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.15 }} />
        </linearGradient>
        <filter id="glowIR" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradIR1)" rx="10"/>

      {/* Open Book Shape */}
      <path 
        d="M100 300 Q120 280 150 280 H450 Q480 280 500 300 L520 70 Q500 50 450 50 H150 Q120 50 100 70 Z" 
        fill="hsl(0 0% 98%)" 
        stroke="hsl(210 20% 80%)" 
        strokeWidth="3"
      />
      {/* Book Spine */}
      <line x1="300" y1="55" x2="300" y2="285" stroke="hsl(210 20% 70%)" strokeWidth="4"/>

      {/* Text Lines - Left Page */}
      <line x1="130" y1="90" x2="280" y2="90" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="130" y1="110" x2="280" y2="110" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <rect x="130" y="125" width="150" height="14" fill="hsl(125 33% 75% / 0.5)" rx="2" filter="url(#glowIR)"/>
      <line x1="130" y1="132" x2="280" y2="132" stroke="hsl(125 33% 75%)" strokeWidth="3"/>
      <line x1="130" y1="150" x2="280" y2="150" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="130" y1="170" x2="260" y2="170" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="130" y1="190" x2="280" y2="190" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="130" y1="210" x2="270" y2="210" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="130" y1="230" x2="280" y2="230" stroke="hsl(210 20% 60%)" strokeWidth="2"/>


      {/* Text Lines - Right Page */}
      <line x1="320" y1="90" x2="470" y2="90" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="110" x2="470" y2="110" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="130" x2="470" y2="130" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="150" x2="470" y2="150" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="170" x2="450" y2="170" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="190" x2="470" y2="190" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="210" x2="460" y2="210" stroke="hsl(210 20% 60%)" strokeWidth="2"/>
      <line x1="320" y1="230" x2="470" y2="230" stroke="hsl(210 20% 60%)" strokeWidth="2"/>

      {/* Magnifying Glass / Focus Element */}
      <g transform="translate(10, -10)">
        <circle cx="205" cy="132" r="25" stroke="hsl(207 88% 68%)" strokeWidth="4" fill="hsl(207 88% 68% / 0.2)"/>
        <line x1="225" y1="152" x2="245" y2="172" stroke="hsl(207 88% 68%)" strokeWidth="5" strokeLinecap="round"/>
      </g>
      
      <text x="300" y="350" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Lecture Facilitée</text>
    </svg>
  );
}
