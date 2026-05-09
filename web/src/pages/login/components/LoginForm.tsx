import { Card, CardContent } from '@/components/ui/card';
import { useLoginForm } from '../hooks/useLoginForm';

import LoginFormHeader from './LoginFormHeader';
import FormInput from './FormInput';
import LoginFormFooter from './LoginFormFooter';

export default function LoginForm() {
  const { identifier, setIdentifier,
          password, setPassword,
          isLoading, handleSubmit } = useLoginForm();

  return (
    <Card>
      <LoginFormHeader />
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <FormInput
            label="Email or Username"
            id="identifier"
            type="text"
            placeholder="Enter your email or username"
            value={identifier}
            onChange={setIdentifier}
            required
            autoComplete="username"
          />
          <FormInput
            label="Password"
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
        </CardContent>
        <LoginFormFooter isLoading={isLoading} />
      </form>
    </Card>
  );
}