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
  commonNeeds: string[];
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
      "Refrigerators not cooling during hot weather",
      "Washers that will not drain, spin, or finish cycles",
      "Dryers taking too long to dry clothes",
      "Dishwashers leaking or leaving dishes dirty",
      "Ovens and cooktops with heating or control issues",
      "Freezers, ice machines, and wine coolers with temperature trouble",
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
      "Refrigerators not holding a steady temperature",
      "Dishwashers leaking near cabinets or flooring",
      "Washers making noise or failing to drain",
      "Dryers heating weakly or running too long",
      "Ovens baking unevenly",
      "Cooktops with ignition or burner problems",
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
      "French door refrigerators not cooling properly",
      "Washers stopping before the cycle completes",
      "Dryers running but not drying clothes well",
      "Dishwashers not draining after the wash",
      "Wine coolers with unstable temperatures",
      "Freezers building frost or losing cold air",
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
      "Refrigerators warming up or leaking water",
      "Washers not draining or shaking heavily",
      "Dryers taking multiple cycles to dry",
      "Dishwashers leaking around the door",
      "Ovens not reaching the right temperature",
      "Freezers and wine coolers with cooling loss",
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
      "Built-in refrigerators or wine coolers with cooling trouble",
      "Dishwashers leaking near cabinetry",
      "Washers creating vibration or drainage issues",
      "Dryers with weak heat or airflow concerns",
      "Ovens and cooktops with uneven heating",
      "Freezers not holding temperature consistently",
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
      "Refrigerators leaking or running warm",
      "Washers stuck on drain or spin cycles",
      "Dryers overheating or taking too long",
      "Dishwashers not cleaning or not draining",
      "Ovens and cooktops with startup problems",
      "Ice machines or freezers with cooling issues",
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
      "Wine coolers not holding the correct temperature",
      "Refrigerators with ice maker or cooling problems",
      "Freezers frosting up or warming",
      "Dryers taking too long to dry",
      "Washers leaking or failing to drain",
      "Dishwashers and ovens with performance issues",
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
      "Refrigerators making noise or cooling unevenly",
      "Dishwashers leaving residue or not draining",
      "Washers stopping mid-cycle",
      "Dryers with weak heat or airflow trouble",
      "Wine coolers with control or temperature problems",
      "Ovens and cooktops not heating consistently",
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
      "Refrigerators and freezers losing temperature",
      "Built-in dishwashers leaking or not cleaning",
      "Washers vibrating or failing to drain",
      "Dryers taking too long to finish loads",
      "Ovens and cooktops with heating problems",
      "Wine coolers with unstable storage temperatures",
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
      "Refrigerators warming up or leaking",
      "Washers not draining or spinning",
      "Dryers running without enough heat",
      "Dishwashers failing to drain or clean",
      "Ovens and cooktops with heating trouble",
      "Freezers and ice machines with cooling issues",
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
