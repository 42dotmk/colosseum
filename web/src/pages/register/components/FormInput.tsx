import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormInputProps } from '../types/FormInput';

export default function FormInput(props: FormInputProps) {
  const { label, id, type, placeholder, value, onChange, required = false, autoComplete } = props;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
      />
    </div>
  );
}
