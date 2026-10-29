// Server-side validation for the three Server Actions — addresses VAL-01.
// Why this exists: the client only enforces `required` and `type=email`
// (see docs/03-findings.md, VAL-01). Client checks are bypassed by any
// direct Server Action call, so the server must re-check everything.
// This is written dependency-free so it runs in tests as-is; in a real
// Next.js app the same rules map directly to Zod, e.g.:
//   const inquiry = z.object({
//     fullName: z.string().trim().min(1).max(100),
//     email: z.string().trim().email().max(254),
//     company: z.string().trim().max(100).optional(),
//     industry: z.string().trim().max(100).optional(),
//     message: z.string().trim().min(10).max(5000),
//   });
// Limits are generous on purpose: rejecting a legitimate long message
// is worse than accepting a long one that a human then reads.

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function checkString(value, { required = false, min = 0, max = 1000, field }) {
  const v = clean(value);
  if (!v) {
    return required ? `${field} is required` : null;
  }
  if (v.length < min) return `${field} must be at least ${min} characters`;
  if (v.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Phone: allow digits, spaces, +, -, (); require 7-15 digits after stripping.
function checkPhone(value) {
  const v = clean(value);
  if (!v) return "phone is required";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return "phone must contain 7-15 digits";
  if (!/^[+\d][\d\s()-]*$/.test(v)) return "phone contains invalid characters";
  return null;
}

function collect(rules, input) {
  const errors = {};
  const data = {};
  for (const [field, fn] of Object.entries(rules)) {
    const err = fn(input[field]);
    if (err) errors[field] = err;
    else if (clean(input[field])) data[field] = clean(input[field]);
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

export function validateInquiry(input = {}) {
  const emailErr = checkString(input.email, { required: true, max: 254, field: "email" })
    || (EMAIL_RE.test(clean(input.email)) ? null : "email must be a valid email address");
  const result = collect({
    fullName: (v) => checkString(v, { required: true, min: 1, max: 100, field: "fullName" }),
    company: (v) => checkString(v, { max: 100, field: "company" }),
    industry: (v) => checkString(v, { max: 100, field: "industry" }),
    message: (v) => checkString(v, { required: true, min: 10, max: 5000, field: "message" }),
  }, input);
  const errors = { ...(result.errors || {}) };
  if (emailErr) errors.email = emailErr;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { ...result.data, email: clean(input.email) } };
}

export function validateServiceLead(input = {}) {
  // Same as inquiry, plus a product interest appended by the client.
  const base = validateInquiry(input);
  if (!base.ok) return base;
  const serviceType = clean(input.serviceType);
  if (serviceType && serviceType.length > 200) {
    return { ok: false, errors: { serviceType: "serviceType must be at most 200 characters" } };
  }
  return { ok: true, data: { ...base.data, ...(serviceType ? { serviceType } : {}) } };
}

// Real select values from evidence/html/bitelevate-r1.html (not guessed).
const TRACKS = ["Full Stack", "Python Backend", "AI", "Frontend", "QA Automation", "UI/UX"];
const DURATIONS = ["60-Day Standard Sprint (8 Weeks)"];

export function validateBitElevate(input = {}) {
  const result = collect({
    fullName: (v) => checkString(v, { required: true, min: 1, max: 100, field: "fullName" }),
    university: (v) => checkString(v, { required: true, min: 1, max: 150, field: "university" }),
    referralName: (v) => checkString(v, { max: 100, field: "referralName" }),
    ambitions: (v) => checkString(v, { required: true, min: 10, max: 2000, field: "ambitions" }),
  }, input);
  const errors = { ...(result.errors || {}) };
  const emailErr = checkString(input.email, { required: true, max: 254, field: "email" })
    || (EMAIL_RE.test(clean(input.email)) ? null : "email must be a valid email address");
  if (emailErr) errors.email = emailErr;
  const phoneErr = checkPhone(input.phone);
  if (phoneErr) errors.phone = phoneErr;
  // Track/duration are allow-listed: the client sends select values, but
  // the server must not trust them (a caller can send any string).
  if (!TRACKS.includes(clean(input.track))) errors.track = "track must be one of the offered labs";
  if (!DURATIONS.includes(clean(input.duration))) errors.duration = "duration must be one of the offered sprints";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      ...result.data,
      email: clean(input.email),
      phone: clean(input.phone),
      ...(input.track ? { track: clean(input.track) } : {}),
      ...(input.duration ? { duration: clean(input.duration) } : {}),
    },
  };
}

// Exported for tests/documentation only.
export const _internals = { TRACKS, DURATIONS };
