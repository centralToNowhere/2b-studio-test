import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import s from './select.module.css';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  'aria-label': string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
};

export function Select({
  options,
  value,
  onValueChange,
  placeholder,
  'aria-label': label,
  required,
  disabled,
  name,
  className = '',
}: SelectProps) {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      onValueChange={onValueChange}
      required={required}
      disabled={disabled}
      name={name}
    >
      <BaseSelect.Trigger
        aria-label={label}
        className={`${s.trigger} ${className}`}
      >
        <BaseSelect.Value className={s.value} placeholder={placeholder} />
        <BaseSelect.Icon className={s.icon}>
          <ChevronDown />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className={s.positioner}
          sideOffset={4}
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup className={s.popup}>
            <BaseSelect.List className={s.list}>
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={s.item}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className={s.indicator}>
                    <Check />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
