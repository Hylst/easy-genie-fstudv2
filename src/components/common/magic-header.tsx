import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Sparkles } from 'lucide-react';
import { GenieLampIcon } from '@/components/icons/logo-icon';

export function MagicHeader() {
  const navItems = [
    { name: 'Outils (Lampe)', href: '/' },
    { name: 'Étincelles', href: '/sparks' }, // Placeholder link
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <GenieLampIcon className="h-7 w-7" />
          <span>Easy Genie</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {item.name}
            </Link>))}
          {/* Placeholder for Login/User when auth is added */}
          {/* <Button variant="outline" size="sm">Connexion</Button> */}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col space-y-4 pt-6">
                {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {item.name}
                </Link>))}
                {/* <Button variant="outline" className="w-full mt-4">Connexion</Button> */}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
