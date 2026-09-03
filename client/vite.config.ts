import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rzpKeyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID || '';
  const apiUrl = process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || process.env.API_URL || env.VITE_API_BASE_URL || env.VITE_API_URL || env.API_URL || '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(rzpKeyId),
      ...(apiUrl ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiUrl) } : {}),
    },
  };
});

