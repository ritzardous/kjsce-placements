import { useState } from 'react';
import { readCompanyHiring, type CompanyHiring } from '../../shared/company-hiring';
import type { ProcedureCompany } from '../../shared/procedures';
import { useCompanies } from '../procedures/useCompanyDirectory';
import { hiringCompanies } from '../procedures/HiringNow';
import { CompanyIdentity } from '../dashboard/CompanyIdentity';
import { FetchLoader } from '../ui/FetchLoader';
import { adminCall } from './admin-api';
import { invalidateCompanyDirectory, procedureError } from '../procedures/procedures-api';

type Form = { key: string; status: CompanyHiring['status']; expectedVersion: number };
export function AdminHiring() {
  const { companies, loading, error: directoryError, retry } = useCompanies();
  const [form, setForm] = useState<Form | null>(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  function choose(company?: ProcedureCompany) {
    setError(''); setMessage('');
    if (!company) { setForm(null); return; }
    const hiring = readCompanyHiring(company.key, company.hiring);
    setForm({ key: company.key, status: hiring.status, expectedVersion: hiring.version });
  }
  async function save() {
    if (!form || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await adminCall<{hiring:CompanyHiring}>('setCompanyHiring', { companyKey: form.key, status: form.status, year: 2027, expectedVersion: form.expectedVersion });
      setForm({ ...form, expectedVersion: result.hiring.version });
      invalidateCompanyDirectory();
      setMessage('Hiring focus updated. The directory and Home update automatically.');
    } catch (cause) { setError(procedureError(cause)); }
    finally { setBusy(false); }
  }
  return <section className="admin-hiring"><h2>What’s next for the Class of 2027?</h2><p>Keep ongoing and upcoming companies in focus. This changes discovery, not placement statistics.</p>
    {loading && <FetchLoader label="Loading company directory…"/>}
    {directoryError && <p role="alert">{directoryError} <button onClick={retry}>Retry directory</button></p>}
    {!loading && !directoryError && <>
      <div className="admin-hiring-featured">{hiringCompanies(companies).map(company => <button type="button" className="admin-hiring-company" disabled={busy} key={company.key} onClick={() => choose(company)}><CompanyIdentity companyKey={company.key} name={company.name}/><span>{company.hiring.status === 'ongoing' ? 'Ongoing' : 'Upcoming'}</span></button>)}{!hiringCompanies(companies).length && <p>No companies are featured right now.</p>}</div>
      <form className="admin-hiring-form" onSubmit={event => { event.preventDefault(); void save(); }}>
        <label>Company<select aria-label="Company" value={form?.key ?? ''} disabled={busy} onChange={event => choose(companies.find(company => company.key === event.target.value))}><option value="">Choose a company</option>{companies.map(company => <option key={company.key} value={company.key}>{company.name}</option>)}</select></label>
        {form && <><label>Hiring status<select aria-label="Hiring status" value={form.status} disabled={busy} onChange={event => setForm({ ...form, status: event.target.value as CompanyHiring['status'] })}><option value="ongoing">Ongoing</option><option value="upcoming">Upcoming</option><option value="none">Not featured</option></select></label><button className="action-button" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Save hiring status'}</button></>}
      </form>
      {error && <p role="alert">{error} <button disabled={busy} onClick={() => choose(companies.find(company => company.key === form?.key))}>Reload status</button></p>}
      {message && <p role="status">{message}</p>}
    </>}
  </section>;
}
