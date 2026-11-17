/** Temporary opt-in mitigation; never changes authorization or server validation. */
export const readConservation = import.meta.env?.VITE_READ_CONSERVATION === 'true';
