import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#173f78" />
        <path d="M14 20 L24 12 L34 20" stroke="#c62828" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M18 17 L27 17 L31 20 L18 20 Z" fill="white" />
        <path d="M16 23 H24 V27 H32 V36 H16 Z" fill="#1e8e4e" />
      </svg>
    ),
    { ...size },
  );
}
