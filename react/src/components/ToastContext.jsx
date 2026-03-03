import { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

const ToastContext = createContext();

export function useToast() {
    return useContext(ToastContext);
}

let idCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "info") => {
        const id = ++idCounter;
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-dismiss after 4s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <Toast key={t.id} {...t} onClose={() => dismissToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
