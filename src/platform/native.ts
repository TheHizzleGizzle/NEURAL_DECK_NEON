import { Capacitor } from "@capacitor/core";

/**
 * True when running inside the Capacitor Android/iOS shell (the APK).
 * There is no Express server on device, so native builds talk to AI
 * providers directly with the user's own API keys.
 */
export const IS_NATIVE = Capacitor.isNativePlatform();

/**
 * Save a text file. Browsers get a normal download; inside the native app
 * (where <a download> on a blob URL silently does nothing) the file is
 * written to the app cache and handed to the Android share sheet so the
 * user can save it to Files/Drive or send it to another app.
 *
 * Returns "downloaded", "shared", or "cancelled" (user dismissed the sheet).
 */
export async function saveTextFile(
  filename: string,
  text: string,
  mimeType: string
): Promise<"downloaded" | "shared" | "cancelled"> {
  if (!IS_NATIVE) {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "downloaded";
  }

  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  const written = await Filesystem.writeFile({
    path: filename,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  try {
    await Share.share({ title: filename, files: [written.uri] });
    return "shared";
  } catch (err) {
    // The Share plugin rejects with "Share canceled" when the sheet is dismissed.
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(msg)) return "cancelled";
    throw err;
  }
}

/** Copy text to the clipboard (native clipboard inside the app, async Clipboard API on web). */
export async function copyText(text: string): Promise<void> {
  if (IS_NATIVE) {
    const { Clipboard } = await import("@capacitor/clipboard");
    await Clipboard.write({ string: text });
    return;
  }
  await navigator.clipboard.writeText(text);
}
