export type ServiceFaq = {
  question: string;
  answer: string;
};

export type ServiceIssue = {
  title: string;
  text: string;
};

export type ServicePageContent = {
  slug: string;
  applianceName: string;
  heroTitle: string;
  heroDescription: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  image: string;
  localServiceTitle: string;
  localServiceDescription: string;
  commonIssues: ServiceIssue[];
  serviceHighlights: string[];
  brands: string[];
  process: {
    title: string;
    text: string;
  }[];
  faqs: ServiceFaq[];
};

export type ServicePageDirectoryItem = {
  slug: string;
  applianceName: string;
  summary: string;
};

export const serviceCategoryCardDescriptions: Record<string, string> = {
  Refrigerator: "Cooling loss, leaks, ice maker trouble, and temperature swings.",
  Washer: "Drain, spin, vibration, fill, door lock, and cycle problems.",
  Dryer: "No heat, weak airflow, long dry times, noise, and startup issues.",
  Dishwasher: "Leaks, standing water, poor cleaning, odors, and latch trouble.",
  Oven: "Preheat, temperature control, uneven baking, ignition, and sensor issues.",
  Cooktop: "Burner, ignition, heat level, control, and startup problems.",
  Freezer: "Frost buildup, warming food, seal trouble, noise, and cooling loss.",
  "Ice Machine": "Low ice production, leaks, water flow, freezing, and cleaning issues.",
  "Wine Cooler": "Temperature swings, noise, controls, airflow, and storage problems.",
  "Commercial Refrigerator":
    "Reach-in cooling loss, leaks, airflow, compressor noise, and control issues.",
};

export function getServiceCategoryCardDescription(applianceName: string) {
  return (
    serviceCategoryCardDescriptions[applianceName] ||
    "Symptoms, service details, and practical repair guidance."
  );
}

const majorApplianceBrands = [
  "Whirlpool",
  "GE",
  "Samsung",
  "LG",
  "KitchenAid",
  "Maytag",
  "Bosch",
  "Frigidaire",
  "Kenmore",
  "Amana",
  "Electrolux",
  "Haier",
  "Hotpoint",
  "Magic Chef",
  "Crosley",
  "Roper",
  "Admiral",
  "Estate",
  "Fisher & Paykel",
  "Cafe",
  "Monogram",
  "JennAir",
  "Thermador",
  "Viking",
  "Sub-Zero",
  "Wolf",
  "Miele",
  "Dacor",
  "Asko",
  "Beko",
  "Blomberg",
  "Speed Queen",
  "Insignia",
  "Hisense",
  "Avanti",
  "Danby",
  "Summit",
  "U-Line",
  "True Residential",
  "Scotsman",
  "Hoshizaki",
  "Perlick",
];

export const refrigeratorServicePage: ServicePageContent = {
  slug: "refrigerator-repair-charlotte-nc",
  applianceName: "Refrigerator",
  heroTitle: "Refrigerator Repair in Charlotte, NC",
  heroDescription:
    "Fast, dependable refrigerator repair for cooling problems, leaks, noisy operation, ice maker issues, and temperature swings. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with prompt scheduling and clear communication.",
  metaTitle: "Refrigerator Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need refrigerator repair in Charlotte, NC? DAPL Appliance Repair fixes cooling issues, leaks, ice makers, and noisy refrigerators with fast local service.",
  keywords: [
    "refrigerator repair Charlotte NC",
    "fridge repair Charlotte",
    "refrigerator not cooling Charlotte",
    "ice maker repair Charlotte",
    "DAPL refrigerator repair",
  ],
  image: "/appliances/refrigerator.png",
  localServiceTitle: "Fast refrigerator repair help",
  localServiceDescription:
    "From cooling issues to leaks and ice maker trouble, we help Charlotte homeowners get their refrigerators back to normal quickly.",
  commonIssues: [
    {
      title: "Refrigerator not cooling evenly",
      text: "We check airflow, fans, sensors, controls, and sealed compartments to find why food temperatures are drifting.",
    },
    {
      title: "Freezer icing over or running too cold",
      text: "Frost buildup can point to defrost, gasket, airflow, or temperature control issues that need a closer look.",
    },
    {
      title: "Water leaking under or behind the unit",
      text: "Leaks may come from the water line, drain system, ice maker connection, or condensation path inside the refrigerator.",
    },
    {
      title: "Ice maker not producing ice",
      text: "We inspect water flow, fill behavior, freezing temperature, and common ice maker parts before recommending a repair.",
    },
    {
      title: "Unusual buzzing, clicking, or rattling noises",
      text: "New sounds can come from fans, relays, compressor startup, loose panels, or components working harder than normal.",
    },
    {
      title: "Door seal, airflow, or temperature control issues",
      text: "Small seal and airflow problems can make the refrigerator run longer and struggle to hold steady temperatures.",
    },
  ],
  serviceHighlights: [
    "Same-day refrigerator repair when scheduling allows",
    "Service for top freezer, bottom freezer, side-by-side, and French door models",
    "Clear recommendations before major repair decisions",
    "Support for both home and select commercial cooling equipment",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the refrigerator is doing",
      text: "Share the symptoms, brand, and model if you know it. We use that information to prepare for the visit and reduce delays.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks cooling performance, airflow, seals, controls, and common failure points before recommending the best path forward.",
    },
    {
      title: "Complete the repair and confirm performance",
      text: "After the repair, we verify operation and explain what to watch for so you feel confident before we leave.",
    },
  ],
  faqs: [
    {
      question: "Do you repair refrigerators that are not cooling?",
      answer:
        "Yes. Lack of cooling is one of the most common refrigerator problems we handle. We inspect airflow, controls, fans, seals, and other common causes to identify the issue.",
    },
    {
      question: "Can you fix refrigerator ice maker problems?",
      answer:
        "Yes. We service many common ice maker issues, including low ice production, jammed systems, water flow problems, and temperature-related failures.",
    },
    {
      question: "Do you work on French door and side-by-side refrigerators?",
      answer:
        "Yes. We service major refrigerator configurations, including French door, side-by-side, top freezer, and bottom freezer models.",
    },
    {
      question: "Do you offer same-day refrigerator repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Should I repair or replace my refrigerator?",
      answer:
        "That depends on the age of the unit, the repair needed, and the overall condition of the appliance. We focus on practical recommendations so you can make an informed decision.",
    },
  ],
};

export const washerServicePage: ServicePageContent = {
  slug: "washer-repair-charlotte-nc",
  applianceName: "Washer",
  heroTitle: "Washer Repair in Charlotte, NC",
  heroDescription:
    "Dependable washer repair for draining issues, spin cycle problems, leaks, vibration, and error codes. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and clear repair recommendations.",
  metaTitle: "Washer Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Looking for washer repair in Charlotte, NC? DAPL Appliance Repair fixes washers that will not spin, drain, fill, or stop leaking with fast local service.",
  keywords: [
    "washer repair Charlotte NC",
    "washing machine repair Charlotte",
    "washer not spinning Charlotte",
    "washer not draining Charlotte",
    "DAPL washer repair",
  ],
  image: "/appliances/washer.png",
  localServiceTitle: "Fast washer repair help",
  localServiceDescription:
    "From drainage problems to shaking, leaks, and cycle failures, we help Charlotte homeowners get their washers working again with practical next-step guidance.",
  commonIssues: [
    {
      title: "Washer not spinning or completing the cycle",
      text: "Spin issues can involve balance, drainage, lid or door locks, controls, or parts that stop the cycle early.",
    },
    {
      title: "Water not draining after the wash",
      text: "Standing water often points to drain restrictions, pump trouble, hose problems, or cycle control issues.",
    },
    {
      title: "Unit leaking during or after operation",
      text: "We look for leak sources around hoses, door seals, valves, pumps, and areas that only show up during a cycle.",
    },
    {
      title: "Washer not filling with water properly",
      text: "Slow or failed filling can come from supply valves, inlet parts, water pressure, or controls not calling for water.",
    },
    {
      title: "Loud vibration, banging, or off-balance movement",
      text: "Shaking may come from leveling, load balance, suspension wear, or internal movement that needs diagnosis.",
    },
    {
      title: "Door lock, control panel, or startup issues",
      text: "If the washer will not start, we check lock behavior, controls, power response, and cycle selection problems.",
    },
  ],
  serviceHighlights: [
    "Same-day washer repair when scheduling allows",
    "Service for many top-load and front-load washer models",
    "Clear recommendations before major repair decisions",
    "Support for common residential laundry equipment",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us how the washer is acting",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common washer failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks water flow, drainage, balance, controls, and other common washer trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and test operation",
      text: "After the repair, we confirm the washer runs properly and explain anything you should keep an eye on after the visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair washers that will not spin?",
      answer:
        "Yes. Spin cycle issues are one of the most common washer problems we see. We inspect balance, controls, drainage, and other likely causes to find the issue.",
    },
    {
      question: "Can you fix a washer that is not draining?",
      answer:
        "Yes. If your washer is leaving water in the tub, we can inspect common drainage-related problems and explain what is preventing the machine from emptying properly.",
    },
    {
      question: "Do you work on front-load and top-load washers?",
      answer:
        "Yes. We service many common residential washer configurations, including both front-load and top-load machines.",
    },
    {
      question: "Do you offer same-day washer repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older washer?",
      answer:
        "That depends on the age of the unit, the condition of the machine, and the repair needed. We focus on practical guidance so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const dryerServicePage: ServicePageContent = {
  slug: "dryer-repair-charlotte-nc",
  applianceName: "Dryer",
  heroTitle: "Dryer Repair in Charlotte, NC",
  heroDescription:
    "Reliable dryer repair for heating problems, long dry times, drum issues, unusual noise, and startup failures. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with prompt local scheduling and straightforward repair guidance.",
  metaTitle: "Dryer Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need dryer repair in Charlotte, NC? DAPL Appliance Repair fixes dryers that will not heat, tumble, start, or dry clothes properly with fast local service.",
  keywords: [
    "dryer repair Charlotte NC",
    "clothes dryer repair Charlotte",
    "dryer not heating Charlotte",
    "dryer not spinning Charlotte",
    "DAPL dryer repair",
  ],
  image: "/appliances/dryer.png",
  localServiceTitle: "Fast dryer repair help",
  localServiceDescription:
    "From no-heat issues to long dry cycles, drum problems, and strange sounds, we help Charlotte homeowners get their dryers working properly again.",
  commonIssues: [
    {
      title: "Dryer not heating properly",
      text: "No-heat complaints can involve heating parts, sensors, controls, power supply, or airflow restrictions.",
    },
    {
      title: "Clothes taking too long to dry",
      text: "Long dry times often come from weak airflow, moisture sensing issues, heat problems, or an overloaded system.",
    },
    {
      title: "Drum not spinning or tumbling",
      text: "A stopped drum can point to belt, motor, roller, pulley, or control issues that prevent normal movement.",
    },
    {
      title: "Dryer making loud or unusual noises",
      text: "Grinding, squealing, or thumping sounds may come from worn rollers, bearings, belts, or loose internal parts.",
    },
    {
      title: "Unit not starting or stopping mid-cycle",
      text: "Startup failures can involve door switches, thermal protection, controls, power, or components overheating.",
    },
    {
      title: "Burning smell, airflow, or vent-related performance issues",
      text: "We treat burning smells seriously and check airflow, lint buildup, heat behavior, and electrical concerns.",
    },
  ],
  serviceHighlights: [
    "Same-day dryer repair when scheduling allows",
    "Service for many electric and common residential dryer models",
    "Clear recommendations before major repair decisions",
    "Support for common laundry appliance issues across major brands",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the dryer is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common dryer failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks heating performance, drum operation, airflow, controls, and other common dryer trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and test performance",
      text: "After the repair, we confirm the dryer runs properly and explain anything you should watch for after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair dryers that are not heating?",
      answer:
        "Yes. No-heat and low-heat complaints are among the most common dryer issues we see. We inspect the appliance and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix a dryer that takes too long to dry clothes?",
      answer:
        "Yes. Long dry times can come from several common dryer issues, including airflow and performance problems. We inspect the unit and help identify what is slowing it down.",
    },
    {
      question: "Do you work on dryers that will not start or spin?",
      answer:
        "Yes. We service many common dryer problems, including startup failures, drum issues, and interrupted cycles.",
    },
    {
      question: "Do you offer same-day dryer repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older dryer?",
      answer:
        "That depends on the age of the appliance, the condition of the unit, and the repair needed. We focus on practical recommendations so you can make an informed repair-versus-replace decision.",
    },
  ],
};

export const dishwasherServicePage: ServicePageContent = {
  slug: "dishwasher-repair-charlotte-nc",
  applianceName: "Dishwasher",
  heroTitle: "Dishwasher Repair in Charlotte, NC",
  heroDescription:
    "Fast dishwasher repair for draining problems, leaks, poor cleaning performance, unusual noises, and cycle failures. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Dishwasher Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need dishwasher repair in Charlotte, NC? DAPL Appliance Repair fixes dishwashers that will not drain, leak, clean properly, or finish cycles with fast local service.",
  keywords: [
    "dishwasher repair Charlotte NC",
    "dishwasher not draining Charlotte",
    "dishwasher leaking Charlotte",
    "dishwasher repair near me Charlotte",
    "DAPL dishwasher repair",
  ],
  image: "/appliances/dishwasher.png",
  localServiceTitle: "Fast dishwasher repair help",
  localServiceDescription:
    "From drainage trouble to leaks, poor cleaning results, and noisy cycles, we help Charlotte homeowners get their dishwashers back in working order quickly.",
  commonIssues: [
    {
      title: "Dishwasher not draining properly",
      text: "Drain problems can come from clogs, pump issues, hose routing, filters, or a cycle that never completes correctly.",
    },
    {
      title: "Water leaking during or after a cycle",
      text: "We inspect door seals, spray patterns, hoses, valves, and tub areas to narrow down where the leak starts.",
    },
    {
      title: "Dishes not coming out clean",
      text: "Poor cleaning can involve spray arms, water temperature, circulation, detergent flow, filters, or loading-related issues.",
    },
    {
      title: "Dishwasher not starting or not finishing the cycle",
      text: "Startup and cycle failures may involve the latch, controls, float system, power, or sensors stopping operation.",
    },
    {
      title: "Unusual grinding, humming, or rattling noises",
      text: "Noises can point to pump, motor, spray arm, debris, or mounting issues that show up during wash or drain.",
    },
    {
      title: "Door latch, spray arm, or control issues",
      text: "Small mechanical or control problems can keep the dishwasher from filling, washing, draining, or sealing properly.",
    },
  ],
  serviceHighlights: [
    "Same-day dishwasher repair when scheduling allows",
    "Service for many built-in residential dishwasher models",
    "Clear recommendations before major repair decisions",
    "Support for common cleaning, drainage, and leak-related issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the dishwasher is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common dishwasher failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks drainage, water flow, wash performance, controls, and other common dishwasher trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and test operation",
      text: "After the repair, we confirm the dishwasher runs properly and explain anything you should keep an eye on after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair dishwashers that are not draining?",
      answer:
        "Yes. Drainage problems are one of the most common dishwasher issues we handle. We inspect the unit and explain what is preventing the water from clearing properly.",
    },
    {
      question: "Can you fix a dishwasher that is leaking?",
      answer:
        "Yes. If your dishwasher is leaking during or after a cycle, we can inspect common causes and help identify the source of the problem.",
    },
    {
      question: "Do you work on dishwashers that are not cleaning well?",
      answer:
        "Yes. Poor cleaning performance can come from several common dishwasher issues. We inspect wash performance and explain the most practical repair path.",
    },
    {
      question: "Do you offer same-day dishwasher repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older dishwasher?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const ovenServicePage: ServicePageContent = {
  slug: "oven-repair-charlotte-nc",
  applianceName: "Oven",
  heroTitle: "Oven Repair in Charlotte, NC",
  heroDescription:
    "Reliable oven repair for heating problems, uneven baking, temperature control issues, door problems, and startup failures. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Oven Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need oven repair in Charlotte, NC? DAPL Appliance Repair fixes ovens that will not heat, bake evenly, maintain temperature, or start properly with fast local service.",
  keywords: [
    "oven repair Charlotte NC",
    "oven not heating Charlotte",
    "wall oven repair Charlotte",
    "oven temperature problem Charlotte",
    "DAPL oven repair",
  ],
  image: "/appliances/oven.png",
  localServiceTitle: "Fast oven repair help",
  localServiceDescription:
    "From no-heat problems to uneven baking, faulty controls, and door issues, we help Charlotte homeowners get their ovens back in dependable working order.",
  commonIssues: [
    {
      title: "Oven not heating properly",
      text: "Heating issues can involve the igniter, bake element, temperature sensor, control board, or power supply.",
    },
    {
      title: "Uneven baking or poor temperature control",
      text: "We check heat consistency, sensor readings, airflow, calibration, and common causes of hot or cold spots.",
    },
    {
      title: "Oven taking too long to preheat",
      text: "Slow preheat can come from weak heating parts, sensor problems, power issues, or controls not reaching target temperature.",
    },
    {
      title: "Unit not turning on or shutting off correctly",
      text: "Power and shutdown issues can involve controls, safety circuits, wiring, door switches, or temperature feedback.",
    },
    {
      title: "Door not closing, sealing, or latching properly",
      text: "A worn gasket, hinge, latch, or alignment issue can let heat escape and make cooking performance uneven.",
    },
    {
      title: "Control panel, sensor, or cooking mode issues",
      text: "We review display behavior, mode selection, sensor response, and error symptoms before recommending the next step.",
    },
  ],
  serviceHighlights: [
    "Same-day oven repair when scheduling allows",
    "Service for many residential oven and wall oven models",
    "Clear recommendations before major repair decisions",
    "Support for common heating, control, and performance issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the oven is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common oven failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks heating performance, controls, sensors, door function, and other common oven trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and test performance",
      text: "After the repair, we confirm the oven operates properly and explain anything you should watch for after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair ovens that are not heating?",
      answer:
        "Yes. No-heat and weak-heating complaints are among the most common oven issues we see. We inspect the appliance and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix an oven that is baking unevenly?",
      answer:
        "Yes. Uneven cooking and temperature inconsistency can come from several common oven issues. We inspect performance and explain the most practical repair path.",
    },
    {
      question: "Do you work on wall ovens and standard residential ovens?",
      answer:
        "Yes. We service many common residential oven configurations, including built-in and standard household units.",
    },
    {
      question: "Do you offer same-day oven repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older oven?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const cooktopServicePage: ServicePageContent = {
  slug: "cooktop-repair-charlotte-nc",
  applianceName: "Cooktop",
  heroTitle: "Cooktop Repair in Charlotte, NC",
  heroDescription:
    "Reliable cooktop repair for burner problems, ignition issues, uneven heating, control failures, and startup trouble. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Cooktop Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need cooktop repair in Charlotte, NC? DAPL Appliance Repair fixes cooktops with burner, ignition, heating, and control problems with fast local service.",
  keywords: [
    "cooktop repair Charlotte NC",
    "cooktop not heating Charlotte",
    "burner repair Charlotte",
    "cooktop ignition problem Charlotte",
    "DAPL cooktop repair",
  ],
  image: "/appliances/cooktop.png",
  localServiceTitle: "Fast cooktop repair help",
  localServiceDescription:
    "From burners that will not heat to ignition trouble and uneven cooking performance, we help Charlotte homeowners get their cooktops working properly again.",
  commonIssues: [
    {
      title: "Cooktop burner not heating properly",
      text: "Burner problems can involve elements, igniters, switches, controls, or power delivery to a single cooking zone.",
    },
    {
      title: "Ignition not clicking or not lighting",
      text: "Ignition issues may come from moisture, spark parts, gas flow, wiring, or controls not sending the right signal.",
    },
    {
      title: "Uneven heat across one or more burners",
      text: "We check burner response, element condition, control behavior, and signs of weak or inconsistent heating.",
    },
    {
      title: "Cooktop not turning on or responding correctly",
      text: "Startup trouble can involve power, controls, safety locks, switches, or internal components failing to respond.",
    },
    {
      title: "Broken knobs, controls, or surface elements",
      text: "Physical control and surface issues can affect usability, heat adjustment, and safe day-to-day cooking.",
    },
    {
      title: "Gas or electric performance issues affecting cooking results",
      text: "We diagnose the appliance type, symptom pattern, and cooking performance before explaining practical repair options.",
    },
  ],
  serviceHighlights: [
    "Same-day cooktop repair when scheduling allows",
    "Service for many common residential cooktop models",
    "Clear recommendations before major repair decisions",
    "Support for burner, control, and performance-related issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the cooktop is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common cooktop failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks burners, ignition, controls, heating performance, and other common cooktop trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and test performance",
      text: "After the repair, we confirm the cooktop operates properly and explain anything you should watch for after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair cooktops that are not heating?",
      answer:
        "Yes. Burner and heating complaints are among the most common cooktop issues we handle. We inspect the unit and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix a cooktop with ignition problems?",
      answer:
        "Yes. If your cooktop will not ignite or lights inconsistently, we can inspect common ignition-related causes and explain the most practical repair path.",
    },
    {
      question: "Do you work on common residential cooktop models?",
      answer:
        "Yes. We service many residential cooktop configurations and help diagnose common burner, control, and performance issues.",
    },
    {
      question: "Do you offer same-day cooktop repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older cooktop?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const freezerServicePage: ServicePageContent = {
  slug: "freezer-repair-charlotte-nc",
  applianceName: "Freezer",
  heroTitle: "Freezer Repair in Charlotte, NC",
  heroDescription:
    "Dependable freezer repair for cooling loss, heavy frost buildup, leaks, unusual noises, and temperature problems. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Freezer Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need freezer repair in Charlotte, NC? DAPL Appliance Repair fixes freezers that will not stay cold, frost up, leak, or make unusual noises with fast local service.",
  keywords: [
    "freezer repair Charlotte NC",
    "freezer not freezing Charlotte",
    "upright freezer repair Charlotte",
    "freezer frost buildup Charlotte",
    "DAPL freezer repair",
  ],
  image: "/appliances/freezer.png",
  localServiceTitle: "Fast freezer repair help",
  localServiceDescription:
    "From cooling loss to frost buildup, leaks, and strange sounds, we help Charlotte homeowners get their freezers back to stable performance quickly.",
  commonIssues: [
    {
      title: "Freezer not staying cold enough",
      text: "Weak freezing can involve airflow, sensors, sealed sections, controls, fans, or components working harder than normal.",
    },
    {
      title: "Heavy frost or ice buildup inside the unit",
      text: "Excess frost may point to defrost issues, a poor seal, warm air intrusion, or temperature control trouble.",
    },
    {
      title: "Water leaking around or under the freezer",
      text: "Leaks can come from drain problems, thaw cycles, condensation paths, or ice buildup melting in the wrong place.",
    },
    {
      title: "Freezer making loud or unusual noises",
      text: "Buzzing, grinding, or rattling can come from fans, relays, compressor startup, or loose internal parts.",
    },
    {
      title: "Temperature fluctuations affecting food storage",
      text: "We check temperature stability, door sealing, airflow, and controls to understand why stored food is at risk.",
    },
    {
      title: "Door seal, airflow, or control-related issues",
      text: "Small seal and circulation problems can create frost, long run times, and inconsistent freezing performance.",
    },
  ],
  serviceHighlights: [
    "Same-day freezer repair when scheduling allows",
    "Service for many common household freezer models",
    "Clear recommendations before major repair decisions",
    "Support for common cooling, frost, and leak-related issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the freezer is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common freezer failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks cooling performance, seals, airflow, frost buildup, and other common freezer trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and confirm performance",
      text: "After the repair, we verify the freezer operates properly and explain anything you should keep an eye on after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair freezers that are not freezing properly?",
      answer:
        "Yes. Cooling loss and weak freezing performance are among the most common freezer issues we handle. We inspect the appliance and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix a freezer with heavy frost buildup?",
      answer:
        "Yes. Excess frost can come from several common freezer issues. We inspect the unit and explain the most practical repair path.",
    },
    {
      question: "Do you work on common residential freezer models?",
      answer:
        "Yes. We service many household freezer configurations and help diagnose common cooling, seal, and performance problems.",
    },
    {
      question: "Do you offer same-day freezer repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older freezer?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const iceMachineServicePage: ServicePageContent = {
  slug: "ice-machine-repair-charlotte-nc",
  applianceName: "Ice Machine",
  heroTitle: "Ice Machine Repair in Charlotte, NC",
  heroDescription:
    "Reliable ice machine repair for low ice production, leaks, startup failures, freezing problems, and unusual noises. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Ice Machine Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need ice machine repair in Charlotte, NC? DAPL Appliance Repair fixes ice machines with production, leak, cooling, and performance issues with fast local service.",
  keywords: [
    "ice machine repair Charlotte NC",
    "ice maker repair Charlotte",
    "ice machine not making ice Charlotte",
    "ice machine leaking Charlotte",
    "DAPL ice machine repair",
  ],
  image: "/appliances/ice-machine.png",
  localServiceTitle: "Fast ice machine repair help",
  localServiceDescription:
    "From low ice production to leaks, freezing issues, and inconsistent performance, we help Charlotte customers get their ice machines back to reliable operation.",
  commonIssues: [
    {
      title: "Ice machine not making enough ice",
      text: "Low production can involve water supply, freezing performance, sensors, harvest timing, or parts that slow each cycle.",
    },
    {
      title: "Unit not making ice at all",
      text: "No-ice complaints may come from water flow, controls, freezing issues, safety switches, or a cycle that never starts.",
    },
    {
      title: "Water leaking around the machine",
      text: "We inspect supply lines, drains, pumps, fill behavior, and internal water paths to locate the leak source.",
    },
    {
      title: "Ice quality, size, or freezing consistency problems",
      text: "Cloudy, small, or inconsistent ice can point to water flow, temperature, cleaning, or freezing-cycle issues.",
    },
    {
      title: "Unusual buzzing, rattling, or cycling noises",
      text: "New noises can come from pumps, fans, valves, loose panels, or components cycling at the wrong time.",
    },
    {
      title: "Startup, control, or cooling-related performance issues",
      text: "We check controls, cooling behavior, water movement, and timing before explaining the most practical repair path.",
    },
  ],
  serviceHighlights: [
    "Same-day ice machine repair when scheduling allows",
    "Service for many common residential and light commercial units",
    "Clear recommendations before major repair decisions",
    "Support for production, leak, and cooling-related issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the ice machine is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common ice machine failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks production, water flow, freezing performance, controls, and other common ice machine trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and confirm performance",
      text: "After the repair, we verify the ice machine operates properly and explain anything you should keep an eye on after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair ice machines that are not making ice?",
      answer:
        "Yes. Low or no ice production is one of the most common ice machine issues we handle. We inspect the unit and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix an ice machine that is leaking?",
      answer:
        "Yes. If your ice machine is leaking, we can inspect common causes and explain the most practical repair path.",
    },
    {
      question: "Do you work on common residential and light commercial ice machines?",
      answer:
        "Yes. We service many common ice machine configurations and help diagnose production, leak, and performance problems.",
    },
    {
      question: "Do you offer same-day ice machine repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older ice machine?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const wineCoolerServicePage: ServicePageContent = {
  slug: "wine-cooler-repair-charlotte-nc",
  applianceName: "Wine Cooler",
  heroTitle: "Wine Cooler Repair in Charlotte, NC",
  heroDescription:
    "Reliable wine cooler repair for temperature instability, cooling loss, moisture buildup, unusual noise, and control issues. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with responsive local scheduling and practical repair guidance.",
  metaTitle: "Wine Cooler Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need wine cooler repair in Charlotte, NC? DAPL Appliance Repair fixes wine coolers with cooling, temperature, condensation, and control problems with fast local service.",
  keywords: [
    "wine cooler repair Charlotte NC",
    "wine fridge repair Charlotte",
    "wine cooler not cooling Charlotte",
    "wine cooler temperature problem Charlotte",
    "DAPL wine cooler repair",
  ],
  image: "/appliances/wine-cooler.png",
  localServiceTitle: "Fast wine cooler repair help",
  localServiceDescription:
    "From unstable temperatures to moisture buildup, unusual sounds, and cooling loss, we help Charlotte homeowners protect their wine storage with practical next-step guidance.",
  commonIssues: [
    {
      title: "Wine cooler not staying at the right temperature",
      text: "Temperature drift can involve sensors, controls, airflow, door seals, or cooling parts that no longer cycle correctly.",
    },
    {
      title: "Unit not cooling properly at all",
      text: "Weak cooling may come from fans, controls, sealed sections, power issues, or components not starting as expected.",
    },
    {
      title: "Moisture, condensation, or water collecting inside",
      text: "Moisture problems can point to door sealing, airflow, drainage, humidity, or temperature swings inside the cabinet.",
    },
    {
      title: "Wine cooler making loud or unusual noises",
      text: "Buzzing, rattling, or fan noise can come from airflow parts, mounting issues, or components working too hard.",
    },
    {
      title: "Interior light, display, or control panel issues",
      text: "Control and display symptoms help us narrow down power, board, sensor, or user-interface problems.",
    },
    {
      title: "Door seal, airflow, or circulation-related problems",
      text: "Stable wine storage depends on steady airflow and sealing, so small issues can affect the whole cabinet.",
    },
  ],
  serviceHighlights: [
    "Same-day wine cooler repair when scheduling allows",
    "Service for many common built-in and freestanding wine cooler models",
    "Clear recommendations before major repair decisions",
    "Support for cooling, control, and storage-performance issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the wine cooler is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common wine cooler failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks cooling performance, circulation, controls, door seals, and other common wine cooler trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and confirm performance",
      text: "After the repair, we verify the wine cooler operates properly and explain anything you should keep an eye on after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair wine coolers that are not cooling properly?",
      answer:
        "Yes. Weak cooling and unstable temperature performance are among the most common wine cooler issues we handle. We inspect the appliance and explain the most likely cause of the problem.",
    },
    {
      question: "Can you fix a wine cooler with condensation or moisture problems?",
      answer:
        "Yes. If your wine cooler is collecting moisture or showing condensation-related issues, we can inspect common causes and explain the most practical repair path.",
    },
    {
      question: "Do you work on built-in and freestanding wine coolers?",
      answer:
        "Yes. We service many common residential wine cooler configurations and help diagnose cooling, airflow, and control-related performance issues.",
    },
    {
      question: "Do you offer same-day wine cooler repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older wine cooler?",
      answer:
        "That depends on the age of the appliance, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const commercialRefrigeratorServicePage: ServicePageContent = {
  slug: "commercial-refrigerator-repair-charlotte-nc",
  applianceName: "Commercial Refrigerator",
  heroTitle: "Commercial Refrigerator Repair in Charlotte, NC",
  heroDescription:
    "Responsive commercial refrigerator repair for cooling loss, temperature swings, leaks, unusual noise, and control issues. DAPL Appliance Repair serves Charlotte, NC and surrounding areas with practical scheduling and clear repair guidance for common commercial refrigeration problems.",
  metaTitle:
    "Commercial Refrigerator Repair in Charlotte, NC | DAPL Appliance Repair",
  metaDescription:
    "Need commercial refrigerator repair in Charlotte, NC? DAPL Appliance Repair helps with cooling, leak, temperature, and performance issues for common commercial units.",
  keywords: [
    "commercial refrigerator repair Charlotte NC",
    "commercial fridge repair Charlotte",
    "commercial cooler repair Charlotte",
    "commercial refrigerator not cooling Charlotte",
    "DAPL commercial refrigerator repair",
  ],
  image: "/appliances/commercial-refrigerator.png",
  localServiceTitle: "Fast commercial refrigerator repair help",
  localServiceDescription:
    "From unstable temperatures to leaks, noise, and cooling loss, we help Charlotte-area businesses and property owners respond quickly to common commercial refrigeration problems.",
  commonIssues: [
    {
      title: "Commercial refrigerator not staying cold enough",
      text: "We check airflow, fans, door sealing, controls, and workload factors that can put stored product at risk.",
    },
    {
      title: "Temperature swings affecting stored product",
      text: "Temperature instability can involve controls, sensors, doors, airflow restrictions, or usage patterns during busy hours.",
    },
    {
      title: "Water leaking around or under the unit",
      text: "Leaks may come from drain lines, condensate handling, door sweat, ice buildup, or nearby water connections.",
    },
    {
      title: "Loud or unusual compressor and fan noises",
      text: "New sounds can indicate fan strain, loose panels, compressor startup issues, or components working outside normal range.",
    },
    {
      title: "Door seal, airflow, or circulation-related performance issues",
      text: "Poor sealing and weak circulation can increase run time, raise temperatures, and affect product consistency.",
    },
    {
      title: "Display, control, or startup problems affecting operation",
      text: "We review controls, display behavior, power response, and startup patterns before outlining repair options.",
    },
  ],
  serviceHighlights: [
    "Same-day commercial refrigerator repair when scheduling allows",
    "Service for many common reach-in and upright commercial refrigerator units",
    "Clear recommendations before major repair decisions",
    "Support for cooling, leak, airflow, and control-related issues",
  ],
  brands: majorApplianceBrands,
  process: [
    {
      title: "Tell us what the commercial refrigerator is doing",
      text: "Share the symptoms, brand, and model if you know it. That helps us prepare for common commercial refrigerator failures before the appointment.",
    },
    {
      title: "On-site diagnosis and repair plan",
      text: "Our technician checks cooling performance, seals, airflow, controls, and other common commercial refrigerator trouble points before recommending the best repair path.",
    },
    {
      title: "Complete the repair and confirm performance",
      text: "After the repair, we verify the unit operates properly and explain anything you should keep an eye on after the service visit.",
    },
  ],
  faqs: [
    {
      question: "Do you repair commercial refrigerators that are not cooling properly?",
      answer:
        "Yes. Cooling loss and unstable temperature performance are among the most common commercial refrigerator issues we handle. We inspect the unit and explain the most likely cause of the problem.",
    },
    {
      question: "Can you help with a commercial refrigerator that is leaking?",
      answer:
        "Yes. If your commercial refrigerator is leaking, we can inspect common causes and explain the most practical repair path.",
    },
    {
      question: "Do you work on common upright and reach-in commercial refrigerator units?",
      answer:
        "Yes. We service many common commercial refrigerator configurations and help diagnose cooling, airflow, control, and performance-related issues.",
    },
    {
      question: "Do you offer same-day commercial refrigerator repair in Charlotte?",
      answer:
        "Same-day availability depends on the schedule, but we do offer same-day and priority appointments whenever possible.",
    },
    {
      question: "Is it worth repairing an older commercial refrigerator?",
      answer:
        "That depends on the age of the equipment, the overall condition of the unit, and the repair needed. We focus on practical recommendations so you can make a smart repair-versus-replace decision.",
    },
  ],
};

export const servicePagesDirectory: ServicePageDirectoryItem[] = [
  refrigeratorServicePage,
  washerServicePage,
  dryerServicePage,
  dishwasherServicePage,
  ovenServicePage,
  cooktopServicePage,
  freezerServicePage,
  iceMachineServicePage,
  wineCoolerServicePage,
  commercialRefrigeratorServicePage,
].map((page) => ({
  slug: page.slug,
  applianceName: page.applianceName,
  summary: page.metaDescription,
}));
