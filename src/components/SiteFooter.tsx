import { GYM_VISUAL_URL } from "@/lib/media";

/**
 * Site-wide credits: exercise media (Gym visual) + archetype art (Gemini).
 * `artOnly` drops the Gym visual line on screens that show no exercise media.
 */
export function SiteFooter({ className = "", artOnly = false }: { className?: string; artOnly?: boolean }) {
  return (
    <footer className={`text-center text-[11px] leading-4 text-muted ${className}`}>
      {!artOnly && (
        <p>
          Exercise media © Gym visual —{" "}
          <a href={GYM_VISUAL_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2">
            https://gymvisual.com/
          </a>
        </p>
      )}
      <p>Art: original characters generated with Google Gemini</p>
    </footer>
  );
}
