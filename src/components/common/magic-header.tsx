
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Wifi, WifiOff, LogIn, UserPlus, LogOut, UserCircle2 } from 'lucide-react';
import { GenieLampIcon } from '@/components/icons/logo-icon';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';

export function MagicHeader() {
  const { toast } = useToast();
  const { user, session, loading, signOut, isOnline, toggleOnlineMode } = useAuth();
  
  const handleToggleOnlineStatus = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour utiliser le mode en ligne.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    toggleOnlineMode(); // This now calls the function from AuthContext
    toast({
      title: `Mode ${isOnline ? 'Hors Ligne' : 'En Ligne'} Activé`,
      description: `Les données seront maintenant ${isOnline ? 'sauvegardées localement.' : 'synchronisées avec le serveur.'} (Logique de synchro à venir)`,
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
            onClick={handleToggleOnlineStatus}
            title={isOnline ? "Mode actuel : En Ligne (cliquer pour passer Hors Ligne)" : "Mode actuel : Hors Ligne (cliquer pour passer En Ligne)"}
            className="w-32"
            disabled={!user || loading} // Disable if not logged in or auth is loading
          >
            {isOnline ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4 text-muted-foreground" />}
            {isOnline ? 'En Ligne' : 'Hors Ligne'}
          </Button>
        </nav>

        <div className="md:hidden flex items-center gap-2">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleOnlineStatus}
            title={isOnline ? "Mode En Ligne" : "Mode Hors Ligne"}
            disabled={!user || loading}
          >
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
            <span className="sr-only">{isOnline ? 'Passer Hors Ligne' : 'Passer En Ligne'}</span>
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
                <Auth