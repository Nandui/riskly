import { Check, Minus } from "lucide-react";
import { ROLES, ROLE_META } from "@/lib/constants";
import { CAPABILITIES, can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// Static overview of which role has which capability. Driven entirely by can()
// and CAPABILITIES, so it always matches what the app actually enforces.
export function RolePermissionMatrix() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-ink">Role permissions</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        What each role can do. Each role also includes everything the roles to
        its left can do.
      </p>

      <div className="scroll-slim mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Permission
              </th>
              {ROLES.map((r) => (
                <th key={r.value} scope="col" className="px-2 py-2 text-center">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      ROLE_META[r.value].pill,
                    )}
                  >
                    {r.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((capability) => (
              <tr key={capability.key} className="border-t border-line">
                <th scope="row" className="py-3 pr-3 text-left align-top font-normal">
                  <span className="block font-medium text-ink">
                    {capability.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {capability.description}
                  </span>
                </th>
                {ROLES.map((r) => {
                  const allowed = can({ role: r.value }, capability.key);
                  return (
                    <td
                      key={r.value}
                      className="px-2 py-3 text-center align-top"
                    >
                      {allowed ? (
                        <Check
                          className="mx-auto size-4 text-brand-strong"
                          aria-label={`${r.label}: allowed`}
                        />
                      ) : (
                        <Minus
                          className="mx-auto size-4 text-faint"
                          aria-label={`${r.label}: not allowed`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
