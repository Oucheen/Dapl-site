export type ServiceAreaPageContent = {
  slug: string;
  city: string;
  state: "NC" | "SC";
  countyOrArea: string;
  nearbyLabel: string;
  heroTitle: string;
  heroDescription: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  introTitle: string;
  introText: string;
  localNotes: string[];
  commonNeeds: {
    title: string;
    text: string;
  }[];
  serviceHighlights: string[];
  nearbyCities: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
};

const sharedHighlights = [
  "Same-day appointments when scheduling allows",
  "Clear recommendations before major repair decisions",
  "Service for many major residential appliance brands",
];

export const serviceAreaPages: ServiceAreaPageContent[] = [
  {
    slug: "appliance-repair-charlotte-nc",
    city: "Charlotte",
    state: "NC",
    countyOrArea: "Mecklenburg County",
    nearbyLabel: "Charlotte neighborhoods and nearby suburbs",
    heroTitle: "Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners with refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, wine cooler, and select commercial refrigeration problems.",
    metaTitle: "Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Charlotte, NC? DAPL Appliance Repair serves Charlotte homes and nearby areas with responsive scheduling and practical repair guidance.",
    keywords: [
      "appliance repair Charlotte NC",
      "Charlotte appliance repair",
      "refrigerator repair Charlotte",
      "washer dryer repair Charlotte",
      "DAPL Appliance Repair Charlotte",
    ],
    introTitle: "Local appliance repair help across Charlotte",
    introText:
      "Charlotte service calls can range from older laundry rooms in established neighborhoods to newer kitchen appliances in growing residential communities. We focus on practical diagnostics, clear communication, and repair guidance that helps you decide what makes sense for the appliance.",
    localNotes: [
      "Useful for homes across Charlotte and nearby Mecklenburg County communities",
      "Good fit for kitchen, laundry, cooling, and select light commercial refrigeration requests",
      "Scheduling depends on the address, technician route, and appointment availability",
    ],
    commonNeeds: [
      {
        title: "Refrigerators not cooling during hot weather",
        text:
          "Charlotte kitchens can get warm fast in summer, so we check cooling loss, airflow, door seals, and ice maker symptoms before recommending the next step.",
      },
      {
        title: "Washers that will not drain, spin, or finish cycles",
        text:
          "Tell us if water is left in the tub, the washer shakes during spin, or an error code appears so we can prepare for common drain and balance checks.",
      },
      {
        title: "Dryers taking too long to dry clothes",
        text:
          "Long dry times often point to heat, airflow, venting, or sensor issues. We ask what the dryer is doing so the visit starts with the right checks.",
      },
      {
        title: "Dishwashers leaking or leaving dishes dirty",
        text:
          "Leaks, standing water, and poor cleaning can come from different areas, so we narrow down door, drain, spray arm, and cycle symptoms first.",
      },
      {
        title: "Ovens and cooktops with heating or control issues",
        text:
          "Whether the problem is weak heat, uneven baking, ignition trouble, or a control panel issue, we help confirm what is practical to inspect.",
      },
      {
        title: "Freezers, ice machines, and wine coolers with temperature trouble",
        text:
          "For cooling equipment, we look at temperature swings, frost, noise, leaks, and control behavior before suggesting a repair path.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Matthews", "Concord", "Huntersville", "Waxhaw"],
    faqs: [
      {
        question: "Do you offer appliance repair throughout Charlotte?",
        answer:
          "We serve Charlotte, NC and nearby communities. Availability depends on the exact address and the schedule for the day, so the best next step is to call or send a request with your service address.",
      },
      {
        question: "Can I book service for more than one appliance in Charlotte?",
        answer:
          "Yes. If you have multiple appliances acting up, include the details in your request so we can plan the visit properly and confirm what can be reviewed during the appointment.",
      },
      {
        question: "Do you handle same-day appliance repair in Charlotte?",
        answer:
          "Same-day service is available when the route and schedule allow it. For urgent appliance problems, calling directly is usually the fastest way to check availability.",
      },
    ],
  },
  {
    slug: "appliance-repair-matthews-nc",
    city: "Matthews",
    state: "NC",
    countyOrArea: "southeast Charlotte area",
    nearbyLabel: "Matthews, Stallings, and southeast Charlotte",
    heroTitle: "Appliance Repair in Matthews, NC",
    heroDescription:
      "Need appliance repair in Matthews? DAPL Appliance Repair helps with common refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and cooling appliance problems near the southeast Charlotte area.",
    metaTitle: "Appliance Repair in Matthews, NC | DAPL Appliance Repair",
    metaDescription:
      "DAPL Appliance Repair serves Matthews, NC with appliance repair for refrigerators, washers, dryers, dishwashers, ovens, cooktops, and more.",
    keywords: [
      "appliance repair Matthews NC",
      "Matthews NC appliance repair",
      "refrigerator repair Matthews NC",
      "washer repair Matthews NC",
      "dryer repair Matthews NC",
    ],
    introTitle: "Responsive appliance repair for Matthews homes",
    introText:
      "Matthews homeowners often need fast help without a complicated service process. Whether the problem is a refrigerator losing temperature, a washer stuck mid-cycle, or a dishwasher leak, we help narrow down the issue and explain the practical repair path.",
    localNotes: [
      "Convenient for homeowners in Matthews and nearby southeast Charlotte neighborhoods",
      "Helpful for both kitchen and laundry appliance issues",
      "Appointment timing depends on technician route and same-day availability",
    ],
    commonNeeds: [
      {
        title: "Refrigerators not holding a steady temperature",
        text:
          "For Matthews homes, we ask when the temperature started changing, whether the freezer is affected, and if there is frost, water, or fan noise.",
      },
      {
        title: "Dishwashers leaking near cabinets or flooring",
        text:
          "A leak near cabinets needs a careful look at the door seal, drain area, supply line, and cycle timing so the damage does not spread.",
      },
      {
        title: "Washers making noise or failing to drain",
        text:
          "Noise and drainage problems can come from load balance, pump, hose, or internal wear. A few symptom details help us plan the visit.",
      },
      {
        title: "Dryers heating weakly or running too long",
        text:
          "We check whether the dryer is heating at all, cycling off too soon, or struggling with airflow before explaining the likely repair options.",
      },
      {
        title: "Ovens baking unevenly",
        text:
          "Uneven baking can involve temperature sensors, elements, igniters, or controls, so we start with how the oven behaves during normal cooking.",
      },
      {
        title: "Cooktops with ignition or burner problems",
        text:
          "For gas or electric cooktop issues, we ask which burner is affected and whether the problem is ignition, heat level, or startup failure.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Charlotte", "Waxhaw", "Weddington", "Fort Mill"],
    faqs: [
      {
        question: "Do you service appliance repair calls in Matthews, NC?",
        answer:
          "Yes. We serve Matthews and nearby southeast Charlotte-area communities, with appointment availability based on schedule and address.",
      },
      {
        question: "What appliances do you repair in Matthews?",
        answer:
          "We help with many common refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, wine cooler, and select commercial refrigeration problems.",
      },
      {
        question: "Can you come to Matthews the same day?",
        answer:
          "Same-day appointments may be available when scheduling allows. Call or send the service address so we can confirm the best available time.",
      },
    ],
  },
  {
    slug: "appliance-repair-huntersville-nc",
    city: "Huntersville",
    state: "NC",
    countyOrArea: "north Charlotte area",
    nearbyLabel: "Huntersville, Lake Norman, and north Charlotte",
    heroTitle: "Appliance Repair in Huntersville, NC",
    heroDescription:
      "DAPL Appliance Repair serves Huntersville-area homes with practical appliance repair help for kitchen, laundry, cooling, and select commercial refrigeration issues.",
    metaTitle: "Appliance Repair in Huntersville, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Huntersville, NC? DAPL Appliance Repair helps with refrigerator, washer, dryer, dishwasher, oven, cooktop, and cooling appliance issues.",
    keywords: [
      "appliance repair Huntersville NC",
      "Huntersville appliance repair",
      "refrigerator repair Huntersville",
      "washer repair Huntersville",
      "dryer repair Huntersville",
    ],
    introTitle: "Appliance repair for Huntersville and north Charlotte",
    introText:
      "Huntersville service requests often involve busy family kitchens, laundry rooms, and cooling appliances that need a clear diagnosis quickly. We help identify likely failure points and explain whether repair is the practical next step.",
    localNotes: [
      "Useful for homes in Huntersville and the north Charlotte / Lake Norman corridor",
      "Good fit for kitchen, laundry, freezer, and wine cooler issues",
      "Route availability can vary by day, especially around Lake Norman-area calls",
    ],
    commonNeeds: [
      {
        title: "French door refrigerators not cooling properly",
        text:
          "Huntersville refrigerator calls often involve cooling loss, ice maker trouble, or water leaks, so brand and model details help us prepare.",
      },
      {
        title: "Washers stopping before the cycle completes",
        text:
          "If the washer pauses, locks, drains repeatedly, or shows a code, those details help us separate control, drain, and balance problems.",
      },
      {
        title: "Dryers running but not drying clothes well",
        text:
          "When the drum turns but clothes stay damp, we look at heat, airflow, sensors, and vent-related symptoms before recommending work.",
      },
      {
        title: "Dishwashers not draining after the wash",
        text:
          "Standing water after a cycle can point to the drain path, pump, filter area, or installation conditions, so we ask what happens at the end of the wash.",
      },
      {
        title: "Wine coolers with unstable temperatures",
        text:
          "For wine storage, small temperature swings matter. We ask about setpoint, actual temperature, noise, and how often the unit runs.",
      },
      {
        title: "Freezers building frost or losing cold air",
        text:
          "Frost, soft food, or a constantly running freezer can involve seals, airflow, defrost behavior, or controls that need a focused check.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Cornelius", "Davidson", "Charlotte", "Concord"],
    faqs: [
      {
        question: "Do you repair appliances in Huntersville?",
        answer:
          "Yes. We serve Huntersville and nearby north Charlotte-area communities when the schedule and route allow.",
      },
      {
        question: "Do you help with Lake Norman-area appliance issues?",
        answer:
          "We handle many calls around the north Charlotte and Lake Norman corridor. Send the address and appliance details so we can confirm coverage.",
      },
      {
        question: "What should I include when requesting service in Huntersville?",
        answer:
          "Include the appliance type, brand if known, symptoms, and service address. That helps us prepare and confirm appointment availability.",
      },
    ],
  },
  {
    slug: "appliance-repair-fort-mill-sc",
    city: "Fort Mill",
    state: "SC",
    countyOrArea: "York County",
    nearbyLabel: "Fort Mill, Tega Cay, and south Charlotte",
    heroTitle: "Appliance Repair in Fort Mill, SC",
    heroDescription:
      "DAPL Appliance Repair helps Fort Mill homeowners with common appliance problems, including refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, and cooling equipment.",
    metaTitle: "Appliance Repair in Fort Mill, SC | DAPL Appliance Repair",
    metaDescription:
      "Looking for appliance repair in Fort Mill, SC? DAPL Appliance Repair helps with kitchen, laundry, and cooling appliance issues near York County and south Charlotte.",
    keywords: [
      "appliance repair Fort Mill SC",
      "Fort Mill appliance repair",
      "refrigerator repair Fort Mill",
      "washer repair Fort Mill SC",
      "dryer repair Fort Mill SC",
    ],
    introTitle: "Appliance repair help for Fort Mill homeowners",
    introText:
      "Fort Mill sits just across the state line, so service timing matters. We keep the request process clear: tell us what appliance is acting up, share the address, and we will confirm the most practical scheduling option.",
    localNotes: [
      "Helpful for Fort Mill, nearby York County addresses, and south Charlotte-area homes",
      "Good fit for laundry, kitchen, and cooling appliance requests",
      "Coverage and timing depend on route availability for South Carolina calls",
    ],
    commonNeeds: [
      {
        title: "Refrigerators warming up or leaking water",
        text:
          "For Fort Mill homes, we ask whether the fresh food section, freezer, or ice maker is affected so the cooling problem is easier to narrow down.",
      },
      {
        title: "Washers not draining or shaking heavily",
        text:
          "Heavy shaking, leftover water, or spin failure can have different causes. Load behavior and cycle timing help us start in the right place.",
      },
      {
        title: "Dryers taking multiple cycles to dry",
        text:
          "If towels or heavy loads need repeated cycles, we look at heating performance, airflow, lint path, and sensor behavior during the visit.",
      },
      {
        title: "Dishwashers leaking around the door",
        text:
          "Door leaks can involve gasket wear, leveling, spray pattern, or loading conditions, so we ask when during the cycle the water appears.",
      },
      {
        title: "Ovens not reaching the right temperature",
        text:
          "Temperature complaints need more than a quick guess. We ask whether the oven preheats slowly, overshoots, or bakes unevenly.",
      },
      {
        title: "Freezers and wine coolers with cooling loss",
        text:
          "Cooling loss in storage units can affect food or bottles quickly, so we focus on temperature, fan noise, frost, and control symptoms.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Rock Hill", "Charlotte", "Waxhaw", "Matthews"],
    faqs: [
      {
        question: "Do you service Fort Mill, SC?",
        answer:
          "Yes. We serve Fort Mill and nearby areas when route availability allows. Send your address so we can confirm coverage and timing.",
      },
      {
        question: "Can you handle both kitchen and laundry appliance repairs in Fort Mill?",
        answer:
          "Yes. We help with many common refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and related cooling appliance issues.",
      },
      {
        question: "Is same-day service available in Fort Mill?",
        answer:
          "Same-day service may be available depending on the day, route, and appointment schedule. Calling directly is the fastest way to check.",
      },
    ],
  },
  {
    slug: "appliance-repair-waxhaw-nc",
    city: "Waxhaw",
    state: "NC",
    countyOrArea: "Union County",
    nearbyLabel: "Waxhaw, Marvin, and south Charlotte suburbs",
    heroTitle: "Appliance Repair in Waxhaw, NC",
    heroDescription:
      "DAPL Appliance Repair supports Waxhaw-area homeowners with practical help for kitchen, laundry, cooling, and select light commercial appliance repair needs.",
    metaTitle: "Appliance Repair in Waxhaw, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Waxhaw, NC? DAPL Appliance Repair helps with refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and cooling appliance issues.",
    keywords: [
      "appliance repair Waxhaw NC",
      "Waxhaw appliance repair",
      "refrigerator repair Waxhaw",
      "washer repair Waxhaw",
      "dryer repair Waxhaw",
    ],
    introTitle: "Careful appliance repair guidance for Waxhaw homes",
    introText:
      "Waxhaw homes often have larger kitchens, busy laundry setups, and built-in appliances where a rushed guess can become expensive. We focus on diagnosis first, then clear repair guidance before major decisions.",
    localNotes: [
      "Useful for Waxhaw, Marvin, and nearby Union County homes",
      "Good fit for built-in kitchen appliances, laundry equipment, and cooling appliances",
      "Scheduling depends on the address and route availability",
    ],
    commonNeeds: [
      {
        title: "Built-in refrigerators or wine coolers with cooling trouble",
        text:
          "Waxhaw homes often have built-in cooling appliances, so we ask about airflow, cabinet fit, temperature swings, and any recent changes.",
      },
      {
        title: "Dishwashers leaking near cabinetry",
        text:
          "A dishwasher leak near custom cabinets needs quick attention. We look at door, drain, supply, and cycle symptoms before giving guidance.",
      },
      {
        title: "Washers creating vibration or drainage issues",
        text:
          "Vibration and drainage problems can be related or separate. We ask about load size, floor movement, water left inside, and error codes.",
      },
      {
        title: "Dryers with weak heat or airflow concerns",
        text:
          "Weak heat can come from the dryer itself or restricted airflow. We use your symptoms to decide what should be checked first.",
      },
      {
        title: "Ovens and cooktops with uneven heating",
        text:
          "Uneven cooking, burner problems, or slow preheat can involve several parts, so we ask which cooking mode or burner is affected.",
      },
      {
        title: "Freezers not holding temperature consistently",
        text:
          "Freezer temperature swings can show up as frost, soft food, or constant running. Those details help us assess the likely failure point.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Weddington", "Matthews", "Fort Mill", "Charlotte"],
    faqs: [
      {
        question: "Do you serve Waxhaw, NC?",
        answer:
          "Yes. We serve Waxhaw and nearby Union County communities when scheduling and route availability allow.",
      },
      {
        question: "Do you work on built-in kitchen appliances in Waxhaw homes?",
        answer:
          "We help with many common built-in and freestanding appliance issues. Share the appliance type, brand, and symptoms so we can confirm the best next step.",
      },
      {
        question: "How do I schedule appliance repair in Waxhaw?",
        answer:
          "Call or submit the form with your address, appliance type, and symptoms. We will confirm availability and practical scheduling options.",
      },
    ],
  },
  {
    slug: "appliance-repair-concord-nc",
    city: "Concord",
    state: "NC",
    countyOrArea: "Cabarrus County",
    nearbyLabel: "Concord, Harrisburg, and northeast Charlotte",
    heroTitle: "Appliance Repair in Concord, NC",
    heroDescription:
      "DAPL Appliance Repair helps Concord-area homes with common appliance problems, from refrigerators and laundry equipment to dishwashers, ovens, cooktops, and cooling units.",
    metaTitle: "Appliance Repair in Concord, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Concord, NC? DAPL Appliance Repair helps with refrigerator, washer, dryer, dishwasher, oven, cooktop, and cooling appliance issues.",
    keywords: [
      "appliance repair Concord NC",
      "Concord appliance repair",
      "refrigerator repair Concord NC",
      "washer repair Concord",
      "dryer repair Concord",
    ],
    introTitle: "Appliance repair support for Concord-area homes",
    introText:
      "Concord service calls often come from fast-growing neighborhoods where appliance downtime can disrupt the whole day. We help identify common failure points and provide straightforward recommendations before you commit to a repair.",
    localNotes: [
      "Helpful for Concord, Harrisburg, and northeast Charlotte-area homes",
      "Good fit for kitchen, laundry, freezer, and refrigerator problems",
      "Availability depends on the route and the service address",
    ],
    commonNeeds: [
      {
        title: "Refrigerators leaking or running warm",
        text:
          "In Concord-area homes, refrigerator leaks and warm sections often need checks around cooling, drain paths, ice makers, and door seals.",
      },
      {
        title: "Washers stuck on drain or spin cycles",
        text:
          "If the washer repeats a cycle, refuses to spin, or leaves water inside, we ask about codes and timing to prepare for drain and control checks.",
      },
      {
        title: "Dryers overheating or taking too long",
        text:
          "Overheating and long dry times both deserve attention because airflow, sensors, and heating parts can affect performance and safety.",
      },
      {
        title: "Dishwashers not cleaning or not draining",
        text:
          "Poor cleaning and drain trouble can overlap. We look at water level, spray action, filters, and drain behavior before recommending work.",
      },
      {
        title: "Ovens and cooktops with startup problems",
        text:
          "Startup failures can involve ignition, controls, elements, or power, so we ask what lights up, clicks, heats, or stays completely off.",
      },
      {
        title: "Ice machines or freezers with cooling issues",
        text:
          "For ice and freezer problems, we ask about production, temperature, frost, water supply, and unusual sounds to narrow the visit.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Charlotte", "Huntersville", "Cornelius", "Davidson"],
    faqs: [
      {
        question: "Do you repair appliances in Concord, NC?",
        answer:
          "Yes. We serve Concord and nearby Cabarrus County / northeast Charlotte-area communities when scheduling allows.",
      },
      {
        question: "Can you repair laundry appliances in Concord?",
        answer:
          "Yes. We help with many washer and dryer issues, including drainage problems, spin trouble, weak heat, long dry times, and startup failures.",
      },
      {
        question: "What is the fastest way to check Concord availability?",
        answer:
          "Call directly or submit the form with your address and appliance details. That gives us the information needed to confirm the route.",
      },
    ],
  },
  {
    slug: "appliance-repair-cornelius-nc",
    city: "Cornelius",
    state: "NC",
    countyOrArea: "Lake Norman area",
    nearbyLabel: "Cornelius, Lake Norman, and Huntersville",
    heroTitle: "Appliance Repair in Cornelius, NC",
    heroDescription:
      "DAPL Appliance Repair serves Cornelius-area homes with repair help for refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, wine coolers, and related appliances.",
    metaTitle: "Appliance Repair in Cornelius, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Cornelius, NC? DAPL Appliance Repair helps with kitchen, laundry, cooling, freezer, and wine cooler issues near Lake Norman.",
    keywords: [
      "appliance repair Cornelius NC",
      "Cornelius appliance repair",
      "refrigerator repair Cornelius",
      "wine cooler repair Cornelius",
      "dryer repair Cornelius",
    ],
    introTitle: "Appliance repair for Cornelius and Lake Norman homes",
    introText:
      "Cornelius homes often include busy kitchens, garage freezers, wine storage, and laundry setups that need dependable performance. We help diagnose the issue and explain the repair path in plain language.",
    localNotes: [
      "Useful for Cornelius and nearby Lake Norman-area addresses",
      "Good fit for refrigerators, freezers, wine coolers, laundry, and kitchen appliance issues",
      "Route timing can vary based on north Charlotte and Lake Norman scheduling",
    ],
    commonNeeds: [
      {
        title: "Wine coolers not holding the correct temperature",
        text:
          "Cornelius and Lake Norman homes often rely on wine storage, so we ask about set temperature, actual readings, airflow, and noise.",
      },
      {
        title: "Refrigerators with ice maker or cooling problems",
        text:
          "Ice maker trouble, water leaks, and weak cooling can be connected, so we collect brand and symptom details before the appointment.",
      },
      {
        title: "Freezers frosting up or warming",
        text:
          "Frost buildup or soft food can point to seal, airflow, defrost, or temperature control issues that need a targeted inspection.",
      },
      {
        title: "Dryers taking too long to dry",
        text:
          "We ask whether the dryer heats, how long loads take, and whether the vent path has changed so airflow and heat checks are focused.",
      },
      {
        title: "Washers leaking or failing to drain",
        text:
          "Leaks and drain failure can come from hoses, pumps, seals, or cycle behavior. A few details help us avoid guessing on arrival.",
      },
      {
        title: "Dishwashers and ovens with performance issues",
        text:
          "For kitchen performance problems, we ask what changed first: cleaning, draining, heating, control response, or cooking results.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Huntersville", "Davidson", "Charlotte", "Concord"],
    faqs: [
      {
        question: "Do you service Cornelius, NC?",
        answer:
          "Yes. We serve Cornelius and nearby Lake Norman-area communities when route availability allows.",
      },
      {
        question: "Do you repair wine coolers and freezers in Cornelius?",
        answer:
          "Yes. We help with many common wine cooler, freezer, and refrigerator cooling issues. Share the brand and symptoms if you know them.",
      },
      {
        question: "Can I request service for a Cornelius rental or second home?",
        answer:
          "Yes. Include the service address, contact information, and access details so we can coordinate the appointment properly.",
      },
    ],
  },
  {
    slug: "appliance-repair-davidson-nc",
    city: "Davidson",
    state: "NC",
    countyOrArea: "Lake Norman area",
    nearbyLabel: "Davidson, Cornelius, and north Charlotte",
    heroTitle: "Appliance Repair in Davidson, NC",
    heroDescription:
      "DAPL Appliance Repair helps Davidson-area homeowners with common kitchen, laundry, freezer, wine cooler, and cooling appliance repair needs.",
    metaTitle: "Appliance Repair in Davidson, NC | DAPL Appliance Repair",
    metaDescription:
      "Looking for appliance repair in Davidson, NC? DAPL Appliance Repair helps with refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and wine cooler issues.",
    keywords: [
      "appliance repair Davidson NC",
      "Davidson appliance repair",
      "refrigerator repair Davidson",
      "washer repair Davidson",
      "wine cooler repair Davidson",
    ],
    introTitle: "Clear appliance repair guidance for Davidson homes",
    introText:
      "Davidson homeowners often want a careful answer before deciding whether an appliance is worth repairing. We inspect the symptoms, explain the likely cause, and help you understand the practical next step.",
    localNotes: [
      "Helpful for Davidson and nearby north Mecklenburg / Lake Norman addresses",
      "Good fit for refrigerators, dishwashers, laundry appliances, freezers, and wine coolers",
      "Appointment availability depends on the route and service address",
    ],
    commonNeeds: [
      {
        title: "Refrigerators making noise or cooling unevenly",
        text:
          "Davidson calls often start with a new noise, warm shelves, or ice maker trouble. We ask where the issue shows up first.",
      },
      {
        title: "Dishwashers leaving residue or not draining",
        text:
          "Residue, standing water, or odor can point to wash action, filters, drain flow, or cycle settings that need a practical check.",
      },
      {
        title: "Washers stopping mid-cycle",
        text:
          "A washer that stops mid-cycle may be reacting to balance, drain, lid lock, control, or motor symptoms, so timing matters.",
      },
      {
        title: "Dryers with weak heat or airflow trouble",
        text:
          "Weak heat and poor airflow can make laundry pile up fast. We ask how long drying takes and whether heat is present at all.",
      },
      {
        title: "Wine coolers with control or temperature problems",
        text:
          "For wine coolers, we ask about display behavior, fan noise, actual temperature, and whether the unit is built in or freestanding.",
      },
      {
        title: "Ovens and cooktops not heating consistently",
        text:
          "If heat changes during cooking or only one burner fails, those details help us focus on the right control, element, or ignition checks.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Cornelius", "Huntersville", "Concord", "Charlotte"],
    faqs: [
      {
        question: "Do you offer appliance repair in Davidson, NC?",
        answer:
          "Yes. We serve Davidson and nearby Lake Norman-area communities when scheduling and route availability allow.",
      },
      {
        question: "Can you help decide whether to repair or replace an appliance?",
        answer:
          "Yes. We focus on practical recommendations based on the symptoms, appliance condition, age, and likely repair path.",
      },
      {
        question: "Do you handle refrigerator and wine cooler calls in Davidson?",
        answer:
          "Yes. We help with many common refrigerator, freezer, and wine cooler issues, including cooling loss, leaks, noise, and controls.",
      },
    ],
  },
  {
    slug: "appliance-repair-weddington-nc",
    city: "Weddington",
    state: "NC",
    countyOrArea: "Union County",
    nearbyLabel: "Weddington, Waxhaw, and southeast Charlotte suburbs",
    heroTitle: "Appliance Repair in Weddington, NC",
    heroDescription:
      "DAPL Appliance Repair helps Weddington-area homeowners with common appliance repair needs for kitchens, laundry rooms, refrigerators, freezers, wine coolers, and more.",
    metaTitle: "Appliance Repair in Weddington, NC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Weddington, NC? DAPL Appliance Repair helps with refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and wine cooler issues.",
    keywords: [
      "appliance repair Weddington NC",
      "Weddington appliance repair",
      "refrigerator repair Weddington",
      "washer repair Weddington",
      "oven repair Weddington",
    ],
    introTitle: "Appliance repair for Weddington-area homes",
    introText:
      "Weddington homes often include high-use kitchen appliances, larger laundry setups, and cooling equipment where a clear diagnosis matters. We keep the process direct, practical, and focused on the best next step.",
    localNotes: [
      "Useful for Weddington, Waxhaw, and nearby Union County homes",
      "Good fit for kitchen, laundry, refrigerator, freezer, and wine cooler issues",
      "Scheduling depends on service address and route availability",
    ],
    commonNeeds: [
      {
        title: "Refrigerators and freezers losing temperature",
        text:
          "For Weddington homes, we ask which section is warming, whether frost is present, and if the compressor or fans sound different.",
      },
      {
        title: "Built-in dishwashers leaking or not cleaning",
        text:
          "Built-in dishwasher issues can affect surrounding cabinetry, so we look at leak location, wash quality, drain behavior, and door fit.",
      },
      {
        title: "Washers vibrating or failing to drain",
        text:
          "Vibration, drain failure, and spin problems can have different causes. Cycle timing and floor movement help guide the inspection.",
      },
      {
        title: "Dryers taking too long to finish loads",
        text:
          "Long dry times usually mean something is limiting heat, airflow, or sensing. We ask what loads are affected and whether heat is weak.",
      },
      {
        title: "Ovens and cooktops with heating problems",
        text:
          "For heating complaints, we ask whether the issue affects preheat, baking results, one burner, or the whole cooking surface.",
      },
      {
        title: "Wine coolers with unstable storage temperatures",
        text:
          "Wine cooler temperature swings are easier to diagnose when we know the setpoint, actual reading, installation type, and noise pattern.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Waxhaw", "Matthews", "Charlotte", "Fort Mill"],
    faqs: [
      {
        question: "Do you service Weddington, NC?",
        answer:
          "Yes. We serve Weddington and nearby Union County communities when appointment availability and routing allow.",
      },
      {
        question: "Can you repair built-in kitchen appliances in Weddington homes?",
        answer:
          "We help with many common built-in and freestanding appliance issues. Send the appliance type, brand, and symptoms so we can confirm the best next step.",
      },
      {
        question: "How should I request a Weddington appointment?",
        answer:
          "Call or submit the form with your service address, appliance type, symptoms, and preferred date. We will confirm availability.",
      },
    ],
  },
  {
    slug: "appliance-repair-rock-hill-sc",
    city: "Rock Hill",
    state: "SC",
    countyOrArea: "York County",
    nearbyLabel: "Rock Hill, Fort Mill, and York County",
    heroTitle: "Appliance Repair in Rock Hill, SC",
    heroDescription:
      "DAPL Appliance Repair helps Rock Hill-area homeowners with common refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, and cooling appliance repair needs.",
    metaTitle: "Appliance Repair in Rock Hill, SC | DAPL Appliance Repair",
    metaDescription:
      "Need appliance repair in Rock Hill, SC? DAPL Appliance Repair helps with kitchen, laundry, and cooling appliance issues across Rock Hill and nearby York County areas.",
    keywords: [
      "appliance repair Rock Hill SC",
      "Rock Hill appliance repair",
      "refrigerator repair Rock Hill",
      "washer repair Rock Hill SC",
      "dryer repair Rock Hill SC",
    ],
    introTitle: "Appliance repair help for Rock Hill and York County",
    introText:
      "Rock Hill calls require clear scheduling because they sit farther from central Charlotte routes. Share your appliance symptoms and address, and we will confirm whether we can fit the visit into the route.",
    localNotes: [
      "Useful for Rock Hill and nearby York County addresses when route availability allows",
      "Good fit for kitchen, laundry, freezer, and cooling appliance issues",
      "Coverage and same-day timing depend on schedule and service address",
    ],
    commonNeeds: [
      {
        title: "Refrigerators warming up or leaking",
        text:
          "For Rock Hill routes, we ask whether the issue is cooling, water, frost, or ice maker related so the appointment is worth the trip.",
      },
      {
        title: "Washers not draining or spinning",
        text:
          "If the washer leaves water behind or will not spin, tell us about sounds, error codes, and where the cycle stops.",
      },
      {
        title: "Dryers running without enough heat",
        text:
          "A dryer can run normally but still fail to dry. We ask whether there is heat, airflow, or a burning smell before confirming next steps.",
      },
      {
        title: "Dishwashers failing to drain or clean",
        text:
          "Drain and cleaning issues can involve water level, spray arms, filters, pumps, or installation details that need a focused look.",
      },
      {
        title: "Ovens and cooktops with heating trouble",
        text:
          "Heating trouble can show up as slow preheat, uneven cooking, failed ignition, or dead burners. We ask which symptom is most obvious.",
      },
      {
        title: "Freezers and ice machines with cooling issues",
        text:
          "Cooling equipment problems can affect stored food quickly, so we collect temperature, frost, water, and noise details before scheduling.",
      },
    ],
    serviceHighlights: sharedHighlights,
    nearbyCities: ["Fort Mill", "Charlotte", "Waxhaw", "Matthews"],
    faqs: [
      {
        question: "Do you serve Rock Hill, SC?",
        answer:
          "We serve Rock Hill when route availability allows. Send your service address so we can confirm coverage and the best available appointment time.",
      },
      {
        question: "Is same-day appliance repair available in Rock Hill?",
        answer:
          "Same-day service may be available depending on the day and route. Calling directly is the fastest way to check.",
      },
      {
        question: "What appliances can you help with in Rock Hill?",
        answer:
          "We help with many common refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, wine cooler, and select commercial refrigeration issues.",
      },
    ],
  },
];

export const serviceAreaPagesDirectory = serviceAreaPages.map((area) => ({
  slug: area.slug,
  city: area.city,
  state: area.state,
  label: `${area.city}, ${area.state}`,
}));

export function getServiceAreaPage(slug: string) {
  return serviceAreaPages.find((area) => area.slug === slug);
}
