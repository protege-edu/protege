"use client";

import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { InkButton } from "@/components/ui/InkButton";
import { Cut, useSize } from "@/components/ui/Cut";
import { LogoMark } from "@/components/ui/Logo";
import { useCalmMotion } from "@/lib/useCalmMotion";

export interface RosterEntry {
  id: string;
  nickname: string;
}

/**
 * "Show the code": made for the classroom projector, readable from the back row.
 * On the school network: Protégé's website (SITE_URL/j, the same link every class) and one join code, the
 * class code plus the laptop's letters (lib/hosting/locator.ts), with the laptop's own address as a backup.
 * Online (a tunnel): the address and the class code. Either way, a QR code that opens the join page directly.
 * Nicknames pop in as students join, so the class watches itself arrive.
 * The QR is drawn right here (the qrcode package), nothing is sent anywhere.
 */
export function ShowCode({
  code,
  address,
  local,
  locator,
  site,
  french,
  roster,
  onClose,
}: {
  code: string;
  address: string;
  local: boolean;
  /** the laptop's part of the join code (null: not on a school network, students use the address) */
  locator: string | null;
  /** Protégé's website, where students type the join code */
  site: string;
  /** a French class goes to the French page */
  french: boolean;
  roster: RosterEntry[];
  onClose: () => void;
}) {
  const calm = useCalmMotion();
  const [svg, setSvg] = useState<string>("");
  const close = useRef<HTMLButtonElement>(null);
  const joinUrl = `${address}/join?code=${encodeURIComponent(code)}`;
  // nicknames already here when the screen opened don't pop; new ones do
  const [firstSeen] = useState(() => new Set(roster.map((r) => r.id)));

  useEffect(() => {
    void QRCode.toString(joinUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d1613", light: "#00000000" } }).then(setSvg);
  }, [joinUrl]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  const shownAddress = address.replace(/^https?:\/\//, "");
  const joinCode = locator ? `${code}-${locator}` : code;
  const go = locator ? `${site.replace(/^https?:\/\//, "")}${french ? "/fr" : ""}/j` : shownAddress;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="show-code-title"
      data-age-style="senior"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0d1613] text-[#d3ddd6]"
      initial={calm ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={calm ? undefined : { opacity: 0, transition: { duration: 0.25 } }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: "url(/art/senior/journey-map-lit.webp)" }} />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgb(13_22_19/0.55),rgb(13_22_19/0.92)_70%)]" />

      <div className="relative mx-auto flex min-h-full max-w-[1400px] flex-col px-[5vw] py-[3vh]">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <LogoMark tone="dark" className="h-12 w-12" />
            <span className="text-lg font-bold">Join your class</span>
          </span>
          <InkButton ref={close} variant="quiet" onClick={onClose}>
            Close
          </InkButton>
        </header>

        <div className="mt-[2vh] grid flex-1 items-center gap-[4vw] md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-[clamp(1rem,min(2vw,3.4vh),1.8rem)] text-[#9fb2a8]">Go to</p>
            <p className={`${go.length > 32 ? "text-[clamp(1.1rem,min(2.3vw,4.4vh),2.2rem)]" : "text-[clamp(1.4rem,min(3.4vw,6vh),3.2rem)]"} font-bold break-words`}>{breakable(go)}</p>
            <p id="show-code-title" className="mt-[3vh] text-[clamp(1rem,min(2vw,3.4vh),1.8rem)] text-[#9fb2a8]">
              {locator ? "and type the code" : "and type the class code"}
            </p>
            <p
              className={`${locator ? "text-[clamp(2.4rem,min(6.2vw,14vh),7.5rem)]" : "text-[clamp(3rem,min(8.5vw,17vh),10rem)]"} leading-[1] font-bold tracking-[0.05em] whitespace-nowrap text-[#f4f1e8]`}
              aria-label={`Code ${joinCode.split("").join(" ")}`}
            >
              {joinCode}
            </p>
            {locator && (
              <p className="mt-[2vh] text-[clamp(0.9rem,min(1.4vw,2.6vh),1.2rem)] text-[#9fb2a8]">
                Or go straight to <span className="font-bold text-[#d3ddd6]">{breakable(shownAddress)}</span> and type <span className="font-bold text-[#d3ddd6]">{code}</span>
              </p>
            )}
            {!local && (
              <CopyLink
                link={locator ? `${site}${french ? "/fr" : ""}/j?c=${encodeURIComponent(joinCode)}` : joinUrl}
                kind={locator ? "room" : /trycloudflare\.com/.test(address) ? "changes" : "fixed"}
              />
            )}
            {local && !locator && (
              <p className="mt-[2vh] max-w-[52ch] text-sm text-[#9fb2a8]">
                This address only works on the school network. To let students join from anywhere, see &ldquo;Students outside the school network&rdquo; in the setup guide.
              </p>
            )}
          </div>

          <QrCard svg={svg} />
        </div>

        <section aria-labelledby="joined-title" className="mt-[2vh] min-h-[14vh]">
          <h2 id="joined-title" className="text-md font-bold text-[#9fb2a8]" aria-live="polite">
            {roster.length === 0 ? "Nobody's here yet. Gloam is waiting." : `${roster.length} ${roster.length === 1 ? "student has" : "students have"} joined`}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            <AnimatePresence>
              {roster.map((r) => (
                <motion.li
                  key={r.id}
                  layout={!calm}
                  initial={calm || firstSeen.has(r.id) ? false : { opacity: 0, scale: 0.4, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18 }}
                  className="rounded-full border border-[#2c4844] bg-[#121e1a]/80 px-4 py-1.5 text-[clamp(1rem,1.5vw,1.35rem)] font-bold"
                >
                  {r.nickname}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </div>
    </motion.div>
  );
}

/** The QR code on a piece of light paper (cameras need light behind it) */
function QrCard({ svg }: { svg: string }) {
  const [box, { w, h }] = useSize<HTMLDivElement>();
  return (
    <div className="justify-self-center">
      <div ref={box} className="relative w-[min(34vw,420px,48vh)] p-[6%] max-md:w-[min(70vw,320px)]">
        <Cut w={w} h={h} seed="qr" radius={22} wobble={2} fill="#f4f1e8" stroke="#c9c2ad" depth={8} depthFill="rgb(0 0 0 / 0.45)" />
        {/* the library's own SVG output (a QR of our join address), not user content */}
        <div className="relative z-[1] aspect-square [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="QR code that opens the join page" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="mt-4 text-center text-sm text-[#9fb2a8]">Or scan this with a camera</p>
    </div>
  );
}

/**
 * A long address wraps only after a dash or its first dot, and keeps the rest together
 * ("concern-kathy-connections-perl." then "trycloudflare.com", never "trycloudflare.c" then "om")
 */
function breakable(text: string) {
  const dot = text.indexOf(".");
  const head = dot < 0 ? text : text.slice(0, dot + 1);
  const rest = dot < 0 ? "" : text.slice(dot + 1);
  const parts = head.split(/(?<=-)/).flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part]));
  return [...parts, <wbr key="dot" />, <span key="rest" className="whitespace-nowrap">{rest}</span>];
}

/**
 * Online, the address is long (and a quick tunnel's is new every time): the teacher copies the link, with the
 * class code in it, and posts it where students already are (Google Classroom), so nobody types it.
 */
function CopyLink({ link, kind }: { link: string; kind: "room" | "changes" | "fixed" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(link).catch(() => undefined);
    setCopied(true);
  };
  return (
    <div className="mt-[2.4vh] flex flex-wrap items-center gap-x-4 gap-y-2">
      <InkButton variant="quiet" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy link for students"}
      </InkButton>
      <p className="max-w-[46ch] text-sm text-[#9fb2a8]" aria-live="polite">
        {copied
          ? "Paste it in Google Classroom (or anywhere students click). It opens with the class code already in."
          : kind === "room"
            ? "Post it once: it's the same link every class, and it works whenever Protégé online is running."
            : kind === "changes"
              ? "This address is new each time Protégé starts online, so share the link each class."
              : "Share it once: it stays the same."}
      </p>
    </div>
  );
}
