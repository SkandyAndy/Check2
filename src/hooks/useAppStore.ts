import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language } from '../utils/i18n';

export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  categoryId: string;
  title: string;
  notes: string;
  dueDate: string | null; // e.g., "2025-11-16"
  dueTime: string | null; // e.g., "14:30"
  completed: boolean;
  subTasks: SubTask[];
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  isPinned?: boolean;
};

export type Category = {
  id: string;
  name: string;
};

type AppState = {
  categories: Category[];
  tasks: Task[];
  theme: 'dark' | 'light';
  language: Language;
  
  // Daily Popup Config
  dailyPopupEnabled: boolean;
  dailyPopupTime: string;
  lastPopupDate: string | null;
  
  // View Settings
  previewDays: number;
  showAllTasks: boolean;

  // Google Drive Sync
  driveConnected: boolean;
  lastSyncTimestamp: string | null;

  // Actions
  toggleTheme: () => void;
  toggleTask: (taskId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (categoryId: string) => void;
  setLanguage: (language: Language) => void;
  setPreviewDays: (days: number) => void;
  setShowAllTasks: (show: boolean) => void;
  setDailyPopupConfig: (enabled: boolean, time: string) => void;
  setLastPopupDate: (date: string) => void;
  setDriveConnected: (val: boolean) => void;
  setLastSyncTimestamp: (ts: string | null) => void;
};

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Willkommen 🚀' },
  { id: 'cat-2', name: 'Projektideen' },
  { id: 'cat-3', name: 'Einkauf' },
];

const defaultTasks: Task[] = [
  {
    id: 't-1',
    categoryId: 'cat-1',
    title: 'Tippe mich an, um Details zu sehen!',
    notes: 'Hey! Willkommen bei Check.\nDiese Aufgabe zeigt dir, wie Notizen aussehen. Hier kannst du alle deine wichtigen Gedanken niederschreiben.\n\nUnd weiter unten siehst du eine Checkliste zum interaktiven Abhaken!',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    dueTime: '10:00',
    completed: false,
    subTasks: [
      { id: 'st-1', title: 'Erkunde die App', completed: true },
      { id: 'st-2', title: 'Erstelle eine neue Kategorie', completed: false },
      { id: 'st-3', title: 'Schalte in den Dark Mode', completed: false },
    ]
  },
  {
    id: 't-2',
    categoryId: 'cat-1',
    title: 'Wische oder hake mich ab',
    notes: '',
    dueDate: new Date().toISOString().split('T')[0], // Today
    dueTime: '',
    completed: false,
    subTasks: []
  },
  {
    id: 't-3',
    categoryId: 'cat-2',
    title: 'Design-Konzept fertigstellen',
    notes: 'Die Farbpalette (Glassmorphismus) muss noch finalisiert werden.',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // In 3 days
    dueTime: '15:30',
    completed: false,
    subTasks: [
      { id: 'st-4', title: 'Fonts auswählen', completed: false },
      { id: 'st-5', title: 'Startseite Scribble', completed: false },
    ]
  }
];

const STORAGE_KEY = 'check_app_data_v2';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      categories: defaultCategories,
      tasks: defaultTasks,
      
      dailyPopupEnabled: false,
      dailyPopupTime: '09:00',
      lastPopupDate: null,
      previewDays: 7, 
      showAllTasks: true,
      driveConnected: false,
      lastSyncTimestamp: null,

      toggleTheme: () => set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: nextTheme };
      }),

      toggleTask: (taskId) => set((state) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return state;

        if (!task.completed && task.recurring && task.recurring !== 'none' && task.dueDate) {
          // Recurring logic: Update date and reset status
          const nextDate = new Date(task.dueDate);
          if (task.recurring === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          if (task.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          if (task.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          return {
            tasks: state.tasks.map(t => t.id === taskId ? {
              ...t,
              dueDate: nextDate.toISOString().split('T')[0],
              subTasks: t.subTasks.map(st => ({ ...st, completed: false }))
            } : t)
          };
        }

        return {
          tasks: state.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
      }),

      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, {
          ...task,
          id: `t-${Date.now()}`,
          completed: false,
          subTasks: task.subTasks || []
        }]
      })),

      updateTask: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      })),

      deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      })),

      toggleSubTask: (taskId, subTaskId) => set((state) => ({
        tasks: state.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subTasks: t.subTasks.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st)
          };
        })
      })),

      addCategory: (name) => set((state) => ({
        categories: [...state.categories, { id: `c-${Date.now()}`, name }]
      })),

      deleteCategory: (categoryId) => set((state) => ({
        categories: state.categories.filter(c => c.id !== categoryId),
        tasks: state.tasks.filter(t => t.categoryId !== categoryId)
      })),

      setLanguage: (language) => set({ language }),
      setPreviewDays: (days) => set({ previewDays: days }),
      setShowAllTasks: (show) => set({ showAllTasks: show }),

      setDailyPopupConfig: (enabled, time) => set({
        dailyPopupEnabled: enabled,
        dailyPopupTime: time
      }),

      setLastPopupDate: (date) => set({
        lastPopupDate: date
      }),

      setDriveConnected: (val) => set({ driveConnected: val }),
      setLastSyncTimestamp: (ts) => set({ lastSyncTimestamp: ts }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Apply theme right after hydration
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  )
);
