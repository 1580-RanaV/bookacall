"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────
type Duration = 15 | 30 | 60;
type EmailState = "idle" | "loading" | "valid" | "invalid";

// ── Constants ─────────────────────────────────────────────────────────────────
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const MAX_GUESTS = 5;
const DURATION_LABEL: Record<Duration, string> = { 15: "15 min", 30: "30 min", 60: "1 hour" };
const DURATION_CARD_TITLE: Record<Duration, string> = {
  15: "Quick chat",
  30: "Standard call",
  60: "Deep dive",
};
const SLOTS: Record<Duration, string[]> = {
  15: [
    "9:00 AM","9:15 AM","9:30 AM","9:45 AM",
    "10:00 AM","10:15 AM","10:30 AM","10:45 AM",
    "11:00 AM","11:15 AM","11:30 AM","11:45 AM",
    "12:00 PM","12:15 PM","12:30 PM","12:45 PM",
    "1:00 PM","1:15 PM","1:30 PM","1:45 PM",
    "2:00 PM","2:15 PM","2:30 PM","2:45 PM",
    "3:00 PM","3:15 PM","3:30 PM",
  ],
  30: [
    "10:00 AM","10:30 AM","11:00 AM","11:30 AM",
    "12:00 PM","12:30 PM","1:00 PM","1:30 PM",
    "2:00 PM","2:30 PM","3:00 PM","3:30 PM",
    "4:00 PM","4:30 PM","5:00 PM",
  ],
  60: [
    "9:00 AM","10:00 AM","11:00 AM",
    "12:00 PM","1:00 PM","2:00 PM",
    "3:00 PM","4:00 PM",
  ],
};

const BLOCKED: Record<Duration, Set<string>> = {
  15: new Set(["9:30 AM","10:15 AM","11:00 AM","12:15 PM","1:00 PM","2:00 PM","2:45 PM","3:15 PM"]),
  30: new Set(["10:30 AM","12:00 PM","1:30 PM","3:00 PM","4:30 PM"]),
  60: new Set(["10:00 AM","1:00 PM","3:00 PM"]),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function mondayOffset(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

function isAvailable(date: Date) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  return y === 2026 && m === 4 && d >= 18 && d <= 30;
}

function addMinutes(timeStr: string, mins: number): string {
  const total = timeToMinutes(timeStr) + mins;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  const ep = eh < 12 ? "AM" : "PM";
  const dh = eh === 0 ? 12 : eh > 12 ? eh - 12 : eh;
  return `${dh}:${em.toString().padStart(2, "0")} ${ep}`;
}

function timeToMinutes(timeStr: string): number {
  const [time, period] = timeStr.split(" ");
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr);
  const m = parseInt(mStr);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length > 254 || trimmed.includes(" ")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ChevL = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 12L6 8l4-4" />
  </svg>
);
const ChevR = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4l4 4-4 4" />
  </svg>
);
const IcoSun = () => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const IcoMoon = () => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);
const IcoVerified = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <path fill="#8bc34a" d="M9 3L8 6H4l1 4l-3 2l3 2l-1 4h4l1 3l3-2l3 2l1-3h4l-1-4l3-2l-3-2l1-4h-4l-1-3l-3 2zm7 5l1 1l-7 7l-3-3l1-1l2 2z" />
  </svg>
);
const IcoCal = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IcoClock = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IcoGoogleMeet = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="15" viewBox="0 0 256 211">
    <path d="M0 0h256v211H0z" fill="none" />
    <path fill="#00832d" d="m144.822 105.322l24.957 28.527l33.562 21.445l5.838-49.792l-5.838-48.669l-34.205 18.839z" />
    <path fill="#0066da" d="M0 150.66v42.43c0 9.688 7.864 17.554 17.554 17.554h42.43l8.786-32.059l-8.786-27.925l-29.11-8.786z" />
    <path fill="#e94235" d="M59.984 0L0 59.984l30.876 8.765l29.108-8.765l8.626-27.545z" />
    <path fill="#2684fc" d="M.001 150.679h59.983V59.983H.001z" />
    <path fill="#00ac47" d="M241.659 25.398L203.34 56.834v98.46l38.477 31.558c5.76 4.512 14.186.4 14.186-6.922V32.18c0-7.403-8.627-11.495-14.345-6.781" />
    <path fill="#00ac47" d="M144.822 105.322v45.338H59.984v59.984h125.804c9.69 0 17.553-7.866 17.553-17.554v-37.796z" />
    <path fill="#ffba00" d="M185.788 0H59.984v59.984h84.838v45.338l58.52-48.49V17.555c0-9.69-7.864-17.554-17.554-17.554" />
  </svg>
);
const IcoCancelled = () => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48">
    <path d="M0 0h48v48H0z" fill="none" />
    <path fill="#D50000" d="M24 6C14.1 6 6 14.1 6 24s8.1 18 18 18s18-8.1 18-18S33.9 6 24 6m0 4c3.1 0 6 1.1 8.4 2.8L12.8 32.4C11.1 30 10 27.1 10 24c0-7.7 6.3-14 14-14m0 28c-3.1 0-6-1.1-8.4-2.8l19.6-19.6C36.9 18 38 20.9 38 24c0 7.7-6.3 14-14 14" />
  </svg>
);
const IcoSpinner = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-blue-500">
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);
const IcoCheck = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BookingWidget() {
  const [dark, setDark] = useState(false);
  const duration: Duration = 30;
  const [monthDate, setMonthDate] = useState(new Date(2026, 4, 1));
  const [todayDate] = useState(() => new Date());
  const [selDate, setSelDate] = useState<Date | null>(null);
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [booked, setBooked] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<EmailState>("idle");
  const [emailTouched, setEmailTouched] = useState(false);
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateLayout = () => setIsCompact(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);

    return () => {
      if (emailTimer.current) clearTimeout(emailTimer.current);
      media.removeEventListener("change", updateLayout);
    };
  }, []);

  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const total = daysInMonth(y, m);
  const offset = mondayOffset(y, m);

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDayClick(date: Date) {
    if (!isAvailable(date)) return;
    setSelDate(prev => (prev && sameDay(prev, date) ? null : date));
    setSelSlot(null);
  }

  function handleBack() {
    if (confirmed) {
      setConfirmed(false);
      setEmail("");
      setEmailState("idle");
      setEmailTouched(false);
      setGuestEmails([]);
      setNotes("");
    } else if (selDate) {
      setSelDate(null);
      setSelSlot(null);
    }
  }

  function handleCancelMeeting() {
    setBooked(false);
    setCancelled(true);
  }

  function handleBookAgain() {
    setCancelled(false);
    setConfirmed(false);
    setSelDate(null);
    setSelSlot(null);
    setEmail("");
    setEmailState("idle");
    setEmailTouched(false);
    setGuestEmails([]);
    setNotes("");
  }

  function handleEmailChange(val: string) {
    setEmail(val);
    const trimmed = val.trim();
    setEmailState(trimmed ? "loading" : "idle");
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!trimmed) return;

    emailTimer.current = setTimeout(() => {
      setEmailState(isValidEmail(trimmed) ? "valid" : "invalid");
    }, 450);
  }

  function handleEmailBlur() {
    setEmailTouched(true);
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailState("idle");
      return;
    }
    setEmailState(isValidEmail(trimmed) ? "valid" : "invalid");
  }

  function handleConfirmBooking() {
    const trimmed = email.trim();
    setEmailTouched(true);
    if (!isValidEmail(trimmed)) {
      setEmailState(trimmed ? "invalid" : "idle");
      return;
    }

    // Backend integration point:
    // Replace this local state transition with your booking mutation, then set
    // booked=true after the API confirms that calendar invites were created.
    setEmail(trimmed);
    setEmailState("valid");
    setBooked(true);
  }

  function handleAddGuest() {
    if (guestEmails.length >= MAX_GUESTS) return;
    setGuestEmails(prev => [...prev, ""]);
  }

  function handleGuestEmailChange(index: number, value: string) {
    setGuestEmails(prev => prev.map((guest, i) => (i === index ? value : guest)));
  }

  function handleRemoveGuest(index: number) {
    setGuestEmails(prev => prev.filter((_, i) => i !== index));
  }

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const $ = {
    page:        dark ? "bg-black"                    : "bg-gray-50",
    card:        dark ? "bg-zinc-900"                 : "bg-white",
    shadow:      dark ? "shadow-2xl shadow-black/60"  : "shadow-xl shadow-gray-200/80",
    divider:     dark ? "border-zinc-800"             : "border-gray-100",
    heading:     dark ? "text-white"                  : "text-gray-900",
    sub:         dark ? "text-zinc-400"               : "text-gray-500",
    muted:       dark ? "text-zinc-700"               : "text-gray-300",
    toggle:      dark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200",
    navPrev:     dark ? "text-zinc-400 hover:bg-zinc-800"             : "text-gray-400 hover:bg-gray-100",
    navNext:     dark ? "bg-blue-900/40 text-blue-400 hover:bg-blue-900/60" : "bg-blue-50 text-blue-600 hover:bg-blue-100",
    avail:       dark ? "text-blue-400 border border-blue-500/40 hover:bg-blue-500/10" : "text-blue-600 border border-blue-200 hover:bg-blue-50",
    backHover:   dark ? "hover:bg-zinc-800"           : "hover:bg-blue-50",
    slotBtn:     dark ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/60" : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300",
    slotBlocked: dark ? "border-zinc-800 text-zinc-700 cursor-not-allowed"                              : "border-gray-100 text-gray-300 bg-gray-50/60 cursor-not-allowed",
    fadeFrom:    dark ? "from-zinc-900"               : "from-white",
    inputBg:     dark ? "bg-zinc-800"                 : "bg-gray-50",
    inputBorder: dark ? "border-zinc-700"             : "border-gray-200",
    inputText:   dark ? "text-white placeholder:text-zinc-500" : "text-gray-900 placeholder:text-gray-400",
    cancelText:  dark ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600",
    link:        "hover:underline underline-offset-2",
    footerLink:  "hover:underline underline-offset-2 transition-colors",
  };
  const emailInvalid = emailTouched && email.trim().length > 0 && emailState === "invalid";
  const emailMissing = emailTouched && email.trim().length === 0;
  const normalizedEmail = email.trim().toLowerCase();
  const validGuestEmails = guestEmails.map(guest => guest.trim()).filter(isValidEmail);
  const hasInvalidGuests = guestEmails.some(guest => guest.trim().length > 0 && !isValidEmail(guest));
  const normalizedGuestEmails = guestEmails.map(guest => guest.trim().toLowerCase()).filter(Boolean);
  const hasRepeatedGuestEmail = normalizedGuestEmails.some((guest, index) => (
    guest === normalizedEmail || normalizedGuestEmails.indexOf(guest) !== index
  ));
  const canConfirmBooking = emailState === "valid" && isValidEmail(email) && !hasInvalidGuests && !hasRepeatedGuestEmail;

  // Responsive panel sizing:
  // - Desktop keeps the original hardcoded widths and horizontal slide behavior.
  // - Mobile stacks sections at full width and collapses hidden panels vertically.
  const calendarPanelWidth = confirmed ? 0 : (isCompact ? "100%" : 500);
  const slotsPanelWidth = confirmed ? 0 : (selDate ? (isCompact ? "100%" : 256) : 0);
  const formPanelWidth = confirmed ? (isCompact ? "100%" : 500) : 0;
  const calendarPanelMaxHeight = isCompact ? (confirmed ? 0 : 900) : undefined;
  const slotsPanelMaxHeight = isCompact ? (!confirmed && selDate ? 520 : 0) : undefined;
  const formPanelMaxHeight = isCompact ? (confirmed ? 700 : 0) : undefined;

  return (
    <div className={`min-h-screen ${$.page} flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 gap-5 md:gap-6 transition-colors duration-300`}>

      {/* Dark / light toggle */}
      <button
        onClick={() => setDark(d => !d)}
        className={`fixed top-5 right-5 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${$.toggle}`}
        aria-label="Toggle dark mode"
      >
        {dark ? <IcoSun /> : <IcoMoon />}
      </button>

      {/* ── Final state: booked or cancelled ─────────────────────────────── */}
      {(cancelled || booked) && selDate && selSlot ? (
        <div key={cancelled ? "cancelled-card" : "booked-card"} className={`animate-card-in relative w-full max-w-[800px] overflow-hidden rounded-2xl px-7 py-9 sm:px-10 md:px-16 md:py-12 transition-colors duration-300 ${$.card} ${$.shadow}`}>
          <Image
            key={cancelled ? "cancelled-watermark" : "booked-watermark"}
            src="/logo.png"
            alt=""
            width={430}
            height={430}
            className="animate-watermark-in pointer-events-none absolute -right-28 top-16 hidden h-auto w-[430px] md:block"
            aria-hidden="true"
          />
          <Image
            src="/logo.png"
            alt="Intempt"
            width={26}
            height={26}
            className="absolute right-7 top-7 rounded-lg opacity-80 md:hidden"
          />

          <div className="relative z-10 max-w-88 pt-4 md:pt-8">
            <div className="animate-pop-in mb-5" style={{ animationDelay: "0.08s" }}>
              {cancelled ? <IcoCancelled /> : <IcoVerified />}
            </div>
            <h1
              className={`animate-fade-up text-[23px] md:text-[26px] font-bold ${$.heading} leading-tight`}
              style={{ animationDelay: "0.2s" }}
            >
              {cancelled ? "Meeting cancelled" : "Meeting confirmed"}
            </h1>
            <p
              className={`animate-fade-up mt-3 text-[14px] leading-relaxed ${$.sub}`}
              style={{ animationDelay: "0.3s" }}
            >
              {cancelled ? (
                "Your meeting with Aman Tiwari has been cancelled. Hope to meet soon."
              ) : (
                <>
	                  Your meeting with Aman Tiwari is confirmed
	                  {email && (
	                    <>
	                      , and a calendar invite has been sent to{" "}
	                      <span className={`font-medium ${$.heading} break-all`}>{email}</span>
	                      {validGuestEmails.length > 0 && " and guest(s)"}
	                    </>
	                  )}
                  . See you soon!
                </>
              )}
            </p>
          </div>

          <div className="relative z-10 mt-8 md:mt-9 max-w-88 space-y-3">
            <div className={`animate-fade-up flex items-start gap-2.5 ${$.sub}`} style={{ animationDelay: "0.4s" }}>
              <div className="mt-0.5 shrink-0"><IcoCal /></div>
              <span className={`text-[13px] font-medium ${$.heading} leading-snug`}>
                {DAYS_LONG[selDate.getDay()]}, {MONTHS[selDate.getMonth()]} {selDate.getDate()}, {selDate.getFullYear()}
              </span>
            </div>
            <div className={`animate-fade-up flex items-center gap-2.5 ${$.sub}`} style={{ animationDelay: "0.48s" }}>
              <div className="shrink-0"><IcoClock /></div>
              <span className={`text-[13px] font-medium ${$.heading}`}>
                {selSlot} – {addMinutes(selSlot, duration)} · {DURATION_LABEL[duration]}
              </span>
            </div>
            <div className={`animate-fade-up flex items-center gap-2.5 ${$.sub}`} style={{ animationDelay: "0.56s" }}>
              <div className="shrink-0"><IcoGoogleMeet /></div>
              <span className="text-[13px]">Google Meet</span>
            </div>
          </div>

          <div className="animate-fade-up relative z-10 mt-9" style={{ animationDelay: "0.66s" }}>
            {cancelled ? (
              <button
                onClick={handleBookAgain}
                className="text-[13px] font-medium text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-700"
              >
                Book again
              </button>
            ) : (
              <button
                onClick={handleCancelMeeting}
                className={`text-[13px] font-medium underline underline-offset-4 transition-colors ${$.cancelText}`}
              >
                Cancel Meeting
              </button>
            )}
          </div>

	          <div className={`animate-fade-up relative z-10 mt-10 md:mt-12 hidden md:flex items-center gap-1.5 text-[11px] ${$.muted}`} style={{ animationDelay: "0.74s" }}>
	            <span>powered by</span>
	            <Image src="/logo.png" alt="Intempt" width={13} height={13} className="rounded opacity-50" />
	            <a href="https://intempt.com" target="_blank" rel="noreferrer" className={$.link}>Intempt</a>
	          </div>
        </div>

      ) : (

        /* ── Steps 1–3: calendar, slots, and confirmation form ───────────── */
        <div className={`animate-card-in relative w-full md:w-auto rounded-2xl flex flex-col md:flex-row ${confirmed ? "md:min-h-130" : "md:h-130"} overflow-hidden transition-colors duration-300 ${$.card} ${$.shadow}`}>

          {/* ── Left info panel ─────────────────────────────────────────── */}
          <div className={`w-full md:w-80 shrink-0 flex flex-col p-6 sm:p-8 border-b md:border-b-0 md:border-r ${$.divider}`}>

            {/* Top: back + logo */}
            <div className="animate-fade-up flex items-center justify-between mb-8 shrink-0" style={{ animationDelay: "0.08s" }}>
              <button
                onClick={handleBack}
                aria-label="Go back"
                className={`w-8 h-8 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 transition-all duration-200 ${$.backHover} ${
                  selDate || confirmed ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
              >
                <ChevL />
              </button>
              <Image src="/logo.png" alt="Intempt" width={26} height={26} className="rounded-lg opacity-80" />
            </div>

            {/* Selected meeting summary; switches to final confirmation details */}
            {!confirmed ? (
              <>
                <p className={`animate-fade-up text-[13px] ${$.sub} mb-1`} style={{ animationDelay: "0.16s" }}>Aman Tiwari</p>
                <h1 className={`animate-fade-up text-[20px] font-bold ${$.heading} leading-snug mb-6`} style={{ animationDelay: "0.22s" }}>
                  {DURATION_CARD_TITLE[duration]}
                </h1>
                <p className={`animate-fade-up text-[13px] leading-relaxed ${$.sub} mb-6`} style={{ animationDelay: "0.28s" }}>
                  Pick a time that works best for your schedule.
                </p>
                <p className={`animate-fade-up text-[11px] font-semibold ${$.muted} uppercase tracking-widest mb-2`} style={{ animationDelay: "0.3s" }}>Duration</p>
                <p className={`animate-fade-up text-[13px] font-semibold ${$.heading}`} style={{ animationDelay: "0.36s" }}>{DURATION_LABEL[duration]}</p>
                <div className="flex-1" />
              </>
            ) : (
              <>
                {selDate && selSlot && (
                  <>
                    <p className={`animate-fade-up text-[13px] ${$.sub} mb-1`} style={{ animationDelay: "0.16s" }}>Aman Tiwari</p>
                    <h1 className={`animate-fade-up text-[17px] font-bold ${$.heading} mb-2`} style={{ animationDelay: "0.22s" }}>Confirm your booking</h1>
                    <p className={`animate-fade-up text-[13px] leading-relaxed ${$.sub} mb-6`} style={{ animationDelay: "0.26s" }}>
                      Almost there. Add your email to receive the invite.
                    </p>
                    <div className="animate-fade-up space-y-3" style={{ animationDelay: "0.3s" }}>
                      <div className={`flex items-start gap-2.5 ${$.sub}`}>
                        <div className="mt-0.5 shrink-0"><IcoCal /></div>
                        <span className={`text-[13px] font-medium ${$.heading} leading-snug`}>
                          {DAYS_LONG[selDate.getDay()]}, {MONTHS[selDate.getMonth()]} {selDate.getDate()}, {selDate.getFullYear()}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2.5 ${$.sub}`}>
                        <div className="shrink-0"><IcoClock /></div>
                        <span className={`text-[13px] font-medium ${$.heading}`}>
                          {selSlot} – {addMinutes(selSlot, duration)} · {DURATION_LABEL[duration]}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2.5 ${$.sub}`}>
                        <div className="shrink-0"><IcoGoogleMeet /></div>
                        <span className={`text-[13px]`}>Google Meet</span>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex-1" />
              </>
            )}

            {/* Footer */}
            <div className="shrink-0">
	              <div className={`animate-fade-up hidden md:flex items-center gap-1.5 text-[11px] ${$.muted}`} style={{ animationDelay: "0.44s" }}>
	                <span>powered by</span>
	                <Image src="/logo.png" alt="Intempt" width={13} height={13} className="rounded opacity-50" />
	                <a href="https://intempt.com" target="_blank" rel="noreferrer" className={$.link}>Intempt</a>
	              </div>
            </div>
          </div>

          {/* ── Calendar panel (hides when confirmed) ───────────────────── */}
          <div
            className="shrink-0 overflow-hidden transition-all duration-500 ease-in-out"
            style={{ width: calendarPanelWidth, maxHeight: calendarPanelMaxHeight }}
          >
            <div className="w-full md:w-125 shrink-0 p-6 sm:p-8 md:p-10">
              <h2 className={`animate-fade-up text-[17px] font-bold ${$.heading} mb-7`} style={{ animationDelay: "0.18s" }}>Select a Date & Time</h2>

              <div className="animate-fade-up flex items-center justify-between mb-6" style={{ animationDelay: "0.24s" }}>
                <button
                  onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${$.navPrev}`}
                >
                  <ChevL />
                </button>
                <span className={`text-[13px] font-semibold ${$.heading}`}>{MONTHS[m]} {y}</span>
                <button
                  onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${$.navNext}`}
                >
                  <ChevR />
                </button>
              </div>

              <div className="animate-fade-up grid grid-cols-7 mb-1" style={{ animationDelay: "0.32s" }}>
                {WEEKDAYS.map(d => (
                  <div key={d} className={`text-center text-[10px] font-semibold tracking-widest ${$.muted} py-1.5`}>
                    {d}
                  </div>
                ))}
              </div>

              <div className="animate-fade-up grid grid-cols-7" style={{ animationDelay: "0.4s" }}>
                {cells.map((day, i) => {
                  if (day === null) return <div key={i} className="h-11" />;
                  const date = new Date(y, m, day);
                  const isToday = sameDay(date, todayDate);
                  const isFuture = startOfDay(date) > startOfDay(todayDate);
                  const avail = isAvailable(date) && (isToday || isFuture);
                  const isSel = !!selDate && sameDay(date, selDate);

                  const cls = [
                    "h-10 w-10 mx-auto flex flex-col items-center justify-center rounded-full text-[13px] relative transition-all duration-150",
                    isSel  ? "bg-blue-600 text-white font-semibold scale-105" :
                    isToday ? `${$.sub} font-medium` :
                    avail  ? `${$.avail} font-medium cursor-pointer` :
                    `${$.muted} cursor-default`,
                  ].join(" ");

                  return (
                    <div key={i} className="h-11 flex items-center justify-center">
                      <button
                        onClick={() => handleDayClick(date)}
                        disabled={!avail}
                        aria-label={`${MONTHS[m]} ${day}${!avail ? ", unavailable" : ""}`}
                        className={cls}
                      >
                        <span>{day}</span>
                        {isToday && !isSel && (
                          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-600" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Time slots panel ────────────────────────────────────────── */}
          <div
            className="shrink-0 overflow-hidden transition-all duration-500 ease-in-out"
            style={{ width: slotsPanelWidth, maxHeight: slotsPanelMaxHeight }}
          >
            <div className={`w-full md:w-64 md:h-full flex flex-col px-6 pb-8 md:py-10 md:border-l ${$.divider}`}>
              {selDate && (
                <>
                  <p className={`animate-fade-up text-[13px] font-semibold ${$.heading} mb-5 shrink-0`}>
                    {DAYS_LONG[selDate.getDay()]}, {MONTHS_SHORT[selDate.getMonth()]} {selDate.getDate()}
                  </p>
                  <div className="relative flex-1 min-h-0">
                    <div className="animate-fade-up max-h-80 overflow-y-auto pr-2 md:absolute md:inset-0 md:max-h-none md:pr-6 space-y-2.5" style={{ animationDelay: "0.08s" }}>
	                      {SLOTS[duration].map(slot => {
	                        const isSel = selSlot === slot;
	                        const isPastTodaySlot = sameDay(selDate, todayDate) && timeToMinutes(slot) < todayDate.getHours() * 60 + todayDate.getMinutes();
	                        const isBlocked = BLOCKED[duration].has(slot) || isPastTodaySlot;
	                        return (
                          <button
                            key={slot}
                            disabled={isBlocked}
                            onClick={() => {
                              if (isSel) {
                                setConfirmed(true);
                              } else {
                                setSelSlot(slot);
                              }
                            }}
                            className={`relative w-full py-2.5 rounded-lg border text-[13px] font-semibold overflow-hidden transition-all duration-300 ${
                              isBlocked ? $.slotBlocked :
                              isSel     ? "bg-blue-600 border-blue-600 text-white" :
                              $.slotBtn
                            }`}
                          >
                            <span className={`block transition-all duration-300 ${isSel ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}>
                              {slot}
                            </span>
                            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isSel ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
                              Confirm
                            </span>
                          </button>
                        );
                      })}
                      <div className="h-10" />
                    </div>
                    <div className={`absolute bottom-0 inset-x-0 h-16 bg-linear-to-t ${$.fadeFrom} to-transparent pointer-events-none`} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Confirmation form panel ──────────────────────────────────── */}
          <div
            className="shrink-0 overflow-hidden transition-all duration-500 ease-in-out"
            style={{ width: formPanelWidth, maxHeight: formPanelMaxHeight }}
          >
            <div className={`w-full md:w-125 md:h-full flex flex-col px-6 sm:px-8 md:px-10 py-8 md:py-10 md:border-l ${$.divider}`}>
              {confirmed && selDate && selSlot && (
                <>
                  <div className="animate-fade-up space-y-4" style={{ animationDelay: "0.08s" }}>
                    <div>
                      <label htmlFor="booking-email" className={`text-[11px] font-semibold ${$.muted} uppercase tracking-widest block mb-2`}>
                        Email
                      </label>
                      <div className="relative">
                        <input
                          id="booking-email"
                          type="email"
                          value={email}
                          onChange={e => handleEmailChange(e.target.value)}
                          onBlur={handleEmailBlur}
                          placeholder="your@email.com"
                          aria-invalid={emailInvalid || emailMissing}
                          aria-describedby={emailInvalid || emailMissing ? "booking-email-error" : undefined}
                          className={`w-full px-4 py-2.5 rounded-lg border text-[13px] outline-none transition-all duration-200 focus:border-blue-500 ${$.inputBg} ${
                            emailInvalid || emailMissing ? "border-red-400 focus:border-red-500" : $.inputBorder
                          } ${$.inputText}`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-live="polite">
                          {emailState === "loading" && (
                            <>
                              <IcoSpinner />
                              <span className="sr-only">Validating email…</span>
                            </>
                          )}
                          {emailState === "valid" && (
                            <>
                              <IcoCheck />
                              <span className="sr-only">Email valid</span>
                            </>
                          )}
                          {emailState === "invalid" && email.trim() && (
                            <span className="text-[12px] font-semibold text-red-500">!</span>
                          )}
                        </div>
                      </div>
                      {(emailInvalid || emailMissing) && (
                        <p id="booking-email-error" className="mt-2 text-[12px] text-red-500">
                          {emailMissing ? "Email is required." : "Enter a valid email address."}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`text-[11px] font-semibold ${$.muted} uppercase tracking-widest`}>
                          Guests
                        </label>
                        <button
                          type="button"
                          onClick={handleAddGuest}
                          disabled={guestEmails.length >= MAX_GUESTS}
                          className="text-[12px] font-semibold text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
                        >
                          Add guest
                        </button>
                      </div>
                      {guestEmails.length >= MAX_GUESTS && (
                        <p className={`mb-2 text-[12px] ${$.sub}`}>5 guests max.</p>
                      )}
	                      {guestEmails.length > 0 && (
	                        <div className="space-y-2">
	                          {guestEmails.map((guest, index) => {
	                            const guestId = `booking-guest-${index}`;
	                            const normalizedGuest = guest.trim().toLowerCase();
	                            const guestRepeated = normalizedGuest.length > 0 && (
	                              normalizedGuest === normalizedEmail ||
	                              normalizedGuestEmails.some((otherGuest, otherIndex) => otherGuest === normalizedGuest && otherIndex !== index)
	                            );
	                            const guestInvalid = guest.trim().length > 0 && !isValidEmail(guest);
	                            const guestHasError = guestInvalid || guestRepeated;
	                            const guestValid = isValidEmail(guest) && !guestRepeated;

	                            return (
	                              <div key={guestId}>
	                                <div className="flex gap-2">
	                                  <div className="relative min-w-0 flex-1">
	                                    <input
	                                      id={guestId}
	                                      type="email"
	                                      value={guest}
	                                      onChange={e => handleGuestEmailChange(index, e.target.value)}
	                                      placeholder="guest@email.com"
	                                      aria-invalid={guestHasError}
	                                      className={`w-full px-4 py-2.5 pr-10 rounded-lg border text-[13px] outline-none transition-all duration-200 focus:border-blue-500 ${$.inputBg} ${
	                                        guestHasError ? "border-red-400 focus:border-red-500" : $.inputBorder
	                                      } ${$.inputText}`}
	                                    />
	                                    <div className="absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-live="polite">
	                                      {guestValid && <IcoCheck />}
	                                      {guestHasError && <span className="text-[12px] font-semibold text-red-500">!</span>}
	                                    </div>
	                                  </div>
	                                  <button
	                                    type="button"
	                                    onClick={() => handleRemoveGuest(index)}
	                                    aria-label={`Remove guest ${index + 1}`}
	                                    className={`px-3 text-[12px] font-semibold transition-colors ${$.sub} hover:text-red-500`}
	                                  >
	                                    Remove
	                                  </button>
	                                </div>
	                                {guestHasError && (
	                                  <p className="mt-1.5 text-[12px] text-red-500">
	                                    {guestRepeated ? "Email repeated." : "Enter a valid guest email."}
	                                  </p>
	                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-notes" className={`text-[11px] font-semibold ${$.muted} uppercase tracking-widest block mb-2`}>
                        Notes{" "}
                        <span className={`normal-case tracking-normal font-normal ${$.sub}`}>(optional)</span>
                      </label>
                      <textarea
                        id="booking-notes"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Anything you want Aman to know before the call?"
                        rows={4}
                        className={`w-full px-4 py-2.5 rounded-lg border text-[13px] outline-none transition-all duration-200 focus:border-blue-500 resize-none ${$.inputBg} ${$.inputBorder} ${$.inputText}`}
                      />
                    </div>
                    <button
                      onClick={handleConfirmBooking}
                      disabled={!canConfirmBooking}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-[14px] font-bold transition-all duration-200"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Page footer — outside the card */}
      <div className={`flex flex-col items-center gap-3 md:flex-row md:gap-6 text-xs ${$.sub}`}>
        <div className="flex gap-6">
          <button className={$.footerLink}>Cookie settings</button>
          <button className={$.footerLink}>Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}
