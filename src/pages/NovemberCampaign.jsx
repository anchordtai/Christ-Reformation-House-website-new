import { Link } from "react-router-dom";
import MetaTags from "../components/MetaTags";
import { novemberBanners } from "../utils/november-campaign.mjs";
import "../styles/november-campaign.css";
export default function NovemberCampaign() {
  return (
    <div className="november-campaign-page">
      <MetaTags
        title="November 2026 — Supernatural Provision"
        description="Happy New Month from Apostle (Dr) Anchord Taiwo and Christ’s Reformation House International Inc. Explore our November theme and share an encouraging banner."
      />
      <header className="november-campaign-heading">
        <p className="ministry-eyebrow">Happy New Month · November 2026</p>
        <h1>Supernatural Provision</h1>
        <p>
          A new month to seek God, trust His care, and walk faithfully in His
          Word.
        </p>
        <blockquote>
          “But my God shall supply all your need according to his riches in
          glory by Christ Jesus.”<cite>Philippians 4:19 · KJV</cite>
        </blockquote>
        <p>
          With love and prayers from <strong>Apostle (Dr) Anchord Taiwo</strong>
          , Senior Pastor, and Christ’s Reformation House International Inc.
        </p>
        <div className="platform-actions">
          <Link className="ministry-button dark" to="/devotional">
            Read today’s devotional
          </Link>
          <Link className="secondary-button" to="/prayer-support">
            Let us pray with you
          </Link>
        </div>
      </header>
      <section
        className="november-banner-gallery"
        aria-label="Three November banners"
      >
        {novemberBanners.map((b) => (
          <article key={b.id}>
            <img
              src={b.image}
              alt={b.alt}
              width="1672"
              height="941"
              loading="lazy"
              decoding="async"
            />
            <div>
              <p className="ministry-eyebrow">{b.palette}</p>
              <h2>{b.name}</h2>
              <p>
                “{b.verse}” <strong>{b.reference} · KJV</strong>
              </p>
              <a
                className="secondary-button"
                href={b.social}
                download={`CRH-November-2026-Supernatural-Provision-${b.id}.jpg`}
              >
                Download banner for sharing
              </a>
            </div>
          </article>
        ))}
      </section>
      <p className="november-sharing-note">
        Share a banner on your WhatsApp Status, Facebook or Instagram, and
        invite someone to read the Word with you. Downloaded copies are 1080
        pixels wide for social sharing.
      </p>
    </div>
  );
}
