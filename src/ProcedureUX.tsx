import { roundOptions } from '../shared/procedures';
import { AppIcon } from './AppIcon';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { safeStored } from './community-api';
import { safeBrowseReturn } from './procedure-navigation';

export function BackToExperiences({ children = '← Back to experiences' }: { children?: ReactNode }) {
  const { user } = useAuth();
  return <a className="procedure-back-link" href={safeBrowseReturn(safeStored(`procedure-return:${user?.uid}`, '#procedures'))}>{children}</a>;
}

// Native dialog supplies focus containment, Escape and focus restoration without a new visual system.
export function ConfirmAction({ label, title, description, confirmLabel, onConfirm, disabled = false, tone = 'danger' }: {
  label: string; title: string; description: string; confirmLabel: string;
  onConfirm: () => void; disabled?: boolean; tone?: 'danger' | 'warning';
}) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  return <><button className={`control-${tone}`} type="button" disabled={disabled} onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog className="procedure-card procedure-confirmation" ref={dialog} aria-labelledby={heading}>
      <h2 id={heading}>{title}</h2><p>{description}</p>
      <div className="procedure-actions"><button type="button" autoFocus onClick={() => dialog.current?.close()}>Cancel</button>
        <button className={`control-${tone}`} type="button" onClick={() => { dialog.current?.close(); onConfirm(); }}>{confirmLabel}</button></div>
    </dialog></>;
}


// Advanced filters remain draft values until Apply, including keyboard/Escape cancellation.
export function AdvancedFilters({value,onApply}:{value:{year:string;coverage:string;outcome:string;round:string};onApply:(value:{year:string;coverage:string;outcome:string;round:string})=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),heading=useId(),[draft,setDraft]=useState(value);
 const count=Object.values(value).filter(Boolean).length;
 return <><button className="procedure-mobile-filters" type="button" aria-haspopup="dialog" onClick={()=>{setDraft(value);dialog.current?.showModal();}}><AppIcon name="filter"/>More filters{count?` (${count})`:''}</button>
 <dialog className="procedure-filter-sheet" ref={dialog} aria-label="Filter experiences"><header className="procedure-sheet-heading"><h2 id={heading}>Filter experiences</h2><button type="button" aria-label="Close filters" onClick={()=>dialog.current?.close()}><AppIcon name="close"/></button></header>
 <div className="procedure-fields"><label>Appearance year<input aria-label="Appearance year" type="number" placeholder="Any year" value={draft.year} onChange={event=>setDraft(previous=>({...previous,year:event.target.value.slice(0,4)}))}/></label>{(['coverage','outcome','round'] as const).map(field=><label key={field}>{field==='round'?'Round':field==='coverage'?'Coverage':'Outcome'}<select aria-label={field==='round'?'Round':field==='coverage'?'Coverage':'Outcome'} value={draft[field]} onChange={event=>setDraft(previous=>({...previous,[field]:event.target.value}))}><option value="">Any {field}</option>{(field==='coverage'?['Full','Partial']:field==='outcome'?['Selected','Not selected','Result pending']:roundOptions).map(option=><option key={option}>{option}</option>)}</select></label>)}</div>
 <div className="procedure-actions"><button type="button" onClick={()=>setDraft({year:'',coverage:'',outcome:'',round:''})}>Reset</button><button className="action-button" type="button" onClick={()=>{onApply(draft);dialog.current?.close();}}>Apply filters</button></div></dialog></>;
}
