type MilesAiConsentControlProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function MilesAiConsentControl({ checked, onChange }: MilesAiConsentControlProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded border border-zinc-850 bg-zinc-900/10 p-3 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-3.5 w-3.5 cursor-pointer rounded border-zinc-800 bg-zinc-900 text-red-650 accent-red-650 focus:ring-0"
      />
      <span>
        <span className="block text-sm font-bold text-zinc-300">
          Enable Miles AI Analysis (Recommended)
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-zinc-500">
          Allow the AI models to read your transaction records and lead pipeline data to automatically identify leaks and calculate campaign performance metrics. You can revoke this in settings at any time.
        </span>
      </span>
    </label>
  );
}
