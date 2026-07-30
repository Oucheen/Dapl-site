type TechnicianSelectProps = {
  technicians: string[];
  className: string;
  defaultValue?: string | null;
  disabled?: boolean;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

export function TechnicianSelect({
  technicians,
  className,
  defaultValue,
  disabled = false,
  name = "assignedTechnician",
  placeholder = "Not assigned",
  required = false,
}: TechnicianSelectProps) {
  const currentTechnician = defaultValue?.trim() ?? "";
  const options =
    currentTechnician && !technicians.includes(currentTechnician)
      ? [currentTechnician, ...technicians]
      : technicians;

  return (
    <select
      name={name}
      defaultValue={currentTechnician}
      disabled={disabled}
      required={required}
      className={className}
    >
      <option value="">{placeholder}</option>
      {options.map((technician) => (
        <option key={technician} value={technician}>
          {technician}
        </option>
      ))}
    </select>
  );
}
