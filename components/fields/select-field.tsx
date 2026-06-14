import type { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BaseFieldProps, RequiredMark } from "./field-context";
import { ComboboxField } from "./combobox-field";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  options: SelectOption[];
  /**
   * Force the searchable combobox on/off. When omitted, the field auto-upgrades
   * to a type-to-filter combobox once there are more than `searchThreshold`
   * options (ui-ux-pro-max: long pickers should be searchable). Set `false` to
   * keep a plain Select for short enums even past the threshold.
   */
  searchable?: boolean;
  /** Option count above which the field becomes searchable. Default 6. */
  searchThreshold?: number;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Select…",
  disabled,
  required,
  options,
  searchable,
  searchThreshold = 6,
  className,
}: SelectFieldProps<T>) {
  const useCombobox =
    searchable ?? options.length > searchThreshold;

  // Long / option-rich pickers render the searchable combobox so users can
  // type-to-filter instead of scrolling a long menu.
  if (useCombobox) {
    return (
      <ComboboxField
        control={control}
        name={name}
        label={label}
        description={description}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        options={options}
        className={className}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              <RequiredMark required={required} />
            </FormLabel>
          )}
          <Select
            onValueChange={field.onChange}
            value={field.value ?? ""}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
