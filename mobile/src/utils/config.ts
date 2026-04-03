import { Platform } from "react-native";

// ── API Configuration ───────────────────────────────────────
// Android emulator:  10.0.2.2 routes to host machine's localhost
// iOS simulator:     localhost works directly
// Physical device:   set DEVICE_IP to your machine's LAN IP
//                    (run `ipconfig` on Windows, `ifconfig` on Mac)

const DEVICE_IP = "localhost"; // Change this for physical devices

const API_HOST = Platform.select({
  android: "10.0.2.2",
  default: DEVICE_IP,
});

const Config = {
  API_BASE_URL: `http://${API_HOST}:8000/api/v1`,
};

export default Config;
