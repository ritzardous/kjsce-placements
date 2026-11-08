import {type ReactNode} from 'react';
import {PortalShell} from './Portal';
import {useAuth} from './auth';
import './admin.css';
export const adminSections=[['Overview','#admin'],['Moderation','#admin/procedures'],['Users','#admin/users'],['Data','#admin/data'],['Analytics','#admin/analytics'],['Operations','#admin/operations']] as const;
export function AdminLayout({active,children}:{active:string;children:ReactNode}) {
  const {admin}=useAuth();
  return <PortalShell active="admin"><div className="admin-workspace procedure-ui"><nav className="workspace-breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a><span>/</span>{active==='Overview'?<span aria-current="page">Administration</span>:<><a href="#admin">Administration</a><span>/</span><span aria-current="page">{active}</span></>}</nav><header className="workspace-page-header"><div><h1>{active==='Overview'?'Administration':active}</h1><p>{active==='Overview'?'Keep the application useful, accurate and running smoothly.':'Administration · Placement Stats'}</p></div><a href="#home">Back to application →</a></header>{admin?<><nav className="admin-navigation" aria-label="Administration">{adminSections.map(([label,href])=><a key={href} href={href} aria-current={label===active?'page':undefined}>{label}</a>)}</nav>{children}</>:<p role="alert">Admin access is required. Contact the app owner if you need access.</p>}</div></PortalShell>;
}
