import { Platform, Alert, Linking } from 'react-native';

function getLocationModule() {
  try {
    return require('expo-location');
  } catch {
    return null;
  }
}

function getImagePickerModule() {
  try {
    return require('expo-image-picker');
  } catch {
    return null;
  }
}

function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export function openAppSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const Location = getLocationModule();
  if (!Location) return true; // Web or mock fallback
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Location permission request failed:', err);
    return false;
  }
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const ImagePicker = getImagePickerModule();
  if (!ImagePicker) return true;
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Media library permission request failed:', err);
    return false;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  const ImagePicker = getImagePickerModule();
  if (!ImagePicker) return true;
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Camera permission request failed:', err);
    return false;
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  const ImagePicker = getImagePickerModule();
  if (!ImagePicker || !ImagePicker.requestMicrophonePermissionsAsync) return true;
  try {
    const { status } = await ImagePicker.requestMicrophonePermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Microphone permission request failed:', err);
    return false;
  }
}

export async function requestNotificationsPermission(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return true;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Notifications permission request failed:', err);
    return false;
  }
}

export async function checkAllRequiredPermissions(): Promise<{
  location: boolean;
  storage: boolean;
  camera: boolean;
  microphone: boolean;
  allGranted: boolean;
}> {
  const Location = getLocationModule();
  const ImagePicker = getImagePickerModule();

  let location = true;
  let storage = true;
  let camera = true;
  let microphone = true;

  if (Location) {
    const res = await Location.getForegroundPermissionsAsync();
    location = res.status === 'granted';
  }

  if (ImagePicker) {
    const photoRes = await ImagePicker.getMediaLibraryPermissionsAsync();
    storage = photoRes.status === 'granted';

    const camRes = await ImagePicker.getCameraPermissionsAsync();
    camera = camRes.status === 'granted';

    if (ImagePicker.getMicrophonePermissionsAsync) {
      const micRes = await ImagePicker.getMicrophonePermissionsAsync();
      microphone = micRes.status === 'granted';
    }
  }

  return {
    location,
    storage,
    camera,
    microphone,
    allGranted: location && storage && camera && microphone,
  };
}
