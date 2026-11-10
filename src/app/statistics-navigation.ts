import {useEffect,useState} from 'react';
import {parseRoute,statisticsPages,visibleYears,type Route} from './routing';
const key='placement-selected-batch';
let rememberedYear:number|null=null;
export function selectedBatch():number|null {
 try {const year=Number(localStorage.getItem(key));return visibleYears.includes(year as 2025|2026|2027)?year:rememberedYear;}catch{return rememberedYear;}
}
export function batchHref(year:number) {return year===2026?'#overview':`#${year}/overview`;}
export function rememberBatch(route:Route) {
 if(!statisticsPages.includes(route.page)||!visibleYears.includes(route.year as 2025|2026|2027))return;
 rememberedYear=route.year;
 try{localStorage.setItem(key,String(route.year));}catch{/* Navigation works when storage is unavailable. */}
 window.dispatchEvent(new Event('statistics-batch-changed'));
}
export function statisticsHref() {
 const route=parseRoute();
 const year=statisticsPages.includes(route.page)&&visibleYears.includes(route.year as 2025|2026|2027)?route.year:selectedBatch();
 return year?batchHref(year):'#statistics';
}
export function useStatisticsHref() {
 const [href,setHref]=useState(statisticsHref);
 useEffect(()=>{const refresh=()=>setHref(statisticsHref());window.addEventListener('hashchange',refresh);window.addEventListener('statistics-batch-changed',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('hashchange',refresh);window.removeEventListener('statistics-batch-changed',refresh);window.removeEventListener('storage',refresh);};},[]);
 return href;
}

export const statisticsSections=[['overview','Overview'],['companies','Companies'],['branches','Branches'],['explore','Career explorer']];
