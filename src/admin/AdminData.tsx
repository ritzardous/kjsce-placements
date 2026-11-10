import {useEffect,useRef,useState} from 'react';
import {adminCall,useAdminQuery,QueryState,type AdminOverview} from './admin-api';
import {JobPanel} from './AdminJobs';
import {procedureError} from '../procedures/procedures-api';
import {OperationStatus} from '../ui/OperationStatus';
export function AdminData({jobId}:{jobId?:string}) {
  const fileInput=useRef<HTMLInputElement>(null);
  const state=useAdminQuery<AdminOverview>('overview'),[year,setYear]=useState(2026),[reason,setReason]=useState(''),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uploadProgress,setUploadProgress]=useState('');
  const resume=useAdminQuery<{type:string;state:string;year:number;reason:string;sourceName:string}>('job',{id:jobId||'none'},!!jobId);
  useEffect(()=>{if(jobId&&resume.data&&['uploading','invalid'].includes(resume.data?.state||'')){setYear(resume.data.year);setReason(resume.data.reason);}},[jobId,resume.data?.year,resume.data?.reason]);
  async function scan(){setBusy(true);setError('');try{const job=await adminCall<{id:string}>('createJob',{type:'quality',reason:'Review company identities and current content validation',requestId:crypto.randomUUID()});location.hash=`#admin/data?job=${job.id}`;}catch(cause){setError(procedureError(cause));}finally{setBusy(false);}}
  async function upload(){if(!file||busy)return;setBusy(true);setError('');try{
    if(file.size>4_500_000)throw Error('Choose a placement JSON file up to 4.5 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer()),decoder=new TextDecoder('utf-8',{fatal:true}),chunks:string[]=[];
    for(let start=0;start<bytes.length;start+=45000)chunks.push(decoder.decode(bytes.slice(start,start+45000),{stream:start+45000<bytes.length}));
    if(!chunks.length)throw Error('The source file is empty.');
    const continuing=jobId&&resume.data?.state==='uploading',requestId=continuing?jobId:crypto.randomUUID();
    if(continuing&&resume.data?.sourceName!==file.name)throw Error('Choose the original source file to resume this upload.');
    const result=await adminCall<{id:string}>('createJob',{type:'import',requestId,year,reason,sourceName:file.name,chunkCount:chunks.length});
    // The URL is the recovery handle if the connection fails midway.
    location.hash=`#admin/data?job=${result.id}`;
    for(let index=0;index<chunks.length;index++){setUploadProgress(`Uploading source ${index+1} of ${chunks.length}…`);await adminCall('uploadChunk',{id:result.id,index,text:chunks[index]});}
    setUploadProgress('Validating source and calculating changes…');await adminCall('validateImport',{id:result.id});setFile(null);if(fileInput.current)fileInput.current.value='';state.refresh();resume.refresh();
  }catch(cause){setError(procedureError(cause));resume.refresh();}finally{setBusy(false);setUploadProgress('');}}
  return <section><QueryState state={state}>{state.data&&<div className="admin-table-scroll"><table><caption>Placement publications by batch</caption><thead><tr><th>Batch</th><th>Active version</th><th>Published</th></tr></thead><tbody>{state.data.batches.map(batch=><tr key={batch.year}><th>{batch.year}</th><td><code>{batch.activeVersion?.slice(0,16)||'Not published'}</code></td><td>{batch.publishedAt?new Date(batch.publishedAt).toLocaleString('en-GB'):'—'}</td></tr>)}</tbody></table></div>}</QueryState>
  <div className="admin-data-tools"><section className="procedure-card"><h2>Data quality</h2><p>Review company aliases, unknown references and invalid drafts. A scan reports issues without changing user content.</p><button type="button" disabled={busy} onClick={()=>void scan()}>Start quality scan</button></section><section className="procedure-card"><h2>{jobId&&resume.data?.state==='uploading'?'Resume source upload':'Stage placement data'}</h2><p>Upload the existing placement dataset JSON format, up to 4.5 MB. Validation and a comparison preview come before publication.</p><a href="#admin/data">Start a new import</a><form onSubmit={event=>{event.preventDefault();void upload();}}><label>Batch year<select value={year} disabled={busy||!!(jobId&&resume.data?.state==='uploading')} onChange={event=>setYear(Number(event.target.value))}>{[2025,2026,2027].map(value=><option key={value}>{value}</option>)}</select></label><label>Placement source JSON<input ref={fileInput} type="file" accept=".json,application/json" disabled={busy} onChange={event=>setFile(event.target.files?.[0]||null)}/></label><label>Import reason<textarea rows={2} value={reason} maxLength={500} disabled={busy} onChange={event=>setReason(event.target.value)}/></label><button className="action-button" type="submit" disabled={busy||!file||reason.trim().length<8}>Upload and validate</button></form></section></div>{busy&&<OperationStatus label={uploadProgress||'Preparing quality scan…'}/>} {error&&<p role="alert">{error}</p>}{jobId&&!busy&&<JobPanel key={`${jobId}-${resume.data?.state}`} id={jobId}/>}</section>;
}
