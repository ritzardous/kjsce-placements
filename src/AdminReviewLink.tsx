import {AppIcon} from './AppIcon';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from './auth';
import { getFirebase } from './firebase';

export function AdminReviewLink() {
  const { admin } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => { if (!admin) return; return onSnapshot(query(collection(getFirebase().db, 'procedureSubmissions'), where('status', '==', 'pending'), limit(100)), s => setCount(s.size), () => setCount(0)); }, [admin]);
  return admin ? <a className="auth-button" href="#admin/procedures"><AppIcon name="shield"/>Review queue{count ? ` (${count}${count === 100 ? '+' : ''})` : ''}</a> : null;
}
