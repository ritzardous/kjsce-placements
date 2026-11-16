import "../styles/experience-invite.css";
import { trackProductEvent } from '../lib/analytics';
import { useAuth } from "../lib/auth";
import { useState } from "react";
import { AppIcon } from "../ui/AppIcon";
import { experienceInviteMessage, experienceInviteUrl } from "./experience-invitation";
export function InviteWriter({
  company,
  className,
  buttonClassName,
}: {
  company: { key: string; name: string };
  className?: string;
  buttonClassName?: string;
}) {
  const { user } = useAuth();
  const [message, setMessage] = useState(""),
    [fallback, setFallback] = useState("");
  async function share() {
    if (!user) return;
    const url = experienceInviteUrl(location.href, company);
    const text = experienceInviteMessage(company);
    const invitation = `${text}\n\n${url}`;
    const method = typeof navigator.share === 'function' ? 'native' : 'clipboard';
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Share your " + company.name + " experience",
          text,
          url,
        });
        setMessage("");
      } else {
        await navigator.clipboard.writeText(invitation);
        setMessage("Message and link copied");
      }
      setFallback("");
      trackProductEvent('share', { method, content_type: 'invitation' });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setFallback(invitation);
      setMessage("Copy this message and link");
    }
  }
  if (!user) return null;
  return (
    <div className={`experience-invite${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={buttonClassName || "text-button"}
        onClick={() => void share()}
      >
        <AppIcon name="share" />
        Invite an alum
      </button>
      {message && <span role="status">{message}</span>}
      {fallback && (
        <textarea
          aria-label="Experience invitation message"
          rows={5}
          readOnly
          value={fallback}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
