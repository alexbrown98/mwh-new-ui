import Link from 'next/link';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6">
      <Link href={'/dashboard'}> Dashboard</Link>
    </main>
  );
}
