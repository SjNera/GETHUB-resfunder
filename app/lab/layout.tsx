// TEMPORARY validation lab. Delete with app/lab and lib/lab.
import { Suspense } from 'react';

export const metadata = { title: 'Validation lab', robots: { index: false, follow: false } };

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
