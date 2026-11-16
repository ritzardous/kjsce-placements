import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { mergeCompanyDirectory } from '../../shared/company-identity';
import type { ProcedureCompany } from '../../shared/procedures';
import { getFirebase } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useBackgroundSync } from '../lib/background-sync';
import { procedureError } from './procedures-api';

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
      return onSnapshot(query(collection(getFirebase().db, 'procedureCompanies'), orderBy('name')), snapshot => {
        const raw = snapshot.docs.map(doc => ({ ...doc.data(), key: doc.id }) as ProcedureCompany);
        const rows = mergeCompanyDirectory(raw).map(row => {
          const canonical = raw.find(value => value.key === row.key);
          return { ...row, hiring: canonical?.hiring };
        });
        setCompanies(rows); setError(''); setLoading(false);
      }, cause => { setError(procedureError(cause)); setLoading(false); });
    } catch (cause) { setError(procedureError(cause)); setLoading(false); }
  }, [allowed, user?.uid, attempt]);
  return { companies, error, loading, retry };
}
