import type { Category, Task } from '../hooks/useAppStore';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import { useAppStore } from '../hooks/useAppStore';
import { translations } from '../utils/i18n';

type CategoryCardProps = {
  category: Category;
  tasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddClick: () => void;
  onTaskToggle: (id: string) => void;
  onDeleteClick?: () => void;
  onDeleteTask?: (id: string) => void;
  onEditTask?: (task: Task) => void;
};

export function CategoryCard({ category, tasks, isExpanded, onToggleExpand, onAddClick, onTaskToggle, onDeleteClick, onDeleteTask, onEditTask }: CategoryCardProps) {
  const { language } = useAppStore();
  const t = translations[language];
  const categoryTasks = tasks.filter(t => t.categoryId === category.id);
  const openTasks = categoryTasks.filter(t => !t.completed);
  const totalTasks = categoryTasks.length;

  const sortedTasks = [...categoryTasks].sort((a, b) => {
    // Bring completed tasks to bottom
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    // Sort rest by date
    const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    if (!timeA && !timeB) return b.id.localeCompare(a.id);
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeA - timeB;
  });

  return (
    <motion.div 
      className="bg-[var(--app-card)] rounded-xl shadow-sm border border-black/5 dark:border-white/5 mb-3 overflow-hidden"
    >
      <div 
        onClick={onToggleExpand}
        className="p-4 flex items-center justify-between cursor-pointer active:bg-black/5 dark:active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-[var(--app-text)]">{category.name}</h3>
          {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteClick?.(); }}
            className="text-[var(--app-text-muted)] hover:text-red-500 transition-colors p-1"
          >
            <Trash2 size={18} />
          </button>
          <div className="bg-black/5 dark:bg-white/5 text-[var(--app-text-muted)] text-sm font-bold px-3 py-1 rounded-full">
            {openTasks.length}/{totalTasks}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onAddClick(); }}
            className="bg-[var(--color-primary)] text-[var(--color-bg-dark)] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-2"
          >
            {sortedTasks.length === 0 ? (
              <p className="text-sm text-[var(--app-text-muted)] py-4 text-center">{t.noTasks}</p>
            ) : (
              sortedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  category={category} 
                  onToggle={onTaskToggle} 
                  onDelete={() => onDeleteTask?.(task.id)}
                  onEdit={() => onEditTask?.(task)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
