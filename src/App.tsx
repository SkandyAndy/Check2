import { useState } from 'react';
import { useAppStore } from './hooks/useAppStore';
import { useNotifications } from './hooks/useNotifications';
import { TaskCard } from './components/TaskCard';
import { CategoryCard } from './components/CategoryCard';
import { TaskModal } from './components/TaskModal';
import { SettingsModal } from './components/SettingsModal';
import { Plus, Settings, Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from './hooks/useAppStore';
import { translations } from './utils/i18n';

function App() {
  const { tasks, categories, theme, language, toggleTheme, toggleTask, addTask, updateTask, deleteTask, addCategory, deleteCategory } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [taskModalState, setTaskModalState] = useState<{isOpen: boolean, task: Task | null, categoryId?: string}>({ isOpen: false, task: null });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const t = translations[language];

  // Register automated push notifications based on due dates
  useNotifications(tasks);

  const openTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    if (!timeA && !timeB) return b.id.localeCompare(a.id);
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeA - timeB;
  });

  const sortedCategories = [...categories].sort((a, b) => {
    const aOpen = tasks.filter(t => t.categoryId === a.id && !t.completed).length;
    const bOpen = tasks.filter(t => t.categoryId === b.id && !t.completed).length;
    if (aOpen === 0 && bOpen > 0) return 1;
    if (bOpen === 0 && aOpen > 0) return -1;
    return 0;
  });

  return (
    <div className="min-h-screen pb-24 p-4 max-w-md mx-auto transition-colors duration-300">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-3xl font-extrabold text-[var(--color-primary)] font-sans tracking-tight">Check</h1>
        <div className="flex gap-3 text-[var(--app-text-muted)]">
          <button onClick={toggleTheme} className="p-1 hover:text-[var(--color-primary)] transition-colors">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <button onClick={() => setIsSettingsOpen(true)} className="p-1 hover:text-[var(--color-primary)] transition-colors">
            <Settings size={22} />
          </button>
          <button onClick={() => setTaskModalState({isOpen: true, task: null})} className="bg-[var(--color-primary)] text-[var(--color-bg-dark)] w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-primary-dark)] transition-colors ml-1">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <section className="bg-[var(--app-card)] p-4 rounded-xl shadow-sm border border-black/5 dark:border-white/5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--app-text)] leading-tight whitespace-pre-line">{t.openTasksTitle}</h2>
          <div className="flex items-center gap-3">

            <div className="bg-black/5 dark:bg-white/5 text-[var(--app-text-muted)] text-sm font-bold w-12 h-12 flex flex-col items-center justify-center rounded-full">
              <span className="leading-none">{openTasks.length}</span>
              <span className="text-[9px] font-normal leading-none">{t.open}</span>
            </div>
            <button onClick={() => setTaskModalState({isOpen: true, task: null})} className="bg-[var(--color-primary)] text-[var(--color-bg-dark)] w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-primary-dark)] transition-colors shadow-lg shadow-green-500/20">
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {openTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                category={categories.find(c => c.id === task.categoryId)!} 
                onToggle={toggleTask}
                onDelete={() => {
                  if (window.confirm(t.delTaskConfirm)) {
                    deleteTask(task.id);
                  }
                }}
                onEdit={() => setTaskModalState({isOpen: true, task, categoryId: task.categoryId})}
              />
            ))}
          </AnimatePresence>
        </div>
        
        {openTasks.length === 0 && (
          <p className="text-center text-[var(--app-text-muted)] py-4">{t.allDone}</p>
        )}
      </section>

      <section>
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {sortedCategories.map(cat => (
              <motion.div key={cat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CategoryCard 
                  category={cat} 
                  tasks={tasks}
                  isExpanded={expandedCategory === cat.id}
                  onToggleExpand={() => setExpandedCategory(prev => prev === cat.id ? null : cat.id)}
                  onTaskToggle={toggleTask}
                  onAddClick={() => setTaskModalState({isOpen: true, task: null, categoryId: cat.id})}
                  onDeleteClick={() => {
                    const confirmMsg = t.delCategoryConfirm;
                    if (window.confirm(confirmMsg)) {
                      deleteCategory(cat.id);
                    }
                  }}
                  onDeleteTask={(taskId) => {
                    const confirmMsg = t.delTaskConfirm;
                    if (window.confirm(confirmMsg)) {
                      deleteTask(taskId);
                    }
                  }}
                  onEditTask={(task) => setTaskModalState({isOpen: true, task, categoryId: cat.id})}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          <button
            onClick={() => {
              const name = window.prompt(t.newCategoryPrompt);
              if (name && name.trim().length > 0) {
                addCategory(name.trim());
              }
            }}
            className="w-full py-4 mt-2 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl text-[var(--app-text-muted)] font-bold flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Plus size={20} className="mr-2" /> {t.newCategoryBtn}
          </button>
        </motion.div>
      </section>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        )}
        
        {taskModalState.isOpen && (
          <TaskModal 
            task={taskModalState.task} 
            categories={categories}
            initialCategoryId={taskModalState.categoryId}
            onClose={() => setTaskModalState({ isOpen: false, task: null })}
            onSave={(taskData) => {
              if (taskModalState.task) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                updateTask(taskModalState.task.id, taskData);
              } else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                addTask(taskData); 
              }
              setTaskModalState({ isOpen: false, task: null });
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
