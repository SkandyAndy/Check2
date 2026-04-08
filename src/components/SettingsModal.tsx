import { useState } from 'react';
import { X, Download, Upload, Globe, Bell, CalendarRange, CloudCog, RefreshCw, LogOut, LogIn, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../hooks/useAppStore';
import { useDriveSync } from '../hooks/useDriveSync';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { translations } from '../utils/i18n';

type SettingsModalProps = {
  onClose: () => void;
};

const CLIENT_ID_SET = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

function formatRelativeTime(isoString: string | null, never: string): string {
  if (!isoString) return never;
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const store = useAppStore();
  const t = translations[store.language];
  const { connectDrive, disconnectDrive, manualSync } = useDriveSync();

  const [driveLoading, setDriveLoading] = useState(false);
  const [driveStatus, setDriveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleConnect = async () => {
    setDriveLoading(true);
    setDriveStatus('idle');
    try {
      await connectDrive();
      setDriveStatus('success');
    } catch {
      setDriveStatus('error');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectDrive();
    setDriveStatus('idle');
  };

  const handleManualSync = async () => {
    setDriveLoading(true);
    setDriveStatus('idle');
    try {
      await manualSync();
      setDriveStatus('success');
    } catch {
      setDriveStatus('error');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = JSON.stringify({ tasks: store.tasks, categories: store.categories });
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'check_backup.json';
      try {
        const fileName = 'check_backup.json';
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Check App Backup',
          text: 'Backup check_backup.json',
          url: fileResult.uri,
          dialogTitle: 'Backup',
        });
      } catch {
        a.click();
      }
    } catch {
      alert(t.exportError);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          try {
            const data = JSON.parse(re.target?.result as string);
            if (data && data.tasks && data.categories) {
              useAppStore.setState({ tasks: data.tasks, categories: data.categories });
              alert(t.importSuccess);
              onClose();
            } else {
              throw new Error('Invalid schema');
            }
          } catch {
            alert(t.invalidFormat);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-black/20 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[var(--app-card)] w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--app-text)]">{t.settings}</h2>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 transition-colors">
            <X size={20} className="text-[var(--app-text)]" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">

          {/* ── Google Drive Sync ─────────────────────────── */}
          {CLIENT_ID_SET && (
            <div className={`p-4 rounded-xl border transition-colors ${store.driveConnected ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center font-bold text-[var(--color-primary)]">
                  <CloudCog size={20} className="mr-2" />
                  {t.driveTitle}
                </div>
                {/* Status badge */}
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${store.driveConnected ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-black/10 dark:bg-white/10 text-[var(--app-text-muted)]'}`}>
                  {store.driveConnected
                    ? <><CheckCircle size={12} /> {t.driveConnected}</>
                    : <>{t.driveNotConnected}</>}
                </div>
              </div>

              <p className="text-sm text-[var(--app-text-muted)] mb-3 leading-relaxed">{t.driveDesc}</p>

              {/* Last sync row */}
              {store.driveConnected && (
                <p className="text-xs text-[var(--app-text-muted)] mb-3">
                  {t.driveLastSync}: <span className="font-medium">{formatRelativeTime(store.lastSyncTimestamp, t.driveNever)}</span> ago
                </p>
              )}

              {/* Feedback flash */}
              {driveStatus === 'success' && (
                <div className="flex items-center gap-1 text-xs text-green-500 mb-2 font-medium">
                  <CheckCircle size={14} /> {t.driveSyncSuccess}
                </div>
              )}
              {driveStatus === 'error' && (
                <div className="flex items-center gap-1 text-xs text-red-500 mb-2 font-medium">
                  <AlertCircle size={14} /> {t.driveSyncError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-1">
                {!store.driveConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={driveLoading}
                    className="flex flex-1 items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-[var(--color-bg-dark)] font-bold rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-60"
                  >
                    {driveLoading ? <Loader size={16} className="animate-spin" /> : <LogIn size={16} />}
                    {driveLoading ? t.driveSyncing : t.driveConnect}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleManualSync}
                      disabled={driveLoading}
                      className="flex flex-1 items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold rounded-xl hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-60"
                    >
                      {driveLoading ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      {driveLoading ? t.driveSyncing : t.driveSyncNow}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black/5 dark:bg-white/5 text-[var(--app-text-muted)] font-bold rounded-xl hover:bg-black/10 transition-colors"
                    >
                      <LogOut size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Daily Popup ───────────────────────────────── */}
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center text-[var(--color-primary)] font-bold">
                <Bell size={20} className="mr-2" /> {t.dailyPopupTitle}
              </div>
              <Toggle checked={store.dailyPopupEnabled} onChange={v => store.setDailyPopupConfig(v, store.dailyPopupTime)} />
            </div>
            <p className="text-sm text-[var(--app-text-muted)] mb-3 leading-relaxed">{t.dailyPopupDesc}</p>
            {store.dailyPopupEnabled && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-black/10 dark:border-white/10">
                <span className="text-sm font-medium text-[var(--app-text)]">{t.dailyPopupTime}</span>
                <input
                  type="time"
                  value={store.dailyPopupTime}
                  onChange={e => store.setDailyPopupConfig(store.dailyPopupEnabled, e.target.value)}
                  className="bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-2 text-[var(--app-text)] outline-none"
                />
              </div>
            )}
          </div>

          {/* ── Task Preview ──────────────────────────────── */}
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center text-[var(--color-primary)] font-bold">
                <CalendarRange size={20} className="mr-2" /> {t.previewDaysTitle}
              </div>
              <Toggle checked={store.showAllTasks} onChange={store.setShowAllTasks} />
            </div>
            <p className="text-sm text-[var(--app-text-muted)] mb-3 leading-relaxed">{t.previewDaysDesc}</p>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-black/10 dark:border-white/10">
              <span className="text-sm font-medium text-[var(--app-text)]">{t.showAllTasks}</span>
            </div>
            <div className={`mt-4 flex items-center justify-between transition-opacity ${store.showAllTasks ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <span className="text-sm font-bold text-[var(--app-text)]">{t.nextXDays.replace('{n}', store.previewDays.toString())}</span>
              <input
                type="range" min="0" max="30" step="1"
                disabled={store.showAllTasks}
                value={store.previewDays}
                onChange={e => store.setPreviewDays(parseInt(e.target.value))}
                className="w-1/2 accent-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* ── Language ──────────────────────────────────── */}
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center font-bold text-[var(--app-text)]">
              <Globe size={20} className="mr-2 text-[var(--color-primary)]" /> {t.languageLbl}
            </div>
            <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-1">
              <button onClick={() => store.setLanguage('de')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${store.language === 'de' ? 'bg-[var(--app-card)] shadow-sm text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'}`}>DE</button>
              <button onClick={() => store.setLanguage('en')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${store.language === 'en' ? 'bg-[var(--app-card)] shadow-sm text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'}`}>EN</button>
            </div>
          </div>

          {/* ── Manual Backup ─────────────────────────────── */}
          <div className="space-y-2">
            <h3 className="font-bold text-[var(--app-text)]">{t.manualBackupTitle}</h3>
            <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">{t.manualBackupDesc}</p>
            <button onClick={handleExport} className="w-full py-3 mt-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-bold rounded-xl flex items-center justify-center transition-colors">
              <Download size={18} className="mr-2" /> {t.btnExport}
            </button>
          </div>

          <div className="space-y-2 pt-4 border-t border-black/10 dark:border-white/10">
            <h3 className="font-bold text-[var(--app-text)]">{t.restoreTitle}</h3>
            <p className="text-xs text-[var(--app-text-muted)]">{t.restoreDesc}</p>
            <button onClick={handleImport} className="w-full py-3 mt-2 bg-black/5 dark:bg-white/5 text-[var(--app-text)] hover:bg-black/10 font-bold rounded-xl flex items-center justify-center transition-colors">
              <Upload size={18} className="mr-2" /> {t.btnImport}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
