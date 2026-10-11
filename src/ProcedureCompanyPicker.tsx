import {matchesSearch} from '../shared/search';
import { useEffect, useId, useState } from 'react';
import type { ProcedureCompany } from '../shared/procedures';

export function ProcedureCompanyPicker({ companies, value, onChange, loading, disabled, invalid, errorId }: {
  companies: ProcedureCompany[]; value: string; onChange: (value: string) => void;
  loading: boolean; disabled: boolean; invalid: boolean; errorId?: string;
}) {
  const listId=useId(), [open,setOpen]=useState(false), [query,setQuery]=useState(''), [active,setActive]=useState(-1);
  const selected=companies.find(company=>company.key===value);
  const matches=companies.filter(company=>!query||query===selected?.name||matchesSearch(company.name,query));
  useEffect(()=>{if(open&&active>=0)document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});},[open,active,listId]);
  function choose(company:ProcedureCompany){onChange(company.key);setQuery(company.name);setOpen(false);setActive(-1);}
  return <div className="procedure-company-picker"><label htmlFor="procedure-companyKey">Company</label>
    <div className="procedure-company-input"><input id="procedure-companyKey" role="combobox" aria-label="Company"
      aria-required="true" aria-invalid={invalid} aria-describedby={errorId} aria-autocomplete="list"
      aria-expanded={open} aria-controls={listId} aria-activedescendant={open&&active>=0?`${listId}-${active}`:undefined}
      autoComplete="off" placeholder={loading?'Loading companies…':'Search and choose a company'} disabled={disabled||loading}
      value={open?query:selected?.name||''} onFocus={()=>{setQuery(selected?.name||'');setOpen(true);setActive(-1);}}
      onClick={()=>{if(!open){setQuery(selected?.name||'');setOpen(true);setActive(-1);}}}
      onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(-1);}}
      onBlur={()=>{setOpen(false);setActive(-1);}}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(previous=>matches.length?Math.max(0,Math.min(matches.length-1,previous+(event.key==='ArrowDown'?1:-1))):-1);}
        else if(event.key==='Enter'&&open){event.preventDefault();if(active>=0&&matches[active])choose(matches[active]);else if(matches.length===1)choose(matches[0]);}
        else if(event.key==='Escape'){event.preventDefault();setOpen(false);setActive(-1);}
      }}/>{value&&!disabled&&<button type="button" aria-label="Clear selected company" onClick={()=>{onChange('');document.getElementById('procedure-companyKey')?.focus();setQuery('');setOpen(true);setActive(-1);}}>×</button>}</div>
    {open&&<div className="procedure-company-options" id={listId} role="listbox" aria-label="Companies">
      {matches.map((company,index)=><div role="option" id={`${listId}-${index}`} key={company.key} aria-selected={company.key===value}
        className={active===index?'is-active':undefined} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(company)}>
        <strong>{company.name}</strong><span>Class of {company.years.join(', ')}</span>
      </div>)}{!matches.length&&<p role="status">No matching company. Try another name.</p>}
    </div>}
    {selected&&<p className="procedure-note">Selected: {selected.name}</p>}
  </div>;
}
