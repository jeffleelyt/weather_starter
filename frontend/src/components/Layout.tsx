import { Sidebar } from './Sidebar';
import { Hero } from './Hero';
import { ThemeSelector } from './ThemeSelector';

export function Layout() {
  return (
    <div className="flex h-full min-h-screen w-full">
      <Sidebar />
      <Hero />
      <div className="pointer-events-none fixed right-4 top-4 z-[1900] sm:right-6 sm:top-5">
        <div className="pointer-events-auto">
          <ThemeSelector />
        </div>
      </div>
    </div>
  );
}
