import { createContext, useContext, useState, useCallback, useRef } from "react";
import "../styles/confirm.css";

const ConfirmContext = createContext();

export function useConfirm() {
    return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        title: "",
        message: "",
        mode: "confirm",       // "confirm" | "prompt"
        placeholder: "",
        inputValue: "",
    });
    const resolveRef = useRef(null);

    const showConfirm = useCallback((message, title = "Confirm Action") => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, title, message, mode: "confirm", placeholder: "", inputValue: "" });
        });
    }, []);

    const showPrompt = useCallback((message, title = "Input Required", placeholder = "") => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, title, message, mode: "prompt", placeholder, inputValue: "" });
        });
    }, []);

    const handleOk = () => {
        if (state.mode === "prompt") {
            resolveRef.current?.(state.inputValue || null);
        } else {
            resolveRef.current?.(true);
        }
        setState(s => ({ ...s, open: false }));
    };

    const handleCancel = () => {
        resolveRef.current?.(state.mode === "prompt" ? null : false);
        setState(s => ({ ...s, open: false }));
    };

    return (
        <ConfirmContext.Provider value={{ showConfirm, showPrompt }}>
            {children}
            {state.open && (
                <div className="confirm-overlay" onClick={handleCancel}>
                    <div className="confirm-card" onClick={e => e.stopPropagation()}>
                        <div className={`confirm-icon ${state.mode === "prompt" ? "prompt-icon" : ""}`}>
                            <i className={`fas ${state.mode === "prompt" ? "fa-keyboard" : "fa-shield-alt"}`}></i>
                        </div>
                        <h3>{state.title}</h3>
                        <p>{state.message}</p>

                        {state.mode === "prompt" && (
                            <input
                                className="confirm-input"
                                type="text"
                                placeholder={state.placeholder}
                                value={state.inputValue}
                                onChange={e => setState(s => ({ ...s, inputValue: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && handleOk()}
                                autoFocus
                            />
                        )}

                        <div className="confirm-actions">
                            <button className="confirm-cancel" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button className="confirm-ok" onClick={handleOk}>
                                {state.mode === "prompt" ? "Submit" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
