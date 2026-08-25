import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export function getApiUrls(): string[] {
  const urls: string[] = [];

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      urls.push(`http://${window.location.hostname}:3000`);
    }
    urls.push('http://localhost:3000');
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    urls.push(process.env.EXPO_PUBLIC_API_URL);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      urls.push(`http://${ip}:3000`);
    }
  }

  // Developer local Wi-Fi LAN IP fallback for physical devices
  if (!urls.includes('http://192.168.1.69:3000')) {
    urls.push('http://192.168.1.69:3000');
  }

  const extra = Constants.expoConfig?.extra;
  if (extra?.apiUrl && !urls.includes(extra.apiUrl)) {
    urls.push(extra.apiUrl);
  }

  if (Platform.OS === 'android') {
    if (!urls.includes('http://10.0.2.2:3000')) {
      urls.push('http://10.0.2.2:3000');
    }
  }

  if (Platform.OS === 'web') {
    if (!urls.includes('http://localhost:3000')) {
      urls.push('http://localhost:3000');
    }
  }

  return urls;
}

export function getApiUrl(): string {
  return getApiUrls()[0] || 'http://192.168.1.69:3000';
}

export const API_URL = getApiUrl();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

export async function api<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<{ data: T | null; error: string | null }> {
  const { method = 'GET', body, headers = {} } = options;

  const allHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    allHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const urlsToTry = getApiUrls();
  let lastError = 'Network connection unavailable.';

  for (const baseUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: allHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: data.error || 'Server error' };
      }

      return { data, error: null };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastError = 'Connection timed out.';
      } else {
        lastError = 'Unable to connect to server.';
      }
    }
  }

  return { data: null, error: lastError };
}

export async function uploadFile(
  endpoint: string,
  uriOrFile: string | File,
  fieldName: string = 'file'
): Promise<{ data: { url: string; filename?: string } | null; error: string | null }> {
  const urlsToTry = getApiUrls();

  // Native Android & iOS upload using official expo-file-system/legacy
  if (Platform.OS !== 'web' && typeof uriOrFile === 'string') {
    let lastError: string | null = null;
    let FileSystemLegacy: any = null;

    try {
      FileSystemLegacy = require('expo-file-system/legacy');
    } catch (e) {
      console.warn('[Upload] Failed to load expo-file-system/legacy:', e);
    }

    if (FileSystemLegacy && typeof FileSystemLegacy.uploadAsync === 'function') {
      for (const baseUrl of urlsToTry) {
        try {
          const uploadUrl = `${baseUrl}${endpoint}`;
          const headers: Record<string, string> = {};
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }

          const response = await FileSystemLegacy.uploadAsync(uploadUrl, uriOrFile, {
            httpMethod: 'POST',
            uploadType: FileSystemLegacy.FileSystemUploadType?.MULTIPART ?? 0,
            fieldName,
            headers,
          });

          if (response.status >= 200 && response.status < 300) {
            const data = JSON.parse(response.body);
            return { data, error: null };
          } else {
            try {
              const errData = JSON.parse(response.body);
              lastError = errData.error || `Upload failed with status ${response.status}`;
            } catch {
              lastError = `Upload failed with status ${response.status}`;
            }
          }
        } catch (err: any) {
          lastError = err?.message || 'Connection failed';
        }
      }
      return { data: null, error: lastError || 'Upload failed. Check your connection.' };
    }
  }

  // Web platform & fallback using standard FormData
  const formData = new FormData();
  if (typeof uriOrFile === 'string') {
    if (uriOrFile.startsWith('blob:') || uriOrFile.startsWith('data:')) {
      try {
        const res = await fetch(uriOrFile);
        const blob = await res.blob();
        const ext = blob.type.includes('video') ? 'mp4' : blob.type.includes('audio') ? 'm4a' : blob.type.includes('png') ? 'png' : 'jpg';
        const filename = `file_${Date.now()}.${ext}`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append(fieldName, file);
      } catch {
        formData.append(fieldName, uriOrFile);
      }
    } else {
      formData.append(fieldName, uriOrFile);
    }
  } else {
    formData.append(fieldName, uriOrFile as File);
  }

  let lastError: string | null = null;
  for (const baseUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        return { data, error: null };
      } else {
        lastError = data.error || `Upload failed with status ${response.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || 'Connection failed';
    }
  }
  return { data: null, error: lastError || 'Upload failed. Check your connection.' };
}
