
import type { SVGProps } from 'react';

export function PriorityGridIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradPG1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.15 }} />
        </linearGradient>
         <filter id="glowPG" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradPG1)" rx="10"/>

      {/* Grid lines */}
      <line x1="300" y1="50" x2="300" y2="350" stroke="hsl(207 88% 68%)" strokeWidth="4" filter="url(#glowPG)" />
      <line x1="50" y1="200" x2="550" y2="200" stroke="hsl(207 88% 68%)" strokeWidth="4" filter="url(#glowPG)" />

      {/* Quadrant backgrounds (subtle) */}
      <rect x="50" y="50" width="250" height="150" fill="hsl(0 84.2% 60.2% / 0.1)" rx="5"/> {/* Urgent/Important */}
      <rect x="300" y="50" width="250" height="150" fill="hsl(48 95% 60% / 0.1)" rx="5"/> {/* Not Urgent/Important */}
      <rect x="50" y="200" width="250" height="150" fill="hsl(207 88% 68% / 0.15)" rx="5"/> {/* Urgent/Not Important */}
      <rect x="300" y="200" width="250" height="150" fill="hsl(0 0% 80% / 0.1)" rx="5"/> {/* Not Urgent/Not Important */}

      {/* Labels for quadrants (simplified) */}
      <text x="70" y="80" fill="hsl(0 84.2% 60.2%)" fontSize="18" fontWeight="bold">FAIRE</text>
      <text x="320" y="80" fill="hsl(48 95% 60%)" fontSize="18" fontWeight="bold">PLANIFIER</text>
      <text x="70" y="230" fill="hsl(207 88% 68%)" fontSize="18" fontWeight="bold">DÉLÉGUER</text>
      <text x="320" y="230" fill="hsl(0 0% 50%)" fontSize="18" fontWeight="bold">ÉLIMINER</text>

      {/* Stylized tasks */}
      <rect x="100" y="100" width="100" height="30" rx="3" fill="hsl(0 84.2% 60.2% / 0.6)" />
      <circle cx="115" cy="115" r="5" fill="white"/>
      <line x1="130" y1="115" x2="185" y2="115" stroke="white" strokeWidth="2"/>
      
      <rect x="350" y="120" width="80" height="25" rx="3" fill="hsl(48 95% 60% / 0.6)" />
      <circle cx="365" cy="132.5" r="4" fill="white"/>
      <line x1="380" y1="132.5" x2="415" y2="132.5" stroke="white" strokeWidth="2"/>

      <rect x="120" y="250" width="90" height="28" rx="3" fill="hsl(207 88% 68% / 0.6)" />
      <circle cx="135" cy="264" r="4.5" fill="white"/>
      <line x1="150" y1="264" x2="195" y2="264" stroke="white" strokeWidth="2"/>
      
      <rect x="380" y="280" width="120" height="20" rx="3" fill="hsl(0 0% 50% / 0.4)" />
      <circle cx="395" cy="290" r="3" fill="white"/>
      <line x1="410" y1="290" x2="485" y2="290" stroke="white" strokeWidth="2"/>
      
      <text x="300" y="375" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Grille de Priorisation</text>
    </svg>
  );
}
