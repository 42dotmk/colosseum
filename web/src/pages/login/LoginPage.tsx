import Logo from './components/Logo'
import LoginForm from './components/LoginForm';
import { useSessionExpiredToast } from './hooks/useSessionExpiredToast';

export default function LoginPage() {
  useSessionExpiredToast();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Logo />
        <LoginForm />
      </div>
    </div>
  );
}
