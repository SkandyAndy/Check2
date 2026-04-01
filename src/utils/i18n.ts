export const translations = {
  de: {
    // App.tsx
    openTasksTitle: 'Alle offenen\nAufgaben',
    open: 'offen',
    allDone: 'Alles erledigt! 🎉',
    newCategoryPrompt: 'Name der neuen Liste:',
    newCategoryBtn: 'Neue Liste erstellen',

    // CategoryCard.tsx
    noTasks: 'Keine Aufgaben in dieser Kategorie.',
    delCategoryConfirm: 'Möchtest du diese Liste wirklich löschen? Alle zugehörigen Aufgaben gehen verloren.',

    // TaskCard.tsx
    unknown: 'Unbekannt',
    checklist: 'Checkliste',
    edit: 'Bearbeiten',
    delTaskConfirm: 'Aufgabe wirklich löschen?',
    duePrefix: 'Fällig:',
    clockSuffix: 'Uhr',

    // TaskModal.tsx
    editTaskTitle: 'Aufgabe bearbeiten',
    newTaskTitle: 'Neue Aufgabe',
    categoryLbl: 'Kategorie',
    titleLbl: 'Titel',
    titlePlaceholder: 'Was ist zu tun?',
    notesLbl: 'Notizen',
    notesPlaceholder: 'Weitere Details...',
    dueLbl: 'Fällig bis:',
    timeLbl: 'Uhrzeit:',
    checklistLbl: 'Checkliste',
    subTaskPlaceholder: 'Neuer Unterpunkt...',
    cancel: 'Abbrechen',
    save: 'Speichern',

    // SettingsModal.tsx
    settings: 'Einstellungen',
    languageLbl: 'Sprache',
    themeLbl: 'Erscheinungsbild',
    dark: 'Dunkel',
    light: 'Hell',
    systemBackupTitle: 'System-Sicherung (Hintergrund)',
    systemBackupDesc: 'Diese App arbeitet 100% lokal. Um Datenverlust vorzubeugen, spiegelt dein Smartphone die lokalen Daten unsichtbar in dein Cloud-Konto. Bei Gerätewechsel wird das Profil automatisch geladen.',
    manualBackupTitle: 'Manuelles Backup (100% Kontrolle)',
    manualBackupDesc: 'Sichere all deine Aufgaben als handfeste Datei. Du wählst im nächsten Schritt exakt aus, wo (.json Datei speichern).',
    btnExport: 'Datei manuell speichern (.json)',
    restoreTitle: 'Daten-Wiederherstellung',
    restoreDesc: 'Importiere eine zuvor exportierte Backup-Datei. (Überschreibt aktuelle Daten)',
    btnImport: 'Backup importieren',
    importSuccess: 'Backup erfolgreich geladen! Bitte lade die App neu.',
    invalidFormat: 'Dateiformat ungültig.',
    exportError: 'Fehler beim Exportieren',
  },
  en: {
    // App.tsx
    openTasksTitle: 'All Open\nTasks',
    open: 'open',
    allDone: 'All done! 🎉',
    newCategoryPrompt: 'Name of the new list:',
    newCategoryBtn: 'Create new list',

    // CategoryCard.tsx
    noTasks: 'No tasks in this category.',
    delCategoryConfirm: 'Do you really want to delete this list? All associated tasks will be lost.',

    // TaskCard.tsx
    unknown: 'Unknown',
    checklist: 'Checklist',
    edit: 'Edit',
    delTaskConfirm: 'Really delete task?',
    duePrefix: 'Due:',
    clockSuffix: '', // English usually just says PM/AM or 14:00, no 'Uhr'

    // TaskModal.tsx
    editTaskTitle: 'Edit task',
    newTaskTitle: 'New task',
    categoryLbl: 'Category',
    titleLbl: 'Title',
    titlePlaceholder: 'What needs to be done?',
    notesLbl: 'Notes',
    notesPlaceholder: 'More details...',
    dueLbl: 'Due date:',
    timeLbl: 'Time:',
    checklistLbl: 'Checklist',
    subTaskPlaceholder: 'New subtask...',
    cancel: 'Cancel',
    save: 'Save',

    // SettingsModal.tsx
    settings: 'Settings',
    languageLbl: 'Language',
    themeLbl: 'Appearance',
    dark: 'Dark',
    light: 'Light',
    systemBackupTitle: 'System Backup (Background)',
    systemBackupDesc: 'This app works 100% locally. To prevent data loss, your smartphone silently mirrors local data into your cloud account. Profiles are automatically restored when switching devices.',
    manualBackupTitle: 'Manual Backup (100% Control)',
    manualBackupDesc: 'Secure all your tasks as a solid file. You choose exactly where to save it (.json).',
    btnExport: 'Save file manually (.json)',
    restoreTitle: 'Data Restoration',
    restoreDesc: 'Import a previously exported backup file. (Overwrites current data)',
    btnImport: 'Import backup',
    importSuccess: 'Backup successfully loaded! Please reload the app.',
    invalidFormat: 'Invalid file format.',
    exportError: 'Error during export',
  }
};

export type Language = 'de' | 'en';
