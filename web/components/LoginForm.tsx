'use client';

import { useActionState } from 'react';
import Image from 'next/image';
import { loginAction, type LoginState } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginFormProps {
  labels: {
    title: string;
    username: string;
    password: string;
    signIn: string;
    loginFailed: string;
  };
}

export function LoginForm({ labels }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted px-4">
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/fugro-logo.png"
          alt="Fugro"
          width={130}
          height={59}
          priority
          className="h-9 w-auto dark:brightness-0 dark:invert"
        />
        <span className="text-sm font-medium text-muted-foreground">Remote Power Manager</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{labels.username}</Label>
              <Input id="username" name="username" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{labels.password}</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {state.error && <p className="text-sm text-destructive">{labels.loginFailed}</p>}
            <Button type="submit" disabled={pending} className="mt-2">
              {labels.signIn}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
