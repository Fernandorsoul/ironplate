# Professional roles and authorization

IronPlate keeps personal and professional capabilities separate. Every account receives the
`student` role, while `nutritionist`, `fitness_professional`, and the internal
`admin_verifier` role are cumulative records in `user_roles`.

## Verification lifecycle

- A submitted CRN creates a pending `nutritionist` credential and role.
- A submitted CREF creates a pending `fitness_professional` credential and role.
- Each credential is reviewed independently as `verified`, `rejected`, or `suspended`.
- Only a verified credential paired with an active matching role enables professional actions.
- Administrative decisions are written to the audit log. Client profile updates cannot assign
  `admin_verifier` or activate a professional role.

The legacy `users.role` and `professional_profiles.status` columns remain compatibility
projections during migration. Authorization must not use them for professional access.

## Server policy

Use `authorizeUserDataAccess` for access to another user's data and provide the authenticated
actor, subject, data scope, and requested action. A decision is allowed only when all conditions
hold:

1. The actor has an active professional role compatible with the data scope.
2. The matching professional credential is verified.
3. The professional-student link is active.
4. The latest consent is granted for that scope.

Self-access is allowed without a professional role. Existing personal endpoints continue to use
`requireUserAccess`, so changing an ID in a URL or payload never grants delegated access by
itself. Professional endpoints use `getScopedActiveLink`, which delegates to the central policy.

## Adding endpoints

Do not authorize from client-visible buttons, `users.role`, a submitted registration number, or
the presence of a `userId`. Enforce the decision in the API handler before reading or mutating
student data, and add a negative test for missing role, verification, link, or scope.
