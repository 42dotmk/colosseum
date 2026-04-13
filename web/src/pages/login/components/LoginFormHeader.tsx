import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginFormHeader() {
  return (
    <CardHeader className="space-y-1">
      <CardTitle className="text-xl">Sign in</CardTitle>
      <CardDescription>Enter your credentials to continue</CardDescription>
    </CardHeader>
  );
}