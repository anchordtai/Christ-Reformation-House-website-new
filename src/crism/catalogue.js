export const institution = {
  name: "Christ Reformation International School of Ministry",
  short: "CRISM",
  affiliation: "Christ’s Reformation House International Inc.",
  motto: "Equipping Lives. Transforming Ministries. Advancing the Kingdom.",
  president: "Apostle (Dr.) Anchord Taiwo",
  email: "info@christreformationhouse.org.ng",
  phone: "+2348138463804",
  location: "Giri, FCT Abuja, Nigeria",
};
export const schools = [
  {
    slug: "biblical-studies",
    name: "Biblical Studies",
    line: "Read faithfully. Interpret carefully.",
    description:
      "Explore the unfolding story of Scripture, its historical setting and its application to life and ministry.",
    courses: [
      "Introduction to Biblical Studies",
      "Old Testament Studies",
      "New Testament Studies",
      "Biblical Interpretation and Hermeneutics",
      "Biblical History",
      "Biblical Languages",
      "Biblical Theology",
      "Advanced Scripture Studies",
    ],
  },
  {
    slug: "theology",
    name: "Theology",
    line: "Know the faith. Think deeply.",
    description:
      "Study Christian doctrine, church history and the questions that shape a thoughtful, biblically grounded faith.",
    courses: [
      "Systematic Theology",
      "Christian Doctrine",
      "Christology",
      "Pneumatology",
      "Soteriology",
      "Eschatology",
      "Ecclesiology",
      "Church History",
      "Apologetics",
      "Comparative Theology",
    ],
  },
  {
    slug: "ministry-pastoral-studies",
    name: "Ministry & Pastoral Studies",
    line: "Form the servant behind the ministry.",
    description:
      "Connect biblical conviction with preaching, pastoral care, spiritual formation and responsible church administration.",
    courses: [
      "Foundations of Christian Ministry",
      "Pastoral Theology",
      "Homiletics",
      "Preaching and Teaching",
      "Church Leadership",
      "Pastoral Care",
      "Church Administration",
      "Ministerial Ethics",
      "Spiritual Formation",
      "Ministry Development",
    ],
  },
  {
    slug: "christian-leadership",
    name: "Christian Leadership",
    line: "Lead with wisdom. Serve with integrity.",
    description:
      "Develop a foundation for ethical leadership, healthy teams, sound governance and purposeful ministry development.",
    courses: [
      "Christian Leadership Principles",
      "Kingdom Leadership",
      "Strategic Church Management",
      "Leadership Ethics",
      "Conflict Resolution",
      "Team and Volunteer Management",
      "Organisational Development",
      "Leadership and Governance",
    ],
  },
  {
    slug: "missions-evangelism",
    name: "Missions & Evangelism",
    line: "Carry the Gospel. Serve the world.",
    description:
      "Explore evangelism, discipleship, cross-cultural ministry and the patient work of building Christ-centred communities.",
    courses: [
      "Foundations of Evangelism",
      "Biblical Missions",
      "Church Planting",
      "Cross-Cultural Ministry",
      "Global Evangelism",
      "Discipleship",
      "Missionary Leadership",
      "Community Transformation",
    ],
  },
  {
    slug: "counselling-family-ministry",
    name: "Christian Counselling & Family Ministry",
    line: "Listen with compassion. Care with wisdom.",
    description:
      "Explore biblical pastoral care, family ministry, ethical practice and appropriate professional referral.",
    courses: [
      "Foundations of Christian Counselling",
      "Biblical Counselling",
      "Marriage and Family Ministry",
      "Pastoral Counselling",
      "Christian Ethics",
      "Family Development",
      "Grief and Pastoral Care",
    ],
  },
];
const sets = [
  ["Certificate", "biblical-studies", ["Biblical Studies"]],
  [
    "Certificate",
    "ministry-pastoral-studies",
    ["Christian Ministry", "Pastoral Ministry"],
  ],
  ["Certificate", "christian-leadership", ["Christian Leadership"]],
  ["Certificate", "missions-evangelism", ["Evangelism and Missions"]],
  ["Diploma", "theology", ["Theology"]],
  ["Diploma", "biblical-studies", ["Biblical Studies"]],
  [
    "Diploma",
    "ministry-pastoral-studies",
    ["Christian Ministry", "Pastoral Studies", "Church Administration"],
  ],
  ["Diploma", "christian-leadership", ["Christian Leadership"]],
  ["Diploma", "counselling-family-ministry", ["Christian Counselling"]],
  ["Advanced Diploma", "theology", ["Theology"]],
  [
    "Advanced Diploma",
    "ministry-pastoral-studies",
    ["Christian Ministry", "Pastoral Leadership"],
  ],
  ["Advanced Diploma", "biblical-studies", ["Biblical Studies"]],
  [
    "Ministerial Development",
    "ministry-pastoral-studies",
    [
      "Ministerial Formation",
      "Apostolic and Prophetic Ministry Studies",
      "Church Growth and Administration",
    ],
  ],
  [
    "Ministerial Development",
    "christian-leadership",
    ["Leadership Development"],
  ],
  [
    "Ministerial Development",
    "biblical-studies",
    ["Advanced Biblical Interpretation"],
  ],
];
export const programmes = sets.flatMap(([level, school, titles]) =>
  titles.map((subject) => {
    const title =
      level === "Ministerial Development" ? subject : `${level} in ${subject}`;
    return {
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      level,
      school,
      status: "Proposed",
    };
  }),
);
export const values = [
  "Biblical integrity",
  "Christ-centred education",
  "Theological excellence",
  "Spiritual maturity",
  "Ministerial excellence",
  "Servant leadership",
  "Evangelism and missions",
  "Academic discipline",
  "Global Christian fellowship",
];
