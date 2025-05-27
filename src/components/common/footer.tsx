
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Easy Genie. Créé par Geoffroy Streit. Tous droits réservés.</p>
        <div className="mt-2 space-x-4">
          <Link href="/legal/privacy" className="hover:text-primary">Politique de confidentialité</Link>
          <Link href="/legal/terms" className="hover:text-primary">Conditions d'utilisation</Link>
          <Link href="/contact" className="hover:text-primary">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
