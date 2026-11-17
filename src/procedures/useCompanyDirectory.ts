import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { companyDirectoryPath, companyDirectorySchema } from '../../shared/company-directory';
import { mergeCompanyDirectory } from '../../shared/company-identity';
import type { ProcedureCompany } from '../../shared/procedures';
import { getFirebase } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useBackgroundSync } from '../lib/background-sync';
import { procedureError, rememberProcedureCompanies } from './procedures-api';

type Consumer = { next: (rows: ProcedureCompany[]) => void; error: (cause: unknown) => void };
const consumers = new Set<Consumer>();
let owner = '', rows: ProcedureCompany[] | undefined, stop: (() => void) | undefined;
let idle: ReturnType<typeof setTimeout> | undefined;
function releaseDirectory() { stop?.(); stop = undefined; rows = undefined; owner = ''; }
function subscribeDirectory(uid: string, consumer: Consumer) {
  clearTimeout(idle);
  if (owner !== uid) { releaseDirectory(); consumers.clear(); owner = uid; }
  consumers.add(consumer);
  if (rows) consumer.next(rows);
  if (!stop) {
    let stopLegacy: (() => void) | undefined;
    const receive = (values:ProcedureCompany[]) => {
      if (owner !== uid || getFirebase().auth.currentUser?.uid !== uid) return;
      rows = values;
      rememberProcedureCompanies(rows);
      for (const current of consumers) current.next(rows);
    };
    const failed = (cause:unknown) => { if (owner !== uid) return; stop?.(); stop = undefined; for (const current of consumers) current.error(cause); };
    const legacy = () => {
      if(stopLegacy)return;
      stopLegacy=onSnapshot(query(collection(getFirebase().db,'procedureCompanies'),orderBy('name')),snapshot=>{
        const raw=snapshot.docs.map(doc=>({...doc.data(),key:doc.id}) as ProcedureCompany);
        receive(mergeCompanyDirectory(raw).map(row=>({...row,hiring:raw.find(value=>value.key===row.key)?.hiring})));
      },failed);
    };
    const stopCompact=onSnapshot(doc(getFirebase().db,companyDirectoryPath),snapshot=>{
      if(!snapshot.exists()){legacy();return;}
      try { const value=companyDirectorySchema.parse(snapshot.data());stopLegacy?.();stopLegacy=undefined;receive(value.companies); }
      catch(cause){failed(cause);}
    },cause=>{if(cause.code==='permission-denied')legacy();else failed(cause);});
    stop=()=>{stopCompact();stopLegacy?.();};
  }
  return () => {
    consumers.delete(consumer);
    if (!consumers.size) {
      if (getFirebase().auth.currentUser?.uid !== uid) releaseDirectory();
      else idle = setTimeout(releaseDirectory, 120000);
    }
  };
}

export function useCompanies() {
  const { user, allowed } = useAuth();
  const [companies, setCompanies] = useState<ProcedureCompany[]>([]);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(value => value + 1);
  useBackgroundSync(async () => { retry(); }, 120000, Boolean(error));
  useEffect(() => {
    if (!allowed || !user) { setCompanies([]); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      return subscribeDirectory(user.uid, {
        next: values => { setCompanies(values); setError(''); setLoading(false); },
        error: cause => { setError(procedureError(cause)); setLoading(false); },
      });
    } catch (cause) { setError(procedureError(cause)); setLoading(false); }
  }, [allowed, user?.uid, attempt]);
  return { companies, error, loading, retry };
}
