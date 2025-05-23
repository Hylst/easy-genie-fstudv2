import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export const metadata: Metadata = {
  title: 'Contact | Easy Genie',
  description: 'Contactez l\'équipe Easy Genie.',
};

// This is a mock server action. In a real app, you'd handle form submission.
async function submitContactForm(formData: FormData) {
  "use server";
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');
  console.log("Formulaire de contact soumis (simulation):", { name, email, message });
  // Here you would typically send an email or save to a database.
  // For now, we just log it.
  return { success: true, message: "Votre message a été envoyé (simulation) !" };
}


export default function ContactPage() {
  // State for form submission feedback (client-side)
  // const [formStatus, setFormStatus] = useState<{success: boolean | null, message: string | null}>( {success: null, message: null });

  // const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  //   event.preventDefault();
  //   const formData = new FormData(event.currentTarget);
  //   const result = await submitContactForm(formData);
  //   setFormStatus(result);
  //   if(result.success) {
  //     (event.target as HTMLFormElement).reset();
  //   }
  // };


  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <div className="text-center mb-12">
        <Mail className="w-16 h-16 mx-auto text-primary mb-6" />
        <h1 className="text-4xl font-bold text-foreground">Contactez-nous</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Une question, une suggestion ou juste envie de dire bonjour ? N'hésitez pas !
        </p>
      </div>

      <form action={submitContactForm} className="space-y-6 bg-card p-8 rounded-lg shadow-xl">
        <div>
          <Label htmlFor="name" className="block text-sm font-medium text-foreground">Nom complet</Label>
          <Input type="text" name="name" id="name" required className="mt-1" placeholder="Votre nom" />
        </div>
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-foreground">Adresse e-mail</Label>
          <Input type="email" name="email" id="email" required className="mt-1" placeholder="vous@example.com" />
        </div>
        <div>
          <Label htmlFor="message" className="block text-sm font-medium text-foreground">Votre message</Label>
          <Textarea name="message" id="message" rows={6} required className="mt-1" placeholder="Écrivez votre message ici..." />
        </div>
        <div>
          <Button type="submit" className="w-full text-lg py-3">
            Envoyer le Message Magique
          </Button>
        </div>
        {/* {formStatus.message && (
          <p className={`text-sm mt-4 text-center ${formStatus.success ? 'text-green-600' : 'text-destructive'}`}>
            {formStatus.message}
          </p>
        )} */}
         <p className="text-xs text-muted-foreground text-center pt-2">Note: Ceci est un formulaire de démonstration. Les messages ne sont pas réellement envoyés.</p>
      </form>
    </div>
  );
}
