import { useState, useEffect } from "react";
import "../styles/network-alert.css";

export default function NetworkAlert() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            setShowReconnected(false);
        };

        const handleOnline = () => {
            setIsOffline(false);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    if (!isOffline && !showReconnected) return null;

    return (
        <div
            id="network-alert-bar"
            className={`net-bar ${isOffline ? "net-bar--offline" : "net-bar--online"}`}
        >
            <svg className="net-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {isOffline ? (
                    <>
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </>
                ) : (
                    <>
                        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                        <line x1="12" y1="20" x2="12.01" y2="20" />
                    </>
                )}
            </svg>
            <span className="net-bar__text">
                {isOffline
                    ? "No internet — POS, inventory sync and reports are unavailable."
                    : "Back online — connection restored."}
            </span>
        </div>
    );
}
