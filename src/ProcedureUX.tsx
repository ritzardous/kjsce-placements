import { useId, useRef, type ReactNode } from 'react';
import { useAuth } from './auth';
import { safeStored } from './community-api';
import { safeBrowseReturn } from './procedure-navigation';

export function BackToExperiences({ children = '← Back to experiences' }: { children?: ReactNode }) {
  const { user } = useAuth();
  return <a href={safeBrowseReturn(safeStored(`procedure-return:${user?.uid}`, '#procedures'))}>{children}</a>;
}

// Native dialog supplies focus containment, Escape and focus restoration without a new visual system.
export function ConfirmAction({ label, title, description, confirmLabel, onConfirm, disabled = false }: {
  label: string; title: string; description: string; confirmLabel: string;
  onConfirm: () => void; disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  return <><button type="button" disabled={disabled} onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog className="procedure-card" ref={dialog} aria-labelledby={heading}>
      <h2 id={heading}>{title}</h2><p>{description}</p>
      <div className="procedure-actions"><button type="button" autoFocus onClick={() => dialog.current?.close()}>Cancel</button>
        <button type="button" onClick={() => { dialog.current?.close(); onConfirm(); }}>{confirmLabel}</button></div>
    </dialog></>;
}
