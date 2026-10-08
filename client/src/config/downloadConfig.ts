/**
 * PrintHub Shop Partner Desktop App Download Configuration
 * 
 * You can update this download URL anytime!
 * Paste your Google Drive link, OneDrive link, GitHub Release URL, or hosting URL here.
 * You can also set VITE_DESKTOP_DOWNLOAD_URL in your Vercel Environment Variables.
 */
export const DESKTOP_DOWNLOAD_CONFIG = {
  // Primary .exe Download URL (Google Drive / OneDrive / GitHub Releases / Direct Link)
  downloadUrl: (import.meta.env.VITE_DESKTOP_DOWNLOAD_URL as string) || '/downloads/PrintHub-Shop-Setup.exe',

  // Optional .zip Download URL (for sharing without email/chat antivirus blocking)
  zipDownloadUrl: (import.meta.env.VITE_DESKTOP_ZIP_URL as string) || '/downloads/PrintHub-Shop-Partner-Setup.zip',

  fileName: 'PrintHub-Shop-Partner-Setup.exe',
  version: '1.0.0',
  fileSize: '335 MB',
  os: 'Windows 10 / 11 (64-bit)'
};
