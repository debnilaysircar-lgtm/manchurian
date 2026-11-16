import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from './ui';

type Ask = (message: string, confirmLabel?: string) => Promise<boolean>;
const Ctx = createContext<Ask>(async () => false);

/** In-page confirmation dialog; browser confirm() is unavailable in embedded viewers. */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; label: string; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback<Ask>((message, label = 'Continue') => new Promise((resolve) => setState({ message, label, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <Ctx.Provider value={ask}>
      {children}
      {state && (
        <Modal title="Please confirm" onClose={() => close(false)}>
          <p className="text-sm text-slate-700">{state.message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => close(false)}>Cancel</button>
            <button className="btn-primary" autoFocus onClick={() => close(true)}>{state.label}</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
