import { X, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../hooks/useAppStore';

export function DailyPopupModal({ onClose }: { onClose: () => void }) {
  const store = useAppStore();
  
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const tasks = store.tasks.filter(tk => !tk.completed && tk.dueDate);
  
  const todayTasks = tasks.filter(tk => {
    const d = new Date(tk.dueDate!);
    d.setHours(0,0,0,0);
    return Math.round((d.getTime() - todayDate.getTime()) / 86400000) === 0;
  });

  const nextTasks = tasks.filter(tk => {
    const d = new Date(tk.dueDate!);
    d.setHours(0,0,0,0);
    const diff = Math.round((d.getTime() - todayDate.getTime()) / 86400000);
    return diff > 0 && diff <= 3; // next 3 days
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const overdueTasks = tasks.filter(tk => {
    const d = new Date(tk.dueDate!);
    d.setHours(0,0,0,0);
    return d.getTime() < todayDate.getTime();
  });

  const isDe = store.language === 'de';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[var(--app-card)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[var(--color-primary)]/20"
      >
        <div className="p-6 pb-4 border-b border-black/10 dark:border-white/10 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-[var(--color-primary)]">{isDe ? "Guten Morgen!" : "Good Morning!"}</h2>
            <p className="text-sm font-medium text-[var(--app-text-muted)] mt-1">{isDe ? "Dein Überblick für heute" : "Your overview for today"}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 transition-colors">
            <X size={20} className="text-[var(--app-text)]" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {overdueTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-2">{isDe ? "Überfällig" : "Overdue"}</h3>
              <div className="space-y-2">
                {overdueTasks.map(tk => (
                  <div key={tk.id} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--app-text)] truncate">{tk.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2 flex items-center">
              <Calendar size={14} className="mr-1" /> {isDe ? "Heute" : "Today"}
            </h3>
            {todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map(tk => (
                  <div key={tk.id} className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3 rounded-xl flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--app-text)] truncate">{tk.title}</p>
                      {tk.dueTime && <p className="text-xs text-[var(--app-text-muted)]">{tk.dueTime} {isDe ? "Uhr" : ""}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--app-text-muted)] italic">{isDe ? "Nichts für heute geplant. Entspanne dich! ☕" : "Nothing planned for today. Relax! ☕"}</p>
            )}
          </div>

          {nextTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">{isDe ? "Die nächsten Tage" : "Upcoming days"}</h3>
              <div className="space-y-2 opacity-80">
                {nextTasks.map(tk => (
                  <div key={tk.id} className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3 rounded-xl flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--app-text)] truncate">{tk.title}</p>
                      <p className="text-xs text-[var(--app-text-muted)]">{new Date(tk.dueDate!).toLocaleDateString(isDe ? 'de-DE' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-black/10 dark:border-white/10">
          <button 
            onClick={onClose}
            className="w-full flex justify-center items-center py-4 bg-[var(--color-primary)] font-bold text-lg rounded-xl text-[var(--color-bg-dark)] hover:bg-[var(--color-primary-dark)] transition-transform active:scale-95 shadow-[0_0_20px_rgba(72,138,255,0.4)]"
          >
            {isDe ? "Los geht's!" : "Let's go!"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
