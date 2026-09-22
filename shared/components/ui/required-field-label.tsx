import * as React from 'react';

export function RequiredMark() {
  return <span className="text-rose-500" aria-hidden="true">*</span>;
}

export function RequiredFieldLabel({ label }: { label: string }) {
  const normalized = label.trimEnd();
  const isRequired = normalized.endsWith('*');
  const text = isRequired ? normalized.slice(0, -1).trimEnd() : normalized;

  return <>{text}{isRequired && <> <RequiredMark /></>}</>;
}
