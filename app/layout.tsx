import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saigon Night',
  description: 'Professional 8-Layer Audio Mixer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}