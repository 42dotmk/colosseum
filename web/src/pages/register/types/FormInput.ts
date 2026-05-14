export interface FormInputProps {
  label: string;
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete: string;
}
