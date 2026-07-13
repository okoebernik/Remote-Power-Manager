'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LabeledSelectProps {
  id?: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}

export function LabeledSelect({ id, name, defaultValue, options, className }: LabeledSelectProps) {
  const labelByValue = Object.fromEntries(options.map((option) => [option.value, option.label]));

  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue>{(value: string) => labelByValue[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
