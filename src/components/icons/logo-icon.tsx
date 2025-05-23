import type { SVGProps } from 'react';

export function GenieLampIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10.61 18.396c-2.4.655-3.497 1.616-3.497 3.276V22h11.667v-.328c0-1.66-1.098-2.62-3.498-3.276" />
      <path d="M9.75 6.75c0-2.899 2.35-5.25 5.25-5.25h0c2.899 0 5.25 2.351 5.25 5.25v0c0 2.899-2.351 5.25-5.25 5.25h0" />
      <path d="M15 12v6.396" />
      <path d="M18.75 9.75h1.5C21.992 9.75 24 7.742 24 5.25S21.992.75 20.25.75H15" />
      <path d="M9.75 14.25s-2.648-1.289-3.333-2.439S5.25 9.186 5.25 8.25c0-.935.417-1.5.417-1.5" />
      <path d="M2.25 18h4.5" />
    </svg>
  );
}
