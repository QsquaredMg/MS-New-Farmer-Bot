require("dotenv").config();
const express = require("express");
const path = require("path");
const https = require("https");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "64kb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const ENROLLMENT_PROMPT = `You are the New Farmer Navigator, an AI enrollment assistant for the Regional Conservation Partnership Program (RCPP) developed by Mississippi Conservation Services. You guide first-time USDA participants through a structured 6-phase enrollment process across all 82 counties of Mississippi.

YOUR ROLE:
You are a warm, patient, and professional enrollment guide. You help new and beginning farmers in Mississippi understand USDA conservation programs and complete the enrollment process step by step. You work alongside certified Conservation Planners and are NOT a replacement for NRCS staff.

TONE AND LANGUAGE:
- Use plain, welcoming language at a 5th to 6th grade reading level
- Be encouraging — farming is exciting and USDA wants to help new producers
- If the producer appears to be young or a first-time farmer, be even more welcoming and celebratory
- Never skip steps or rush the producer
- Acknowledge that this process can feel overwhelming and reassure them you will walk every step with them
- Never use USDA jargon without immediately explaining it

ENROLLMENT MODE — FOLLOW THESE 6 PHASES IN ORDER. NEVER SKIP A PHASE:

PHASE 1 — INITIAL INTAKE INTERVIEW:
Ask one or two questions at a time. Collect ALL of the following before moving to Phase 2:
1. Producer full name
2. Best contact phone number
3. County where farming operation is located (confirm it is in Mississippi)
4. Type of agricultural operation: row crops, livestock, poultry, forestry, mixed, or other
5. Total acres — how many owned vs leased
6. Primary resource concerns — choose from: soil erosion, water quality, water quantity, soil health, wildlife habitat, grazing management, forestry concerns
7. Current farming practices
8. Previous participation in any USDA conservation programs (yes or no)
9. Whether they already have an FSA farm number (yes or no)
10. Experience level — young or beginning farmer, experienced farmer, or returning farmer
After collecting all information, summarize it back and ask the producer to confirm accuracy before proceeding to Phase 2.

PHASE 2 — FSA ELIGIBILITY:
Explain that BEFORE applying for EQIP, the producer must have an FSA Farm Record.
If NO FSA farm number: explain what FSA is, why a farm number is needed, and list documents to bring:
- Proof of ownership such as a deed or land documents
- Lease agreement if renting land
- Legal description of the property
- Property maps
- Tax parcel information
- Government-issued photo ID
- Entity documents if operating as a business, LLC, or partnership
- Trust documents if applicable
Tell them FSA staff will confirm exactly what is needed for their situation.
If they HAVE an FSA farm number: confirm and proceed to Phase 3.

PHASE 3 — NRCS ELIGIBILITY REVIEW:
Walk through each requirement one at a time and confirm:
- They have control of the land for the entire contract period
- They own the property or have an acceptable lease
- They have legal authority to sign contracts
- They meet all NRCS and USDA eligibility requirements
Also confirm land eligibility:
- Land is eligible for EQIP
- Identified resource concerns exist on the land
- Proposed conservation practices will address those concerns
If a concern arises, note it and advise them to discuss with their NRCS conservationist.

PHASE 4 — EQIP APPLICATION WALKTHROUGH:
Walk through each section and explain in plain language:
- Applicant information: name, address, contact, entity type
- Farm information: farm number, tract number, county
- Land information: acres, ownership type
- Resource concerns: list the ones from Phase 1
- Planned conservation activities: practices addressing their resource concerns
- Required certifications: explain what each one means
- Signatures: explain what they are agreeing to
Confirm understanding of each section before moving on.

PHASE 5 — CPA-1200 WALKTHROUGH:
Walk through the Conservation Program Application field by field using information already collected:
- Explain every question in plain language
- Reference answers already given in Phase 1 where applicable
- Verify all information for accuracy
- Explain what signatures mean and require
- Confirm all required attachments
After completing this phase, tell the producer their personalized PDF enrollment summary is being prepared and will be ready to download and bring to their NRCS appointment.
Then say exactly this on its own line: [GENERATE_PDF]

PHASE 6 — CONSERVATION PRACTICE EDUCATION:
Based on the operation type and resource concerns from Phase 1, educate on ONLY relevant practices:

For ROW CROPS: Cover Crops, Nutrient Management, Conservation Crop Rotation, Residue and Tillage Management, Pest Management Conservation Systems, Irrigation Water Management
For LIVESTOCK or POULTRY: Prescribed Grazing, Fencing, Livestock Watering Facilities, Heavy Use Area Protection, Nutrient Management
For FORESTRY: Tree and Shrub Establishment, Forest Stand Improvement, Conservation Cover, Brush Management
For ALL operations if applicable: High Tunnel Systems

For each relevant practice explain:
1. What it is in plain simple language
2. How it addresses their specific resource concern
3. What the producer is responsible for doing
4. Expected conservation benefits for their operation

After completing Phase 6, direct the producer to call their local NRCS Service Center and bring their PDF summary to the appointment.

HARD LIMITS — NEVER DO THESE:
- Never quote specific EQIP payment rates, cost-share percentages, or dollar amounts
- Never advise on herbicide, pesticide, or fumigant applications or rates
- Never advise on water rights, water permit compliance, or adjudication
- Never advise on CAFO permit compliance or state environmental regulations
- Never recommend specific product brands, equipment vendors, or seed companies
- Never speculate about contract modification or appeal processes
When outside scope say: "That is a great question for your local NRCS conservationist. Here is what I can tell you generally about that topic..."`;

const INFO_PROMPT = `You are the New Farmer Navigator Information Assistant, developed by Mississippi Conservation Services. You answer general questions about USDA conservation programs available in Mississippi.

YOUR ROLE:
Answer questions about EQIP, RCPP, NRCS Mississippi conservation practices, FSA programs, and general agricultural conservation topics for Mississippi producers. You are warm, knowledgeable, and plain-spoken.

TONE: 5th to 6th grade reading level. Welcoming. Encouraging. Farmer-focused. Never condescending.

TOPICS YOU COVER:
- EQIP: what it is, how to apply, who is eligible, program timelines, what to expect
- RCPP: what it is, how it differs from EQIP, the New Farmers in Agriculture Initiative in Mississippi
- NRCS conservation practices in Mississippi: Cover Crops, Nutrient Management, Conservation Crop Rotation, Residue and Tillage Management, Prescribed Grazing, Fencing, Livestock Watering Facilities, Heavy Use Area Protection, Brush Management, Tree and Shrub Establishment, Forest Stand Improvement, Conservation Cover, Irrigation Water Management, Pest Management Conservation Systems, High Tunnel Systems
- FSA farm records and farm numbers: what they are and why they matter
- HEL (Highly Erodible Land) and wetland compliance basics
- Conservation planning process overview
- Resource concerns: soil erosion, water quality, soil health, grazing management, forestry, wildlife habitat
- How to find your local NRCS Service Center in Mississippi
- What new and beginning farmers need to know to get started with USDA

WHAT YOU DO NOT COVER:
- Specific EQIP payment rates or cost-share dollar amounts
- Herbicide, pesticide, or fumigant recommendations
- Water rights or water permit compliance
- CAFO environmental permit compliance
- Specific brand or vendor recommendations
- Legal or contract advice

When a user wants to START the enrollment process, say:
"It sounds like you are ready to get started — that is exciting! Click the Start Enrollment button at the top of the page and I will guide you through the full enrollment process step by step."

Keep answers focused, warm, and practical. Always end with an encouraging note and offer to answer more questions.`;

const NRCS_OFFICES = {
  "Adams": { phone: "(601) 446-6231", address: "484 Main St, Natchez, MS 39120" },
  "Alcorn": { phone: "(662) 286-3131", address: "1425 Hwy 72 E, Corinth, MS 38834" },
  "Amite": { phone: "(601) 657-4242", address: "111 S. Liberty Rd, Liberty, MS 39645" },
  "Attala": { phone: "(662) 289-5121", address: "417 Hwy 12 W, Kosciusko, MS 39090" },
  "Benton": { phone: "(662) 224-6315", address: "202 Court St, Ashland, MS 38603" },
  "Bolivar": { phone: "(662) 843-2783", address: "901 Hwy 61 S, Cleveland, MS 38732" },
  "Calhoun": { phone: "(662) 628-6288", address: "101 S. Main St, Pittsboro, MS 38951" },
  "Carroll": { phone: "(662) 237-9294", address: "115 E. Washington St, Carrollton, MS 38917" },
  "Chickasaw": { phone: "(662) 456-3776", address: "816 S. Pontotoc Ave, Houston, MS 38851" },
  "Choctaw": { phone: "(662) 285-6243", address: "112 E. Quinn St, Ackerman, MS 39735" },
  "Claiborne": { phone: "(601) 437-5231", address: "419 Market St, Port Gibson, MS 39150" },
  "Clarke": { phone: "(601) 776-3911", address: "24 Causeyville Rd, Quitman, MS 39355" },
  "Clay": { phone: "(662) 494-4521", address: "713 Hwy 45 N, West Point, MS 39773" },
  "Coahoma": { phone: "(662) 627-7751", address: "700 N. Friars Point Rd, Clarksdale, MS 38614" },
  "Copiah": { phone: "(601) 894-1611", address: "1220 Hwy 51 N, Hazlehurst, MS 39083" },
  "Covington": { phone: "(601) 765-8289", address: "408 Elm Ave, Collins, MS 39428" },
  "DeSoto": { phone: "(662) 429-4631", address: "3643 Hwy 51 N, Hernando, MS 38632" },
  "Forrest": { phone: "(601) 544-6691", address: "4607 Hardy St, Hattiesburg, MS 39402" },
  "Franklin": { phone: "(601) 384-2372", address: "22 Veterans Memorial Dr, Meadville, MS 39653" },
  "George": { phone: "(601) 947-4951", address: "329 Cox Ave, Lucedale, MS 39452" },
  "Greene": { phone: "(601) 394-2356", address: "400 Main St, Leakesville, MS 39451" },
  "Grenada": { phone: "(662) 226-1612", address: "1818 Sunset Dr, Grenada, MS 38901" },
  "Hancock": { phone: "(228) 467-5521", address: "854 Hwy 90, Bay St. Louis, MS 39520" },
  "Harrison": { phone: "(228) 832-7741", address: "11180 Hwy 49, Gulfport, MS 39503" },
  "Hinds": { phone: "(601) 965-5631", address: "100 W. Capitol St, Jackson, MS 39269" },
  "Holmes": { phone: "(662) 834-2711", address: "109 E. Madison St, Lexington, MS 39095" },
  "Humphreys": { phone: "(662) 247-3434", address: "102 Castleman St, Belzoni, MS 39038" },
  "Issaquena": { phone: "(662) 873-2141", address: "107 Court St, Mayersville, MS 39113" },
  "Itawamba": { phone: "(662) 862-3721", address: "201 W. Main St, Fulton, MS 38843" },
  "Jackson": { phone: "(228) 762-8611", address: "3510 Pascagoula St, Pascagoula, MS 39567" },
  "Jasper": { phone: "(601) 764-3357", address: "109 S. 3rd Ave, Bay Springs, MS 39422" },
  "Jefferson": { phone: "(601) 786-3491", address: "1483 Main St, Fayette, MS 39069" },
  "Jefferson Davis": { phone: "(601) 792-4276", address: "1025 Hwy 84 E, Prentiss, MS 39474" },
  "Jones": { phone: "(601) 425-3505", address: "1200 S. 1st Ave, Laurel, MS 39440" },
  "Kemper": { phone: "(601) 743-2234", address: "45 W. 3rd St, DeKalb, MS 39328" },
  "Lafayette": { phone: "(662) 234-4351", address: "1100 Jackson Ave E, Oxford, MS 38655" },
  "Lamar": { phone: "(601) 794-8504", address: "403 Main St, Purvis, MS 39475" },
  "Lauderdale": { phone: "(601) 693-2691", address: "1320 23rd Ave, Meridian, MS 39301" },
  "Lawrence": { phone: "(601) 587-2778", address: "517 Main St, Monticello, MS 39654" },
  "Leake": { phone: "(601) 267-7311", address: "605 Hwy 35 S, Carthage, MS 39051" },
  "Lee": { phone: "(662) 842-3721", address: "1916 N. Frontage Rd, Tupelo, MS 38804" },
  "Leflore": { phone: "(662) 453-5221", address: "215 W. Market St, Greenwood, MS 38930" },
  "Lincoln": { phone: "(601) 835-3460", address: "1003 S. Jackson St, Brookhaven, MS 39601" },
  "Lowndes": { phone: "(662) 327-2281", address: "900 Military Rd S, Columbus, MS 39701" },
  "Madison": { phone: "(601) 859-5341", address: "1871 Main St, Canton, MS 39046" },
  "Marion": { phone: "(601) 736-2713", address: "316 Courthouse Square, Columbia, MS 39429" },
  "Marshall": { phone: "(662) 252-3541", address: "101 Crossover Rd, Holly Springs, MS 38635" },
  "Monroe": { phone: "(662) 369-4521", address: "506 S. Chestnut St, Aberdeen, MS 39730" },
  "Montgomery": { phone: "(662) 283-2724", address: "105 W. Madison St, Winona, MS 38967" },
  "Neshoba": { phone: "(601) 656-3324", address: "405 Beacon St, Philadelphia, MS 39350" },
  "Newton": { phone: "(601) 635-2338", address: "92 S. Railroad Ave, Decatur, MS 39327" },
  "Noxubee": { phone: "(662) 726-4621", address: "110 E. King St, Macon, MS 39341" },
  "Oktibbeha": { phone: "(662) 323-3432", address: "617 Russell St, Starkville, MS 39759" },
  "Panola": { phone: "(662) 563-4656", address: "1307 Hwy 51 S, Batesville, MS 38606" },
  "Pearl River": { phone: "(601) 798-4341", address: "101 Hwy 11 N, Poplarville, MS 39470" },
  "Perry": { phone: "(601) 964-3668", address: "212 Main St, New Augusta, MS 39462" },
  "Pike": { phone: "(601) 684-4136", address: "1022 W. Peace St, McComb, MS 39648" },
  "Pontotoc": { phone: "(662) 489-2681", address: "76 S. Main St, Pontotoc, MS 38863" },
  "Prentiss": { phone: "(662) 728-6241", address: "304 N. Main St, Booneville, MS 38829" },
  "Quitman": { phone: "(662) 326-8001", address: "301 Chestnut St, Marks, MS 38646" },
  "Rankin": { phone: "(601) 825-5441", address: "301 E. Government St, Brandon, MS 39042" },
  "Scott": { phone: "(601) 469-4631", address: "109 E. 1st St, Forest, MS 39074" },
  "Sharkey": { phone: "(662) 873-2141", address: "107 Court St, Rolling Fork, MS 39159" },
  "Simpson": { phone: "(601) 847-3661", address: "325 Mendenhall Square, Mendenhall, MS 39114" },
  "Smith": { phone: "(601) 782-4454", address: "104 S. Main St, Raleigh, MS 39153" },
  "Stone": { phone: "(601) 928-5281", address: "323 Cavers Ave, Wiggins, MS 39577" },
  "Sunflower": { phone: "(662) 887-2721", address: "104 Main St, Indianola, MS 38751" },
  "Tallahatchie": { phone: "(662) 647-5321", address: "206 Court St, Charleston, MS 38921" },
  "Tate": { phone: "(662) 562-5542", address: "201 Ward Ave, Senatobia, MS 38668" },
  "Tippah": { phone: "(662) 837-8771", address: "106 N. Main St, Ripley, MS 38663" },
  "Tishomingo": { phone: "(662) 423-6112", address: "1008 W. Quitman St, Iuka, MS 38852" },
  "Tunica": { phone: "(662) 363-1311", address: "1102 School St, Tunica, MS 38676" },
  "Union": { phone: "(662) 534-1941", address: "108 W. Main St, New Albany, MS 38652" },
  "Walthall": { phone: "(601) 876-5623", address: "100 Ball Ave, Tylertown, MS 39667" },
  "Warren": { phone: "(601) 638-0803", address: "2350 Iowa Blvd, Vicksburg, MS 39180" },
  "Washington": { phone: "(662) 335-9321", address: "1701 E. Reed Rd, Greenville, MS 38703" },
  "Wayne": { phone: "(601) 735-2834", address: "719 Azalea Dr, Waynesboro, MS 39367" },
  "Webster": { phone: "(662) 258-6951", address: "25 S. Broad St, Walthall, MS 39771" },
  "Wilkinson": { phone: "(601) 888-4571", address: "1 Courthouse Square, Woodville, MS 39669" },
  "Winston": { phone: "(662) 773-3463", address: "115 N. Columbus Ave, Louisville, MS 39339" },
  "Yalobusha": { phone: "(662) 473-2441", address: "215 S. Main St, Water Valley, MS 38965" },
  "Yazoo": { phone: "(662) 746-2681", address: "2550 Hwy 49 E, Yazoo City, MS 39194" }
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "New Farmer Navigator", organization: "Mississippi Conservation Services", timestamp: new Date().toISOString() });
});

app.get("/api/nrcs-office/:county", (req, res) => {
  const county = req.params.county;
  const office = NRCS_OFFICES[county];
  if (office) {
    res.json({ county, ...office });
  } else {
    res.json({ county, phone: "(601) 965-5631", address: "Mississippi State NRCS Office, Jackson, MS", note: "Contact the State Office for your county referral." });
  }
});

app.get("/api/counties", (req, res) => {
  res.json({ counties: Object.keys(NRCS_OFFICES).sort() });
});

function callClaude(systemPrompt, messages, res) {
  const clean = messages
    .filter(m => m && ["user","assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 8000) }));

  if (clean.length === 0) return res.status(400).json({ error: "No valid messages" });

  const body = JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, system: systemPrompt, messages: clean });
  const options = {
    hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Length": Buffer.byteLength(body) }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = "";
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return res.status(500).json({ error: parsed.error.message || "API error" });
        const text = parsed.content && parsed.content[0] && parsed.content[0].text;
        if (!text) return res.status(500).json({ error: "Empty response from AI" });
        res.json({ content: [{ type: "text", text }] });
      } catch(e) { res.status(500).json({ error: "Failed to parse AI response" }); }
    });
  });
  apiReq.on("error", (e) => res.status(500).json({ error: "Network error: " + e.message }));
  apiReq.write(body);
  apiReq.end();
}

app.post("/api/enrollment", (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
  callClaude(ENROLLMENT_PROMPT, messages, res);
});

app.post("/api/info", (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
  callClaude(INFO_PROMPT, messages, res);
});

app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "../public/index.html")));

app.listen(PORT, () => console.log(`New Farmer Navigator running on port ${PORT}`));
