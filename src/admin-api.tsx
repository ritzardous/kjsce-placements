import {useEffect,useRef,useState,type ReactNode} from 'react';
import {callProcedure,procedureError} from './procedures-api';
import {FetchLoader} from './FetchLoader';
export function adminCall<T>(action:string,payload:unknown={}):Promise<T>{return callProcedure<T>('adminWorkspace',{action,payload});}
export function useAdminQuery<T>(action:string,payload:unknown={},enabled=true) {
  const key=JSON.stringify(payload),[data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  const generation=useRef(0);
  useEffect(()=>{if(!enabled){setLoading(false);setData(null);setError('');return;}const request=++generation.current;setLoading(true);setError('');setData(null);void adminCall<T>(action,JSON.parse(key)).then(result=>{if(request===generation.current)setData(result);}).catch(cause=>{if(request===generation.current)setError(procedureError(cause));}).finally(()=>{if(request===generation.current)setLoading(false);});return()=>{generation.current++;};},[action,key,revision,enabled]);
  return {data,error,loading,refresh:()=>setRevision(value=>value+1)};
}
export function QueryState({state,children}:{state:{error:string;loading:boolean;refresh:()=>void};children?:ReactNode}){return <>{state.loading?<FetchLoader label="Loading admin information…"/>:state.error?<p role="alert">{state.error} <button type="button" onClick={state.refresh}>Retry</button></p>:children}</>;}
export const adminDate=(value:number|string|null|undefined)=>value?new Date(value).toLocaleString('en-GB'):'Not available';
export function AuditLink({id}:{id:string}){return <a href={`#admin/operations?audit=${encodeURIComponent(id)}`}>View audit record →</a>;}
export type AdminJob={id:string;auditId:string|null;type:'quality'|'repair'|'recover'|'import';state:string;year:number|null;sourceName:string;createdAt:number;updatedAt:number;progress:number;total:number;message:string;reason:string;version:string|null;previousVersion:string|null;leaseUntil:number;preview:{sourceHash?:string;before?:Record<string,number|null>|null;after?:Record<string,number|null>;source?:string;target?:string;submissions?:number;posts?:number;policy?:string}|null};
export type AdminOverview={owner:boolean;pending:number;reports:number;oldestAt:number|null;lastError:{createdAt:number;action:string}|null;jobs:AdminJob[];batches:{year:number;activeVersion:string|null;publishedAt:number|null}[];checkedAt:number};
