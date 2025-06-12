
"use client";

import { useState, useEffect } from 'react'; // Added useEffect here
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, LogInIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth(); // To redirect if already logged in

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (session) {
      router.push('/'); // Redirect to home if already logged in
    }
  }, [session, router]);


  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);

    if (error) {
      if (error.message === 'Email not confirmed') {
         toast({
          title: "Email non confirmé",
          description: "Veuillez vérifier votre boîte de réception pour confirmer votre adresse e-mail.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur de connexion",
          description: "Email ou mot de passe incorrect.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Connexion réussie !",
        description: "Vous êtes maintenant connecté.",
      });
      router.push('/'); // onAuthStateChange in AuthContext will handle session update
      router.refresh(); // ensure fresh state on redirect
    }
  };
  
  if (session) {
    // Still loading or already logged in, show minimal content or redirect
    return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="flex justify-center items-center min-h-screen py-12 px-4 bg-gradient-to-br from-background to-muted/30">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <LogInIcon className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">Connexion à Easy Genie</CardTitle>
          <CardDescription>Accédez à votre espace pour libérer votre potentiel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vous@example.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Votre mot de passe" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogInIcon className="mr-2 h-5 w-5" />}
                Se connecter
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
            <Link href="/auth/signup" className="text-sm text-primary hover:underline">
              Pas encore de compte ? Inscrivez-vous
            </Link>
            {/* <Link href="/auth/forgot-password" // TODO: Implement forgot password
                className="text-sm text-muted-foreground hover:underline">
                Mot de passe oublié ?
            </Link> */}
        </CardFooter>
      </Card>
    </div>
  );
}
