import MapClient from '@/components/MapClient';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Rota dos Pequenos</h1>
      <MapClient />
    </main>
  );
}