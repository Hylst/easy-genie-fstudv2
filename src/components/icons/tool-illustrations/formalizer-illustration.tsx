
import type { SVGProps } from 'react';

export function FormalizerIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradF1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.1 }} />
        </linearGradient>
        <filter id="glowF" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="hsl(125 33% 75%)" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradF1)" rx="10"/>

      {/* Input Text Block (Messy) */}
      <rect x="50" y="100" width="200" height="200" fill="hsl(207 88% 68% / 0.2)" rx="8" stroke="hsl(207 88% 68% / 0.5)" strokeWidth="2"/>
      <path d="M70 130 C90 110, 110 150, 130 130 S170 150, 190 130 S230 110, 230 130" stroke="hsl(210 20% 20% / 0.7)" strokeWidth="2.5" fill="none" strokeDasharray="3 3" />
      <path d="M70 160 C90 180, 110 140, 130 160 S170 140, 190 160 S230 180, 230 160" stroke="hsl(210 20% 20% / 0.7)" strokeWidth="2.5" fill="none" />
      <path d="M70 190 Q90 220 130 190 T190 210 C210 180 230 220 230 190" stroke="hsl(210 20% 20% / 0.7)" strokeWidth="2.5" fill="none" strokeDasharray="5 2" />
      <path d="M70 220 C80 200, 120 240, 130 220 S160 240, 190 220 S230 200, 230 220" stroke="hsl(210 20% 20% / 0.7)" strokeWidth="2.5" fill="none" />
      <path d="M70 250 Q100 270 130 250 T190 270 C210 240 230 270 230 250" stroke="hsl(210 20% 20% / 0.7)" strokeWidth="2.5" fill="none" strokeDasharray="2 4" />
      
      {/* Magic Wand / Quill & Arrow */}
      <g transform="translate(280, 200) rotate(-15)">
        <line x1="-30" y1="0" x2="30" y2="0" stroke="hsl(125 33% 75%)" strokeWidth="5" strokeLinecap="round" filter="url(#glowF)"/>
        <path d="M25 -5 L35 0 L25 5" stroke="hsl(125 33% 75%)" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <circle cx="-28" cy="0" r="7" fill="hsl(125 33% 75%)" />
        <path d="M-28 -7 Q-24 -15 -20 -7 S -12 -15 -8 -7" stroke="hsl(207 88% 68%)" strokeWidth="1.5" fill="none"/>
      </g>
      
      {/* Output Text Block (Formal) */}
      <rect x="350" y="100" width="200" height="200" fill="hsl(125 33% 75% / 0.2)" rx="8" stroke="hsl(125 33% 75% / 0.5)" strokeWidth="2"/>
      <line x1="370" y1="130" x2="530" y2="130" stroke="hsl(210 20% 20% / 0.8)" strokeWidth="2.5" />
      <line x1="370" y1="160" x2="530" y2="160" stroke="hsl(210 20% 20% / 0.8)" strokeWidth="2.5" />
      <line x1="370" y1="190" x2="530" y2="190" stroke="hsl(210 20% 20% / 0.8)" strokeWidth="2.5" />
      <line x1="370" y1="220" x2="530" y2="220" stroke="hsl(210 20% 20% / 0.8)" strokeWidth="2.5" />
      <line x1="370" y1="250" x2="530" y2="250" stroke="hsl(210 20% 20% / 0.8)" strokeWidth="2.5" />

      <text x="300" y="350" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Transformation de Texte</text>
    </svg>
  );
}
