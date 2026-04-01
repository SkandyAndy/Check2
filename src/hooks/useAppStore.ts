import { useState, useEffect, useCallback } from 'react';

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
};

export type Category = {
  id: string;
  name: string;
};

import type { Language } from '../utils/i18n';

type AppState = {
  categories: Category[];
  tasks: Task[];
  theme: 'dark' | 'light';
  language: Language;
};

const defaultState: AppState = {
  theme: 'dark',
  language: 'en',
  categories: [
    { id: 'cat-1', name: 'Willkommen 🚀' },
    { id: 'cat-2', name: 'Projektideen' },
    { id: 'cat-3', name: 'Einkauf' },
  ],
  tasks: [
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
      notes: 'Die Farbpalette (Glassmorphismus) muss noch финаlisiert werden.',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // In 3 days
      dueTime: '15:30',
      completed: false,
      subTasks: [
        { id: 'st-4', title: 'Fonts auswählen', completed: false },
        { id: 'st-5', title: 'Startseite Scribble', completed: false },
      ]
    }
  ]
};

const STORAGE_KEY = 'check_app_data_v2';

export function useAppStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Apply theme
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const toggleTheme = useCallback(() => {
    setState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }));
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'completed'>) => {
    const newTask: Task = {
      ...task,
      id: `t-${Date.now()}`,
      completed: false,
      subTasks: task.subTasks || []
    };
    setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }));
  }, []);

  const toggleSubTask = useCallback((taskId: string, subTaskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subTasks: t.subTasks.map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st)
        };
      })
    }));
  }, []);

  const addCategory = useCallback((name: string) => {
    const newCat: Category = {
      id: `c-${Date.now()}`,
      name
    };
    setState(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId),
      tasks: prev.tasks.filter(t => t.categoryId !== categoryId) // Cascade delete
    }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setState(prev => ({ ...prev, language }));
  }, []);

  return {
    ...state,
    toggleTheme,
    toggleTask,
    addTask,
    updateTask,
    deleteTask,
    toggleSubTask,
    addCategory,
    deleteCategory,
    setLanguage
  };
}
