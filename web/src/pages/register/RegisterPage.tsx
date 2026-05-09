import Logo from './components/Logo';
import RegisterForm from './components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Logo />
        <RegisterForm />
      </div>
    </div>
  );
}
