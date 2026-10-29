// RFC 9457 problem+json error envelope — addresses VAL-01, ARCH-02.
// Why: today the client only checks `success` and shows one generic
// message. A consistent envelope lets clients distinguish validation
// errors (fix the form) from server errors (try later) without leaking
// internals. Never include stack traces, SQL errors, or internal paths.
//
// Response usage (Next.js Server Action / route handler):
//   return Response.json(problem(400, "Validation failed", { errors }), { status: 400 });
//   // with header: Content-Type: application/problem+json
// The `type` URI should point at a real docs page in production; the
// about:blank default is the RFC's "no further documentation" value.

export function problem(status, title, { detail = undefined, instance = undefined, errors = undefined } = {}) {
  const body = {
    type: "about:blank",
    title,
    status,
    ...(detail !== undefined ? { detail } : {}),
    ...(instance !== undefined ? { instance } : {}),
    // `errors` is an extension member (field -> message), not part of
    // core RFC 9457, but widely used and safe: it contains only the
    // messages the server chose to return, never raw internals.
    ...(errors !== undefined ? { errors } : {}),
  };
  return body;
}

export function validationProblem(errors, instance = undefined) {
  return problem(400, "Validation failed", {
    detail: "One or more fields did not pass validation. Fix the listed fields and resubmit.",
    instance,
    errors,
  });
}

export function serverProblem(instance = undefined) {
  // Deliberately generic: the real error goes to server logs, not the client.
  return problem(500, "Internal server error", {
    detail: "Something went wrong on our side. Please try again later.",
    instance,
  });
}
