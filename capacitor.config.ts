import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neuraldeck.app",
  appName: "NEURAL//DECK",
  webDir: "dist",
  backgroundColor: "#080A12",
  android: {
    backgroundColor: "#080A12",
  },
  plugins: {
    SystemBars: {
      // index.html deliberately has no viewport-fit=cover, so Capacitor pads the WebView
      // by the status/navigation bar (and keyboard) insets instead of drawing under them.
      insetsHandling: "css",
      // The bars sit on the dark deck background (android:windowBackground), so always use
      // light status/navigation icons regardless of the phone's light/dark setting.
      style: "DARK",
    },
  },
};

export default config;
