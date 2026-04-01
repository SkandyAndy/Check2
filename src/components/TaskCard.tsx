import { useState } from 'react';
import type { Task, Category } from '../hooks/useAppStore';
import { Calendar, CheckSquare, Square, Edit, Trash2, FileText, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../hooks/useAppStore';

type TaskCardProps = {
  task: Task;
  category: Category;
  onToggle: (id: string) => void;
  onDelete?: () => void;
  onEdit?: () => void;
};

export function TaskCard({ task, category, onToggle, onDelete, onEdit }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toggleSubTask } = useAppStore();

  const completedSubtasks = task.subTasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subTasks?.length || 0;

  // Format date and time
  let dateText = '';
  if (task.dueDate) {
    dateText = new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (task.dueTime) {
      dateText += ` ${task.dueTime} Uhr`;
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={!isExpanded ? { scale: 1.01 } : {}}
      className={`bg-[var(--app-card)] p-4 rounded-xl shadow-sm border ${task.completed ? 'border-transparent opacity-60' : 'border-black/5 dark:border-white/5'} mb-3 overflow-hidden cursor-pointer`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex gap-4">
        {/* Checkbox Trigger */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className="mt-1 flex-shrink-0 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
        >
          {task.completed ? <CheckSquare size={24} /> : <Square size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              {category?.name || 'Unbekannt'}
            </span>
          </div>

          <h3 className={`text-lg font-medium leading-tight ${task.completed ? 'line-through text-[var(--app-text-muted)]' : 'text-[var(--app-text)]'}`}>
            {task.title}
          </h3>

          {/* Compact Meta Row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {dateText && (
              <div className={`flex items-center text-xs font-medium px-2 py-0.5 rounded ${task.completed ? 'bg-black/5 dark:bg-white/5 text-[var(--app-text-muted)]' : 'bg-red-500/10 text-red-500/80'}`}>
                <Calendar size={12} className="mr-1" />
                {dateText}
              </div>
            )}
            
            {!isExpanded && task.notes && (
              <div className="text-[var(--app-text-muted)] opacity-60">
                <FileText size={16} />
              </div>
            )}

            {!isExpanded && totalSubtasks > 0 && (
              <div className="flex items-center text-xs text-[var(--app-text-muted)] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded font-medium">
                <ListTodo size={12} className="mr-1" />
                {completedSubtasks}/{totalSubtasks}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pl-10"
            onClick={(e) => e.stopPropagation()} // Prevent clicking details from closing card
          >
            {task.notes && (
              <div className="text-sm text-[var(--app-text-muted)] whitespace-pre-wrap mb-4 bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-black/5 dark:border-white/5">
                {task.notes}
              </div>
            )}

            {totalSubtasks > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">Checkliste ({completedSubtasks}/{totalSubtasks})</h4>
                {task.subTasks.map(st => (
                  <button 
                    key={st.id}
                    onClick={() => toggleSubTask(task.id, st.id)}
                    className="flex w-full text-left items-start gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="mt-0.5 flex-shrink-0 text-[var(--color-primary)]">
                      {st.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <span className={`text-sm ${st.completed ? 'line-through text-[var(--app-text-muted)]' : 'text-[var(--app-text)]'}`}>
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(); setIsExpanded(false); }}
                className="flex flex-1 items-center justify-center gap-2 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors font-medium text-sm"
              >
                <Edit size={16} /> Bearbeiten
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="flex px-4 items-center justify-center gap-2 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors font-medium text-sm"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
