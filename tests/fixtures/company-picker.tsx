// Isolated picker UI fixture: creation is stubbed; persistence is tested against Firebase emulators.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ProcedureCompanyPicker} from '../../src/procedures/ProcedureCompanyPicker';
import type {ProcedureCompany} from '../../shared/procedures';
import '../../src/styles/styles.css';
import '../../src/styles/editor-studio.css';
function PickerFixture() {
  const [companies,setCompanies]=useState<ProcedureCompany[]>([{key:'existing',name:'Existing Labs',years:[2026]}]);
  const [value,setValue]=useState('');
  return <main style={{padding:24,maxWidth:600}}><ProcedureCompanyPicker companies={companies} value={value} onChange={setValue} loading={false} disabled={false} invalid={false} onCreate={async name=>{
    await new Promise(resolve=>setTimeout(resolve,500));
    if(name==='Fail Labs')throw Error('Please retry');
    const company={key:'new-labs',name,years:[]};
    setCompanies(previous=>[...previous,company]);
    return company;
  }}/></main>;
}
createRoot(document.getElementById('root')!).render(<PickerFixture/>);
