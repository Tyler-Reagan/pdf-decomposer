import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/main.css";
import { App } from "./App";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4 p-8">
          <p className="text-red-400 font-medium">Something went wrong</p>
          <p className="text-slate-400 text-sm text-center max-w-md">
            {this.state.message}
          </p>
          <button
            className="px-4 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm transition-colors cursor-pointer"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
