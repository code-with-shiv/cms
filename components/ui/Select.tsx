"use client";

import { Children, isValidElement, useMemo, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import ReactSelect from "react-select";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

interface OptionItem {
  value: string;
  label: ReactNode;
}

function extractOptions(children: ReactNode): OptionItem[] {
  const options: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === "option") {
      const { value, children: label } = child.props as { value?: string; children?: ReactNode };
      options.push({ value: String(value ?? ""), label });
    }
  });
  return options;
}

export function Select({ value, onChange, disabled, className = "", children }: SelectProps) {
  const options = useMemo(() => extractOptions(children), [children]);
  const selected = options.find((option) => option.value === String(value ?? "")) ?? null;

  return (
    <ReactSelect
      unstyled
      isDisabled={disabled}
      options={options}
      value={selected}
      onChange={(option) => {
        const next = (option as OptionItem | null)?.value ?? "";
        onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>);
      }}
      menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
      styles={{
        // Inline style always wins over any class-based z-index, so the menu
        // reliably renders above fixed-position modals (which are z-50).
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
      classNames={{
        container: () => className,
        control: (state) =>
          `min-h-[38px] rounded-lg border bg-white px-2 text-sm transition-colors ${
            state.isDisabled
              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : state.isFocused
                ? "cursor-pointer border-indigo-500 ring-1 ring-indigo-500"
                : "cursor-pointer border-slate-300"
          }`,
        placeholder: () => "text-slate-400",
        singleValue: () => "text-slate-900",
        input: () => "text-slate-900",
        indicatorSeparator: () => "hidden",
        dropdownIndicator: () => "px-1 text-slate-400",
        menuPortal: () => "z-[9999]",
        menu: () => "mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
        menuList: () => "scrollbar-thin max-h-60 overflow-auto py-1",
        option: (state) =>
          `cursor-pointer px-3 py-2 text-sm ${
            state.isSelected
              ? "bg-indigo-600 text-white"
              : state.isFocused
                ? "bg-indigo-50 text-slate-900"
                : "text-slate-700"
          }`,
        noOptionsMessage: () => "px-3 py-2 text-sm text-slate-400",
      }}
    />
  );
}
