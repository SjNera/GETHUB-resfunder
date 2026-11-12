import type { ReactNode } from "react";

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border-strong px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted [&_svg]:size-5">{icon}</div>
      <h3 className="heading mt-4 text-lg">{title}</h3>
      {children ? <p className="mt-1 max-w-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
