import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  /** Temporary URI of the resized JPEG. */
  uri: string;
  base64: string;
}

/** Long edge of stored photos. Small enough for fast AI analysis, sharp enough to read a dish. */
const MAX_EDGE = 1024;

/**
 * Opens the camera (or gallery) and returns a resized JPEG.
 * Returns null when the user cancels; throws a user-facing message when permission is denied.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(source === 'camera' ? 'Izin kamera ditolak.' : 'Izin galeri ditolak.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? null : res.assets?.[0];
  if (!asset) return null;

  const landscape = (asset.width ?? 0) >= (asset.height ?? 0);
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize(landscape ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  const image = await context.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return { uri: out.uri, base64: out.base64 ?? '' };
}

/** Copies a temporary photo into app storage so it survives cache clears. */
export async function persistPhoto(tempUri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'expense-photos');
  dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, `${Crypto.randomUUID()}.jpg`);
  await new File(tempUri).copy(target);
  return target.uri;
}

export function deletePhoto(uri: string | undefined) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing photo must never block deleting the transaction.
  }
}
