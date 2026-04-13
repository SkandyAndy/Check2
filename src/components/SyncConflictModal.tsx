import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, Cloud, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { translations } from '../utils/i18n';

interface SyncConflictModalProps {
  driveTimestamp: string;
  localTimestamp: string;
  onKeepLocal: () => void;
  onUseCloud: () => void;
}

export function SyncConflictModal({
  driveTimestamp,
  localTimestamp,
  onKeepLocal,
  onUseCloud,
}: SyncConflictModalProps) {
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(language === 'de' ? 'de-DE' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--app-card)' }}
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        >
          {/* Header stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

          <div className="p-6">
            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center">
                <AlertTriangle size={28} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--app-text)]">
                  {t.conflictTitle}
                </h2>
                <p className="text-sm text-[var(--app-text-muted)] mt-1 leading-snug">
                  {t.conflictDesc}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl p-3 bg-black/5 dark:bg-white/5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                  <CloudOff size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t.conflictLocal}
                  </span>
                </div>
                <span className="text-xs text-[var(--app-text)] font-mono">
                  {fmtDate(localTimestamp)}
                </span>
              </div>
              <div className="rounded-xl p-3 bg-black/5 dark:bg-white/5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--app-text-muted)]">
                  <Cloud size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {t.conflictDrive}
                  </span>
                </div>
                <span className="text-xs text-[var(--app-text)] font-mono">
                  {fmtDate(driveTimestamp)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onKeepLocal}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-bg-dark)',
                }}
              >
                <CloudOff size={16} />
                {t.conflictKeepLocal}
              </button>
              <button
                onClick={onUseCloud}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm border border-black/10 dark:border-white/10 transition-all hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center gap-2 text-[var(--app-text)]"
              >
                <Cloud size={16} />
                {t.conflictUseDrive}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
