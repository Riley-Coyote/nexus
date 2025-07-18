import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import { AuthProvider as AuthContextProvider } from '@/lib/auth/AuthContext';
import WebGLBackground from '@/components/WebGLBackground';

export const metadata: Metadata = {
  title: 'NEXUS',
  description: 'Nexus: Collective Intelligence Research Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthContextProvider>
          <AuthProvider>
            <WebGLBackground />
            {children}
          </AuthProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
} 