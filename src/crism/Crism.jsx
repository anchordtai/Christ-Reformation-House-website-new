import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Routes,
  Route,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { institution as I, schools, programmes, values } from "./catalogue";
import "./crism.css";
import {schoolImages,imageForSchool,SchoolScene,useSchoolReveal} from "./visuals";
import Portal, {VerifyAward} from "./portal/Portal";
import Admissions from "./portal/Admissions";
export function Crest({large=false}){return <img className={large?'crism-crest large':'crism-crest'} src="/assets/crism/logo.jpg" alt="CRISM — Christ Reformation International School of Ministry" width={large?360:108} height={large?240:72}/>;}
const nav = [
  ["/crism", "Home"],
  ["/crism/about", "About"],
  ["/crism/schools", "Schools"],
  ["/crism/programmes", "Programmes"],
  ["/crism/admissions", "Admissions"],
  ["/crism/contact", "Contact"],
  ["/crism/portal", "School portal"],
];
function Arrow() {
  return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 19 19 5M5 5h14v14"/></svg>;
}
function Title({ eyebrow, title, children }) {
  const {pathname}=useLocation();const image=/vision|mission|president|contact/.test(pathname)?schoolImages.service:/library|theology|biblical/.test(pathname)?schoolImages.study:schoolImages.community;
  return (
    <section className="crism-page-title crism-image-title">
      <img className="crism-title-image" src={image.src} alt="" aria-hidden="true" width="1536" height="1024" decoding="async"/>
      <div className="crism-wrap">
        <p className="crism-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="crism-lead">{children}</p>}
      </div>
    </section>
  );
}
function Status() {
  return (
    <p className="crism-status">
      <span aria-hidden="true">●</span> Certificate and Diploma training · Admissions: 10 December 2026–10 January 2027
    </p>
  );
}
function SchoolCards() {
  return (
    <div className="crism-schools">
      {schools.map((s, i) => (
        <Link
          to={`/crism/schools/${s.slug}`}
          key={s.slug}
          className="crism-school"
        >
          <div className="crism-school-photo"><img src={imageForSchool(s.slug).src} alt={imageForSchool(s.slug).alt} width="1536" height="1024" loading="lazy" decoding="async"/></div><span className="crism-school-number">0{i + 1}</span>
          <h3>School of {s.name}</h3>
          <p>{s.description}</p>
          <span className="crism-text-link">
            Explore the school <Arrow />
          </span>
        </Link>
      ))}
    </div>
  );
}
function Home() {
  return (
    <>
      <section className="crism-hero crism-image-hero">
        <img className="crism-hero-background" src={schoolImages.study.src} alt="" aria-hidden="true" width="1536" height="1024" fetchPriority="high" decoding="async"/>
        <div className="crism-wrap crism-hero-grid">
          <div>
            <p className="crism-eyebrow">Scripture. Formation. Service.</p>
            <h1>
              Rooted in the Word.
              <br />
              <em>Prepared for ministry.</em>
            </h1>
            <p className="crism-hero-copy">
              A vision for Christ-centred biblical education, theological depth
              and servant leadership—accessible across borders, grounded in the
              life of the Church.
            </p>
            <div className="crism-actions">
              <Link className="crism-button gold" to="/crism/programmes">
                Explore programmes <Arrow />
              </Link>
              <Link className="crism-button outline" to="/crism/about">
                Discover CRISM
              </Link>
            </div>
            <Status />
          </div>
          <div className="crism-hero-seal">
            <div className="crism-seal-orbit" />
            <Crest large />
            <p>
              CHRIST REFORMATION
              <br />
              INTERNATIONAL SCHOOL OF MINISTRY
            </p>
            <span>
              Faith seeking understanding. Learning expressed in service.
            </span>
          </div>
        </div>
      </section>
      <div className="crism-intro-strip">
        <div className="crism-wrap">
          <span>A distinct academic vision</span>
          <span>Six proposed schools</span>
          <span>
            Affiliated with Christ’s Reformation House International Inc.
          </span>
        </div>
      </div>
      <section className="crism-section crism-wrap">
        <div className="crism-section-head">
          <div>
            <p className="crism-eyebrow">The heart of CRISM</p>
            <h2>
              Learning that forms
              <br />
              the whole servant.
            </h2>
          </div>
          <p>
            Knowledge matters. So do character, prayer, compassion and faithful
            practice. CRISM’s academic framework brings biblical study
            and ministerial formation into the same conversation.
          </p>
        </div>
        <div className="crism-pillars">
          {[
            [
              "01",
              "Understand Scripture",
              "Read the Bible in context, ask thoughtful questions and build habits of careful interpretation.",
            ],
            [
              "02",
              "Grow in character",
              "Connect theological reflection with spiritual maturity, integrity and everyday discipleship.",
            ],
            [
              "03",
              "Serve with purpose",
              "Prepare for compassionate pastoral care, responsible leadership and the work of the Gospel.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="crism-section crism-wrap crism-formation crism-reveal"><SchoolScene kind="community" caption="Learn in community. Grow in purpose."/><div><p className="crism-eyebrow">A calling worth preparing for</p><h2>Deep roots.<br/><em>Lasting impact.</em></h2><p>Bring your questions, your experience and your desire to serve. Explore a structured path through Scripture, Christian character and practical ministry.</p><div className="crism-actions"><Link className="crism-button navy" to="/crism/admissions">Begin your journey <Arrow /></Link><Link className="crism-text-link" to="/crism/portal">Open school portal <Arrow /></Link></div><p className="crism-small">Certificate · 3 months &nbsp; | &nbsp; Diploma · 6 months</p></div></section>
      <section className="crism-section crism-tinted">
        <div className="crism-wrap">
          <div className="crism-section-head">
            <div>
              <p className="crism-eyebrow">Our proposed academic community</p>
              <h2>
                Six schools.
                <br />
                One Christ-centred vision.
              </h2>
            </div>
            <Link className="crism-text-link" to="/crism/schools">
              Explore all schools <Arrow />
            </Link>
          </div>
          <SchoolCards />
        </div>
      </section>
      <section className="crism-section crism-wrap crism-journey">
        <div>
          <p className="crism-eyebrow">Your next step</p>
          <h2>
            Explore your calling.
            <br />
            Understand the path.
          </h2>
          <p>
            Begin with the proposed programme catalogue. Certificate and Diploma admissions run 10 December 2026–10 January 2027. Review the school fees, create an account and follow the approved intake information.
          </p>
          <Link className="crism-button navy" to="/crism/admissions">
            Read admission information <Arrow />
          </Link>
        </div>
        <ol>
          {[
            [
              "Explore",
              "Find a proposed area of study that fits your interests and ministry.",
            ],
            [
              "Ask",
              "Contact the ministry with questions about the developing institution.",
            ],
            [
              "Prepare",
              "Review approved requirements when an intake is announced.",
            ],
          ].map(([t, p]) => (
            <li key={t}>
              <h3>{t}</h3>
              <p>{p}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="crism-motto crism-image-motto">
        <div className="crism-wrap">
          <p className="crism-eyebrow">Our institutional motto</p>
          <h2>
            Equipping Lives.
            <br />
            Transforming Ministries.
            <br />
            <em>Advancing the Kingdom.</em>
          </h2>
          <Link className="crism-button outline" to="/crism/vision-mission">
            Our vision & mission <Arrow />
          </Link>
        </div>
      </section>
    </>
  );
}
function About({ vision = false, president = false }) {
  return (
    <>
      <Title
        eyebrow={
          president
            ? "Institutional leadership"
            : vision
              ? "Purpose & conviction"
              : "About the institution"
        }
        title={
          president
            ? "A vision for faithful service."
            : vision
              ? "Biblical education with a Kingdom purpose."
              : "Meet CRISM."
        }
      >
        {president
          ? `${I.president} · Founder/Senior Pastor and proposed Seminary President, subject to final governance arrangements.`
          : "A distinct institutional identity, affiliated with Christ’s Reformation House International Inc."}
      </Title>
      <section className="crism-section crism-wrap crism-reading">
        {!president&&<SchoolScene kind={vision?"service":"community"} caption={vision?"Learning expressed through compassionate service.":"A community shaped by Scripture and purpose."}/>}
        {president ? (
          <>
            <h2>Leadership and formation</h2>
            <p>
              CRISM is being developed under the leadership of {I.president}.
              Its vision brings together careful biblical study, spiritual
              formation and practical preparation for Christian ministry.
            </p>
            <p>
              Governance appointments, academic leadership and a formal
              presidential welcome will be published after institutional
              confirmation.
            </p>
          </>
        ) : (
          <>
            <h2>Our vision</h2>
            <p>
              To become a globally accessible centre for biblical education,
              theological excellence, spiritual formation, and leadership
              development, equipping believers and Christian ministers for
              effective service in the Kingdom of God.
            </p>
            <h2>Our mission</h2>
            <p>
              To provide accessible, structured, Christ-centred biblical and
              theological education through quality teaching, practical ministry
              training, academic research, spiritual development, and digital
              learning.
            </p>
            <h2>Convictions that shape our work</h2>
            <ul className="crism-values">
              {values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p>
              The motto “{I.motto}” is provisional. Academic policies and
              institutional governance remain under development.
            </p>
          </>
        )}
        <div className="crism-notice">
          <h3>Qualifications and recognition</h3>
          <p>
            Programme titles are proposals for institutional ministry training.
            No university accreditation, recognized degree-awarding authority or
            professional licence is claimed. Final award descriptions and any
            verified recognition will be published before enrolment.
          </p>
        </div>
        <Link className="crism-text-link" to="/crism/programmes">
          Explore the proposed catalogue <Arrow />
        </Link>
      </section>
    </>
  );
}
function Schools() {
  return (
    <>
      <Title
        eyebrow="Academic structure"
        title="A place for every area of service."
      >
        Explore the six proposed schools and their areas of study.
      </Title>
      <section className="crism-section crism-wrap">
        <SchoolCards />
      </section>
    </>
  );
}
function School({ slug }) {
  const s = schools.find((s) => s.slug === slug);
  if (!s) return <Missing />;
  return (
    <>
      <Title eyebrow="Proposed academic school" title={`School of ${s.name}`}>
        {s.line}
      </Title>
      <section className="crism-section crism-wrap crism-reading">
        <p className="crism-lead">{s.description}</p>
        <h2>Proposed areas of study</h2>
        <ul className="crism-values">
          {s.courses.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p>
          Course credits, syllabuses, lecturers and study schedules will be
          published after academic approval.
        </p>
        <Link
          className="crism-button navy"
          to={`/crism/programmes?school=${s.slug}`}
        >
          View related programmes <Arrow />
        </Link>
      </section>
    </>
  );
}
function Catalogue() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    school = params.get("school") || "",
    level = params.get("level") || "";
  const filtered = programmes.filter(
    (p) =>
      (!school || p.school === school) &&
      (!level || p.level === level) &&
      p.title.toLowerCase().includes(q.toLowerCase()),
  );
  function filter(k, v) {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  }
  return (
    <>
      <Title eyebrow="Proposed programme catalogue" title="Study with purpose.">
        Certificate and Diploma admissions run 10 December 2026–10 January 2027. Advanced programmes remain under development.
      </Title>
      <section className="crism-section crism-wrap">
        <div className="crism-filters">
          <label>
            Find a programme
            <input
              type="search"
              maxLength={100}
              value={q}
              onChange={(e) => filter("q", e.target.value)}
              placeholder="Search an area of study"
            />
          </label>
          <label>
            School
            <select
              value={school}
              onChange={(e) => filter("school", e.target.value)}
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option value={s.slug} key={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Qualification type
            <select
              value={level}
              onChange={(e) => filter("level", e.target.value)}
            >
              <option value="">All types</option>
              {[...new Set(programmes.map((p) => p.level))].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
        <p role="status" className="crism-result-count">
          {filtered.length} proposed{" "}
          {filtered.length === 1 ? "programme" : "programmes"}
        </p>
        <div className="crism-programmes">
          {filtered.map((p) => (
            <Link
              className="crism-programme"
              to={`/crism/programmes/${p.slug}`}
              key={p.slug}
            >
              <span className="crism-eyebrow">{p.level}</span>
              <h2>{p.title}</h2>
              <p>School of {schools.find((s) => s.slug === p.school).name}</p>
              <span className="crism-text-link">
                Programme information <Arrow />
              </span>
              <span className="crism-tag">Proposed</span>
            </Link>
          ))}
        </div>
        {!filtered.length && (
          <div className="crism-notice">
            <h2>No programmes match these filters.</h2>
            <button
              type="button"
              className="crism-button navy"
              onClick={() => setParams({})}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
function Programme({ slug }) {
  const p = programmes.find((p) => p.slug === slug);
  if (!p) return <Missing />;
  return (
    <>
      <Title eyebrow={`${p.level} · Proposed`} title={p.title}>
        An area of study in the School of{" "}
        {schools.find((s) => s.slug === p.school).name}.
      </Title>
      <section className="crism-section crism-wrap crism-reading">
        <div className="crism-notice">
          <h2>Programme under academic development</h2>
          <p>
            Certificate programmes run for 3 months and Diploma programmes for 6 months. Startup admissions run 10 December 2026–10 January 2027. The application fee is ₦2,500, with ₦20,000 tuition and certification after an offer. Approved curriculum and intake availability are shown in the school portal. This information page does not accept applications or payments.
          </p>
        </div>
        <h2>A foundation for thoughtful ministry</h2>
        <p>
          The proposed programme belongs to CRISM’s developing framework for
          biblical education, spiritual formation and responsible Christian
          service.
        </p>
        <p>
          Institutional certificates and diplomas must be distinguished from
          legally recognized academic degrees. CRISM makes no claim of
          university accreditation or regulated degree-awarding authority.
        </p>
        <div className="crism-actions">
          <Link className="crism-button navy" to="/crism/contact">
            Ask about this programme <Arrow />
          </Link>
          <Link className="crism-text-link" to="/crism/programmes">
            Back to catalogue
          </Link>
        </div>
      </section>
    </>
  );
}
function Information({ kind }) {
  const content = {
    admissions: [
      "Admissions",
      "Prepare for your next chapter.",
      "Admissions are not yet open.",
      "Applications will open only after programme requirements, academic governance, intake dates, privacy terms and the application workflow are approved. No application fee is being collected on this page.",
    ],
    fees: [
      "Tuition & scholarships",
      "Accessible learning. Clear information.",
      "Application: ₦2,500. Tuition and certification: ₦20,000.",
      "Total school fees are ₦22,500. School invoices use the existing Flutterwave gateway and are recorded separately from church donations. View foreign-currency quotes in the admissions page and portal before paying. Scholarship and refund policies require separate approval.",
    ],
    scholarships: [
      "Scholarships & sponsorship",
      "A vision for shared opportunity.",
      "Scholarship arrangements are under development.",
      "Eligibility criteria, award values and an application process will be published after institutional approval. No student sponsorship allocation is being collected here.",
    ],
    faculty: [
      "Faculty & lecturers",
      "Teaching shaped by knowledge and character.",
      "Academic officer: Pastor Cecilia Taiwo.",
      "Verified biographies, qualifications, specializations and teaching assignments will be added after appointments are confirmed.",
    ],
    library: [
      "Digital theological library",
      "Resources for deeper study.",
      "The institutional library is being prepared.",
      "Licensed resources and permitted downloads will be listed when available. In the meantime, the church’s Bible reader and devotional resources are available.",
    ],
    calendar: [
      "Academic calendar",
      "Plan your learning journey.",
      "Admissions: 10 December 2026–10 January 2027.",
      "The admission window uses Africa/Lagos time. The teaching start date will be announced separately. Enrolled students see live classes and assessment deadlines in their own local time in the school portal.",
    ],
    news: [
      "News & events",
      "The life of a learning community.",
      "No institutional announcements have been published.",
      "Future CRISM announcements will distinguish proposed plans from confirmed events.",
    ],
  }[kind];
  return (
    <>
      <Title eyebrow={content[0]} title={content[1]} />
      <section className="crism-section crism-wrap crism-reading">
        <h2>{content[2]}</h2>
        <p className="crism-lead">{content[3]}</p>
        {kind === "library" && (
          <Link className="crism-button navy" to="/crism/portal">
            Open the student library <Arrow />
          </Link>
        )}
        <div className="crism-notice">
          <h3>Speak with the ministry</h3>
          <p>
            For questions about CRISM’s development, use our contact
            information. A general enquiry is not an application or admission
            offer.
          </p>
          <Link className="crism-text-link" to="/crism/contact">
            Contact CRISM <Arrow />
          </Link>
        </div>
      </section>
    </>
  );
}
function Contact() {
  return (
    <>
      <Title eyebrow="Contact CRISM" title="Begin a conversation.">
        Questions about the developing institution? Contact the affiliated
        ministry and include “CRISM” in your subject.
      </Title>
      <section className="crism-section crism-wrap crism-contact">
        <div>
          <h2>We would like to hear from you.</h2>
          <p>
            Programme and admissions enquiries are welcome. Please do not send
            passports, identity documents, student records or payment details
            through a general enquiry.
          </p>
          <Link className="crism-button navy" to="/contact">
            Open the ministry enquiry form <Arrow />
          </Link>
          <p className="crism-small">
            The form saves your message for the ministry team. It does not
            create a student application or send an automatic email
            confirmation.
          </p>
        </div>
        <address>
          <span>Email</span>
          <a href={`mailto:${I.email}?subject=CRISM%20enquiry`}>{I.email}</a>
          <span>Telephone</span>
          <a href={`tel:${I.phone}`}>+234 813 846 3804</a>
          <span>Affiliated ministry location</span>
          <p>{I.location}</p>
        </address>
      </section>
    </>
  );
}
function Missing() {
  return (
    <>
      <Title eyebrow="Page not found" title="Let’s find your way." />
      <section className="crism-section crism-wrap">
        <Link className="crism-button navy" to="/crism">
          Return to CRISM
        </Link>
      </section>
    </>
  );
}
function Detail({ type }) {
  const { pathname } = useLocation();
  const slug = pathname.split("/").filter(Boolean).at(-1);
  return type === "school" ? <School slug={slug} /> : <Programme slug={slug} />;
}
export default function Crism() {
  const [open, setOpen] = useState(false),
    { pathname } = useLocation();
  useSchoolReveal(pathname);
  useEffect(() => {
    setOpen(false);
    const old = document.title;
    document.title = `CRISM | ${I.name}`;
    return () => {
      document.title = old;
    };
  }, [pathname]);
  return (
    <div className="crism-site">
      <div className="crism-affiliation">
        <div className="crism-wrap">
          <Link to="/">
            Affiliated with {I.affiliation} <Arrow />
          </Link>
          <span>Faith · Learning · Service</span>
        </div>
      </div>
      <header className="crism-header">
        <div className="crism-wrap">
          <Link className="crism-brand" to="/crism">
            <Crest />
            <span>
              <strong>CRISM</strong>
              <small>
                Christ Reformation International
                <br />
                School of Ministry
              </small>
            </span>
          </Link>
          <button
            type="button"
            className="crism-menu"
            aria-label="CRISM navigation"
            aria-expanded={open}
            aria-controls="crism-navigation"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
          <nav
            id="crism-navigation"
            className={open ? "is-open" : ""}
            aria-label="CRISM navigation"
          >
            {nav.map(([to, label]) => (
              <NavLink end={to === "/crism"} to={to} key={to}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Routes>
        <Route index element={<Home />} />
        <Route path="portal" element={<Portal />} />
        <Route path="verify/:token" element={<VerifyAward />} />
        <Route path="admissions" element={<Admissions />} />
        <Route path="privacy" element={<SchoolPrivacy />} />
        <Route path="about" element={<About />} />
        <Route path="vision-mission" element={<About vision />} />
        <Route path="president" element={<About president />} />
        <Route path="schools" element={<Schools />} />
        <Route path="schools/:slug" element={<Detail type="school" />} />
        <Route path="programmes" element={<Catalogue />} />
        <Route path="programmes/:slug" element={<Detail type="programme" />} />
        {[
          "fees",
          "scholarships",
          "faculty",
          "library",
          "calendar",
          "news",
        ].map((kind) => (
          <Route path={kind} element={<Information kind={kind} />} key={kind} />
        ))}
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<Missing />} />
      </Routes>
      <footer className="crism-footer">
        <div className="crism-wrap crism-footer-grid">
          <div>
            <Link className="crism-brand" to="/crism">
              <Crest />
              <span>
                <strong>CRISM</strong>
                <small>{I.name}</small>
              </span>
            </Link>
            <p>{I.motto}</p>
            <p><a href={`mailto:${I.email}`}>{I.email}</a></p>
            <p className="crism-small">
              Certificate and Diploma ministry training,
              affiliated with {I.affiliation}
            </p>
          </div>
          <div>
            <h2>Discover</h2>
            {[
              ["about", "About CRISM"],
              ["vision-mission", "Vision & mission"],
              ["president", "Institutional leadership"],
              ["faculty", "Faculty"],
              ["news", "News & events"],
            ].map(([p, t]) => (
              <Link key={p} to={`/crism/${p}`}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <h2>Study & connect</h2>
            {[
              ["programmes", "Proposed programmes"],
              ["admissions", "Admission information"],
              ["fees", "Tuition & scholarships"],
              ["library", "Library"],
              ["calendar", "Academic calendar"],
              ["contact", "Contact"],
            ].map(([p, t]) => (
              <Link key={p} to={`/crism/${p}`}>
                {t}
              </Link>
            ))}
          </div>
        </div>
        <div className="crism-wrap crism-footer-bottom">
          <p>
            © {new Date().getFullYear()} CRISM · Affiliated with{" "}
            {I.affiliation}
          </p>
          <p>
            Certificate and Diploma school portal. Degree admissions remain closed.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SchoolPrivacy(){return <section className="school-portal crism-wrap"><h1>School privacy information</h1><div className="school-card"><p>CRISM uses your confirmed email, name, country, time zone, application statements, academic work and payment references to operate admissions, teaching, assessment and academic records.</p><p>Authorised academic staff can access records needed for their assigned duties. Lecturers can access their assigned courses and submitted coursework. Students can access their own records. School signup does not subscribe you to marketing.</p><p>Do not submit private counselling details, medical records or another person’s information in applications or coursework. Ministry training is not a clinical counselling qualification.</p><p>Issued awards can be verified by anyone holding their verification link; verification displays the award holder’s name, programme, issue date and current award status. No student directory or transcript is published.</p><p>Request corrections or account support at admissions@christreformationhouse.org.ng. Financial and issued academic evidence may need to be retained even if an account is closed. Before opening admissions, the academic office must approve a detailed records retention policy.</p></div></section>}
