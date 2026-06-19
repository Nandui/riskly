import { PrismaClient } from "@prisma/client";
import { addMonths, subDays, subMonths } from "date-fns";
import { normalizePersonsAtRisk } from "../src/lib/persons";

const db = new PrismaClient();
const now = new Date();

type Category =
  | "Physical"
  | "Chemical"
  | "Biological"
  | "Ergonomic"
  | "Psychosocial"
  | "Environmental";

interface HazardSeed {
  hazard: string;
  riskFactor: string;
  personAtRisk: string;
  consequence: string;
  currentControls: string;
  likelihood: number;
  severity: number;
  riskCategory: Category;
}

let refCounter = 1;
const nextRef = () => `RA-${String(refCounter++).padStart(4, "0")}`;

async function makeAssessment(opts: {
  description?: string;
  centerId: string;
  subjectType: "Area" | "Role" | "Activity";
  areaId?: string;
  roleId?: string;
  activityId?: string;
  status: "Draft" | "Active" | "UnderReview" | "Archived";
  assessorName?: string;
  approvedByName?: string;
  monthsAgo: number;
  extraDaysAgo?: number;
  reviewFrequencyMonths: number;
  reviewed?: { outcome: "NoChanges" | "Updated" | "Escalated"; reviewerName: string };
  hazards: HazardSeed[];
}) {
  const assessmentDate = subDays(
    subMonths(now, opts.monthsAgo),
    opts.extraDaysAgo ?? 0,
  );
  const reviewedDate = opts.status === "Draft" ? null : assessmentDate;
  const baseForReview = reviewedDate ?? assessmentDate;
  const nextReviewDate = addMonths(baseForReview, opts.reviewFrequencyMonths);

  await db.riskAssessment.create({
    data: {
      reference: nextRef(),
      description: opts.description,
      centerId: opts.centerId,
      subjectType: opts.subjectType,
      areaId: opts.areaId,
      roleId: opts.roleId,
      activityId: opts.activityId,
      status: opts.status,
      assessorName: opts.assessorName,
      approvedByName: opts.approvedByName,
      assessmentDate,
      reviewFrequencyMonths: opts.reviewFrequencyMonths,
      lastReviewedDate: reviewedDate,
      nextReviewDate,
      hazardSeq: opts.hazards.length,
      hazards: {
        create: opts.hazards.map((h, i) => ({
          sortOrder: i,
          seq: i + 1,
          hazard: h.hazard,
          riskFactor: h.riskFactor,
          personAtRisk: normalizePersonsAtRisk(h.personAtRisk) || null,
          consequence: h.consequence,
          currentControls: h.currentControls,
          likelihood: h.likelihood,
          severity: h.severity,
          riskCategory: h.riskCategory,
        })),
      },
      reviewLogs: opts.reviewed
        ? {
            create: {
              reviewedDate: baseForReview,
              reviewerName: opts.reviewed.reviewerName,
              outcome: opts.reviewed.outcome,
              nextReviewDate,
              notes: "Periodic review completed.",
            },
          }
        : undefined,
    },
  });
}

async function main() {
  await db.reviewLog.deleteMany();
  await db.hazard.deleteMany();
  await db.riskAssessment.deleteMany();
  await db.area.deleteMany();
  await db.activity.deleteMany();
  await db.role.deleteMany();
  await db.center.deleteMany();

  // ---- Centres ----------------------------------------------------------
  const bishopstown = await db.center.create({
    data: {
      name: "Bishopstown",
      slug: "bishopstown",
      address: "Bishopstown Sports Complex, Cork",
      contactName: "Fernando Serina",
      contactEmail: "bishopstown@example.com",
      phone: "021 000 0000",
      notes: "Outdoor pitches, pool, gym and sports hall.",
    },
  });

  const hilltop = await db.center.create({
    data: {
      name: "Hilltop Sports & Pool",
      slug: "hilltop-sports-pool",
      address: "Beacon Road, Hilltop",
      contactName: "Marcus Yeo",
      contactEmail: "operations@hilltop-sports.example",
      phone: "021 000 0001",
      notes: "Sports hall, swimming pool and fitness suite.",
    },
  });

  // ---- Areas ------------------------------------------------------------
  const area = async (centerId: string, name: string, description: string, sortOrder: number) =>
    db.area.create({ data: { centerId, name, description, sortOrder } });

  const bPitches = await area(bishopstown.id, "Pitches", "Outdoor playing pitches", 1);
  const bPool = await area(bishopstown.id, "Pool", "Swimming pool and surrounds", 2);
  const bChanging = await area(bishopstown.id, "Changing rooms", "Changing village", 3);
  const bGym = await area(bishopstown.id, "Gym", "Fitness suite", 4);
  await area(bishopstown.id, "Reception", "Front of house", 5);

  const hSportsHall = await area(hilltop.id, "Sports hall", "Multi-use sports hall", 1);
  const hPool = await area(hilltop.id, "Pool", "Swimming pool", 2);
  const hReception = await area(hilltop.id, "Reception", "Front desk and foyer", 3);

  // ---- Roles ------------------------------------------------------------
  const role = async (name: string, description: string, sortOrder: number) =>
    db.role.create({ data: { name, description, sortOrder } });

  const rlLifeguard = await role("Lifeguard", "Pool supervision and rescue", 1);
  const rlGrounds = await role("Grounds & maintenance", "Pitch and building upkeep", 2);
  const rlInstructor = await role("Fitness instructor", "Gym and class instruction", 3);
  const rlReceptionist = await role("Receptionist", "Front of house", 4);
  const rlCleaner = await role("Cleaner", "Cleaning and housekeeping", 5);
  const rlDutyManager = await role("Duty manager", "Site duty management", 6);
  await role("Coach / sports official", "Match and training supervision", 7);

  // ---- Activities -------------------------------------------------------
  const activity = async (name: string, description: string, sortOrder: number) =>
    db.activity.create({ data: { name, description, sortOrder } });

  const acPitchUse = await activity("Pitch sports & hire", "Outdoor pitch activities and bookings", 1);
  const acPoolSup = await activity("Pool supervision", "Lifeguarding and bather supervision", 2);
  const acChemical = await activity("Chemical handling", "Pool plant dosing and storage", 3);
  const acCleaning = await activity("Cleaning & housekeeping", "Routine cleaning tasks", 4);
  const acCash = await activity("Cash & front of house", "Reception and cash handling", 5);
  const acClass = await activity("Group exercise class", "Instructor-led classes", 6);

  const ALL = "Staff, Customers, Children, Contractors, Visitors";

  // 1. Bishopstown — Pitches (mirrors the client's real assessment) — due soon
  await makeAssessment({
    description: "Risk assessment for the outdoor playing pitches at Bishopstown.",
    centerId: bishopstown.id,
    subjectType: "Area",
    areaId: bPitches.id,
    status: "Active",
    assessorName: "Fernando Serina",
    approvedByName: "Site Manager",
    monthsAgo: 11,
    extraDaysAgo: 9,
    reviewFrequencyMonths: 12,
    reviewed: { outcome: "NoChanges", reviewerName: "Fernando Serina" },
    hazards: [
      {
        hazard: "Pests",
        riskFactor: "Contamination / Bites / Stings",
        personAtRisk: "Customers & Staff",
        consequence: "Infections",
        currentControls: "Pest Control Checks\nPest Sighting Log",
        likelihood: 2,
        severity: 5,
        riskCategory: "Biological",
      },
      {
        hazard: "Lack of immediate first aid / AED access",
        riskFactor: "Delayed treatment following injury or cardiac event on pitch",
        personAtRisk: ALL,
        consequence: "Worsened injury outcome, serious harm or fatality",
        currentControls:
          "Staff first aid training; AED available on site; Emergency response procedure; First aid kit checks; Clear access for emergency services",
        likelihood: 2,
        severity: 5,
        riskCategory: "Physical",
      },
      {
        hazard: "Uneven pitch surface / holes",
        riskFactor: "Trip or fall during play, warm-up or pitch walk-through",
        personAtRisk: ALL,
        consequence: "Sprains, fractures, head injury or cuts",
        currentControls:
          "Routine pitch inspections; Defect reporting process; Prompt repair or cordon off; Pre-session pitch walk-through; Adequate lighting; Staff supervision",
        likelihood: 2,
        severity: 4,
        riskCategory: "Physical",
      },
      {
        hazard: "Inadequate supervision / uncontrolled play",
        riskFactor: "Unsafe behaviour, reckless tackles or overcrowding leading to impact injuries",
        personAtRisk: "Customers / Visitors",
        consequence: "Fractures, concussion or other serious injury",
        currentControls:
          "Booking presence/supervision; Rules briefing and signage; Booking controls / limit numbers",
        likelihood: 2,
        severity: 4,
        riskCategory: "Physical",
      },
      {
        hazard: "Waterlogged pitch surface / poor drainage",
        riskFactor: "Slip, loss of footing or collision due to reduced traction and unstable ground",
        personAtRisk: "Staff / Customers / Contractors",
        consequence: "Sprains, fractures, head injury or other impact injuries",
        currentControls:
          "Routine pitch inspections; Close / cordon off unplayable areas; Drainage maintenance; Weather monitoring; Suitable footwear guidance; Staff supervision",
        likelihood: 2,
        severity: 4,
        riskCategory: "Physical",
      },
      {
        hazard: "Damaged perimeter fencing / unsecured gates",
        riskFactor: "Unauthorised access to pitch or ball escaping into walkways / roadway",
        personAtRisk: "Customers / Visitors / Contractors",
        consequence: "Impact injury, fractures or serious injury to players, bystanders or road users",
        currentControls:
          "Routine boundary/fence inspections; Prompt repair of defects; Gates kept closed/locked when not in use; Ball stop netting where required; Staff supervision",
        likelihood: 2,
        severity: 3,
        riskCategory: "Physical",
      },
      {
        hazard: "Inappropriate footwear / unsafe studs",
        riskFactor: "Laceration or puncture injury from contact during play",
        personAtRisk: "Customers / Visitors",
        consequence: "Cuts, bruising or eye injury requiring first aid / medical attention",
        currentControls:
          "Footwear rules communicated; Pre-play checks by staff; Refuse play if non-compliant; Signage at entrances; First aid provision; Incident reporting",
        likelihood: 2,
        severity: 3,
        riskCategory: "Physical",
      },
      {
        hazard: "Structural failure",
        riskFactor: "Falling debris / collapse",
        personAtRisk: "Customers / Staff",
        consequence: "Serious injury / death",
        currentControls: "Maintenance Policy",
        likelihood: 1,
        severity: 5,
        riskCategory: "Physical",
      },
      {
        hazard: "Radon gas",
        riskFactor: "Inhalation",
        personAtRisk: ALL,
        consequence: "Serious health effects, potentially fatal",
        currentControls: "Measurement",
        likelihood: 1,
        severity: 5,
        riskCategory: "Chemical",
      },
      {
        hazard: "Inadequate pitch lighting",
        riskFactor: "Reduced visibility leading to collision, trip or struck-by incidents",
        personAtRisk: ALL,
        consequence: "Sprains, fractures, cuts or head injury",
        currentControls:
          "Lighting inspections; Timely lamp/fixture replacement; Adequate illumination maintained; Report faults promptly; Restrict use of poorly lit areas; Staff supervision",
        likelihood: 1,
        severity: 4,
        riskCategory: "Physical",
      },
      {
        hazard: "Broken glass / sharp objects on pitch",
        riskFactor: "Cuts or puncture wounds during play or walk-through",
        personAtRisk: ALL,
        consequence: "Lacerations, infection or need for medical treatment",
        currentControls:
          "Pre-use pitch inspection; Litter bins and signage; Prompt clean-up and safe disposal; Staff patrols / supervision",
        likelihood: 2,
        severity: 2,
        riskCategory: "Physical",
      },
      {
        hazard: "Severe weather (lightning / high winds)",
        riskFactor: "Lightning strike or wind-blown debris impacting players / spectators",
        personAtRisk: "Customers / Members; Staff; Contractors; Children; Vulnerable persons",
        consequence: "Serious injury or fatality; property damage",
        currentControls:
          "Weather monitoring; Lightning policy and pitch closure; Clear evacuation routes to indoor shelter; Staff communication / radio; Signage and announcements; Event cancellation procedure",
        likelihood: 1,
        severity: 3,
        riskCategory: "Environmental",
      },
      {
        hazard: "Sun exposure / heat stress",
        riskFactor: "Heat exhaustion, dehydration or sunburn during outdoor activity",
        personAtRisk: "Staff / Customers / Contractors",
        consequence: "Heat-related illness requiring first aid; possible collapse",
        currentControls:
          "Scheduling / heat policy; Access to drinking water; shade / rest breaks; Staff monitoring and first aid provision; Sunscreen / hat advice; Weather warnings and activity modification",
        likelihood: 1,
        severity: 3,
        riskCategory: "Environmental",
      },
      {
        hazard: "Animal fouling / biological contamination on pitch",
        riskFactor: "Contact with animal faeces or contaminated surfaces",
        personAtRisk: ALL,
        consequence: "Gastrointestinal illness, skin infection or other communicable disease",
        currentControls:
          "Routine pitch inspections; Prompt cleaning and safe disposal; Pest control / grounds maintenance checks; Hand hygiene facilities; Staff supervision",
        likelihood: 1,
        severity: 2,
        riskCategory: "Biological",
      },
    ],
  });

  // 2. Bishopstown — Pool supervision — overdue
  await makeAssessment({
    description: "Supervision of bathers in the main pool, including rescue response.",
    centerId: bishopstown.id,
    subjectType: "Activity",
    activityId: acPoolSup.id,
    status: "Active",
    assessorName: "Sarah Whitcombe",
    approvedByName: "Site Manager",
    monthsAgo: 13,
    reviewFrequencyMonths: 12,
    reviewed: { outcome: "Updated", reviewerName: "Sarah Whitcombe" },
    hazards: [
      {
        hazard: "Swimmer in difficulty / drowning",
        riskFactor: "Weak or non-swimmer, lapse in supervision",
        personAtRisk: "Members of the public, weak and non-swimmers, children",
        consequence: "Drowning or serious harm",
        currentControls:
          "NPLQ-qualified lifeguards on poolside; zoned supervision; rescue equipment; NOP / EAP in place",
        likelihood: 2,
        severity: 5,
        riskCategory: "Physical",
      },
      {
        hazard: "Slips, trips and falls on wet poolside",
        riskFactor: "Wet surfaces and running",
        personAtRisk: "Staff and members of the public",
        consequence: "Sprains, fractures, head injury",
        currentControls:
          "Non-slip surfacing; wet-floor signage; no-running policy; prompt clean-up of spillages",
        likelihood: 3,
        severity: 3,
        riskCategory: "Physical",
      },
      {
        hazard: "Eye / skin irritation from pool water chemistry",
        riskFactor: "Dosing imbalance",
        personAtRisk: "Members of the public, staff",
        consequence: "Irritation requiring first aid",
        currentControls: "Automatic dosing with continuous monitoring; manual water tests every 2 hours",
        likelihood: 2,
        severity: 3,
        riskCategory: "Chemical",
      },
    ],
  });

  // 3. Bishopstown — Changing room cleaning — due soon
  await makeAssessment({
    description: "Routine cleaning of wet-side changing facilities.",
    centerId: bishopstown.id,
    subjectType: "Activity",
    activityId: acCleaning.id,
    status: "Active",
    assessorName: "Elaine Foster",
    monthsAgo: 11,
    extraDaysAgo: 16,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazard: "Slips on wet floors during cleaning",
        riskFactor: "Standing water and cleaning in occupied periods",
        personAtRisk: "Cleaning staff, members of the public",
        consequence: "Sprains, fractures, head injury",
        currentControls: "Wet-floor signage; cleaning during quiet periods; suitable footwear",
        likelihood: 3,
        severity: 3,
        riskCategory: "Physical",
      },
      {
        hazard: "Exposure to cleaning chemicals",
        riskFactor: "Skin / eye contact, incorrect dilution",
        personAtRisk: "Cleaning staff",
        consequence: "Dermatitis or irritation",
        currentControls: "COSHH data sheets; correct dilution; gloves and ventilation",
        likelihood: 2,
        severity: 2,
        riskCategory: "Chemical",
      },
    ],
  });

  // 4. Hilltop — Sports hall — overdue, under review
  await makeAssessment({
    description: "Court sports, equipment setup and hall hire activities.",
    centerId: hilltop.id,
    subjectType: "Area",
    areaId: hSportsHall.id,
    status: "UnderReview",
    assessorName: "Marcus Yeo",
    monthsAgo: 14,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazard: "Collisions during court sports",
        riskFactor: "Fast play in shared space",
        personAtRisk: "Participants, members of the public",
        consequence: "Bruising, sprains or concussion",
        currentControls: "Activity briefings; appropriate court markings; supervised sessions",
        likelihood: 3,
        severity: 2,
        riskCategory: "Physical",
      },
      {
        hazard: "Manual handling of heavy equipment (goals, nets)",
        riskFactor: "Setting up / moving equipment",
        personAtRisk: "Staff",
        consequence: "Musculoskeletal injury",
        currentControls: "Two-person lifts; equipment trolleys; manual handling training",
        likelihood: 2,
        severity: 3,
        riskCategory: "Ergonomic",
      },
    ],
  });

  // 5. Hilltop — Reception — due soon
  await makeAssessment({
    description: "Front desk duties including lone working and handling cash.",
    centerId: hilltop.id,
    subjectType: "Role",
    roleId: rlReceptionist.id,
    status: "Active",
    assessorName: "Marcus Yeo",
    monthsAgo: 5,
    extraDaysAgo: 18,
    reviewFrequencyMonths: 6,
    hazards: [
      {
        hazard: "Aggressive or abusive customer behaviour",
        riskFactor: "Lone working, conflict at the desk",
        personAtRisk: "Reception staff",
        consequence: "Stress, assault or injury",
        currentControls: "Panic alarm at desk; conflict-management training; CCTV; never lone after dark",
        likelihood: 3,
        severity: 3,
        riskCategory: "Psychosocial",
      },
      {
        hazard: "Robbery during cash handling",
        riskFactor: "Cash counted in view, predictable banking",
        personAtRisk: "Reception staff",
        consequence: "Assault or theft",
        currentControls: "Cash counted away from public view; varied banking times; safe with drop slot",
        likelihood: 2,
        severity: 3,
        riskCategory: "Physical",
      },
    ],
  });

  // 6. Hilltop — Pool plant chemical handling — OK
  await makeAssessment({
    description: "Handling, dosing and storage of pool treatment chemicals.",
    centerId: hilltop.id,
    subjectType: "Activity",
    activityId: acChemical.id,
    status: "Active",
    assessorName: "James Okafor",
    monthsAgo: 4,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazard: "Chlorine gas release",
        riskFactor: "Incompatible chemicals mixing",
        personAtRisk: "Maintenance staff",
        consequence: "Respiratory injury, potentially fatal",
        currentControls:
          "COSHH assessments; acids and chlorine stored separately; PPE; mechanical ventilation; spill kit",
        likelihood: 2,
        severity: 5,
        riskCategory: "Chemical",
      },
      {
        hazard: "Acid splash to eyes / skin during dosing",
        riskFactor: "Manual dosing without protection",
        personAtRisk: "Maintenance staff",
        consequence: "Burns or irritation",
        currentControls: "Face shield, gloves and apron; eyewash station; trained operatives only",
        likelihood: 2,
        severity: 4,
        riskCategory: "Chemical",
      },
    ],
  });

  const counts = await Promise.all([
    db.center.count(),
    db.area.count(),
    db.role.count(),
    db.activity.count(),
    db.riskAssessment.count(),
    db.hazard.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} centres, ${counts[1]} areas, ${counts[2]} roles, ${counts[3]} activities, ${counts[4]} assessments, ${counts[5]} hazards.`,
  );
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
