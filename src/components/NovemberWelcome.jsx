import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowRight,
} from "lucide-react";
import {
  isNovemberCampaign,
  novemberBanners,
  novemberRibbonPath,
} from "../utils/november-campaign.mjs";
import "../styles/november-campaign.css";
export function useNovemberCampaign() {
  const [active, setActive] = useState(() => isNovemberCampaign());
  useEffect(() => {
    const id = setInterval(() => setActive(isNovemberCampaign()), 60000);
    return () => clearInterval(id);
  }, []);
  return active;
}
export default function NovemberWelcome({ fallback = null }) {
  const touch = useRef(null);
  const active = useNovemberCampaign(),
    [current, setCurrent] = useState(0),
    [paused, setPaused] = useState(false),
    [imageError, setImageError] = useState(false),
    [retry, setRetry] = useState(0),
    [hovered, setHovered] = useState(false),
    [hidden, setHidden] = useState(() => document.visibilityState === "hidden"),
    [reduced, setReduced] = useState(
      () =>
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
        false,
    );
  useEffect(() => {
    setImageError(false);
    setRetry(0);
  }, [current]);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)"),
      motion = () => setReduced(!!query?.matches),
      visibility = () => setHidden(document.visibilityState === "hidden");
    query?.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      query?.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!active || paused || hovered || hidden || reduced) return;
    const id = setInterval(
      () => setCurrent((v) => (v + 1) % novemberBanners.length),
      9000,
    );
    return () => clearInterval(id);
  }, [active, paused, hovered, hidden, reduced]);
  if (!active) return fallback;
  const banner = novemberBanners[current],
    select = (value) => {
      setCurrent((value + novemberBanners.length) % novemberBanners.length);
      setPaused(true);
    };
  return (
    <section
      className="november-welcome"
      role="region"
      aria-roledescription="carousel"
      aria-label="November — Supernatural Provision"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = t ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchCancel={() => {
        touch.current = null;
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0],
          start = touch.current;
        touch.current = null;
        if (!start || !t) return;
        const dx = t.clientX - start.x,
          dy = t.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4)
          select(current + (dx < 0 ? 1 : -1));
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          select(current - 1);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          select(current + 1);
        }
      }}
    >
      <div className="november-campaign-topline">
        <span>Happy New Month · November 2026</span>
        <Link to="/november">
          Explore the month’s theme <ArrowRight size={16} />
        </Link>
      </div>
      <figure className="november-banner-frame">
        <img
          key={`${banner.id}:${retry}`}
          src={banner.image + (retry ? "?retry=" + retry : "")}
          onError={() => {
            setImageError(true);
            setPaused(true);
          }}
          alt={banner.alt}
          width="1672"
          height="941"
          fetchpriority="high"
          decoding="async"
        />
        <figcaption className="sr-only">
          {banner.verse} {banner.reference}, King James Version.
        </figcaption>
      </figure>
      {imageError && (
        <p className="november-image-error" role="status">
          The banner image could not load. The Bible text is available below.{" "}
          <button
            onClick={() => {
              setImageError(false);
              setRetry((v) => v + 1);
            }}
          >
            Retry image
          </button>
        </p>
      )}
      <div className="november-banner-bottom">
        <div
          className="november-banner-copy"
          aria-live={paused || reduced ? "polite" : "off"}
          aria-atomic="true"
        >
          <p className="ministry-eyebrow">Our theme for November</p>
          <h1>Supernatural Provision</h1>
          <p>
            {banner.verse} <strong>— {banner.reference} (KJV)</strong>
          </p>
        </div>
        <div className="november-banner-navigation">
          <div className="november-banner-controls">
            <button
              aria-label="Previous November banner"
              onClick={() => select(current - 1)}
            >
              <ChevronLeft size={19} />
            </button>
            {novemberBanners.map((b, i) => (
              <button
                className="november-banner-dot"
                key={b.id}
                aria-label={`Show November banner ${i + 1}: ${b.name}`}
                aria-pressed={current === i}
                onClick={() => select(i)}
              >
                <span />
              </button>
            ))}
            <button
              aria-label="Next November banner"
              onClick={() => select(current + 1)}
            >
              <ChevronRight size={19} />
            </button>
            {!reduced && (
              <button
                aria-label={
                  paused
                    ? "Play November slideshow"
                    : "Pause November slideshow"
                }
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            )}
          </div>
          <Link className="november-campaign-action" to="/devotional">
            Begin with today’s devotional <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function NovemberThemeRibbon() {
  const { pathname } = useLocation(),
    active = useNovemberCampaign();
  if (!active || !novemberRibbonPath(pathname)) return null;
  return (
    <aside
      className="november-theme-ribbon"
      aria-label="November ministry theme"
    >
      <Link to="/november">
        <span className="november-ribbon-month">November 2026</span>
        <strong>Supernatural Provision</strong>
        <span>
          Philippians 4:19 <span aria-hidden="true">→</span>
        </span>
      </Link>
    </aside>
  );
}
