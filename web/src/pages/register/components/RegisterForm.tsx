import { Card, CardContent } from '@/components/ui/card';
import { useRegisterForm } from '../hooks/useRegisterForm';
import RegisterFormHeader from './RegisterFormHeader';
import FormInput from './FormInput';
import RegisterFormFooter from './RegisterFormFooter';

export default function RegisterForm() {
  const {
    username, setUsername,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    isLoading, handleSubmit,
  } = useRegisterForm();

  return (
    <Card>
      <RegisterFormHeader />
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <FormInput
            label="Username"
            id="username"
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={setUsername}
            required
            autoComplete="username"
          />
          <FormInput
            label="Email"
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <FormInput
            label="Password"
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />
          <FormInput
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            autoComplete="new-password"
          />
        </CardContent>
        <RegisterFormFooter isLoading={isLoading} />
      </form>
    </Card>
  );
}
