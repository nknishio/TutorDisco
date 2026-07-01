import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BACKUP_MIME = 'application/json';

/** Share/download a backup JSON file. Native: share sheet. Web: browser download. */
export const shareBackupFile = async (content: string, filename: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: BACKUP_MIME });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: BACKUP_MIME,
      dialogTitle: 'Save backup',
    });
  }
};

/** Open a file picker on web and return the chosen file's text content, or null if cancelled. */
export const pickBackupFileOnWeb = (): Promise<string | null> =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
