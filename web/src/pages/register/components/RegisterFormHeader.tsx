import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterFormHeader() {
  return (
    <CardHeader className="space-y-1">
      <CardTitle className="text-xl">Create account</CardTitle>
      <CardDescription>Enter your details to get started</CardDescription>
    </CardHeader>
  );
}
