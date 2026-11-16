import { useState } from 'react';
import { api, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, ErrorBanner, Loading, PageHeader } from '../../components/ui';

export default function AccountDetermination() {
  const { can } = useAuth();
  const { data, error, reload } = useApi<any[]>('/account-determination');
  const { data: accounts } = useApi<any[]>('/accounts');
  const [saveError, setSaveError] = useState<string | null>(null);
  const update = async (key: string, accountId: string) => {
    try {
      await api(`/account-determination/${key}`, { method: 'PUT', body: { account_id: Number(accountId) } });
      reload();
    } catch (e) {
      setSaveError((e as Error).message);
    }
  };
  return (
    <div>
      <PageHeader title="Automatic Account Determination" subtitle="Which G/L accounts goods movements, invoices and payments post to" />
      <ErrorBanner error={error ?? saveError} onClose={() => setSaveError(null)} />
      <Card>
        {!data ? <Loading /> : (
          <table className="tbl">
            <thead><tr><th>Key</th><th>Purpose</th><th className="w-96">G/L account</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td className="font-mono">{d.key}</td>
                  <td>{d.description}</td>
                  <td>
                    <select className="input" value={d.account_id} disabled={!can('finance')} onChange={(e) => update(d.key, e.target.value)}>
                      {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
