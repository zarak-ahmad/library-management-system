import * as React from 'react';
import { ToastProvider, ToastViewport } from '@/components/ui/toast';

type ToastContextType = {
  toast: (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<
    Array<{ id: number; title?: string; description?: string; variant?: 'default' | 'destructive' }>
  >([]);

  const toast = React.useCallback(
    (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, ...props }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border p-4 shadow-xl animate-in slide-in-from-bottom-5 ${
              t.variant === 'destructive'
                ? 'border-destructive bg-destructive text-destructive-foreground'
                : 'border overlay-surface text-foreground'
            }`}
          >
            {t.title && <p className="font-semibold">{t.title}</p>}
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToasterProvider');
  }
  return context;
}
