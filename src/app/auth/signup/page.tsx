
"use client";

import { useState, useEffect } from 'react';
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
import { Loader2, UserPlusIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const signupSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"], // Path of error
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth(); // To redirect if already logged in

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  
  useEffect(() => {
    if (session) {
      router.push('/'); // Redirect to home if already logged in
    }
  }, [session, router]);

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message === "User already registered" ? "Un utilisateur avec cet e-mail existe déjà." : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Inscription réussie !",
        description: "Veuillez vérifier votre boîte de réception pour confirmer votre adresse e-mail.",
        duration: 7000, // Longer duration for this message
      });
      // Don't redirect immediately, user needs to confirm email.
      // Supabase auth state listener will handle session if auto-confirmed or after manual confirmation.
      form.reset(); // Reset form after successful submission
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
          <UserPlusIcon className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">Créez votre Compte Easy Genie</CardTitle>
          <CardDescription>Rejoignez-nous et débloquez la magie de l'organisation.</CardDescription>
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
                      <Input type="password" placeholder="Choisissez un mot de passe" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmez le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Retapez votre mot de passe" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlusIcon className="mr-2 h-5 w-5" />}
                S'inscrire
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            Déjà un compte ? Connectez-vous
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
