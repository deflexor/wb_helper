import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AuthCard({ children, title, description }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      <div className="w-full max-w-md p-8 rounded-lg border border-border bg-card shadow-xl">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-6">
          {/* Logo placeholder - can be replaced with actual logo */}
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">WB</span>
          </div>
          {title && (
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {description}
            </p>
          )}
        </div>

        {/* Form content */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
