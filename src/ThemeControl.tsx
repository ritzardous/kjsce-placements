import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppIcon } from './AppIcon';
const ThemeContext=createContext({dark:false,toggle:()=>{}});
function initialTheme(){try{const saved=localStorage.getItem('placement-theme');return saved?saved==='dark':matchMedia('(prefers-color-scheme: dark)').matches;}catch{return false;}}
export function ThemeProvider({children}:{children:ReactNode}) {
 const [dark,setDark]=useState(initialTheme);
 useEffect(()=>{const apply=()=>{const publicPage=!location.hash||/^#(?:landing|login)(?:\?|$)/.test(location.hash);document.documentElement.dataset.theme=dark&&!publicPage?'dark':'light';};apply();window.addEventListener('hashchange',apply);return()=>window.removeEventListener('hashchange',apply);},[dark]);
 return <ThemeContext.Provider value={{dark,toggle:()=>setDark(previous=>{const next=!previous;try{localStorage.setItem('placement-theme',next?'dark':'light');}catch{}return next;})}}>{children}</ThemeContext.Provider>;
}
export function ThemeControl(){const {dark,toggle}=useContext(ThemeContext);return <button type="button" className="auth-button icon-control" aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'} onClick={toggle}><AppIcon name={dark?'sun':'moon'}/></button>;}
