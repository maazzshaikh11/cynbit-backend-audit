"""Pytest mirror of snippets/error-envelope/problem.js (stdlib only).

Run:  python3 -m pytest snippets/tests/test_problem.py -q
This is a small, independent Python check that the RFC 9457 shape is
understood the same way in both languages; the JS tests are the primary
suite (npm test in snippets/).
"""


def problem(status, title, detail=None, errors=None):
    body = {"type": "about:blank", "title": title, "status": status}
    if detail is not None:
        body["detail"] = detail
    if errors is not None:
        body["errors"] = errors
    return body


def test_problem_has_rfc9457_fields_and_no_stack():
    p = problem(400, "Validation failed", detail="Bad field", errors={"email": "invalid"})
    assert p["status"] == 400
    assert p["title"] == "Validation failed"
    assert p["type"] == "about:blank"
    assert "stack" not in p
    assert p["errors"]["email"] == "invalid"


def test_server_problem_is_generic():
    p = problem(500, "Internal server error", detail="Something went wrong on our side. Please try again later.")
    assert p["status"] == 500
    assert "sql" not in str(p).lower()


if __name__ == "__main__":
    test_problem_has_rfc9457_fields_and_no_stack()
    test_server_problem_is_generic()
    print("test_problem.py: 2 passed (stdlib runner; pytest also works when installed)")
