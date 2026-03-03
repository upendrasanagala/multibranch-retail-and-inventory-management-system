import { useEffect, useState } from "react";
import "../styles/toast.css";

const ICONS = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
};

export default function Toast({ id, message, type = "info", onClose }) {
    const [exiting, setExiting] = useState(false);

    const handleClose = () => {
        setExiting(true);
        setTimeout(onClose, 300);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onClose, 300);
        }, 3700); // slightly before auto-dismiss to animate out
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast-item toast-${type} ${exiting ? "toast-exit" : ""}`}>
            <div className="toast-icon">
                <i className={`fas ${ICONS[type] || ICONS.info}`}></i>
            </div>
            <div className="toast-body">
                <p>{message}</p>
            </div>
            <button className="toast-close" onClick={handleClose}>
                <i className="fas fa-times"></i>
            </button>
            <div className="toast-progress">
                <div className="toast-progress-bar"></div>
            </div>
        </div>
    );
}
