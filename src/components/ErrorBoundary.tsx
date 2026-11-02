import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getDepartment, patronusLabel } from '../config/departments';

/** Last successful lookup, readable even if React itself crashes. */
const lastResult: { name: string | null; dept: string | null } = { name: null, dept: null };

export function rememberResult(name: string, dept: string): void {
  lastResult.name = name;
  lastResult.dept = dept;
}

interface State {
  failed: boolean;
}

/** If rendering ever throws, show the answer in plain text instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const d = lastResult.dept ? getDepartment(lastResult.dept) : undefined;
    return (
      <main className="fallback" role="alert">
        {d && lastResult.name ? (
          <>
            <h1>{lastResult.name}</h1>
            <p className="fallback-dept" style={{ color: d.accent }}>
              {d.name}
            </p>
            <p>Your Patronus is {patronusLabel(d)}.</p>
            <p>{d.flavor}</p>
          </>
        ) : (
          <>
            <h1>The magic stumbled.</h1>
            <p>Reload the page, or please see a Prefect (volunteer).</p>
          </>
        )}
        <button type="button" className="btn-gold" onClick={() => location.reload()}>
          Reload
        </button>
      </main>
    );
  }
}