
"use client"; // Required for useState

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { GenieLampIcon } from '@/components/icons/logo-icon';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export function MagicHeader() {
  const { toast } = useToast();
  // Nav items removed as per request
  // const navItems = [
  //   { name: 'Outils (Lampe)', href: '/' },
  //   { name: 'Étincelles', href: '/sparks' },
  // ];

  const [isOnline, setIsOnline] = useState(true); 
  
  const toggleOnlineStatus = () => {
    // This is a placeholder. Actual logic will be much more complex.
    // setIsOnline(!isOnline); 
    toast({
      title: "Mode de Synchronisation",
      description: "La fonctionnalité de basculement Hors ligne / En ligne et la synchronisation des données seront implémentées prochainement.",
      duration: 5000,
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <GenieLampIcon className="h-7 w-7" />
          <span>Easy Genie</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
          {/* {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {item.name}
            </Link>))} */}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleOnlineStatus} 
            title={isOnline ? "Mode actuel : En Ligne (cliquer pour détails)" : "Mode actuel : Hors Ligne (cliquer pour détails)"}
            className="w-32"
          >
            {isOnline ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4 text-destructive" />}
            {isOnline ? 'En Ligne' : 'Hors Ligne'}
          </Button>
        </nav>

        <div className="md:hidden flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleOnlineStatus} 
            title={isOnline ? "Mode actuel : En Ligne" : "Mode actuel : Hors Ligne"}
            className="md:hidden"
          >
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            <span className="sr-only">{isOnline ? 'Mode En Ligne' : 'Mode Hors Ligne'}</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col space-y-4 pt-6">
                {/* Mobile nav items removed as corresponding desktop items were removed */}
                {/* {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-lg font-medium transition-colors hover:text-primary"
                >
                  {item.name}
                </Link>))} */}
                 <p className="text-muted-foreground text-center p-4">
                   Navigation principale simplifiée. Accédez aux outils via la page d'accueil.
                 </p>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
