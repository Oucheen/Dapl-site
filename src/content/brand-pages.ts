import { servicePagesDirectory } from "@/content/service-pages";

export type BrandPageContent = {
  slug: string;
  name: string;
  logo: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroTitle: string;
  heroDescription: string;
  introTitle: string;
  introText: string;
  commonIssues: {
    title: string;
    text: string;
  }[];
  serviceNotes: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
};

const standardAppliances = servicePagesDirectory.filter(
  (service) => service.slug !== "commercial-refrigerator-repair-charlotte-nc",
);

export const brandServiceCategories = standardAppliances.map((service) => ({
  slug: service.slug,
  applianceName: service.applianceName,
  summary: service.summary,
}));

export const brandPages: BrandPageContent[] = [
  {
    slug: "whirlpool-appliance-repair-charlotte-nc",
    name: "Whirlpool",
    logo: "/brands/whirlpool.svg",
    metaTitle: "Whirlpool Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need Whirlpool appliance repair in Charlotte, NC? DAPL Appliance Repair helps with Whirlpool refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, and more.",
    keywords: [
      "Whirlpool appliance repair Charlotte NC",
      "Whirlpool refrigerator repair Charlotte",
      "Whirlpool washer repair Charlotte",
      "Whirlpool dryer repair Charlotte",
    ],
    heroTitle: "Whirlpool Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners troubleshoot and repair common Whirlpool refrigerator, laundry, kitchen, and cooling appliance problems with practical local scheduling.",
    introTitle: "Local help for common Whirlpool appliance problems",
    introText:
      "Whirlpool appliances are found in many Charlotte homes, from laundry rooms to kitchens. Tell us the model if you have it, what changed, and whether the issue is constant or intermittent so we can prepare for the visit.",
    commonIssues: [
      {
        title: "Whirlpool refrigerator cooling issues",
        text: "We check airflow, fans, controls, seals, and temperature behavior when a Whirlpool refrigerator is not holding steady cold.",
      },
      {
        title: "Whirlpool washer drain or spin trouble",
        text: "Drainage, spin, and lock symptoms can come from pump, balance, control, or cycle-related problems.",
      },
      {
        title: "Whirlpool dryer not heating or drying slowly",
        text: "Weak heat and long dry times often involve airflow, sensors, heating parts, or controls.",
      },
      {
        title: "Whirlpool dishwasher leaks or poor cleaning",
        text: "We inspect wash performance, spray action, seals, valves, and drainage before recommending the next step.",
      },
      {
        title: "Whirlpool oven or cooktop heating problems",
        text: "Uneven heat, no heat, and burner issues can involve elements, igniters, sensors, or controls.",
      },
      {
        title: "Whirlpool freezer frost or temperature swings",
        text: "Frost buildup and unstable temperatures can point to seals, airflow, controls, or defrost-related issues.",
      },
    ],
    serviceNotes: [
      "Service for many common Whirlpool kitchen and laundry appliances",
      "Same-day Whirlpool appliance repair when scheduling allows",
      "Clear repair-versus-replace guidance before major repairs",
    ],
    faqs: [
      {
        question: "Do you repair Whirlpool appliances in Charlotte?",
        answer:
          "Yes. We help with many common Whirlpool refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, and wine cooler issues in Charlotte and nearby areas.",
      },
      {
        question: "Should I provide the Whirlpool model number?",
        answer:
          "If you have it, yes. The model number helps us understand the appliance configuration and prepare for the most likely repair path.",
      },
      {
        question: "Can you provide same-day Whirlpool appliance repair?",
        answer:
          "Same-day availability depends on the schedule and route, but we offer priority appointments whenever possible.",
      },
    ],
  },
  {
    slug: "ge-appliance-repair-charlotte-nc",
    name: "GE",
    logo: "/brands/general-electric.svg",
    metaTitle: "GE Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need GE appliance repair in Charlotte, NC? DAPL Appliance Repair helps with GE refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, and cooling appliances.",
    keywords: [
      "GE appliance repair Charlotte NC",
      "GE refrigerator repair Charlotte",
      "GE washer repair Charlotte",
      "GE oven repair Charlotte",
    ],
    heroTitle: "GE Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners with common GE kitchen, laundry, refrigeration, and cooking appliance issues, from cooling loss to startup trouble.",
    introTitle: "Practical GE appliance repair guidance",
    introText:
      "GE appliances can show very different symptoms depending on the model and category. We focus on the behavior you are seeing, the appliance type, and the best practical next step.",
    commonIssues: [
      {
        title: "GE refrigerator not cooling properly",
        text: "We inspect fans, airflow, temperature controls, seals, and common cooling failure points.",
      },
      {
        title: "GE washer not draining or spinning",
        text: "Spin and drain problems may involve pumps, locks, controls, balance, or restricted water movement.",
      },
      {
        title: "GE dryer heat or airflow problems",
        text: "If clothes stay damp, we check heating performance, moisture sensing, airflow, and cycle behavior.",
      },
      {
        title: "GE dishwasher not cleaning or draining",
        text: "Poor cleaning or standing water can involve spray arms, filters, pumps, valves, or drain routing.",
      },
      {
        title: "GE oven temperature or preheat issues",
        text: "We check heating parts, sensors, controls, and temperature behavior before recommending a repair.",
      },
      {
        title: "GE freezer frost or cold loss",
        text: "Frost, thawing, or unstable freezing can come from sealing, airflow, defrost, or control issues.",
      },
    ],
    serviceNotes: [
      "Service for many common GE residential appliance models",
      "Support for kitchen, laundry, and cooling appliance issues",
      "Local Charlotte scheduling with straightforward repair recommendations",
    ],
    faqs: [
      {
        question: "Do you repair GE appliances in Charlotte?",
        answer:
          "Yes. We service many common GE appliance issues across refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, ice machines, and wine coolers.",
      },
      {
        question: "Can you help with GE refrigerator cooling problems?",
        answer:
          "Yes. GE refrigerator cooling complaints are common, and we inspect airflow, controls, fans, seals, and temperature behavior.",
      },
      {
        question: "Do you work on older GE appliances?",
        answer:
          "We can evaluate many older GE appliances and explain whether repair makes practical sense based on the symptom and condition.",
      },
    ],
  },
  {
    slug: "samsung-appliance-repair-charlotte-nc",
    name: "Samsung",
    logo: "/brands/samsung.svg",
    metaTitle: "Samsung Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need Samsung appliance repair in Charlotte, NC? DAPL Appliance Repair helps with Samsung refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, and more.",
    keywords: [
      "Samsung appliance repair Charlotte NC",
      "Samsung refrigerator repair Charlotte",
      "Samsung washer repair Charlotte",
      "Samsung dryer repair Charlotte",
    ],
    heroTitle: "Samsung Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps with common Samsung appliance issues, including cooling problems, laundry cycle trouble, drainage issues, heating failures, and control symptoms.",
    introTitle: "Samsung appliance help without guesswork",
    introText:
      "Samsung appliances often include digital controls and model-specific behavior. We look at the full symptom pattern and explain the practical repair path before major decisions.",
    commonIssues: [
      {
        title: "Samsung refrigerator cooling or ice maker issues",
        text: "We check cooling behavior, airflow, ice production, water flow, and control symptoms.",
      },
      {
        title: "Samsung washer cycle or drain problems",
        text: "Drain, spin, and startup trouble can involve pumps, locks, sensors, balance, or control behavior.",
      },
      {
        title: "Samsung dryer not heating or stopping early",
        text: "We inspect heat, airflow, sensors, controls, and cycle behavior when clothes are not drying properly.",
      },
      {
        title: "Samsung dishwasher leak or cleaning problems",
        text: "Leaks and poor wash results can involve seals, water flow, spray action, or drainage.",
      },
      {
        title: "Samsung oven or cooktop control symptoms",
        text: "Control response, heating, and mode-selection problems can affect daily cooking performance.",
      },
      {
        title: "Samsung freezer or cooling appliance instability",
        text: "Unstable temperatures may involve airflow, sensors, seals, controls, or frost-related issues.",
      },
    ],
    serviceNotes: [
      "Support for many common Samsung appliance categories",
      "Helpful troubleshooting based on symptoms and model details",
      "Clear recommendations before expensive repairs",
    ],
    faqs: [
      {
        question: "Do you repair Samsung appliances in Charlotte?",
        answer:
          "Yes. We help with many common Samsung refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, and wine cooler issues.",
      },
      {
        question: "Can you help with Samsung refrigerator ice maker issues?",
        answer:
          "Yes. Ice maker and cooling complaints are common. We inspect water flow, freezing performance, controls, and related symptoms.",
      },
      {
        question: "Should I mention error codes when booking Samsung repair?",
        answer:
          "Yes. If an error code appears, include it in the request. It can help us prepare for the service visit.",
      },
    ],
  },
  {
    slug: "lg-appliance-repair-charlotte-nc",
    name: "LG",
    logo: "/brands/lg-electronics.svg",
    metaTitle: "LG Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need LG appliance repair in Charlotte, NC? DAPL Appliance Repair helps with LG refrigerators, washers, dryers, dishwashers, ovens, cooktops, freezers, and cooling appliances.",
    keywords: [
      "LG appliance repair Charlotte NC",
      "LG refrigerator repair Charlotte",
      "LG washer repair Charlotte",
      "LG dryer repair Charlotte",
    ],
    heroTitle: "LG Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners with common LG appliance symptoms, including cooling loss, laundry performance issues, leak concerns, heating problems, and startup failures.",
    introTitle: "Local LG appliance repair support",
    introText:
      "From LG laundry appliances to refrigerators and kitchen units, we focus on the symptom, model details, and practical repair choices that make sense for the appliance.",
    commonIssues: [
      {
        title: "LG refrigerator not cooling consistently",
        text: "We check temperature behavior, airflow, seals, fans, controls, and signs of cooling strain.",
      },
      {
        title: "LG washer drain, spin, or door lock issues",
        text: "Cycle interruptions can involve lock behavior, balance, drainage, sensors, or control response.",
      },
      {
        title: "LG dryer long dry times or no heat",
        text: "Weak drying can come from heat, airflow, moisture sensing, or cycle control problems.",
      },
      {
        title: "LG dishwasher leaking or not cleaning well",
        text: "We inspect drainage, spray action, seals, water entry, and wash performance.",
      },
      {
        title: "LG oven or cooktop not heating correctly",
        text: "Heating problems can involve elements, sensors, igniters, controls, or power delivery.",
      },
      {
        title: "LG freezer frost or temperature problems",
        text: "Frost and temperature swings can point to sealing, airflow, defrost, or control issues.",
      },
    ],
    serviceNotes: [
      "Service for many common LG kitchen and laundry appliances",
      "Symptom-based diagnosis before major repair decisions",
      "Charlotte-area scheduling for urgent and routine appliance issues",
    ],
    faqs: [
      {
        question: "Do you repair LG appliances in Charlotte?",
        answer:
          "Yes. We help with many common LG refrigerator, washer, dryer, dishwasher, oven, cooktop, freezer, ice machine, and wine cooler issues.",
      },
      {
        question: "Can you work on LG washer and dryer problems?",
        answer:
          "Yes. We inspect many LG laundry appliance symptoms, including draining, spin, heat, airflow, and cycle problems.",
      },
      {
        question: "Can you help decide whether an LG appliance is worth repairing?",
        answer:
          "Yes. We explain the likely issue, appliance condition, and repair-versus-replace considerations before major repair decisions.",
      },
    ],
  },
  {
    slug: "kitchenaid-appliance-repair-charlotte-nc",
    name: "KitchenAid",
    logo: "/brands/kitchen-aid.svg",
    metaTitle: "KitchenAid Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need KitchenAid appliance repair in Charlotte, NC? DAPL Appliance Repair helps with KitchenAid refrigerators, dishwashers, ovens, cooktops, freezers, ice machines, and more.",
    keywords: [
      "KitchenAid appliance repair Charlotte NC",
      "KitchenAid dishwasher repair Charlotte",
      "KitchenAid refrigerator repair Charlotte",
      "KitchenAid oven repair Charlotte",
    ],
    heroTitle: "KitchenAid Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps with common KitchenAid kitchen and cooling appliance issues, including refrigerator cooling loss, dishwasher performance problems, oven heating trouble, and more.",
    introTitle: "KitchenAid repair help for busy Charlotte kitchens",
    introText:
      "KitchenAid appliances are often central to the kitchen. We focus on practical diagnosis, clear communication, and getting the appliance back to dependable use when repair makes sense.",
    commonIssues: [
      {
        title: "KitchenAid refrigerator cooling problems",
        text: "We inspect airflow, controls, fans, seals, and temperature behavior when cooling becomes unreliable.",
      },
      {
        title: "KitchenAid dishwasher not cleaning or draining",
        text: "Poor wash results can involve spray arms, filters, water flow, pumps, or drain restrictions.",
      },
      {
        title: "KitchenAid oven not heating evenly",
        text: "Uneven baking can involve sensors, heating parts, airflow, calibration, or control behavior.",
      },
      {
        title: "KitchenAid cooktop burner issues",
        text: "Burner and ignition symptoms may involve elements, switches, spark parts, gas flow, or controls.",
      },
      {
        title: "KitchenAid freezer or ice maker trouble",
        text: "We check freezing performance, water flow, ice production, and temperature consistency.",
      },
      {
        title: "KitchenAid control or startup symptoms",
        text: "Display, mode, and startup problems help us narrow down power, board, sensor, or control issues.",
      },
    ],
    serviceNotes: [
      "Support for common KitchenAid kitchen and cooling appliances",
      "Helpful guidance for built-in and freestanding units",
      "Clear recommendations for repair-versus-replacement choices",
    ],
    faqs: [
      {
        question: "Do you repair KitchenAid appliances in Charlotte?",
        answer:
          "Yes. We help with many common KitchenAid refrigerator, dishwasher, oven, cooktop, freezer, ice machine, wine cooler, washer, and dryer issues.",
      },
      {
        question: "Can you repair KitchenAid dishwashers?",
        answer:
          "Yes. We inspect KitchenAid dishwasher drainage, cleaning, leak, latch, and control problems.",
      },
      {
        question: "Do you service KitchenAid built-in appliances?",
        answer:
          "We can evaluate many common built-in KitchenAid appliance issues and explain the most practical repair path.",
      },
    ],
  },
  {
    slug: "bosch-appliance-repair-charlotte-nc",
    name: "Bosch",
    logo: "/brands/bosch-1.svg",
    metaTitle: "Bosch Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need Bosch appliance repair in Charlotte, NC? DAPL Appliance Repair helps with Bosch dishwashers, refrigerators, ovens, cooktops, washers, dryers, freezers, and more.",
    keywords: [
      "Bosch appliance repair Charlotte NC",
      "Bosch dishwasher repair Charlotte",
      "Bosch refrigerator repair Charlotte",
      "Bosch oven repair Charlotte",
    ],
    heroTitle: "Bosch Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners with common Bosch appliance issues, including dishwasher drainage, refrigerator cooling, oven heating, cooktop performance, and more.",
    introTitle: "Bosch appliance service with careful diagnostics",
    introText:
      "Bosch appliances can be compact, efficient, and model-specific. We review the symptom pattern and appliance category before explaining the best practical repair option.",
    commonIssues: [
      {
        title: "Bosch dishwasher not draining or cleaning well",
        text: "We check filters, pumps, spray action, water flow, and drainage when dishes are not coming out clean.",
      },
      {
        title: "Bosch refrigerator cooling instability",
        text: "Temperature swings can involve airflow, sensors, seals, fans, or control response.",
      },
      {
        title: "Bosch oven heating or temperature issues",
        text: "We inspect heating performance, sensors, controls, and preheat behavior for uneven cooking complaints.",
      },
      {
        title: "Bosch cooktop burner or control problems",
        text: "Cooktop symptoms can involve heating elements, ignition, controls, or power delivery.",
      },
      {
        title: "Bosch laundry appliance cycle problems",
        text: "Washer and dryer issues may involve drainage, spin, airflow, heat, or electronic control behavior.",
      },
      {
        title: "Bosch freezer or wine cooler performance issues",
        text: "We review airflow, temperature stability, sealing, and cooling behavior to protect stored items.",
      },
    ],
    serviceNotes: [
      "Support for many common Bosch kitchen and laundry appliance issues",
      "Local scheduling for Charlotte and surrounding service areas",
      "Practical recommendations before major repair decisions",
    ],
    faqs: [
      {
        question: "Do you repair Bosch appliances in Charlotte?",
        answer:
          "Yes. We help with many common Bosch dishwasher, refrigerator, oven, cooktop, washer, dryer, freezer, ice machine, and wine cooler issues.",
      },
      {
        question: "Can you repair Bosch dishwashers?",
        answer:
          "Yes. Bosch dishwasher drainage, cleaning, leak, and cycle issues are common service requests.",
      },
      {
        question: "Should I include the Bosch model number?",
        answer:
          "Yes, if available. Bosch model details can help us prepare for the service visit and understand the appliance configuration.",
      },
    ],
  },
  {
    slug: "frigidaire-appliance-repair-charlotte-nc",
    name: "Frigidaire",
    logo: "/brands/frigidaire.svg",
    metaTitle: "Frigidaire Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need Frigidaire appliance repair in Charlotte, NC? DAPL Appliance Repair helps with Frigidaire refrigerators, freezers, dishwashers, ovens, cooktops, washers, dryers, and more.",
    keywords: [
      "Frigidaire appliance repair Charlotte NC",
      "Frigidaire refrigerator repair Charlotte",
      "Frigidaire freezer repair Charlotte",
      "Frigidaire dishwasher repair Charlotte",
    ],
    heroTitle: "Frigidaire Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps with common Frigidaire appliance problems, including cooling loss, freezer frost, dishwasher leaks, oven heating trouble, and laundry performance issues.",
    introTitle: "Responsive Frigidaire repair help",
    introText:
      "Frigidaire appliances are common across Charlotte kitchens, laundry rooms, and garages. We focus on what the appliance is doing now and the most practical way to handle it.",
    commonIssues: [
      {
        title: "Frigidaire refrigerator not cooling",
        text: "We inspect airflow, fans, seals, controls, and temperature behavior when cooling becomes unreliable.",
      },
      {
        title: "Frigidaire freezer frost or thawing",
        text: "Frost and thawing can point to defrost, sealing, airflow, or temperature control issues.",
      },
      {
        title: "Frigidaire dishwasher leaking or not draining",
        text: "Leaks and standing water can involve seals, valves, pumps, filters, or drain routing.",
      },
      {
        title: "Frigidaire oven or cooktop heating problems",
        text: "Heating complaints can involve elements, igniters, sensors, controls, or power delivery.",
      },
      {
        title: "Frigidaire washer or dryer performance issues",
        text: "Laundry symptoms may involve drainage, spin, heat, airflow, controls, or cycle behavior.",
      },
      {
        title: "Frigidaire control or startup trouble",
        text: "We check power response, displays, switches, and controls when the appliance will not start correctly.",
      },
    ],
    serviceNotes: [
      "Service for many common Frigidaire appliance categories",
      "Support for refrigerators, freezers, kitchen, and laundry appliances",
      "Clear next-step guidance for repair decisions",
    ],
    faqs: [
      {
        question: "Do you repair Frigidaire appliances in Charlotte?",
        answer:
          "Yes. We help with many common Frigidaire refrigerator, freezer, dishwasher, oven, cooktop, washer, dryer, ice machine, and wine cooler issues.",
      },
      {
        question: "Can you repair Frigidaire freezer problems?",
        answer:
          "Yes. We inspect Frigidaire freezer frost, cooling, leak, noise, and temperature stability issues.",
      },
      {
        question: "Can you help with older Frigidaire appliances?",
        answer:
          "We can evaluate many older Frigidaire appliances and explain whether repair is practical based on the issue and condition.",
      },
    ],
  },
  {
    slug: "maytag-appliance-repair-charlotte-nc",
    name: "Maytag",
    logo: "/brands/maytag-3.svg",
    metaTitle: "Maytag Appliance Repair in Charlotte, NC | DAPL Appliance Repair",
    metaDescription:
      "Need Maytag appliance repair in Charlotte, NC? DAPL Appliance Repair helps with Maytag washers, dryers, refrigerators, dishwashers, ovens, cooktops, freezers, and more.",
    keywords: [
      "Maytag appliance repair Charlotte NC",
      "Maytag washer repair Charlotte",
      "Maytag dryer repair Charlotte",
      "Maytag refrigerator repair Charlotte",
    ],
    heroTitle: "Maytag Appliance Repair in Charlotte, NC",
    heroDescription:
      "DAPL Appliance Repair helps Charlotte homeowners with common Maytag laundry, kitchen, refrigeration, and cooking appliance problems, from spin trouble to cooling loss.",
    introTitle: "Maytag repair support for kitchen and laundry appliances",
    introText:
      "Maytag appliances are often chosen for daily-use spaces. When something stops working right, we help narrow down the likely issue and explain practical next steps.",
    commonIssues: [
      {
        title: "Maytag washer not spinning or draining",
        text: "We check drainage, balance, lock behavior, controls, and cycle symptoms when a washer stops mid-process.",
      },
      {
        title: "Maytag dryer not heating or tumbling",
        text: "Dryer problems can involve heating parts, belts, motors, airflow, sensors, or control response.",
      },
      {
        title: "Maytag refrigerator cooling problems",
        text: "Cooling issues may involve airflow, fans, seals, controls, or temperature feedback.",
      },
      {
        title: "Maytag dishwasher cleaning or leak issues",
        text: "We inspect spray action, drainage, seals, valves, filters, and wash performance.",
      },
      {
        title: "Maytag oven or cooktop heating trouble",
        text: "No-heat and uneven-heat symptoms can involve elements, igniters, sensors, switches, or controls.",
      },
      {
        title: "Maytag freezer temperature or frost issues",
        text: "We review sealing, airflow, defrost behavior, and controls when freezing performance changes.",
      },
    ],
    serviceNotes: [
      "Service for many common Maytag laundry and kitchen appliances",
      "Helpful diagnosis for cooling, heating, cycle, and leak symptoms",
      "Local Charlotte scheduling with clear communication",
    ],
    faqs: [
      {
        question: "Do you repair Maytag appliances in Charlotte?",
        answer:
          "Yes. We help with many common Maytag washer, dryer, refrigerator, dishwasher, oven, cooktop, freezer, ice machine, and wine cooler issues.",
      },
      {
        question: "Can you repair Maytag laundry appliances?",
        answer:
          "Yes. We inspect Maytag washer and dryer issues including spin, drain, heat, airflow, startup, and cycle problems.",
      },
      {
        question: "Do you offer same-day Maytag appliance repair?",
        answer:
          "Same-day service depends on scheduling and route availability, but we offer priority appointments whenever possible.",
      },
    ],
  },
];

export const brandPagesDirectory = brandPages.map((page) => ({
  slug: page.slug,
  name: page.name,
  logo: page.logo,
  summary: page.metaDescription,
}));

export function getBrandPage(slug: string) {
  return brandPages.find((page) => page.slug === slug);
}

export function getBrandPageByName(name: string) {
  return brandPages.find((page) => page.name === name);
}
