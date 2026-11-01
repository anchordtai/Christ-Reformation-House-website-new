export const NOVEMBER_START = Date.parse("2026-10-31T23:00:00Z");
export const NOVEMBER_END = Date.parse("2026-11-30T23:00:00Z");
export function isNovemberCampaign(now = Date.now()) {
  return Number.isFinite(now) && now >= NOVEMBER_START && now < NOVEMBER_END;
}
export const novemberBanners = [
  {
    id: 1,
    name: "God supplies",
    palette: "Rose pink suit · emerald & gold",
    reference: "Philippians 4:19",
    verse:
      "But my God shall supply all your need according to his riches in glory by Christ Jesus.",
  },
  {
    id: 2,
    name: "The Lord provides",
    palette: "Royal blue suit · midnight & champagne",
    reference: "Psalm 23:1",
    verse: "The LORD is my shepherd; I shall not want.",
  },
  {
    id: 3,
    name: "Seek first His kingdom",
    palette: "Ivory white suit · ivory & burgundy",
    reference: "Matthew 6:33",
    verse:
      "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
  },
].map((b) => ({
  ...b,
  image: `/assets/campaigns/november-2026/banner-${b.id}.webp`,
  social: `/assets/campaigns/november-2026/banner-${b.id}-social.jpg`,
  alt: `Happy New Month — November 2026, Supernatural Provision. Apostle (Dr) Anchord Taiwo, Christ’s Reformation House International Inc. ${b.reference}, KJV. ${b.palette} design.`,
}));
export function novemberRibbonPath(path) {
  return [
    "/devotional",
    "/blog",
    "/watch",
    "/live",
    "/sermons",
    "/prayer-support",
    "/prayer-request",
    "/events",
    "/ministries",
  ].some((p) => path === p || path.startsWith(p + "/"));
}
