
import type { SVGProps } from 'react';

export function TaskBreakerIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradTB1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.1 }} />
        </linearGradient>
        <filter id="glowTB" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradTB1)" rx="10" />

      {/* Main trunk/scroll */}
      <path d="M100 200 Q150 100 300 100 T500 200" stroke="hsl(207 88% 68%)" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#glowTB)" />
      
      {/* Branches level 1 */}
      <line x1="180" y1="150" x2="150" y2="80" stroke="hsl(207 88% 68%)" strokeWidth="8" strokeLinecap="round" />
      <line x1="250" y1="110" x2="280" y2="50" stroke="hsl(207 88% 68%)" strokeWidth="8" strokeLinecap="round" />
      <line x1="350" y1="110" x2="320" y2="50" stroke="hsl(207 88% 68%)" strokeWidth="8" strokeLinecap="round" />
      <line x1="420" y1="150" x2="450" y2="80" stroke="hsl(207 88% 68%)" strokeWidth="8" strokeLinecap="round" />

      {/* Branches level 2 (smaller) */}
      <line x1="150" y1="80" x2="130" y2="40" stroke="hsl(125 33% 75%)" strokeWidth="5" strokeLinecap="round" />
      <line x1="150" y1="80" x2="170" y2="45" stroke="hsl(125 33% 75%)" strokeWidth="5" strokeLinecap="round" />
      <line x1="450" y1="80" x2="430" y2="45" stroke="hsl(125 33% 75%)" strokeWidth="5" strokeLinecap="round" />
      <line x1="450" y1="80" x2="470" y2="40" stroke="hsl(125 33% 75%)" strokeWidth="5" strokeLinecap="round" />

      {/* Sparkles */}
      <circle cx="100" cy="200" r="5" fill="hsl(125 33% 75%)" opacity="0.8" />
      <circle cx="180" cy="150" r="4" fill="hsl(125 33% 75%)" opacity="0.7" />
      <circle cx="250" cy="110" r="4" fill="hsl(125 33% 75%)" opacity="0.7" />
      <circle cx="350" cy="110" r="4" fill="hsl(125 33% 75%)" opacity="0.7" />
      <circle cx="420" cy="150" r="4" fill="hsl(125 33% 75%)" opacity="0.7" />
      <circle cx="500" cy="200" r="5" fill="hsl(125 33% 75%)" opacity="0.8" />
      
      <path d="M70 300 Q150 250 300 250 T530 300" stroke="hsl(207 88% 68%)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.6"/>
      <line x1="200" y1="270" x2="180" y2="230" stroke="hsl(207 88% 68%)" strokeWidth="6" strokeLinecap="round" opacity="0.6"/>
      <line x1="400" y1="270" x2="420" y2="230" stroke="hsl(207 88% 68%)" strokeWidth="6" strokeLinecap="round" opacity="0.6"/>
      
      <text x="300" y="350" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Décomposition Magique</text>
    </svg>
  );
}
