import type { SVGProps } from 'react';
const paths = {
 search:'m21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
 filter:'M4 7h16M7 12h10M10 17h4', bookmark:'M6 3h12v18l-6-4-6 4V3Z',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 pen:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5', shield:'m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7l9-4Zm-4 9 3 3 5-6',
 arrow:'M5 12h14m-5-5 5 5-5 5', back:'M19 12H5m5-5-5 5 5 5', close:'m6 6 12 12M18 6 6 18',
 refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 1M18 18a8 8 0 0 1-13-1',
 check:'m5 12 4 4L19 6', trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
 bold:'M7 3h6a5 5 0 0 1 0 10H7V3Zm0 10h7a4 4 0 0 1 0 8H7v-8Z',
 italic:'M11 3h8M5 21h8M15 3 9 21', heading:'M5 4v16M19 4v16M5 12h14',
 list:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
 code:'m8 5-7 7 7 7m8-14 7 7-7 7m-2-17-4 20', quote:'M4 5h6v8H4V5Zm10 0h6v8h-6V5ZM10 13c0 4-2 6-6 6m16-6c0 4-2 6-6 6',
 link:'m10 13 4-4M9 15l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 compare:'M4 3h6v18H4V3Zm10 0h6v18h-6V3Z', share:'M12 16V2m-5 5 5-5 5 5M5 12H3v9h18v-9h-2',
 up:'M12 20V4m-6 6 6-6 6 6', down:'M12 4v16m-6-6 6 6 6-6', clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
} as const;
export type IconName = keyof typeof paths;
export function AppIcon({name,...props}:{name:IconName}&SVGProps<SVGSVGElement>) {
 return <svg {...props} className={`app-icon ${props.className||''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]}/></svg>;
}
