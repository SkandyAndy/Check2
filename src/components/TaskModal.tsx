import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Task, Category, SubTask } from '../hooks/useAppStore';

type TaskModalProps = {
  task?: Task | null;
  categories: Category[];
  initialCategoryId?: string;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
};

export function TaskModal({ task, categories, initialCategoryId, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [dueTime, setDueTime] = useState(task?.dueTime || ''); // Empty string by default
  const [categoryId, setCategoryId] = useState(task?.categoryId || initialCategoryId || categories[0]?.id || '');
  
  const [subTasks, setSubTasks] = useState<SubTask[]>(task?.subTasks || []);
  const [newSubTask, setNewSubTask] = useState('');

  const handleAddSubTask = () => {
    if (newSubTask.trim().length === 0) return;
    setSubTasks([...subTasks, { id: `st-${Date.now()}`, title: newSubTask.trim(), completed: false }]);
    setNewSubTask('');
  };

  const handleDeleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
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
          <h2 className="text-xl font-bold text-[var(--app-text)]">
            {task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
          </h2>
          <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 transition-colors">
            <X size={20} className="text-[var(--app-text)]" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-1">Kategorie</label>
            <select 
              value={categoryId} 
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-neutral-800 text-black dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-1">Titel</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none"
              placeholder="Was ist zu tun?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-1">Notizen</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none min-h-[80px]"
              placeholder="Weitere Details..."
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-1">Fällig bis:</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-1">Uhrzeit:</label>
              <input 
                type="time" 
                value={dueTime} 
                onChange={e => setDueTime(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-black/10 dark:border-white/10">
            <label className="block text-sm font-medium text-[var(--app-text-muted)] mb-3">Checkliste</label>
            
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={newSubTask} 
                onChange={e => setNewSubTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSubTask()}
                className="flex-1 bg-black/5 dark:bg-white/5 border border-transparent focus:border-[var(--color-primary)] rounded-lg p-3 text-[var(--app-text)] outline-none text-sm"
                placeholder="Neuer Unterpunkt..."
              />
              <button 
                onClick={handleAddSubTask}
                className="bg-[var(--color-primary)] text-[var(--color-bg-dark)] px-4 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                disabled={newSubTask.trim().length === 0}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {subTasks.map(st => (
                  <motion.div 
                    key={st.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 px-3 rounded-lg"
                  >
                    <span className="text-sm text-[var(--app-text)] truncate mr-2">{st.title}</span>
                    <button 
                      onClick={() => handleDeleteSubTask(st.id)}
                      className="text-red-500/80 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

        </div>

        <div className="p-4 border-t border-black/10 dark:border-white/10 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-black/5 dark:bg-white/5 font-medium rounded-xl text-[var(--app-text-muted)] hover:bg-black/10 transition-colors"
          >
            Abbrechen
          </button>
          <button 
            onClick={() => onSave({ title, notes, dueDate, dueTime, categoryId, subTasks })}
            className="flex-1 py-3 bg-[var(--color-primary)] font-medium rounded-xl text-[var(--color-bg-dark)] hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Speichern
          </button>
        </div>
      </motion.div>
    </div>
  );
}
