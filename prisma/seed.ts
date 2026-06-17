import { PrismaClient } from "@prisma/client";
import { addDays, addMonths, subDays, subMonths } from "date-fns";

const db = new PrismaClient();
const now = new Date();

interface HazardSeed {
  hazardDescription: string;
  whoAtRisk: string;
  existingControls: string;
  initialLikelihood: number;
  initialSeverity: number;
  additionalControls?: string;
  residualLikelihood: number;
  residualSeverity: number;
  actionOwnerName?: string;
  actionDueDate?: Date;
  actionStatus?: "NA" | "Open" | "InProgress" | "Done";
}

let refCounter = 1;
const nextRef = () => `RA-${String(refCounter++).padStart(4, "0")}`;

async function makeAssessment(opts: {
  title: string;
  description?: string;
  centerId: string;
  areaId: string;
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
      title: opts.title,
      description: opts.description,
      centerId: opts.centerId,
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
      hazards: {
        create: opts.hazards.map((h, i) => ({
          sortOrder: i,
          hazardDescription: h.hazardDescription,
          whoAtRisk: h.whoAtRisk,
          existingControls: h.existingControls,
          initialLikelihood: h.initialLikelihood,
          initialSeverity: h.initialSeverity,
          additionalControls: h.additionalControls,
          residualLikelihood: h.residualLikelihood,
          residualSeverity: h.residualSeverity,
          actionOwnerName: h.actionOwnerName,
          actionDueDate: h.actionDueDate,
          actionStatus: h.actionStatus ?? "NA",
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
  // Reset (dependency order)
  await db.reviewLog.deleteMany();
  await db.hazard.deleteMany();
  await db.riskAssessment.deleteMany();
  await db.area.deleteMany();
  await db.activity.deleteMany();
  await db.role.deleteMany();
  await db.center.deleteMany();

  // ---- Centres ----------------------------------------------------------
  const riverside = await db.center.create({
    data: {
      name: "Riverside Leisure Centre",
      slug: "riverside-leisure-centre",
      address: "12 Mill Lane, Riverside, RS1 4QP",
      contactName: "Sarah Whitcombe",
      contactEmail: "duty.manager@riverside-leisure.example",
      phone: "01632 960123",
      notes: "Flagship site — 25m pool, learner pool, gym, studio, soft play and café.",
    },
  });

  const hilltop = await db.center.create({
    data: {
      name: "Hilltop Sports & Pool",
      slug: "hilltop-sports-pool",
      address: "Beacon Road, Hilltop, HT7 2BD",
      contactName: "Marcus Yeo",
      contactEmail: "operations@hilltop-sports.example",
      phone: "01632 960456",
      notes: "Sports hall, swimming pool and fitness suite.",
    },
  });

  // ---- Areas (per centre) ----------------------------------------------
  const area = async (centerId: string, name: string, description: string, sortOrder: number) =>
    db.area.create({ data: { centerId, name, description, sortOrder } });

  const rPoolside = await area(riverside.id, "Poolside", "25m main pool and learner pool surrounds", 1);
  const rGym = await area(riverside.id, "Gym floor", "Cardio and resistance training area", 2);
  const rStudio = await area(riverside.id, "Studio", "Group exercise studio", 3);
  const rChanging = await area(riverside.id, "Changing rooms", "Wet-side changing village", 4);
  const rPlant = await area(riverside.id, "Plant room", "Pool plant and chemical store", 5);
  const rReception = await area(riverside.id, "Reception", "Front of house and entrance", 6);
  const rSoftPlay = await area(riverside.id, "Soft play", "Children's soft play frame", 7);
  const rCafe = await area(riverside.id, "Café", "Servery and seating", 8);

  const hSportsHall = await area(hilltop.id, "Sports hall", "Multi-use sports hall", 1);
  const hPoolside = await area(hilltop.id, "Poolside", "Swimming pool surrounds", 2);
  const hFitness = await area(hilltop.id, "Fitness suite", "Gym and free weights", 3);
  const hChanging = await area(hilltop.id, "Changing rooms", "Changing and shower facilities", 4);
  const hReception = await area(hilltop.id, "Reception", "Front desk and foyer", 5);

  // ---- Roles (org-level) ------------------------------------------------
  const role = async (name: string, description: string, sortOrder: number) =>
    db.role.create({ data: { name, description, sortOrder } });

  const rlLifeguard = await role("Lifeguard", "Pool supervision and rescue", 1);
  const rlInstructor = await role("Fitness instructor", "Gym and class instruction", 2);
  const rlTeacher = await role("Swimming teacher", "Swimming lessons", 3);
  const rlReceptionist = await role("Receptionist", "Front of house", 4);
  const rlCleaner = await role("Cleaner", "Cleaning and housekeeping", 5);
  const rlDutyManager = await role("Duty manager", "Site duty management", 6);
  const rlTech = await role("Maintenance technician", "Plant and building maintenance", 7);
  const rlCafe = await role("Café assistant", "Food and beverage service", 8);

  // ---- Activities (org-level) ------------------------------------------
  const activity = async (name: string, description: string, sortOrder: number) =>
    db.activity.create({ data: { name, description, sortOrder } });

  const acPoolSup = await activity("Pool supervision", "Lifeguarding and bather supervision", 1);
  const acChemical = await activity("Chemical handling", "Pool plant dosing and storage", 2);
  const acClass = await activity("Group exercise class", "Instructor-led classes", 3);
  const acGymUse = await activity("Gym & equipment use", "Member use of fitness equipment", 4);
  const acCleaning = await activity("Cleaning & housekeeping", "Routine cleaning tasks", 5);
  const acCash = await activity("Cash & front of house", "Reception and cash handling", 6);
  const acSoftPlay = await activity("Soft play supervision", "Supervising children's play", 7);
  const acCatering = await activity("Food & beverage service", "Café and catering", 8);
  const acMaintenance = await activity("Equipment maintenance", "Inspection and repair", 9);

  // ---- Assessments ------------------------------------------------------
  // 1. Riverside poolside — overdue, critical residual, mixed actions
  await makeAssessment({
    title: "Pool supervision & drowning prevention",
    description:
      "Supervision of bathers in the main and learner pools, including rescue response.",
    centerId: riverside.id,
    areaId: rPoolside.id,
    roleId: rlLifeguard.id,
    activityId: acPoolSup.id,
    status: "Active",
    assessorName: "Sarah Whitcombe",
    approvedByName: "Operations Manager",
    monthsAgo: 13,
    reviewFrequencyMonths: 12,
    reviewed: { outcome: "Updated", reviewerName: "Sarah Whitcombe" },
    hazards: [
      {
        hazardDescription: "Swimmer in difficulty / drowning",
        whoAtRisk: "Members of the public, weak and non-swimmers, children",
        existingControls:
          "NPLQ-qualified lifeguards on poolside; zoned supervision; rescue equipment; PoolSafe operating procedures (NOP/EAP).",
        initialLikelihood: 4,
        initialSeverity: 5,
        additionalControls:
          "Maintain ongoing lifeguard training; introduce quarterly scenario-based rescue drills.",
        residualLikelihood: 2,
        residualSeverity: 5,
        actionOwnerName: "Duty manager",
        actionDueDate: addDays(now, 21),
        actionStatus: "Open",
      },
      {
        hazardDescription: "Slips, trips and falls on wet poolside",
        whoAtRisk: "Staff and members of the public",
        existingControls:
          "Non-slip surfacing; wet-floor signage; no-running policy; prompt clean-up of spillages.",
        initialLikelihood: 3,
        initialSeverity: 3,
        additionalControls: "Replace worn anti-slip matting at learner pool steps.",
        residualLikelihood: 2,
        residualSeverity: 3,
        actionOwnerName: "Maintenance technician",
        actionDueDate: subDays(now, 9),
        actionStatus: "Open",
      },
      {
        hazardDescription: "Eye / skin irritation from pool water chemistry",
        whoAtRisk: "Members of the public, staff",
        existingControls:
          "Automatic dosing with continuous monitoring; manual water tests every 2 hours.",
        initialLikelihood: 2,
        initialSeverity: 3,
        residualLikelihood: 1,
        residualSeverity: 3,
        actionStatus: "NA",
      },
    ],
  });

  // 2. Riverside plant room — chemical handling, OK
  await makeAssessment({
    title: "Pool plant chemical handling & storage",
    description: "Handling, dosing and storage of pool treatment chemicals.",
    centerId: riverside.id,
    areaId: rPlant.id,
    roleId: rlTech.id,
    activityId: acChemical.id,
    status: "Active",
    assessorName: "James Okafor",
    approvedByName: "Sarah Whitcombe",
    monthsAgo: 4,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Chlorine gas release from incompatible chemicals mixing",
        whoAtRisk: "Maintenance staff",
        existingControls:
          "COSHH assessments held; acids and chlorine stored separately; PPE; mechanical ventilation; spill kit.",
        initialLikelihood: 2,
        initialSeverity: 5,
        additionalControls: "Install gas detection alarm in the chemical store.",
        residualLikelihood: 1,
        residualSeverity: 5,
        actionOwnerName: "Facilities manager",
        actionDueDate: addMonths(now, 2),
        actionStatus: "InProgress",
      },
      {
        hazardDescription: "Acid splash to eyes/skin during dosing",
        whoAtRisk: "Maintenance staff",
        existingControls: "Face shield, gloves and apron; eyewash station; trained operatives only.",
        initialLikelihood: 2,
        initialSeverity: 4,
        residualLikelihood: 1,
        residualSeverity: 4,
        actionOwnerName: "James Okafor",
        actionDueDate: subMonths(now, 1),
        actionStatus: "Done",
      },
    ],
  });

  // 3. Riverside gym — due soon
  await makeAssessment({
    title: "Gym floor & fitness equipment use",
    description: "Member and staff use of cardiovascular and resistance equipment.",
    centerId: riverside.id,
    areaId: rGym.id,
    roleId: rlInstructor.id,
    activityId: acGymUse.id,
    status: "Active",
    assessorName: "Priya Nair",
    monthsAgo: 11,
    extraDaysAgo: 16,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Injury from improper use of equipment / weights",
        whoAtRisk: "Members, staff",
        existingControls:
          "Compulsory gym induction; instructors on the floor; clear instructions on machines.",
        initialLikelihood: 3,
        initialSeverity: 3,
        residualLikelihood: 2,
        residualSeverity: 3,
        actionStatus: "NA",
      },
      {
        hazardDescription: "Manual handling of weight plates and dumbbells",
        whoAtRisk: "Members, staff",
        existingControls: "Manual handling guidance displayed; storage racks at sensible heights.",
        initialLikelihood: 3,
        initialSeverity: 2,
        residualLikelihood: 2,
        residualSeverity: 2,
        actionStatus: "NA",
      },
    ],
  });

  // 4. Hilltop sports hall — overdue, under review
  await makeAssessment({
    title: "Sports hall activities & events",
    description: "Court sports, equipment setup and hall hire activities.",
    centerId: hilltop.id,
    areaId: hSportsHall.id,
    roleId: rlDutyManager.id,
    activityId: acClass.id,
    status: "UnderReview",
    assessorName: "Marcus Yeo",
    monthsAgo: 14,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Collisions during court sports",
        whoAtRisk: "Participants, members of the public",
        existingControls: "Activity briefings; appropriate court markings; supervised sessions.",
        initialLikelihood: 3,
        initialSeverity: 2,
        residualLikelihood: 2,
        residualSeverity: 2,
        actionStatus: "NA",
      },
      {
        hazardDescription: "Injury from setting up / moving heavy equipment (goals, nets)",
        whoAtRisk: "Staff",
        existingControls: "Two-person lifts; equipment trolleys; manual handling training.",
        initialLikelihood: 2,
        initialSeverity: 3,
        additionalControls: "Refresh manual handling training for sports staff.",
        residualLikelihood: 1,
        residualSeverity: 3,
        actionOwnerName: "Marcus Yeo",
        actionDueDate: addDays(now, 30),
        actionStatus: "Open",
      },
    ],
  });

  // 5. Hilltop changing rooms — due soon, cleaning
  await makeAssessment({
    title: "Changing room cleaning & housekeeping",
    description: "Routine cleaning of wet-side changing and shower facilities.",
    centerId: hilltop.id,
    areaId: hChanging.id,
    roleId: rlCleaner.id,
    activityId: acCleaning.id,
    status: "Active",
    assessorName: "Elaine Foster",
    monthsAgo: 11,
    extraDaysAgo: 10,
    reviewFrequencyMonths: 12,
    reviewed: { outcome: "NoChanges", reviewerName: "Elaine Foster" },
    hazards: [
      {
        hazardDescription: "Slips on wet floors during cleaning",
        whoAtRisk: "Cleaning staff, members of the public",
        existingControls: "Wet-floor signage; cleaning during quiet periods; suitable footwear.",
        initialLikelihood: 3,
        initialSeverity: 3,
        additionalControls: "Trial a two-stage mopping system to reduce standing water.",
        residualLikelihood: 2,
        residualSeverity: 3,
        actionOwnerName: "Elaine Foster",
        actionDueDate: addDays(now, 14),
        actionStatus: "Open",
      },
      {
        hazardDescription: "Exposure to cleaning chemicals",
        whoAtRisk: "Cleaning staff",
        existingControls: "COSHH data sheets; correct dilution; gloves and ventilation.",
        initialLikelihood: 2,
        initialSeverity: 2,
        residualLikelihood: 1,
        residualSeverity: 2,
        actionStatus: "NA",
      },
    ],
  });

  // 6. Hilltop reception — due very soon, lone working
  await makeAssessment({
    title: "Reception, front of house & cash handling",
    description: "Front desk duties including lone working and handling cash.",
    centerId: hilltop.id,
    areaId: hReception.id,
    roleId: rlReceptionist.id,
    activityId: acCash.id,
    status: "Active",
    assessorName: "Marcus Yeo",
    monthsAgo: 5,
    extraDaysAgo: 18,
    reviewFrequencyMonths: 6,
    hazards: [
      {
        hazardDescription: "Aggressive or abusive customer behaviour (incl. lone working)",
        whoAtRisk: "Reception staff",
        existingControls: "Panic alarm at desk; conflict-management training; CCTV; never lone after dark.",
        initialLikelihood: 3,
        initialSeverity: 3,
        residualLikelihood: 2,
        residualSeverity: 3,
        actionOwnerName: "Duty manager",
        actionDueDate: addDays(now, 12),
        actionStatus: "Open",
      },
      {
        hazardDescription: "Robbery during cash handling / banking",
        whoAtRisk: "Reception staff",
        existingControls: "Cash counted away from public view; varied banking times; safe with drop slot.",
        initialLikelihood: 2,
        initialSeverity: 3,
        residualLikelihood: 1,
        residualSeverity: 3,
        actionStatus: "NA",
      },
    ],
  });

  // 7. Riverside soft play — OK
  await makeAssessment({
    title: "Soft play supervision",
    description: "Supervision of children using the soft play frame.",
    centerId: riverside.id,
    areaId: rSoftPlay.id,
    roleId: rlDutyManager.id,
    activityId: acSoftPlay.id,
    status: "Active",
    assessorName: "Priya Nair",
    monthsAgo: 2,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Falls and impacts within the play structure",
        whoAtRisk: "Children",
        existingControls: "Impact-absorbing surfaces; padding inspected daily; age/height zoning.",
        initialLikelihood: 3,
        initialSeverity: 3,
        residualLikelihood: 2,
        residualSeverity: 3,
        actionStatus: "NA",
      },
      {
        hazardDescription: "Overcrowding and lost / unaccompanied children",
        whoAtRisk: "Children",
        existingControls: "Session capacity limits; signing-in; carer-present policy.",
        initialLikelihood: 2,
        initialSeverity: 3,
        additionalControls: "Add wristband matching for child and carer.",
        residualLikelihood: 1,
        residualSeverity: 3,
        actionOwnerName: "Duty manager",
        actionDueDate: addDays(now, 45),
        actionStatus: "Open",
      },
    ],
  });

  // 8. Riverside café — draft
  await makeAssessment({
    title: "Café & food service",
    description: "Preparation and service of hot drinks and light food.",
    centerId: riverside.id,
    areaId: rCafe.id,
    roleId: rlCafe.id,
    activityId: acCatering.id,
    status: "Draft",
    assessorName: "Priya Nair",
    monthsAgo: 0,
    extraDaysAgo: 6,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Burns and scalds from hot drinks and equipment",
        whoAtRisk: "Café staff, customers",
        existingControls: "Training on equipment; heat-resistant gloves; spill procedures.",
        initialLikelihood: 3,
        initialSeverity: 2,
        residualLikelihood: 2,
        residualSeverity: 2,
        actionStatus: "NA",
      },
    ],
  });

  // 9. Riverside studio — due soon
  await makeAssessment({
    title: "Group exercise studio classes",
    description: "Instructor-led classes including spin, circuits and aerobics.",
    centerId: riverside.id,
    areaId: rStudio.id,
    roleId: rlInstructor.id,
    activityId: acClass.id,
    status: "Active",
    assessorName: "Priya Nair",
    monthsAgo: 11,
    extraDaysAgo: 14,
    reviewFrequencyMonths: 12,
    hazards: [
      {
        hazardDescription: "Trips over equipment, mats and trailing leads",
        whoAtRisk: "Participants, instructors",
        existingControls: "Equipment set out and cleared safely; cable management; clear floor space.",
        initialLikelihood: 3,
        initialSeverity: 2,
        residualLikelihood: 2,
        residualSeverity: 2,
        actionStatus: "NA",
      },
      {
        hazardDescription: "Overexertion or cardiac event in a participant",
        whoAtRisk: "Participants",
        existingControls: "Pre-activity readiness questions; instructor monitoring; AED on site.",
        initialLikelihood: 2,
        initialSeverity: 4,
        additionalControls: "Confirm monthly AED checks are logged.",
        residualLikelihood: 2,
        residualSeverity: 3,
        actionOwnerName: "Fitness instructor",
        actionDueDate: addDays(now, 20),
        actionStatus: "Open",
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
