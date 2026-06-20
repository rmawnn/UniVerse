import { Platform } from "react-native";

// ── API Configuration ───────────────────────────────────────
//
// Production / staging:
//   Set EXPO_PUBLIC_API_URL in your .env file or EAS build config.
//   Example: EXPO_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
//
// Local development (when EXPO_PUBLIC_API_URL is not set):
//   Android emulator:  10.0.2.2 routes to host machine's localhost
//   iOS simulator:     localhost works directly
//   Physical device:   set EXPO_PUBLIC_DEV_IP to your LAN IP
//                      (run `ipconfig` on Windows, `ifconfig` on Mac)

function getDevApiUrl(): string {
  const devIp = process.env.EXPO_PUBLIC_DEV_IP ?? "localhost";
  const host = Platform.select({
    android: "10.0.2.2",
    default: devIp,
  })!;
  return `http://${host}:8000/api/v1`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || getDevApiUrl();

const Config = {
  API_BASE_URL,
};

export default Config;
