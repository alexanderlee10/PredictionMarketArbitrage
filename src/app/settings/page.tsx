import { getSettings } from '@/lib/settings';
import { SettingsPanel } from '@/components/SettingsPanel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure scanner thresholds and fee assumptions</p>
      </div>
      <SettingsPanel initial={settings} />
    </div>
  );
}
