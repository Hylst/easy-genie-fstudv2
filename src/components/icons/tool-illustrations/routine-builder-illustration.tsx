
import type { SVGProps } from 'react';

export function RoutineBuilderIllustration(props: SVGProps<SVGSVGElement>) {
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
        <linearGradient id="gradRB1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(207 88% 68%)', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(125 33% 75%)', stopOpacity: 0.15 }} />
        </linearGradient>
        <filter id="glowRB" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#gradRB1)" rx="10"/>

      {/* Stylized Planner/Calendar Page */}
      <rect x="100" y="70" width="400" height="260" fill="hsl(0 0% 100%)" rx="10" stroke="hsl(207 88% 68% / 0.5)" strokeWidth="3" filter="url(#glowRB)"/>
      <line x1="100" y1="120" x2="500" y2="120" stroke="hsl(207 88% 68% / 0.3)" strokeWidth="2"/> {/* Header line */}

      {/* Days of week (simple representation) */}
      <text x="130" y="105" fontFamily="Arial, sans-serif" fontSize="16" fill="hsl(210 20% 20%)">Lun</text>
      <text x="200" y="105" fontFamily="Arial, sans-serif" fontSize="16" fill="hsl(210 20% 20%)">Mar</text>
      <text x="270" y="105" fontFamily="Arial, sans-serif" fontSize="16" fill="hsl(210 20% 20%)">Mer</text>
      <text x="340" y="105" fontFamily="Arial, sans-serif" fontSize="16" fill="hsl(210 20% 20%)">Jeu</text>
      <text x="410" y="105" fontFamily="Arial, sans-serif" fontSize="16" fill="hsl(210 20% 20%)">Ven</text>

      {/* Routine items with checkmarks */}
      {/* Item 1 */}
      <rect x="120" y="140" width="20" height="20" rx="3" stroke="hsl(125 33% 75%)" strokeWidth="2" fill="hsl(125 33% 75% / 0.3)"/>
      <path d="M125 150 L130 155 L138 145" stroke="hsl(125 33% 75%)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <text x="150" y="156" fontFamily="Arial, sans-serif" fontSize="18" fill="hsl(210 20% 20%)">Réveil & Méditation</text>
      
      {/* Item 2 */}
      <rect x="120" y="180" width="20" height="20" rx="3" stroke="hsl(125 33% 75%)" strokeWidth="2" fill="hsl(125 33% 75% / 0.3)"/>
      <path d="M125 190 L130 195 L138 185" stroke="hsl(125 33% 75%)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <text x="150" y="196" fontFamily="Arial, sans-serif" fontSize="18" fill="hsl(210 20% 20%)">Session de travail N°1</text>

      {/* Item 3 (unchecked) */}
      <rect x="120" y="220" width="20" height="20" rx="3" stroke="hsl(207 88% 68%)" strokeWidth="2" fill="hsl(0 0% 100%)"/>
      <text x="150" y="236" fontFamily="Arial, sans-serif" fontSize="18" fill="hsl(210 20% 20%)">Pause & Déjeuner</text>
      
      {/* Item 4 */}
       <rect x="120" y="260" width="20" height="20" rx="3" stroke="hsl(125 33% 75%)" strokeWidth="2" fill="hsl(125 33% 75% / 0.3)"/>
      <path d="M125 270 L130 275 L138 265" stroke="hsl(125 33% 75%)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <text x="150" y="276" fontFamily="Arial, sans-serif" fontSize="18" fill="hsl(210 20% 20%)">Sport / Activité</text>

      {/* Genie Lamp or Sparkle "adding" a check */}
       <path d="M400 225 Q410 215 420 225 L410 235 Z" fill="hsl(125 33% 75%)" filter="url(#glowRB)">
         <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="1.5s" repeatCount="indefinite"/>
       </path>
       <path d="M410 235 Q410 255 390 265" stroke="hsl(125 33% 75%)" strokeWidth="3" fill="none" strokeLinecap="round"/>
       
      <text x="300" y="360" fontFamily="Arial, sans-serif" fontSize="24" fill="hsl(210 20% 20%)" textAnchor="middle" fontWeight="bold">Constructeur de Routines</text>
    </svg>
  );
}
