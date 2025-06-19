// types/fineTuneEvent.ts

export interface FineTuneEvent {
  job_id: string;
  user_id: string;
  status: "pending" | "started" | "succeeded" | "failed";
  created_at: string;
  message?: string;
  retry_count?: number;
  model_version?: string;
  error_details?: string;
  retrain_suggested?: boolean;
}

// components/ui/Modal.tsx

import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export default function Modal({ onClose, children, initialFocusRef }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      previousActiveElement.current?.focus();
    };
  }, [onClose, initialFocusRef]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
