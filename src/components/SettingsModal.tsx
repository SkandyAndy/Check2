import { X, Download, Upload, Cloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../hooks/useAppStore';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type SettingsModalProps = {
  onClose: () => void;
};

export function SettingsModal({ onClose }: SettingsModalProps) {
  const store = useAppStore();

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
          text: 'Hier ist dein Backup der Check-App',
          url: fileResult.uri,
          dialogTitle: 'Backup speichern',
        });
      } catch (nativeError) {
        // Fallback to web download
        a.click();
      }
      
    } catch (e) {
      alert('Fehler beim Exportieren');
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
            // Replace or merge data (here we just replace for simplicity, or we could merge)
            alert('Backup erfolgreich geladen! Bitte lade die App neu.');
            localStorage.setItem('check_app_data_v1', JSON.stringify({ theme: store.theme, ...data }));
            window.location.reload();
          } catch {
            alert('Dateiformat ungültig.');
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
          <h2 className="text-xl font-bold text-[var(--app-text)]">Einstellungen</h2>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 transition-colors">
            <X size={20} className="text-[var(--app-text)]" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
              <div className="flex items-center text-[var(--color-primary)] font-bold mb-2">
                <Cloud size={20} className="mr-2" /> System-Sicherung (Hintergrund)
              </div>
              <p className="text-sm text-[var(--app-text-muted)] mb-3 leading-relaxed">
                Diese App arbeitet 100% lokal. Um Datenverlust vorzubeugen, spiegelt dein Android-Gerät die lokalen App-Daten automatisch verschlüsselt in den "App-Daten"-Ordner deines verknüpften Google Drives (für dich unsichtbar). Bei einem Gerätewechsel lädt Android das Profil automatisch herunter.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[var(--app-text)]">Manuelles Backup (100% Kontrolle)</h3>
              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                Sichere all deine Aufgaben als handfeste Datei. Du wählst im nächsten Schritt genau aus, ob du sie im Downloads-Ordner, in der iCloud oder Drive speichern willst.
              </p>
              <button onClick={handleExport} className="w-full py-3 mt-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-bold rounded-xl flex items-center justify-center transition-colors">
                <Download size={18} className="mr-2" /> Datei manuell speichern (.json)
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-black/10 dark:border-white/10">
              <h3 className="font-bold text-[var(--app-text)]">Daten-Wiederherstellung</h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Importiere eine zuvor exportierte Backup-Datei. (Überschreibt aktuelle Daten)
              </p>
              <button onClick={handleImport} className="w-full py-3 mt-2 bg-black/5 dark:bg-white/5 text-[var(--app-text)] hover:bg-black/10 font-bold rounded-xl flex items-center justify-center transition-colors">
                <Upload size={18} className="mr-2" /> Backup importieren
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
