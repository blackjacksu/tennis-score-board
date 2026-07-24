// Event details shared by every generator in this folder, so the sign-in
// sheet, the schedule poster and the QR sheet never drift apart.
export const EVENT_NAME = "TAA Tennis Team Tournament";
export const EVENT_NAME_ZH = "TAA 網球團體賽";
export const EVENT_DATE = "2026-07-23";

// Where the deployed scoreboard lives — what the printed QR code resolves to.
// Override for a one-off run with BASE_URL=https://… npm run gen:qr
export const BASE_URL = process.env.BASE_URL ?? "https://anyone-can-be-roger.com";
