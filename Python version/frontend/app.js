"use strict";

const CONFIG = { API_BASE: "http://127.0.0.1:8000" };

/* ============================================================
   STATE  (language + theme, persisted)
   ============================================================ */
const state = {
  lang:  localStorage.getItem("bisto.lang")  || "ar",
  theme:    localStorage.getItem("bisto.theme")    || "default",
  barColor: localStorage.getItem("bisto.barColor") || "#57d6c4",
};

/* ============================================================
   THEMES (8 options, first is the current default)
   ============================================================ */
const THEMES = [
  { id: "default",   color: "#57d6c4" },  // default 
  { id: "blue",      color: "#3b82f6" },
  { id: "crimson",   color: "#dc143c" },
  { id: "darkblue",  color: "#4169e1" },
  { id: "darkgreen", color: "#2e8b57" },
  { id: "gold",      color: "#d4af37" },
  { id: "indigo",    color: "#6a5acd" },
  { id: "peru",      color: "#cd853f" },
  { id: "violet",    color: "#8b5cf6" },
  { id: "cyan",      color: "#22d3ee" },
  { id: "fuchsia",   color: "#d946ef" },
];

function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  state.theme = t.id;
  localStorage.setItem("bisto.theme", t.id);
  document.body.dataset.theme = t.id;
  const dot = document.getElementById("color-dot");
  if (dot) { dot.style.background = t.color; dot.style.boxShadow = `0 0 10px ${t.color}`; }
}
function applyBarColor(color) {
  const value = color || THEMES[0].color;
  state.barColor = value;
  localStorage.setItem("bisto.barColor", value);
  document.documentElement.style.setProperty("--bar-accent", value);
  const dot = document.getElementById("bar-color-dot");
  if (dot) { dot.style.background = value; dot.style.boxShadow = `0 0 10px ${value}`; }
}

function applyLang(lang) {
  state.lang = lang;
  localStorage.setItem("bisto.lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
  document.getElementById("lang-btn").textContent = lang === "ar" ? "En" : "Ar";
  // refresh UI text
  document.getElementById("dd-toggle-label").textContent = T("sections");
  document.getElementById("help-btn").textContent  = T("help");
  document.getElementById("rules-btn").textContent = T("rules");
  buildDropdown();

  const currentId = document.querySelector(".dd-item.active")?.dataset.tool || TOOLS[0].id;
  goToTool(currentId);
}
function t(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[state.lang] ?? v.ar ?? v.en ?? "";
}
const T = key => I18N[state.lang][key] ?? key;

/* ============================================================
   I18N — UI strings
   ============================================================ */
const I18N = {
  ar: {
    sections: "الأقسام",
    help: "مساعدة",
    rules: "القوانين",
    calc: "احسب",
    reset: "تصفير القيم",
    resultPlaceholder: 'النتيجة هتظهر هنا بعد الضغط على "احسب".',
    calculating: "...بيتحسب",
    badInput: "تأكد إن كل الحقول متملية بأرقام صحيحة.",
    solveError: "الحسبة دي مش ممكنة على القيم المدخلة.",
    connError: "تعذّر الاتصال بالسيرفر. تأكد إن الباك اند شغّال على ",
    helpTitle: "مساعدة",
    rulesTitle: "القوانين",
    rulesDesc: "كل القوانين المستخدمة في الحلّال. القانون اللي جنبه ↗ اضغط عليه علشان تحسبه على طول.",
    helpIntro: "اختار الأداة اللي محتاجها من قايمة \"الأقسام\" فوق، املا الإحداثيات، واضغط \"احسب\".",
    helpInputs: "النقطة/المتجه ثلاث قيم (x, y, z). الخط = نقطة + اتجاه. المستوى = ناظم n + d.",
    helpErrors: "الرسالة الحمراء بتظهر لما القيم مستحيلة هندسيًا (متجه صفري، نقاط متراصفة...).",
    helpConn: "الواجهة بتتكلم مع سيرفر Python شغّال على ",
    cats: { point: "نقطة", vector: "متجه", line: "خط", plane: "مستوى", area: "مساحات" },
  },

  en: {
    sections: "Sections",
    help: "Help",
    rules: "Rules",
    calc: "Calculate",
    reset: "Reset",
    resultPlaceholder: 'Result will appear here after pressing "Calculate".',
    calculating: "Calculating…",
    badInput: "Make sure every field contains a valid number.",
    solveError: "This calculation isn't possible with the given values.",
    connError: "Could not reach the server. Make sure the backend is running at ",
    helpTitle: "Help",
    rulesTitle: "Rules",
    rulesDesc: "All formulas used by the solver. Rules marked with ↗ open their calculator instantly.",
    helpIntro: 'Pick a tool from the "Sections" menu, fill in coordinates, press "Calculate".',
    helpInputs: "Point/Vector = three values (x, y, z). Line = point + direction. Plane = normal n + d.",
    helpErrors: "A red message appears when the values are geometrically impossible (zero vector, collinear points…).",
    helpConn: "The UI talks to a Python backend running at ",
    cats: { point: "Point", vector: "Vector", line: "Line", plane: "Plane", area: "Areas" },
  },
};

/* ============================================================
   HELPERS
   ============================================================ */
function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function fmtNum(n, decimals = 4) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return String(r);
}
function fmtVec(v) { return v ? `( ${fmtNum(v.x)} , ${fmtNum(v.y)} , ${fmtNum(v.z)} )` : "—"; }
function fmtExact(s) {
  if (!s) return "—";
  return String(s).replace(/sqrt\(([^)]+)\)/g, "√$1").replace(/\*/g, "");
}

const RELATION_LABELS = {
  ar: { parallel:"متوازيان", skew:"متخالفان", intersecting:"متقاطعان", identical:"منطبقان",
        on_plane:"تقع على المستوى", positive_side:"في الجهة الموجبة", negative_side:"في الجهة السالبة",
        contained:"يقع بالكامل داخل المستوى" },
  en: { parallel:"Parallel", skew:"Skew", intersecting:"Intersecting", identical:"Identical",
        on_plane:"On the plane", positive_side:"Positive side", negative_side:"Negative side",
        contained:"Contained in the plane" },
};

/* ============================================================
   DIAGRAMS (unchanged — kept short)
   ============================================================ */
const DIAGRAMS = {
  vectors2: `<svg viewBox="0 0 400 170"><g style="stroke:var(--border);stroke-width:1">
    <line x1="40" y1="150" x2="380" y2="150"/><line x1="40" y1="150" x2="40" y2="10"/></g>
    <line x1="40" y1="150" x2="280" y2="40" style="stroke:var(--accent);stroke-width:2.5" marker-end="url(#ah)"/>
    <line x1="40" y1="150" x2="320" y2="120" style="stroke:var(--accent-2);stroke-width:2.5" marker-end="url(#ah2)"/>
    <text x="285" y="35" style="fill:var(--accent);font-size:14px">a</text>
    <text x="325" y="118" style="fill:var(--accent-2);font-size:14px">b</text>
    <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--accent)"/></marker>
    <marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--accent-2)"/></marker></defs></svg>`,
  vector1: `<svg viewBox="0 0 400 170">
    <line x1="40" y1="150" x2="380" y2="150" style="stroke:var(--border)"/><line x1="40" y1="150" x2="40" y2="10" style="stroke:var(--border)"/>
    <line x1="40" y1="150" x2="300" y2="45" style="stroke:var(--accent);stroke-width:2.5" marker-end="url(#ah3)"/>
    <line x1="40" y1="150" x2="130" y2="118" style="stroke:var(--accent-2);stroke-width:2;stroke-dasharray:4 3" marker-end="url(#ah4)"/>
    <text x="305" y="42" style="fill:var(--accent);font-size:14px">v</text>
    <defs><marker id="ah3" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--accent)"/></marker>
    <marker id="ah4" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--accent-2)"/></marker></defs></svg>`,
  points2: `<svg viewBox="0 0 400 170">
    <line x1="60" y1="120" x2="340" y2="60" style="stroke:var(--accent);stroke-width:2"/>
    <circle cx="60" cy="120" r="5" style="fill:var(--accent-2)"/><circle cx="340" cy="60" r="5" style="fill:var(--accent-2)"/>
    <circle cx="200" cy="90" r="5" style="fill:var(--accent)"/>
    <text x="45" y="145" style="fill:var(--text);font-size:13px">A</text>
    <text x="345" y="50" style="fill:var(--text);font-size:13px">B</text>
    <text x="195" y="75" style="fill:var(--accent);font-size:12px">M</text></svg>`,
  "line-point": `<svg viewBox="0 0 400 170">
    <line x1="30" y1="150" x2="370" y2="70" style="stroke:var(--accent);stroke-width:2.5"/>
    <circle cx="260" cy="60" r="5" style="fill:var(--accent-2)"/>
    <line x1="260" y1="60" x2="230" y2="108" style="stroke:var(--text-dim);stroke-width:1.5;stroke-dasharray:4 3"/>
    <circle cx="230" cy="108" r="4" style="fill:var(--text-dim)"/>
    <text x="35" y="165" style="fill:var(--text-dim);font-size:12px">L</text>
    <text x="268" y="55" style="fill:var(--accent-2);font-size:13px">P</text></svg>`,
  lines2: `<svg viewBox="0 0 400 170">
    <line x1="30" y1="140" x2="370" y2="90" style="stroke:var(--accent);stroke-width:2.5"/>
    <line x1="30" y1="70" x2="370" y2="20" style="stroke:var(--accent-2);stroke-width:2.5"/></svg>`,
  plane1: `<svg viewBox="0 0 400 170">
    <polygon points="40,110 260,90 340,140 120,160" style="fill:var(--panel-2);stroke:var(--accent);stroke-width:1.5"/>
    <line x1="200" y1="120" x2="200" y2="30" style="stroke:var(--accent-2);stroke-width:2.5" marker-end="url(#ah5)"/>
    <circle cx="200" cy="120" r="4" style="fill:var(--accent)"/>
    <defs><marker id="ah5" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" style="fill:var(--accent-2)"/></marker></defs></svg>`,
  planes2: `<svg viewBox="0 0 400 170">
    <polygon points="30,100 220,80 290,120 100,140" style="fill:var(--panel-2);stroke:var(--accent);stroke-width:1.5;opacity:.9"/>
    <polygon points="90,60 280,45 360,90 170,105" style="fill:var(--panel-2);stroke:var(--accent-2);stroke-width:1.5;opacity:.75"/></svg>`,
  "line-plane": `<svg viewBox="0 0 400 170">
    <polygon points="30,120 250,95 330,140 110,165" style="fill:var(--panel-2);stroke:var(--accent);stroke-width:1.5"/>
    <line x1="230" y1="15" x2="150" y2="150" style="stroke:var(--accent-2);stroke-width:2.5"/></svg>`,
  "planes-intersect": `<svg viewBox="0 0 400 170">
    <polygon points="20,110 220,85 300,130 100,150" style="fill:var(--panel-2);stroke:var(--accent);stroke-width:1.5;opacity:.9"/>
    <polygon points="70,50 280,35 360,95 150,110" style="fill:var(--panel-2);stroke:var(--accent-2);stroke-width:1.5;opacity:.75"/>
    <line x1="65" y1="98" x2="290" y2="72" style="stroke:var(--text);stroke-width:2.5;stroke-dasharray:6 3"/></svg>`,
  "triangle-area": `<svg viewBox="0 0 400 170">
    <polygon points="60,150 340,150 220,30" style="fill:var(--panel-2);stroke:var(--accent);stroke-width:2"/>
    <line x1="220" y1="150" x2="220" y2="30" style="stroke:var(--text-dim);stroke-width:1;stroke-dasharray:4 3"/></svg>`,
};

/* ============================================================
   TOOLS  (bilingual labels)
   ============================================================ */
const TOOLS = [
  // -------- VECTOR --------
  { id:"v-dot", cat:"vector", endpoint:"/vector/dot", diagram:"vectors2",
    title:{ar:"الضرب القياسي", en:"Dot Product"},
    desc:{ar:"حاصل الضرب القياسي بين متجهين a·b.", en:"Scalar product of two vectors a·b."},
    fields:[{type:"vector",key:"a",label:{ar:"المتجه a",en:"Vector a"}},
            {type:"vector",key:"b",label:{ar:"المتجه b",en:"Vector b"}}],
    outputs:[{label:{ar:"a · b",en:"a · b"},kind:"number",path:"dot"}] },

  { id:"v-cross", cat:"vector", endpoint:"/vector/cross", diagram:"vectors2",
    title:{ar:"الضرب الاتجاهي", en:"Cross Product"},
    desc:{ar:"المتجه الناتج عن a×b، عمودي على كليهما.", en:"The vector a×b, perpendicular to both."},
    fields:[{type:"vector",key:"a",label:{ar:"المتجه a",en:"Vector a"}},
            {type:"vector",key:"b",label:{ar:"المتجه b",en:"Vector b"}}],
    outputs:[{label:{ar:"a × b",en:"a × b"},kind:"vector"}] },

  { id:"v-mag", cat:"vector", endpoint:"/vector/magnitude", diagram:"vector1",
    title:{ar:"طول المتجه", en:"Magnitude"},
    desc:{ar:"طول (مقدار) المتجه |v|.", en:"The length (magnitude) of |v|."},
    fields:[{type:"vector",key:"v",label:{ar:"المتجه v",en:"Vector v"}}],
    payloadIsField:"v",
    outputs:[{label:{ar:"|v|",en:"|v|"},kind:"number",path:"value"},
             {label:{ar:"بالصورة الدقيقة",en:"Exact form"},kind:"exact",path:"exact"}] },

  { id:"v-unit", cat:"vector", endpoint:"/vector/unit", diagram:"vector1",
    title:{ar:"متجه الوحدة", en:"Unit Vector"},
    desc:{ar:"متجه بنفس الاتجاه وطوله 1.", en:"Same direction, length 1."},
    fields:[{type:"vector",key:"v",label:{ar:"المتجه v",en:"Vector v"}}],
    payloadIsField:"v",
    outputs:[{label:{ar:"v̂",en:"v̂"},kind:"vector"}] },

  { id:"v-angle", cat:"vector", endpoint:"/vector/angle", diagram:"vectors2",
    title:{ar:"الزاوية بين متجهين", en:"Angle Between Vectors"},
    desc:{ar:"الزاوية المحصورة بين متجهين.", en:"Angle between two vectors."},
    fields:[{type:"vector",key:"a",label:{ar:"المتجه a",en:"Vector a"}},
            {type:"vector",key:"b",label:{ar:"المتجه b",en:"Vector b"}}],
    outputs:[{label:{ar:"الزاوية (درجة)",en:"Angle (°)"},kind:"number",path:"degrees",decimals:2,suffix:"°"},
             {label:{ar:"الزاوية (راديان)",en:"Angle (rad)"},kind:"number",path:"radians"}] },

  { id:"v-dircos", cat:"vector", endpoint:"/vector/direction-cosines", diagram:"vector1",
    title:{ar:"جيوب التمام الاتجاهية", en:"Direction Cosines"},
    desc:{ar:"جيب تمام الزوايا مع المحاور x, y, z.", en:"Cosines of angles with x, y, z axes."},
    fields:[{type:"vector",key:"v",label:{ar:"المتجه v",en:"Vector v"}}],
    payloadIsField:"v",
    outputs:[{label:{ar:"cos مع x",en:"cos x"},kind:"number",path:"cos_x"},
             {label:{ar:"cos مع y",en:"cos y"},kind:"number",path:"cos_y"},
             {label:{ar:"cos مع z",en:"cos z"},kind:"number",path:"cos_z"}] },

  { id:"v-proj", cat:"vector", endpoint:"/vector/projection", diagram:"vectors2",
    title:{ar:"إسقاط متجه على آخر", en:"Vector Projection"},
    desc:{ar:"إسقاط a على اتجاه b (قياسي + متجهي).", en:"Project a onto b (scalar + vector)."},
    fields:[{type:"vector",key:"a",label:{ar:"المتجه a",en:"Vector a"}},
            {type:"vector",key:"b",label:{ar:"المتجه b",en:"Vector b"}}],
    outputs:[{label:{ar:"الإسقاط القياسي",en:"Scalar projection"},kind:"number",path:"scalar"},
             {label:{ar:"الإسقاط المتجهي",en:"Vector projection"},kind:"vector",path:"vector"}] },

  // -------- POINT --------
  { id:"p-dist", cat:"point", endpoint:"/point/distance", diagram:"points2",
    title:{ar:"المسافة بين نقطتين", en:"Distance Between Points"},
    desc:{ar:"المسافة المستقيمة بين A و B.", en:"Straight-line distance between A and B."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}}],
    outputs:[{label:{ar:"المسافة",en:"Distance"},kind:"number",path:"distance"}] },

  { id:"p-mid", cat:"point", endpoint:"/point/midpoint", diagram:"points2",
    title:{ar:"منتصف القطعة", en:"Midpoint"},
    desc:{ar:"نقطة المنتصف بين A و B.", en:"Midpoint between A and B."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}}],
    outputs:[{label:{ar:"المنتصف M",en:"Midpoint M"},kind:"point"}] },

  { id:"pl-position", cat:"point", endpoint:"/plane/point-position", diagram:"plane1",
    title:{ar:"موضع نقطة من مستوى", en:"Point vs Plane"},
    desc:{ar:"هل النقطة على المستوى أم في أي جهة منه.", en:"Whether the point is on the plane and on which side."},
    fields:[{type:"point",key:"point",label:{ar:"النقطة",en:"Point"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"الموضع",en:"Position"},kind:"relation",path:"relation"}] },

  // -------- LINE --------
  { id:"l-from2", cat:"line", endpoint:"/line/from-two-points", diagram:"points2",
    title:{ar:"خط من نقطتين", en:"Line From Two Points"},
    desc:{ar:"يبني خطًا يمر بنقطتين.", en:"Builds the line through two points."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}}],
    outputs:[{label:{ar:"نقطة على الخط",en:"Point on line"},kind:"point",path:"point"},
             {label:{ar:"اتجاه الخط",en:"Direction"},kind:"vector",path:"direction"}] },

  { id:"l-dist-point", cat:"line", endpoint:"/line/distance-from-point", diagram:"line-point",
    title:{ar:"المسافة من نقطة إلى خط", en:"Point → Line Distance"},
    desc:{ar:"أقصر مسافة عمودية.", en:"Shortest perpendicular distance."},
    fields:[{type:"point",key:"point",label:{ar:"النقطة",en:"Point"}},
            {type:"line",key:"line",label:{ar:"الخط",en:"Line"}}],
    outputs:[{label:{ar:"المسافة",en:"Distance"},kind:"number",path:"distance"}] },

  { id:"l-proj-point", cat:"line", endpoint:"/line/project-point", diagram:"line-point",
    title:{ar:"إسقاط نقطة على خط", en:"Project Point on Line"},
    desc:{ar:"قدم العمود من نقطة على خط.", en:"Foot of the perpendicular from a point to a line."},
    fields:[{type:"point",key:"point",label:{ar:"النقطة",en:"Point"}},
            {type:"line",key:"line",label:{ar:"الخط",en:"Line"}}],
    outputs:[{label:{ar:"نقطة الإسقاط",en:"Projection point"},kind:"point"}] },

  { id:"l-relative", cat:"line", endpoint:"/line/relative", diagram:"lines2",
    title:{ar:"الوضع النسبي لخطين", en:"Two Lines — Relation"},
    desc:{ar:"متوازيان/متقاطعان/متخالفان/منطبقان.", en:"Parallel / intersecting / skew / identical."},
    fields:[{type:"line",key:"l1",label:{ar:"الخط L1",en:"Line L1"}},
            {type:"line",key:"l2",label:{ar:"الخط L2",en:"Line L2"}}],
    outputs:[{label:{ar:"العلاقة",en:"Relation"},kind:"relation",path:"relation"}] },

  { id:"l-dist-between", cat:"line", endpoint:"/line/distance-between", diagram:"lines2",
    title:{ar:"المسافة بين خطين", en:"Distance Between Lines"},
    desc:{ar:"يحسب العلاقة والمسافة بين الخطين.", en:"Relation and distance between two lines."},
    fields:[{type:"line",key:"l1",label:{ar:"الخط L1",en:"Line L1"}},
            {type:"line",key:"l2",label:{ar:"الخط L2",en:"Line L2"}}],
    outputs:[{label:{ar:"العلاقة",en:"Relation"},kind:"relation",path:"relation"},
             {label:{ar:"المسافة",en:"Distance"},kind:"number",path:"distance"}] },

  { id:"l-angle", cat:"line", endpoint:"/line/angle", diagram:"lines2",
    title:{ar:"الزاوية بين خطين", en:"Angle Between Lines"},
    desc:{ar:"الزاوية بين اتجاهي الخطين.", en:"Angle between the two directions."},
    fields:[{type:"line",key:"l1",label:{ar:"الخط L1",en:"Line L1"}},
            {type:"line",key:"l2",label:{ar:"الخط L2",en:"Line L2"}}],
    outputs:[{label:{ar:"الزاوية (درجة)",en:"Angle (°)"},kind:"number",path:"degrees",decimals:2,suffix:"°"},
             {label:{ar:"الزاوية (راديان)",en:"Angle (rad)"},kind:"number",path:"radians"}] },

  { id:"l-angle-plane", cat:"line", endpoint:"/line/angle-with-plane", diagram:"line-plane",
    title:{ar:"الزاوية بين خط ومستوى", en:"Line ↔ Plane Angle"},
    desc:{ar:"الزاوية بين خط ومستوى.", en:"Angle between a line and a plane."},
    fields:[{type:"line",key:"line",label:{ar:"الخط",en:"Line"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"الزاوية (درجة)",en:"Angle (°)"},kind:"number",path:"degrees",decimals:2,suffix:"°"},
             {label:{ar:"الزاوية (راديان)",en:"Angle (rad)"},kind:"number",path:"radians"}] },

  // -------- PLANE --------
  { id:"pl-from3", cat:"plane", endpoint:"/plane/from-three-points", diagram:"plane1",
    title:{ar:"مستوى من ثلاث نقاط", en:"Plane From Three Points"},
    desc:{ar:"مستوى يمر بثلاث نقاط ليست على استقامة واحدة.", en:"Plane through three non-collinear points."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}},
            {type:"point",key:"c",label:{ar:"النقطة C",en:"Point C"}}],
    outputs:[{label:{ar:"المتجه العمودي على المستوى n",en:"Normal n"},kind:"vector",path:"normal"},
             {label:{ar:"d",en:"d"},kind:"number",path:"d"}] },

  { id:"pl-dist-point", cat:"plane", endpoint:"/plane/distance-from-point", diagram:"plane1",
    title:{ar:"المسافة من نقطة إلى مستوى", en:"Point → Plane Distance"},
    desc:{ar:"أقصر مسافة عمودية.", en:"Shortest perpendicular distance."},
    fields:[{type:"point",key:"point",label:{ar:"النقطة",en:"Point"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"المسافة",en:"Distance"},kind:"number",path:"distance"}] },

  { id:"pl-proj-point", cat:"plane", endpoint:"/plane/project-point", diagram:"plane1",
    title:{ar:"إسقاط نقطة على مستوى", en:"Project Point on Plane"},
    desc:{ar:"قدم العمود من نقطة على المستوى.", en:"Foot of perpendicular from a point to a plane."},
    fields:[{type:"point",key:"point",label:{ar:"النقطة",en:"Point"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"نقطة الإسقاط",en:"Projection point"},kind:"point"}] },

  { id:"pl-relative", cat:"plane", endpoint:"/plane/relative", diagram:"planes2",
    title:{ar:"الوضع النسبي لمستويين", en:"Two Planes — Relation"},
    desc:{ar:"متوازيان، متقاطعان، منطبقان.", en:"Parallel, intersecting, identical."},
    fields:[{type:"plane",key:"p1",label:{ar:"المستوى P1",en:"Plane P1"}},
            {type:"plane",key:"p2",label:{ar:"المستوى P2",en:"Plane P2"}}],
    outputs:[{label:{ar:"العلاقة",en:"Relation"},kind:"relation",path:"relation"}] },

  { id:"pl-angle", cat:"plane", endpoint:"/plane/angle", diagram:"planes2",
    title:{ar:"الزاوية بين مستويين", en:"Angle Between Planes"},
    desc:{ar:"الزاوية بين المتجهين العمودين على المستوى المستويين.", en:"Angle between the two plane normals."},
    fields:[{type:"plane",key:"p1",label:{ar:"المستوى P1",en:"Plane P1"}},
            {type:"plane",key:"p2",label:{ar:"المستوى P2",en:"Plane P2"}}],
    outputs:[{label:{ar:"الزاوية (درجة)",en:"Angle (°)"},kind:"number",path:"degrees",decimals:2,suffix:"°"},
             {label:{ar:"الزاوية (راديان)",en:"Angle (rad)"},kind:"number",path:"radians"}] },

  { id:"pl-int-line", cat:"plane", endpoint:"/plane/intersect-line", diagram:"line-plane",
    title:{ar:"تقاطع مستوى وخط", en:"Plane ∩ Line"},
    desc:{ar:"نقطة تقاطع خط مع مستوى.", en:"Intersection point of a line with a plane."},
    fields:[{type:"line",key:"line",label:{ar:"الخط",en:"Line"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"نقطة التقاطع",en:"Intersection"},kind:"point"}] },

  { id:"pl-int-plane", cat:"plane", endpoint:"/plane/intersect-plane", diagram:"planes-intersect",
    title:{ar:"تقاطع مستويين", en:"Plane ∩ Plane"},
    desc:{ar:"خط تقاطع مستويين غير متوازيين.", en:"Intersection line of two non-parallel planes."},
    fields:[{type:"plane",key:"p1",label:{ar:"المستوى P1",en:"Plane P1"}},
            {type:"plane",key:"p2",label:{ar:"المستوى P2",en:"Plane P2"}}],
    outputs:[{label:{ar:"نقطة على الخط",en:"Point on line"},kind:"point",path:"point"},
             {label:{ar:"اتجاه الخط",en:"Direction"},kind:"vector",path:"direction"}] },

  { id:"pl-line-rel", cat:"plane", endpoint:"/plane/line-relative", diagram:"line-plane",
    title:{ar:"وضع خط بالنسبة لمستوى", en:"Line vs Plane"},
    desc:{ar:"يحتويه / يوازيه / يقطعه.", en:"Contained / parallel / intersecting."},
    fields:[{type:"line",key:"line",label:{ar:"الخط",en:"Line"}},
            {type:"plane",key:"plane",label:{ar:"المستوى",en:"Plane"}}],
    outputs:[{label:{ar:"العلاقة",en:"Relation"},kind:"relation",path:"relation"}] },

  // -------- AREA --------
  { id:"a-tri", cat:"area", endpoint:"/area/triangle", diagram:"triangle-area",
    title:{ar:"مساحة مثلث", en:"Triangle Area"},
    desc:{ar:"مساحة المثلث المحدد بثلاث نقاط.", en:"Area of the triangle through three points."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}},
            {type:"point",key:"c",label:{ar:"النقطة C",en:"Point C"}}],
    outputs:[{label:{ar:"المساحة",en:"Area"},kind:"number",path:"area"}] },

  { id:"a-para", cat:"area", endpoint:"/area/parallelogram", diagram:"triangle-area",
    title:{ar:"مساحة متوازي أضلاع", en:"Parallelogram Area"},
    desc:{ar:"مساحة متوازي الأضلاع AB × AC.", en:"Area of the parallelogram AB × AC."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}},
            {type:"point",key:"c",label:{ar:"النقطة C",en:"Point C"}}],
    outputs:[{label:{ar:"المساحة",en:"Area"},kind:"number",path:"area"}] },

  { id:"a-quad", cat:"area", endpoint:"/area/quadrilateral", diagram:"triangle-area",
    title:{ar:"مساحة رباعي مستوٍ", en:"Quadrilateral Area"},
    desc:{ar:"مساحة أي رباعي برؤوسه الأربعة.", en:"Area of any quadrilateral from its four vertices."},
    fields:[{type:"point",key:"a",label:{ar:"النقطة A",en:"Point A"}},
            {type:"point",key:"b",label:{ar:"النقطة B",en:"Point B"}},
            {type:"point",key:"c",label:{ar:"النقطة C",en:"Point C"}},
            {type:"point",key:"d",label:{ar:"النقطة D",en:"Point D"}}],
    outputs:[{label:{ar:"المساحة",en:"Area"},kind:"number",path:"area"}] },
];

const CATEGORIES = [
  { id:"point",  label:{ar:"نقطة", en:"Point"} },
  { id:"vector", label:{ar:"متجه", en:"Vector"} },
  { id:"line",   label:{ar:"خط", en:"Line"} },
  { id:"plane",  label:{ar:"مستوى", en:"Plane"} },
  { id:"area",   label:{ar:"مساحات", en:"Areas"} },
];

/* ============================================================
   RULES (bilingual)
   ============================================================ */
const RULES = [
  { cat:{ar:"متجه (Vector)",en:"Vector"}, items:[
    [{ar:"الضرب القياسي",en:"Dot product"}, "a · b = ax·bx + ay·by + az·bz", "v-dot"],
    [{ar:"الضرب الاتجاهي",en:"Cross product"}, "a × b = ( ay·bz − az·by , az·bx − ax·bz , ax·by − ay·bx )", "v-cross"],
    [{ar:"الطول",en:"Magnitude"}, "|v| = sqrt( vx² + vy² + vz² )", "v-mag"],
    [{ar:"متجه الوحدة",en:"Unit vector"}, "v̂ = v / |v|", "v-unit"],
    [{ar:"الزاوية",en:"Angle"}, "cos θ = (a · b) / (|a| |b|)", "v-angle"],
    [{ar:"الإسقاط القياسي",en:"Scalar projection"}, "comp = (a · b) / |b|", "v-proj"],
    [{ar:"الإسقاط المتجهي",en:"Vector projection"}, "proj = ( (a · b) / (b · b) ) · b", "v-proj"],
  ]},
  { cat:{ar:"نقطة (Point)",en:"Point"}, items:[
    [{ar:"المسافة بين نقطتين",en:"Distance between points"}, "d(A,B) = |B − A|", "p-dist"],
    [{ar:"منتصف القطعة",en:"Midpoint"}, "M = ( (Ax+Bx)/2 , (Ay+By)/2 , (Az+Bz)/2 )", "p-mid"],
  ]},
  { cat:{ar:"خط (Line)",en:"Line"}, items:[
    [{ar:"الصورة البارامترية",en:"Parametric form"}, "P(k) = P₀ + k·d"],
    [{ar:"المسافة من نقطة لخط",en:"Point → line"}, "d = |(-P₀→P) × d| / |d|", "l-dist-point"],
    [{ar:"توازي خطين",en:"Parallel lines"}, "متوازيان إذا d₁ × d₂ = 0", "l-relative"],
    [{ar:"المسافة بين متوازيين",en:"Parallel lines distance"}, "= المسافة من نقطة على أحدهما للآخر", "l-dist-between"],
    [{ar:"المسافة بين متخالفين",en:"Skew lines distance"}, "d = | (P₂−P₁) · (d₁×d₂) | / |d₁×d₂|", "l-dist-between"],
  ]},
  { cat:{ar:"مستوى (Plane)",en:"Plane"}, items:[
    [{ar:"معادلة المستوى",en:"Plane equation"}, "n · r + d = 0   (n = normal)"],
    [{ar:"مستوى من ٣ نقاط",en:"Plane from 3 points"}, "n = (B−A) × (C−A)", "pl-from3"],
    [{ar:"المسافة من نقطة لمستوى",en:"Point → plane"}, "d = | n·P + d | / |n|", "pl-dist-point"],
    [{ar:"توازي مستويين",en:"Parallel planes"}, "n₁ × n₂ = 0", "pl-relative"],
    [{ar:"الزاوية بين مستويين",en:"Angle between planes"}, "cos θ = (n₁ · n₂) / (|n₁| |n₂|)", "pl-angle"],
  ]},
  { cat:{ar:"مساحات (Areas)",en:"Areas"}, items:[
    [{ar:"مساحة مثلث",en:"Triangle area"}, "S = ½ | (B−A) × (C−A) |", "a-tri"],
    [{ar:"مساحة متوازي أضلاع",en:"Parallelogram area"}, "S = | (B−A) × (C−A) |", "a-para"],
    [{ar:"مساحة رباعي مستوٍ",en:"Quadrilateral area"}, "S = ½ | (C−A) × (D−B) |", "a-quad"],
  ]},
];

/* ============================================================
   FIELD RENDERING
   ============================================================ */
function coordBox(axisLabel, dataAxis, value = 0) {
  return `<span class="coord-box"><span class="axis">${axisLabel}</span>
    <input type="number" step="any" data-axis="${dataAxis}" value="${value}"></span>`;
}
function renderXYZ() {
  return `<span class="coord-row"><span class="paren">(</span>
    ${coordBox("x","x")}${coordBox("y","y")}${coordBox("z","z")}
    <span class="paren">)</span></span>`;
}
function renderField(field) {
  const label = t(field.label);
  if (field.type === "point" || field.type === "vector") {
    return `<div class="field-group" data-field-key="${field.key}" data-field-type="${field.type}">
      <div class="field-group-label">${label}</div>${renderXYZ()}</div>`;
  }
  if (field.type === "plane") {
    return `<div class="field-group" data-field-key="${field.key}" data-field-type="plane">
      <div class="field-group-label">${label} — ${state.lang==="ar"?"المتجه العمودي على المستوى n":"Normal n"}</div>
      <span class="coord-row"><span class="paren">(</span>
        ${coordBox("nx","nx")}${coordBox("ny","ny")}${coordBox("nz","nz")}
        <span class="paren">)</span>
        <span class="coord-box scalar-box"><span class="axis">d</span>
          <input type="number" inputmode="decimal" step="any" data-axis="d" value="0"></span>
      </span></div>`;
  }
  if (field.type === "line") {
    const pLbl = state.lang === "ar" ? "نقطة على الخط" : "A point on the line";
    const dLbl = state.lang === "ar" ? "اتجاه الخط"     : "Direction";
    return `<div class="field-group" data-field-key="${field.key}" data-field-type="line">
      <div class="field-group-label">${label} — ${pLbl}</div>
      <span class="coord-row"><span class="paren">(</span>
        ${coordBox("px","px")}${coordBox("py","py")}${coordBox("pz","pz")}
        <span class="paren">)</span></span>
      <div class="field-group-label" style="margin-top:8px">${label} — ${dLbl}</div>
      <span class="coord-row"><span class="paren">(</span>
        ${coordBox("dx","dx")}${coordBox("dy","dy")}${coordBox("dz","dz")}
        <span class="paren">)</span></span></div>`;
  }
  return "";
}
function readField(root, field) {
  const box = root.querySelector(`[data-field-key="${field.key}"]`);
  const val = a => parseFloat(box.querySelector(`[data-axis="${a}"]`).value) || 0;
  if (field.type === "point" || field.type === "vector")
    return { x:val("x"), y:val("y"), z:val("z") };
  if (field.type === "plane")
    return { normal:{x:val("nx"),y:val("ny"),z:val("nz")}, d: val("d") };
  if (field.type === "line")
    return { point:{x:val("px"),y:val("py"),z:val("pz")},
             direction:{x:val("dx"),y:val("dy"),z:val("dz")} };
}

/* ============================================================
   OUTPUT RENDERING
   ============================================================ */
function renderOutputs(tool, data) {
  return tool.outputs.map(o => {
    let value;
    if (o.kind === "number")       value = fmtNum(getPath(data,o.path), o.decimals ?? 4) + (o.suffix ?? "");
    else if (o.kind === "text")    value = getPath(data,o.path) ?? "—";
    else if (o.kind === "exact")   value = fmtExact(getPath(data,o.path));
    else if (o.kind === "vector" || o.kind === "point")
                                    value = fmtVec(o.path ? getPath(data,o.path) : data);
    else if (o.kind === "relation") {
      const raw = getPath(data, o.path);
      value = (RELATION_LABELS[state.lang][raw]) || raw;
    }
    return `<div class="result-row"><span class="k">${t(o.label)}</span><span class="v">${value}</span></div>`;
  }).join("");
}

/* ============================================================
   MOUNT TOOL
   ============================================================ */
function mountTool(root, tool) {
  root.innerHTML = `
    <h2 class="tool-title">${t(tool.title)}</h2>
    <p class="tool-desc">${t(tool.desc)}</p>
    <div class="diagram-wrap">${DIAGRAMS[tool.diagram] || ""}</div>
    <div class="fields">${tool.fields.map(renderField).join("")}</div>
    <div class="actions">
      <button class="solve-btn" type="button">${T("calc")}</button>
      <button class="reset-btn" type="button">${T("reset")}</button>
    </div>
    <div class="result-panel empty">${T("resultPlaceholder")}</div>`;
  root.querySelector(".solve-btn").addEventListener("click", () => solve(root, tool));
  root.querySelector(".reset-btn").addEventListener("click", () => mountTool(root, tool));
}

async function solve(root, tool) {
  const panel = root.querySelector(".result-panel");
  panel.className = "result-panel";
  panel.textContent = T("calculating");
  let payload = {};
  try {
    tool.fields.forEach(f => { payload[f.key] = readField(root, f); });
    if (tool.payloadIsField) payload = payload[tool.payloadIsField];
  } catch (e) {
    panel.className = "result-panel error";
    panel.textContent = T("badInput");
    return;
  }
  try {
    const res = await fetch(CONFIG.API_BASE + tool.endpoint, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      panel.className = "result-panel error";
      panel.textContent = data.detail || T("solveError");
      return;
    }
    panel.className = "result-panel";
    panel.innerHTML = renderOutputs(tool, data);
  } catch (e) {
    panel.className = "result-panel error";
    panel.textContent = T("connError") + CONFIG.API_BASE;
  }
}

/* ============================================================
   DROPDOWN
   ============================================================ */
function buildDropdown() {
  const panel = document.getElementById("dropdown-panel");
  panel.innerHTML = CATEGORIES.map(cat => `
    <div class="dd-cat">
      <div class="dd-cat-title">${t(cat.label)}</div>
      ${TOOLS.filter(x => x.cat === cat.id).map(x =>
        `<button class="dd-item" type="button" data-tool="${x.id}">${t(x.title)}</button>`
      ).join("")}
    </div>`).join("");
  panel.querySelectorAll("[data-tool]").forEach(btn => {
    btn.addEventListener("click", () => { goToTool(btn.dataset.tool); closeDropdown(); });
  });
  // keep the active item highlighted after a rebuild
  const active = TOOLS.find(x => x.id === currentToolId);
  if (active) setActiveDropdownItem(active.id);
}
function setActiveDropdownItem(toolId) {
  document.querySelectorAll(".dd-item").forEach(b =>
    b.classList.toggle("active", b.dataset.tool === toolId));
}
function openDropdown()  { document.getElementById("dropdown-panel").classList.add("open");
                           document.getElementById("dd-toggle").classList.add("active"); }
function closeDropdown() { document.getElementById("dropdown-panel").classList.remove("open");
                           document.getElementById("dd-toggle").classList.remove("active"); }
function toggleDropdown(){
  const p = document.getElementById("dropdown-panel");
  p.classList.contains("open") ? closeDropdown() : openDropdown();
}

let currentToolId = null;
function goToTool(toolId) {
  const tool = TOOLS.find(x => x.id === toolId);
  if (!tool) return;
  currentToolId = toolId;
  setActiveDropdownItem(toolId);
  document.getElementById("panel-bar-title").textContent = t(tool.title);
  mountTool(document.getElementById("content-body"), tool);
}

/* ============================================================
   HELP MODAL
   ============================================================ */
function openHelpModal() {
  document.getElementById("help-body").innerHTML = `
    <h2 class="tool-title">${T("helpTitle")}</h2>
    <div class="help-section"><h2>${state.lang==="ar"?"الفكرة":"Idea"}</h2>
      <p>${T("helpIntro")}</p></div>
    <div class="help-section"><h2>${state.lang==="ar"?"إدخال البيانات":"Inputs"}</h2>
      <p>${T("helpInputs")}</p></div>
    <div class="help-section"><h2>${state.lang==="ar"?"لو ظهر خطأ":"Errors"}</h2>
      <p>${T("helpErrors")}</p></div>
    <div class="help-section"><h2>${state.lang==="ar"?"الاتصال بالباك اند":"Backend"}</h2>
      <p>${T("helpConn")}<code>${CONFIG.API_BASE}</code></p></div>`;
  document.getElementById("help-overlay").classList.add("open");
}
function closeHelpModal(){ document.getElementById("help-overlay").classList.remove("open"); }

/* ============================================================
   RULES MODAL
   ============================================================ */
function openRulesModal() {
  const body = document.getElementById("rules-body");
  body.innerHTML =
    `<h2 class="tool-title">${T("rulesTitle")}</h2>
     <p class="tool-desc">${T("rulesDesc")}</p>` +
    RULES.map(g => `
      <div class="rules-category"><h2>${t(g.cat)}</h2>
        ${g.items.map(([name, formula, toolId]) => `
          <div class="rule-card ${toolId ? "clickable" : ""}" ${toolId ? `data-tool="${toolId}"` : ""}>
            <div class="name">${t(name)}</div>
            <div class="formula">${formula}</div>
          </div>`).join("")}
      </div>`).join("");
  body.querySelectorAll(".rule-card.clickable").forEach(card => {
    card.addEventListener("click", () => { closeRulesModal(); enterRuleMode(card.dataset.tool); });
  });
  document.getElementById("rules-overlay").classList.add("open");
}
function closeRulesModal(){ document.getElementById("rules-overlay").classList.remove("open"); }

/* ============================================================
   RULE MODE (floating panel)
   ============================================================ */
function enterRuleMode(toolId) {
  const tool = TOOLS.find(x => x.id === toolId);
  if (!tool) return;
  document.getElementById("nav-dropdown").classList.add("rule-mode");
  const panel = document.getElementById("floating-panel");
  panel.hidden = false;
  panel.style.transform = "translateX(-50%)";
  panel.style.left = "50%";
  const topbarBottom = document.getElementById("topbar").getBoundingClientRect().bottom;
  panel.style.top  = (topbarBottom + 8) + "px";
  panel.style.position = "fixed";
  panel.style.zIndex = "90";        // ⬅️ تحت الـ topbar (500)
  document.getElementById("floating-panel-title").textContent = t(tool.title);
  mountTool(document.getElementById("floating-panel-body"), tool);
}

   function exitRuleMode() {
  document.getElementById("nav-dropdown").classList.remove("rule-mode");
  document.getElementById("floating-panel").hidden = true;
}
   
function enableDrag(panelEl, barEl) {
  let dragging = false;
  let offX = 0, offY = 0;

  function isInteractive (){
    return !!el.closest("button, input, textarea, select, a, label, .no-drag")
  }

  function getBounds() {
    const rect = panelEl.getBoundingClientRect();
    const topbar = document.getElementById("topbar");
    const topLimit = topbar ? topbar.getBoundingClientRect().bottom : 0;
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(topLimit, window.innerHeight - rect.height);
    return { rect, topLimit, maxX, maxY };
  }

  function clampPosition(left, top) {
    const { maxX, maxY, topLimit } = getBounds();
    return {
      left: Math.min(Math.max(0, left), maxX),
      top: Math.min(Math.max(topLimit, top), maxY),
    };
  }

  function startDrag(clientX, clientY, event) {
    const rect = panelEl.getBoundingClientRect();

    if (panelEl.style.position !== "fixed") {
      panelEl.style.position = "fixed";
      panelEl.style.width = rect.width + "px";
      panelEl.style.margin = "0";
      panelEl.style.left = rect.left + "px";
      panelEl.style.top = rect.top + "px";
      panelEl.style.transform = "none";
      panelEl.classList.add("floating");
    }

    // Re-read after switching to fixed.
    const fixedRect = panelEl.getBoundingClientRect();
    const safe = clampPosition(fixedRect.left, fixedRect.top);
    panelEl.style.left = safe.left + "px";
    panelEl.style.top = safe.top + "px";

    offX = clientX - safe.left;
    offY = clientY - safe.top;
    dragging = true;
    panelEl.classList.add("dragging");
    if (event) event.preventDefault();
  }

  function moveDrag(clientX, clientY, event) {
    if (!dragging) return;
    const safe = clampPosition(clientX - offX, clientY - offY);
    panelEl.style.left = safe.left + "px";
    panelEl.style.top = safe.top + "px";
    if (event) event.preventDefault();
  }

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    panelEl.classList.remove("dragging");
  }

  barEl.addEventListener("mousedown", e => {
    if (isInteractive(e.target)) return;   
    startDrag(e.clientX, e.clientY, e);
  });

  barEl.addEventListener("touchstart", e => {
    if (isInteractive(e.target)) return;  
    const t0 = e.touches[0];
    if (t0) startDrag(t0.clientX, t0.clientY, e);
  }, { passive: false });  window.addEventListener("mouseup", stopDrag);


  window.addEventListener("touchmove", e => {
    if (!dragging) return;
    const t0 = e.touches[0];
    if (t0) moveDrag(t0.clientX, t0.clientY, e);
  }, { passive: false });

  window.addEventListener("touchend", stopDrag);
  window.addEventListener("touchcancel", stopDrag);

  window.addEventListener("resize", () => {
    if (panelEl.style.position !== "fixed") return;
    const rect = panelEl.getBoundingClientRect();
    const safe = clampPosition(rect.left, rect.top);
    panelEl.style.left = safe.left + "px";
    panelEl.style.top = safe.top + "px";
  });
}

/* ============================================================
   COLOR PALETTE
   ============================================================ */
function buildPalette() {
  const pal = document.getElementById("color-palette");
  pal.innerHTML = THEMES.map(th =>
    `<span class="swatch ${th.id===state.theme?"active":""}"
           data-theme="${th.id}"
           style="background:${th.color}; color:${th.color}"
           title="${th.id}"></span>`
  ).join("");
  pal.querySelectorAll(".swatch").forEach(s => {
    s.addEventListener("click", () => {
      applyTheme(s.dataset.theme);
      pal.querySelectorAll(".swatch").forEach(x =>
        x.classList.toggle("active", x.dataset.theme === s.dataset.theme));
      setTimeout(closePalette, 120);
    });
  });
}
function openPalette() {
  document.getElementById("topbar").classList.add("palette-mode");
  document.getElementById("color-palette").hidden = false;
}
function closePalette() {
  document.getElementById("topbar").classList.remove("palette-mode");
  document.getElementById("color-palette").hidden = true;
}

/* ============================================================
   BAR COLOR PALETTE — changes only the topbar + window bars
   ============================================================ */
function buildBarPalette() {
  const pal = document.getElementById("bar-color-palette");
  pal.innerHTML = THEMES.map(th =>
    `<span class="bar-swatch ${th.color.toLowerCase() === state.barColor.toLowerCase() ? "active" : ""}"
           data-color="${th.color}"
           style="background:${th.color}; color:${th.color}"
           title="${th.id}"></span>`
  ).join("");

  pal.querySelectorAll(".bar-swatch").forEach(s => {
    s.addEventListener("click", () => {
      applyBarColor(s.dataset.color);
      pal.querySelectorAll(".bar-swatch").forEach(x =>
        x.classList.toggle("active", x.dataset.color.toLowerCase() === state.barColor.toLowerCase()));
      setTimeout(closeBarPalette, 120);
    });
  });
}
function openBarPalette() {
  document.getElementById("topbar").classList.add("bar-palette-mode");
  document.getElementById("bar-color-palette").hidden = false;
}
function closeBarPalette() {
  document.getElementById("topbar").classList.remove("bar-palette-mode");
  document.getElementById("bar-color-palette").hidden = true;
}

/* ============================================================
   INIT
   ============================================================ */
(function init() {
  applyTheme(state.theme);
  applyBarColor(state.barColor);
  applyLang(state.lang);

  document.getElementById("dd-toggle").addEventListener("click", e => {
    e.stopPropagation();
    toggleDropdown();
  });
  document.addEventListener("click", e => {
    const wrap = document.getElementById("nav-dropdown");
    if (wrap && !wrap.contains(e.target)) closeDropdown();
  });

  // language toggle — one click flips
  document.getElementById("lang-btn").addEventListener("click", () => {
    applyLang(state.lang === "ar" ? "en" : "ar");
  });

  // color palette
  document.getElementById("color-btn").addEventListener("click", e => {
    e.stopPropagation();
    document.getElementById("color-palette").hidden ? openPalette() : closePalette();
  });
  document.addEventListener("click", e => {
    const pal = document.getElementById("color-palette");
    const btn = document.getElementById("color-btn");
    if (!pal.hidden && !pal.contains(e.target) && !btn.contains(e.target)) closePalette();
  });
  buildPalette();
  buildBarPalette();

  document.getElementById("bar-color-btn").addEventListener("click", e => {
    e.stopPropagation();
    document.getElementById("bar-color-palette").hidden ? openBarPalette() : closeBarPalette();
  });
  document.addEventListener("click", e => {
    const pal = document.getElementById("bar-color-palette");
    const btn = document.getElementById("bar-color-btn");
    if (!pal.hidden && !pal.contains(e.target) && !btn.contains(e.target)) closeBarPalette();
  });

  // modals
  document.getElementById("help-btn").addEventListener("click", openHelpModal);
  document.getElementById("help-close").addEventListener("click", closeHelpModal);
  document.getElementById("help-overlay").addEventListener("click", e => {
    if (e.target.id === "help-overlay") closeHelpModal();
  });
  document.getElementById("rules-btn").addEventListener("click", openRulesModal);
  document.getElementById("rules-close").addEventListener("click", closeRulesModal);
  document.getElementById("rules-overlay").addEventListener("click", e => {
    if (e.target.id === "rules-overlay") closeRulesModal();
  });

document.getElementById("floating-panel-close")
  .addEventListener("click", exitRuleMode);
enableDrag(
  document.getElementById("floating-panel"),
  document.getElementById("floating-panel-bar")
);

enableDrag(
  document.getElementById("content"),
  document.getElementById("panel-bar")
);

  // initial tool
  currentToolId = TOOLS[0].id;
  setActiveDropdownItem(currentToolId);
  document.getElementById("panel-bar-title").textContent = t(TOOLS[0].title);
  mountTool(document.getElementById("content-body"), TOOLS[0]);

  const fpClose = document.getElementById("floating-panel-close");
  fpClose.addEventListener("mousedown",  e => e.stopPropagation());
  fpClose.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
})();
