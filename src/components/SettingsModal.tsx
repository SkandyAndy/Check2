import { X, Download, Upload, Cloud, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../hooks/useAppStore';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { translations } from '../utils/i18n';

type SettingsModalProps = {
  onClose: () => void;
};

export function SettingsModal({ onClose }: SettingsModalProps) {
  const store = useAppStore();
  const t = translations[store.language];

  const handleExport = async () => {
    try {
      const data = JSON.stringify({ tasks: store.tasks, categories: store.categories });
      
      // On web we just download it
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'check_backup.json';
      
      // Try using Capacitor native share if available
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
      } catch (nativeError) {
        // Fallback to web download
        a.click();
      }
      
    } catch (e) {
      alert(t.exportError);
    }
  };

  const handleImport = () => {
    // Basic web import
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
            alert(t.importSuccess);
            localStorage.setItem('check_app_data_v2', JSON.stringify({ theme: store.theme, language: store.language, ...data }));
            window.location.reload();
          } catch {
            alert(t.invalidFormat);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

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

        <div className="p-5 overflow-y-auto space-y-6">
          <div className="space-y-4">
            
            {/* Language Switcher */}
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center font-bold text-[var(--app-text)]">
                <Globe size={20} className="mr-2 text-[var(--color-primary)]" /> {t.languageLbl}
              </div>
              <div className="flex bg-black/10 dark:bg-white/10 rounded-lg p-1">
                <button 
                  onClick={() => store.setLanguage('de')}
                  className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${store.language === 'de' ? 'bg-[var(--app-card)] shadow-sm text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'}`}
                >
                  DE
                </button>
                <button 
                  onClick={() => store.setLanguage('en')}
                  className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${store.language === 'en' ? 'bg-[var(--app-card)] shadow-sm text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
              <div className="flex items-center text-[var(--color-primary)] font-bold mb-2">
                <Cloud size={20} className="mr-2" /> {t.systemBackupTitle}
              </div>
              <p className="text-sm text-[var(--app-text-muted)] mb-3 leading-relaxed">
                {t.systemBackupDesc}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[var(--app-text)]">{t.manualBackupTitle}</h3>
              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                {t.manualBackupDesc}
              </p>
              <button onClick={handleExport} className="w-full py-3 mt-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-bold rounded-xl flex items-center justify-center transition-colors">
                <Download size={18} className="mr-2" /> {t.btnExport}
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-black/10 dark:border-white/10">
              <h3 className="font-bold text-[var(--app-text)]">{t.restoreTitle}</h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                {t.restoreDesc}
              </p>
              <button onClick={handleImport} className="w-full py-3 mt-2 bg-black/5 dark:bg-white/5 text-[var(--app-text)] hover:bg-black/10 font-bold rounded-xl flex items-center justify-center transition-colors">
                <Upload size={18} className="mr-2" /> {t.btnImport}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
