import { brand } from "@/lib/brand";

// Two-column sign-in layout: the form on paper, a quiet statement panel beside it.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      <section className="paper-grain relative hidden flex-col justify-between border-r border-border bg-secondary/50 p-10 lg:flex">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Operator workshop</p>
        <div className="max-w-md">
          <h2 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight">Find the AI your staff already use. Then make it safe.</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">Scan the workspace, survey the staff, read the card statement, score the risk, write the policy, pick the platform. One company at a time.</p>
        </div>
        <p className="text-xs text-muted-foreground">{brand.name}</p>
      </section>
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          {children && (
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
