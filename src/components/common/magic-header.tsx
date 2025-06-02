
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Wifi, WifiOff, LogIn, UserPlus, LogOut, UserCircle2 } from 'lucide-react';
import { GenieLampIcon } from '@/components/icons/logo-icon';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export function MagicHeader() {
  const { toast } = useToast();
  const { user, session, loading, signOut } = useAuth(); // Get auth state and signOut function

  // The isOnline state should eventually come from a global appDataService
  // For now, it's just a local UI placeholder state for the button's appearance.
  // We'll assume 'true' if logged in and capable of going online, 'false' otherwise for visual cue.
  const isOnlineForDisplay = !!user; 
  
  const toggleOnlineStatus = () => {
    toast({
      title: "Mode de Synchronisation",
      description: "La fonctionnalité de basculement Hors ligne / En ligne et la synchronisation des données seront implémentées prochainement.",
      duration: 5000,
    });
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Déconnecté",
        description: "Vous avez été déconnecté avec succès.",
      });
      // No explicit redirect here, onAuthStateChange should handle UI updates.
    }
  };

  const AuthLinksDesktop = () => {
    if (loading) {
      return (
        <>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </>
      );
    }
    if (user && session) {
      return (
        <>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {/* Potential future: <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User Avatar'} /> */}
              <AvatarFallback>
                {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle2 size={20}/>}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden lg:inline">{user.email}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="ghost" asChild size="sm">
          <Link href="/auth/login"><LogIn className="mr-2 h-4 w-4" />Connexion</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth/signup"><UserPlus className="mr-2 h-4 w-4" />Inscription</Link>
        </Button>
      </>
    );
  };

  const AuthLinksMobile = () => {
    if (loading) {
      return (
        <>
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </>
      );
    }
    if (user && session) {
      return (
        <>
          <div className="flex items-center gap-3 p-2 border-b mb-2">
            <Avatar className="h-10 w-10">
               {/* Potential future: <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User Avatar'} /> */}
              <AvatarFallback>
                {user.email ? user.email.charAt(0).toUpperCase() : <UserCircle2 size={24}/>}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{user.email}</span>
          </div>
          <SheetClose asChild>
            <Button variant="outline" onClick={handleSignOut} className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </Button>
          </SheetClose>
        </>
      );
    }
    return (
      <>
        <SheetClose asChild>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/auth/login"><LogIn className="mr-2 h-4 w-4" />Connexion</Link>
          </Button>
        </SheetClose>
        <SheetClose asChild>
          <Button asChild className="w-full justify-start">
            <Link href="/auth/signup"><UserPlus className="mr-2 h-4 w-4" />Inscription</Link>
          </Button>
        </SheetClose>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <GenieLampIcon className="h-7 w-7" />
          <span>Easy Genie</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-4">
          <AuthLinksDesktop />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleOnlineStatus} 
            title={isOnlineForDisplay ? "Mode actuel : En Ligne (cliquer pour détails)" : "Mode actuel : Hors Ligne (cliquer pour détails)"}
            className="w-32"
            disabled={!user} // Disable if not logged in, as "Online" implies being logged in
          >
            {isOnlineForDisplay ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4 text-muted-foreground" />}
            {isOnlineForDisplay ? 'En Ligne' : 'Hors Ligne'}
          </Button>
        </nav>

        <div className="md:hidden flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleOnlineStatus} 
            title={isOnlineForDisplay ? "Mode actuel : En Ligne" : "Mode actuel : Hors Ligne"}
            disabled={!user} // Disable if not logged in
          >
            {isOnlineForDisplay ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
            <span className="sr-only">{isOnlineForDisplay ? 'Mode En Ligne' : 'Mode Hors Ligne'}</span>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
               <div className="p-4 border-b mb-4">
                 <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <GenieLampIcon className="h-7 w-7" />
                    <span>Easy Genie</span>
                </Link>
               </div>
              <nav className="flex flex-col space-y-3 px-4">
                <AuthLinksMobile />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
