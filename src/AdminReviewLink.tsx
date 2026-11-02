import {AppIcon} from './AppIcon';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './auth';
import { getFirebase } from './firebase';

export function AdminReviewLink() {
  const { admin } = useAuth();
  const [count, setCount] = useState<number|null>(null), [failed,setFailed] = useState(false);
  useEffect(() => { setCount(null);setFailed(false);if (!admin) return; return onSnapshot(query(collection(getFirebase().db, 'procedureSubmissions'), where('status', '==', 'pending'), limit(100)), s => {setCount(s.size);setFailed(false);}, () => setFailed(true)); }, [admin]);
  return admin ? <a className="auth-button" href="#admin/procedures"><AppIcon name="shield"/>Review queue{failed ? ' (unavailable)' : count === null ? ' (…)': count ? ` (${count}${count === 100 ? '+' : ''})` : ''}</a> : null;
}
