type JsonRecord = Record<string, unknown>;

export type HousecallProJobSnapshot = {
  id: string;
  leadId: string;
  appointmentId: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  appliance: string;
  notes: string;
  status: string;
  assignedTechnician: string;
  scheduledStart: string;
  scheduledEnd: string;
  source: string;
};

const DEFAULT_API_BASE_URL = "https://api.housecallpro.com";
const JOB_EXPAND_QUERY = "expand[]=customer&expand[]=appointments";

function getApiKey() {
  return process.env.HOUSECALL_PRO_API_KEY?.trim() || "";
}

function getApiBaseUrl() {
  return (process.env.HOUSECALL_PRO_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function getValue(record: JsonRecord, ...names: string[]) {
  for (const name of names) {
    const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase());

    if (key) {
      return record[key];
    }
  }

  return undefined;
}

function getText(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = getText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function getDateTime(value: unknown) {
  const text = getText(value);
  const parsed = text ? new Date(text) : null;

  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function getCustomer(job: JsonRecord) {
  return asRecord(getValue(job, "customer", "client", "contact"));
}

function getAddress(job: JsonRecord, customer: JsonRecord) {
  const address = asRecord(
    getValue(job, "address", "serviceAddress", "service_address") ??
      getValue(customer, "address", "serviceAddress", "service_address"),
  );

  if (Object.keys(address).length) {
    return [
      firstText(getValue(address, "street", "address", "line1", "addressLine1", "address_line1")),
      firstText(getValue(address, "city")),
      firstText(getValue(address, "state", "stateCode", "state_code", "province")),
      firstText(getValue(address, "zip", "zipCode", "zip_code", "postalCode", "postal_code")),
    ]
      .filter(Boolean)
      .join(", ");
  }

  return firstText(
    getValue(job, "serviceAddress", "service_address", "address"),
    getValue(customer, "serviceAddress", "service_address", "address"),
  );
}

function getName(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  const record = asRecord(value);
  return firstText(
    getValue(record, "name", "fullName", "full_name", "displayName", "display_name"),
    [getValue(record, "firstName", "first_name"), getValue(record, "lastName", "last_name")]
      .map(getText)
      .filter(Boolean)
      .join(" "),
  );
}

function collectNames(value: unknown, names: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectNames(item, names));
    return;
  }

  const name = getName(value);

  if (name) {
    names.push(name);
  }
}

function getAppointments(job: JsonRecord) {
  const value = getValue(job, "appointments", "jobAppointments", "job_appointments");
  return Array.isArray(value) ? value.map(asRecord).filter((item) => Object.keys(item).length) : [];
}

function getAppointmentTechnicians(appointment: JsonRecord, job: JsonRecord, employeeNames = new Map<string, string>()) {
  const names: string[] = [];
  const values = [
    getValue(appointment, "assignedPros", "assigned_pros", "pros", "employees", "team", "technicians"),
    getValue(appointment, "dispatchedEmployeeIds", "dispatched_employee_ids", "assignedEmployeeIds", "assigned_employee_ids"),
    getValue(appointment, "assignedPro", "assigned_pro", "employee", "technician"),
    getValue(job, "assignedPros", "assigned_pros", "pros", "employees", "team", "technicians"),
    getValue(job, "assignedEmployeeIds", "assigned_employee_ids", "dispatchedEmployeeIds", "dispatched_employee_ids"),
    getValue(job, "assignedPro", "assigned_pro", "employee", "technician"),
  ];

  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const itemText = getText(item);

        if (itemText && employeeNames.has(itemText)) {
          names.push(employeeNames.get(itemText) || itemText);
        } else {
          collectNames(item, names);
        }
      });
    } else {
      const valueText = getText(value);
      names.push(valueText && employeeNames.has(valueText) ? employeeNames.get(valueText) || valueText : "");
      collectNames(value, names);
    }
  });

  return Array.from(new Set(names)).join(", ");
}

function getAppointmentStart(appointment: JsonRecord, job: JsonRecord) {
  return getDateTime(
    getValue(
      appointment,
      "scheduledStart",
      "scheduled_start",
      "startTime",
      "start_time",
      "startsAt",
      "starts_at",
      "start",
      "date",
    ) ??
      getValue(job, "scheduledStart", "scheduled_start", "startTime", "start_time", "startsAt", "starts_at"),
  );
}

function getAppointmentEnd(appointment: JsonRecord, job: JsonRecord) {
  return getDateTime(
    getValue(
      appointment,
      "scheduledEnd",
      "scheduled_end",
      "endTime",
      "end_time",
      "endsAt",
      "ends_at",
      "end",
    ) ?? getValue(job, "scheduledEnd", "scheduled_end", "endTime", "end_time", "endsAt", "ends_at"),
  );
}

function normalizeJob(value: unknown, employeeNames = new Map<string, string>()): HousecallProJobSnapshot | null {
  const job = asRecord(value);
  const id = firstText(getValue(job, "id", "jobId", "job_id"));

  if (!id) {
    return null;
  }

  const customer = getCustomer(job);
  const appointments = getAppointments(job)
    .map((appointment) => ({
      appointment,
      start: getAppointmentStart(appointment, job),
    }))
    .sort((left, right) => (left.start || "9999").localeCompare(right.start || "9999"));
  const selectedAppointment = appointments[0]?.appointment ?? job;
  const allTechnicians = appointments.flatMap(({ appointment }) => {
    const text = getAppointmentTechnicians(appointment, job, employeeNames);
    return text ? text.split(", ") : [];
  });
  const assignedTechnician = Array.from(new Set(allTechnicians)).join(", ") || getAppointmentTechnicians(job, job, employeeNames);
  const scheduledStart = getAppointmentStart(selectedAppointment, job);
  const scheduledEnd = getAppointmentEnd(selectedAppointment, job);

  return {
    id,
    leadId: firstText(getValue(job, "leadId", "lead_id")),
    appointmentId: firstText(getValue(selectedAppointment, "id", "appointmentId", "appointment_id")),
    customerName: firstText(
      getName(customer),
      getName(getValue(job, "customer")),
      getValue(job, "customerName", "customer_name", "name"),
      "Housecall Pro customer",
    ),
    phone: normalizePhone(firstText(getValue(customer, "phone", "mobileNumber", "mobile_number"), getValue(job, "phone", "phoneNumber", "phone_number"))),
    email: firstText(getValue(customer, "email", "emailAddress", "email_address"), getValue(job, "email", "emailAddress", "email_address")),
    address: getAddress(job, customer),
    appliance: firstText(getValue(job, "jobType", "job_type", "serviceType", "service_type", "category", "service"), "Appliance repair"),
    notes: firstText(getValue(job, "notes", "description", "message")),
    status: firstText(getValue(job, "status", "workStatus", "work_status", "jobStatus", "job_status")),
    assignedTechnician,
    scheduledStart,
    scheduledEnd,
    source: firstText(getValue(job, "leadSource", "lead_source", "marketingSource", "marketing_source", "source")),
  };
}

async function requestJson(path: string) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("HOUSECALL_PRO_API_KEY is not configured.");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Housecall Pro API request failed: ${response.status} ${details.slice(0, 500)}`);
  }

  return response.json() as Promise<unknown>;
}

function unwrapRecord(value: unknown) {
  const root = asRecord(value);
  return asRecord(getValue(root, "data", "job", "resource") ?? value);
}

function getCollection(value: unknown) {
  const root = asRecord(value);
  const candidates = [getValue(root, "data", "jobs", "items", "results")];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return Array.isArray(value) ? value : [];
}

export function getHousecallProApiStatus() {
  return {
    configured: Boolean(getApiKey()),
    baseUrl: getApiBaseUrl(),
  };
}

export async function listHousecallProJobs(limit = 250) {
  const jobs: HousecallProJobSnapshot[] = [];
  const pageSize = Math.min(Math.max(limit, 1), 100);
  const maxPages = Math.ceil(limit / pageSize);
  const employeeNames = new Map<string, string>();

  try {
    const employeePayload = await requestJson("/employees?page=1&page_size=100");

    for (const employee of getCollection(employeePayload)) {
      const record = asRecord(employee);
      const id = firstText(getValue(record, "id", "employeeId", "employee_id"));
      const name = getName(record);

      if (id && name) {
        employeeNames.set(id, name);
      }
    }
  } catch {
    // The job payload can still contain employee names even when the employee list is unavailable.
  }

  for (let page = 1; page <= maxPages && jobs.length < limit; page += 1) {
    const payload = await requestJson(`/jobs?page=${page}&page_size=${pageSize}&${JOB_EXPAND_QUERY}`);
    const rawJobs = getCollection(payload);
    const detailedJobs: unknown[] = [];

    for (let index = 0; index < rawJobs.length; index += 5) {
      const batch = rawJobs.slice(index, index + 5);
      const details = await Promise.all(
        batch.map(async (rawJob) => {
          const rawRecord = asRecord(rawJob);
          const id = firstText(getValue(rawRecord, "id", "jobId", "job_id"));

          if (!id) {
            return rawJob;
          }

          try {
            const detailPayload = await requestJson(`/jobs/${encodeURIComponent(id)}?${JOB_EXPAND_QUERY}`);
            const detail = unwrapRecord(detailPayload);

            if (!getAppointments(detail).length) {
              try {
                const appointmentPayload = await requestJson(`/jobs/${encodeURIComponent(id)}/appointments`);
                const appointments = getCollection(appointmentPayload);

                if (appointments.length) {
                  return { ...detail, appointments };
                }
              } catch {
                // Keep the detailed job when the account has no appointment endpoint data.
              }
            }

            return detail;
          } catch {
            return rawJob;
          }
        }),
      );

      detailedJobs.push(...details);
    }

    const pageJobs = detailedJobs
      .map((job) => normalizeJob(job, employeeNames))
      .filter((job): job is HousecallProJobSnapshot => Boolean(job));

    jobs.push(...pageJobs);

    if (pageJobs.length < pageSize) {
      break;
    }
  }

  return jobs.slice(0, limit);
}
