import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from './useAppStore';

export function useNotifications(tasks: Task[]) {
  useEffect(() => {
    async function requestPermissions() {
      // Check and request permissions
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    }
    
    async function scheduleNotifications() {
      // Clear all existing to prevent duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }

      // Schedule for uncompleted tasks with due dates
      const notificationsToSchedule = tasks
        .filter(t => !t.completed && t.dueDate)
        .map(t => {
          // Parse due date, let's notify at specified time or 9 AM
          const date = new Date(t.dueDate!);
          
          if (t.dueTime) {
            const [hours, minutes] = t.dueTime.split(':').map(n => parseInt(n, 10));
            date.setHours(hours || 9, minutes || 0, 0, 0);
          } else {
            date.setHours(9, 0, 0, 0);
          }

          // If due date is already past, don't schedule
          if (date.getTime() < Date.now()) return null;

          return {
            title: 'Aufgabe fällig: Check',
            body: t.title,
            id: Math.abs(t.id.hashCode() || Math.floor(Math.random() * 100000)), // Needs numeric ID
            schedule: { at: date },
          };
        })
        .filter(n => n !== null) as any[];

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
      }
    }

    // Add string hashCode helper if not exists
    if (!String.prototype.hashCode) {
      String.prototype.hashCode = function() {
        let hash = 0,
          i, chr;
        if (this.length === 0) return hash;
        for (i = 0; i < this.length; i++) {
          chr = this.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
    }

    requestPermissions().then(() => scheduleNotifications());
    
  }, [tasks]); // Re-run when tasks change
}

// Ensure TypeScript knows about hashCode
declare global {
  interface String {
    hashCode(): number;
  }
}
