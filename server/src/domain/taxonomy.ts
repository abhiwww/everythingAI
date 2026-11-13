/**
 * Universal category taxonomy.
 *
 * This is the core of the "order anything" engine: a category is *data*, not
 * code. Adding a new vertical (flowers, laptops, a plumber, a helicopter
 * charter) means adding one entry here — no route, table, or UI change.
 *
 * Every category declares:
 *  - how it is fulfilled (delivery / onsite / at provider / remote / handover)
 *  - how it is priced (fixed / per unit / hourly / daily / quote / dynamic)
 *  - what the concierge must collect before a request can be confirmed
 *  - what compliance profile applies (none / age gated / licensed / prohibited)
 *  - what the provider is (cook, driver, dealer, delivery partner, ...)
 */

export type Vertical =
  | 'goods'
  | 'food'
  | 'home_service'
  | 'personal_service'
  | 'ride'
  | 'delivery'
  | 'rental'
  | 'professional'
  | 'planning';

export type Fulfillment =
  | 'delivery'
  | 'onsite'
  | 'at_provider'
  | 'remote'
  | 'handover';

export type PricingModel =
  | 'fixed'
  | 'per_unit'
  | 'hourly'
  | 'daily'
  | 'quote'
  | 'dynamic';

export type ComplianceProfile =
  | 'none'
  | 'age_gated'
  | 'licensed_goods'
  | 'licensed_service'
  | 'prohibited';

export type AttributeType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'date'
  | 'time';

export interface AttributeSpec {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  options?: string[];
  example?: string;
  help?: string;
}

export interface PriceHint {
  min: number;
  max: number;
  unit: 'per_item' | 'per_hour' | 'per_day' | 'per_trip' | 'per_job';
}

export interface CategoryDefinition {
  slug: string;
  name: string;
  vertical: Vertical;
  description: string;
  /** What the supply side actually is. Answers "what will the provider do?" */
  providerRole: string;
  fulfillment: Fulfillment;
  pricing: PricingModel;
  compliance: ComplianceProfile;
  minAge?: number;
  licenceType?: string;
  requiredAttributes: AttributeSpec[];
  optionalAttributes?: AttributeSpec[];
  keywords: string[];
  examples: string[];
  priceHint: PriceHint;
  transactable: boolean;
  legalNote?: string;
}

const attr = (
  key: string,
  label: string,
  type: AttributeType,
  required = true,
  extra: Partial<AttributeSpec> = {}
): AttributeSpec => ({ key, label, type, required, ...extra });

const where = attr('area', 'Which Bengaluru area?', 'text', true, {
  example: 'Indiranagar',
});
const when = attr('scheduled_for', 'When do you need it?', 'text', true, {
  example: 'tomorrow 10am',
});

export const CATEGORIES: CategoryDefinition[] = [
  // ---------------------------------------------------------------- goods
  {
    slug: 'quick_commerce',
    name: 'Quick commerce / any small item',
    vertical: 'goods',
    description:
      'Any retail item a nearby store can hand over: gum, chocolate, milk, toiletries, a phone charger, a toy car.',
    providerRole: 'Store / delivery partner',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('items', 'What should I get?', 'text', true, {
        example: 'one pack of chewing gum',
      }),
      where,
    ],
    optionalAttributes: [
      attr('quantity', 'Quantity', 'number', false, { example: '1' }),
      attr('budget_max', 'Maximum budget (INR)', 'number', false),
    ],
    keywords: [
      'gum', 'chewing gum', 'chocolate', 'chips', 'snacks', 'grocery', 'groceries',
      'milk', 'bread', 'eggs', 'toothpaste', 'toiletries', 'water bottle',
      'soft drink', 'coke', 'pepsi', 'charger', 'cable', 'batteries',
    ],
    examples: ['a pack of gum', 'milk and bread', 'a toy car'],
    priceHint: { min: 20, max: 500, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'toy_purchase',
    name: 'Toys & games',
    vertical: 'goods',
    description: 'Toys, board games, LEGO-style sets, remote-control cars, dolls.',
    providerRole: 'Toy store / marketplace seller',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('item', 'Which toy?', 'text', true, { example: 'remote control car' }),
      where,
    ],
    keywords: ['toy', 'toys', 'lego', 'doll', 'board game', 'remote control car', 'rc car'],
    examples: ['a LEGO set', 'an RC car'],
    priceHint: { min: 199, max: 8000, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'electronics_purchase',
    name: 'Electronics',
    vertical: 'goods',
    description: 'Phones, laptops, TVs, headphones, cameras, consoles.',
    providerRole: 'Electronics retailer / brand store',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('item', 'Which product?', 'text', true, { example: 'iPhone 17' }),
      where,
    ],
    optionalAttributes: [
      attr('condition', 'New or used?', 'enum', false, { options: ['new', 'used', 'refurbished'] }),
      attr('budget_max', 'Maximum budget (INR)', 'number', false),
    ],
    keywords: [
      'laptop', 'phone', 'iphone', 'android phone', 'tv', 'television', 'headphones',
      'camera', 'gaming console', 'playstation', 'xbox', 'smartwatch', 'tablet',
    ],
    examples: ['a MacBook', 'a 55 inch TV'],
    priceHint: { min: 1500, max: 250000, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'furniture_purchase',
    name: 'Furniture',
    vertical: 'goods',
    description: 'Sofas, beds, mattresses, tables, chairs, wardrobes.',
    providerRole: 'Furniture store / dealer',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('item', 'Which piece of furniture?', 'text', true, { example: '3-seater sofa' }),
      where,
    ],
    keywords: ['furniture', 'sofa', 'bed', 'mattress', 'dining table', 'chair', 'wardrobe', 'bookshelf'],
    examples: ['a queen bed', 'a study table'],
    priceHint: { min: 1500, max: 120000, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'fashion_purchase',
    name: 'Clothing & footwear',
    vertical: 'goods',
    description: 'Clothes, shoes, sneakers, sarees, accessories.',
    providerRole: 'Boutique / brand store',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('item', 'What are you looking for?', 'text', true, { example: 'white sneakers, size 9' }),
      where,
    ],
    keywords: ['clothes', 'shirt', 'tshirt', 't-shirt', 'dress', 'shoes', 'sneakers', 'jeans', 'saree', 'kurta'],
    examples: ['running shoes', 'a formal shirt'],
    priceHint: { min: 299, max: 25000, unit: 'per_item' },
    transactable: true,
  },

  // ------------------------------------------------------------ vehicles
  {
    slug: 'vehicle_purchase',
    name: 'Vehicle purchase',
    vertical: 'goods',
    description:
      'New or used cars and bikes — from a hatchback to a Lamborghini or Rolls-Royce. Dealers quote; registration transfer is part of fulfilment.',
    providerRole: 'Car / bike dealer',
    fulfillment: 'handover',
    pricing: 'quote',
    compliance: 'licensed_service',
    licenceType: 'Dealer trade certificate + RC transfer',
    requiredAttributes: [
      attr('vehicle', 'Which vehicle or model?', 'text', true, { example: 'Lamborghini Huracan' }),
      attr('condition', 'New or used?', 'enum', true, { options: ['new', 'used'] }),
      where,
    ],
    optionalAttributes: [
      attr('budget_max', 'Budget (INR)', 'number', false),
      attr('finance', 'Need financing?', 'boolean', false),
    ],
    keywords: [
      'buy a car', 'buy car', 'new car', 'used car', 'second hand car', 'car dealer',
      'lamborghini', 'lambo', 'rolls royce', 'ferrari', 'porsche', 'bmw', 'audi',
      'mercedes', 'bentley', 'tesla', 'suv', 'sedan', 'hatchback', 'buy a bike',
      'motorcycle', 'royal enfield', 'honda', 'hyundai', 'maruti', 'tata', 'kia',
      'toyota', 'mahindra', 'skoda', 'volkswagen', 'jaguar', 'land rover', 'volvo',
    ],
    examples: ['a used Honda City', 'a Lamborghini Huracan'],
    priceHint: { min: 100000, max: 50000000, unit: 'per_job' },
    legalNote:
      'Sale completes only through a licensed dealer with RC transfer, insurance and applicable tax. The platform never collects full vehicle payment in this pilot.',
    transactable: true,
  },
  {
    slug: 'vehicle_rental',
    name: 'Vehicle rental',
    vertical: 'rental',
    description: 'Self-drive or chauffeur-driven car/bike rental by hour or day.',
    providerRole: 'Rental fleet operator',
    fulfillment: 'handover',
    pricing: 'daily',
    compliance: 'licensed_service',
    licenceType: 'RC, insurance and commercial permit',
    requiredAttributes: [
      attr('vehicle_class', 'Vehicle class', 'enum', true, {
        options: ['hatchback', 'sedan', 'SUV', 'luxury', 'bike', 'van'],
      }),
      attr('days', 'How many days?', 'number', true, { example: '2' }),
      where,
    ],
    optionalAttributes: [
      attr('self_drive', 'Self-drive?', 'boolean', false),
      attr('pickup_time', 'Pickup time', 'text', false),
    ],
    keywords: [
      'rent a car', 'car rental', 'rent car', 'self drive', 'hire a car', 'rent a bike',
      'bike rental', 'chauffeur car', 'luxury car rental',
    ],
    examples: ['a self-drive SUV for 2 days'],
    priceHint: { min: 1500, max: 40000, unit: 'per_day' },
    transactable: true,
  },
  {
    slug: 'cab_ride',
    name: 'Cab / ride',
    vertical: 'ride',
    description: 'Point-to-point ride, airport transfer, outstation cab.',
    providerRole: 'Driver with a permitted vehicle',
    fulfillment: 'onsite',
    pricing: 'dynamic',
    compliance: 'licensed_service',
    licenceType: 'Commercial driving licence + vehicle permit',
    requiredAttributes: [
      attr('pickup', 'Pickup location', 'text', true, { example: 'Indiranagar' }),
      attr('drop', 'Drop location', 'text', true, { example: 'Kempegowda Airport' }),
      attr('pickup_time', 'Pickup time', 'text', true, { example: 'tomorrow 6am' }),
    ],
    keywords: ['cab', 'taxi', 'ola', 'uber', 'ride', 'airport drop', 'airport pickup', 'outstation cab'],
    examples: ['a cab to the airport at 6am'],
    priceHint: { min: 150, max: 4500, unit: 'per_trip' },
    transactable: true,
  },
  {
    slug: 'driver_hire',
    name: 'Driver on hire',
    vertical: 'personal_service',
    description: 'A driver for your own car, by the hour or day.',
    providerRole: 'Driver',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'licensed_service',
    licenceType: 'Commercial driving licence',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true, { example: '6' }),
      where,
    ],
    optionalAttributes: [attr('vehicle_type', 'Your vehicle', 'text', false)],
    keywords: ['driver', 'chauffeur', 'driving service', 'driver for my car'],
    examples: ['a driver for 6 hours'],
    priceHint: { min: 250, max: 600, unit: 'per_hour' },
    transactable: true,
  },

  // --------------------------------------------------------------- food
  {
    slug: 'food_delivery',
    name: 'Food delivery',
    vertical: 'food',
    description: 'Restaurant or cloud-kitchen food delivered to you.',
    providerRole: 'Restaurant / cloud kitchen + delivery partner',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'licensed_goods',
    licenceType: 'FSSAI licence',
    requiredAttributes: [
      attr('dish', 'What do you want to eat?', 'text', true, { example: 'chicken biryani' }),
      where,
    ],
    optionalAttributes: [
      attr('quantity', 'How many portions?', 'number', false),
      attr('spice_level', 'Spice level', 'enum', false, { options: ['mild', 'medium', 'hot'] }),
    ],
    keywords: ['food', 'biryani', 'pizza', 'burger', 'restaurant', 'lunch', 'dinner', 'breakfast', 'dosa', 'thali', 'meal', 'cake'],
    examples: ['biryani for two', 'a pizza'],
    priceHint: { min: 120, max: 1500, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'home_cooking',
    name: 'Cook at home',
    vertical: 'personal_service',
    description: 'A cook comes to your kitchen and prepares meals.',
    providerRole: 'Home cook / chef',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'licensed_service',
    licenceType: 'FSSAI registration (food handler)',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true, { example: '3' }),
      attr('cuisine', 'What cuisine / dishes?', 'text', true, { example: 'South Indian lunch for 4' }),
      where,
    ],
    keywords: ['cook', 'chef', 'home cook', 'cooking', 'make food at home'],
    examples: ['a cook for 3 hours'],
    priceHint: { min: 300, max: 900, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'event_catering',
    name: 'Catering',
    vertical: 'food',
    description: 'Bulk food for parties, weddings and office events.',
    providerRole: 'Caterer',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'licensed_goods',
    licenceType: 'FSSAI licence',
    requiredAttributes: [
      attr('guests', 'How many guests?', 'number', true, { example: '50' }),
      attr('menu', 'Menu preference', 'text', true, { example: 'North Indian vegetarian' }),
      when,
    ],
    keywords: ['catering', 'caterer', 'party food', 'wedding food', 'buffet', 'bulk food'],
    examples: ['catering for 50 guests'],
    priceHint: { min: 350, max: 1800, unit: 'per_item' },
    transactable: true,
  },

  // ------------------------------------------------------- household help
  {
    slug: 'house_cleaning',
    name: 'Home cleaning',
    vertical: 'home_service',
    description: 'Deep clean, regular clean, bathroom/kitchen cleaning.',
    providerRole: 'Cleaner',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true, { example: '2' }),
      attr('scope', 'What should be cleaned?', 'text', true, { example: '2BHK deep clean' }),
      where,
    ],
    keywords: ['cleaning', 'cleaner', 'cleaned', 'deep clean', 'deep cleaned', 'bathroom cleaning', 'bathroom clean', 'kitchen cleaning', 'housekeeping', 'maid', 'clean my house'],
    examples: ['a 2BHK deep clean'],
    priceHint: { min: 200, max: 500, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'gardening',
    name: 'Gardening',
    vertical: 'home_service',
    description: 'Lawn mowing, pruning, potting, landscaping.',
    providerRole: 'Gardener',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true, { example: '2' }),
      attr('work', 'What needs doing?', 'text', true, { example: 'mow the lawn and trim hedges' }),
      where,
    ],
    keywords: ['gardening', 'gardener', 'lawn', 'mowing', 'hedge', 'landscaping', 'plants'],
    examples: ['lawn mowing'],
    priceHint: { min: 200, max: 450, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'general_labour',
    name: 'General labour / helpers',
    vertical: 'personal_service',
    description: 'Loading, unloading, shifting, packing, extra hands for a job.',
    providerRole: 'Labourer / helper',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true, { example: '4' }),
      attr('work', 'What is the work?', 'text', true, { example: 'shift furniture to the 3rd floor' }),
      where,
    ],
    keywords: ['labour', 'labor', 'worker', 'helpers', 'helper', 'loading', 'unloading', 'shifting', 'shifting furniture', 'moving furniture', 'mover', 'packers', 'extra hands', 'hire helpers'],
    examples: ['2 helpers for 4 hours'],
    priceHint: { min: 120, max: 300, unit: 'per_hour' },
    legalNote:
      'Platform floor applies: no booking below the configured minimum hourly rate, and no child labour.',
    transactable: true,
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    vertical: 'home_service',
    description: 'Leaks, taps, pipes, drains, bathroom fittings.',
    providerRole: 'Plumber',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('issue', 'What is the problem?', 'text', true, { example: 'kitchen sink leaking' }),
      where,
    ],
    keywords: ['plumber', 'plumbing', 'leak', 'leaking', 'leaky', 'tap', 'pipe', 'drain', 'flush', 'geyser', 'sink', 'water leak'],
    examples: ['fix a leaking tap'],
    priceHint: { min: 250, max: 700, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'electrical',
    name: 'Electrical work',
    vertical: 'home_service',
    description: 'Switches, wiring, fan/light installation, inverter.',
    providerRole: 'Electrician',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('issue', 'What needs fixing?', 'text', true, { example: 'install a ceiling fan' }),
      where,
    ],
    keywords: ['electrician', 'electrical', 'wiring', 'switchboard', 'fan installation', 'light fitting', 'inverter'],
    examples: ['install two ceiling fans'],
    priceHint: { min: 300, max: 800, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'appliance_repair',
    name: 'Appliance repair',
    vertical: 'home_service',
    description: 'Washing machine, fridge, AC, microwave, oven.',
    providerRole: 'Appliance technician',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'none',
    requiredAttributes: [
      attr('appliance', 'Which appliance?', 'text', true, { example: 'Samsung washing machine' }),
      attr('issue', 'What is wrong?', 'text', true, { example: 'not draining water' }),
      where,
    ],
    keywords: ['appliance repair', 'washing machine', 'fridge', 'refrigerator', 'ac repair', 'microwave', 'oven repair'],
    examples: ['fix a washing machine'],
    priceHint: { min: 400, max: 3500, unit: 'per_job' },
    transactable: true,
  },
  {
    slug: 'carpentry',
    name: 'Carpentry',
    vertical: 'home_service',
    description: 'Furniture repair, doors, wardrobes, custom woodwork.',
    providerRole: 'Carpenter',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'none',
    requiredAttributes: [
      attr('work', 'What woodwork is needed?', 'text', true, { example: 'repair a wardrobe door' }),
      where,
    ],
    keywords: ['carpenter', 'carpentry', 'furniture repair', 'door repair', 'woodwork'],
    examples: ['repair a wardrobe'],
    priceHint: { min: 500, max: 5000, unit: 'per_job' },
    transactable: true,
  },
  {
    slug: 'painting',
    name: 'Painting',
    vertical: 'home_service',
    description: 'Interior/exterior wall painting.',
    providerRole: 'Painter',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'none',
    requiredAttributes: [
      attr('scope', 'What should be painted?', 'text', true, { example: '2BHK interior' }),
      where,
    ],
    keywords: ['painter', 'painting', 'wall painting', 'paint walls', 'repaint'],
    examples: ['paint a 2BHK'],
    priceHint: { min: 3000, max: 40000, unit: 'per_job' },
    transactable: true,
  },
  {
    slug: 'pest_control',
    name: 'Pest control',
    vertical: 'home_service',
    description: 'Cockroaches, termites, rodents, fumigation.',
    providerRole: 'Pest control technician',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'licensed_service',
    licenceType: 'Pesticide applicator licence',
    requiredAttributes: [
      attr('pest', 'Which pest?', 'text', true, { example: 'cockroaches' }),
      where,
    ],
    keywords: ['pest control', 'termite', 'cockroach', 'rodent', 'fumigation', 'bed bugs'],
    examples: ['cockroach treatment'],
    priceHint: { min: 800, max: 6000, unit: 'per_job' },
    transactable: true,
  },
  {
    slug: 'courier_delivery',
    name: 'Courier / delivery',
    vertical: 'delivery',
    description: 'Send a parcel, documents or keys across the city.',
    providerRole: 'Delivery partner',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('pickup', 'Pickup address', 'text', true),
      attr('drop', 'Drop address', 'text', true),
      attr('item', 'What is being sent?', 'text', true, { example: 'sealed envelope' }),
    ],
    keywords: ['delivery boy', 'courier', 'parcel', 'send package', 'document delivery', 'pickup and drop'],
    examples: ['send documents to Whitefield'],
    priceHint: { min: 80, max: 600, unit: 'per_trip' },
    transactable: true,
  },
  {
    slug: 'car_wash',
    name: 'Car / bike wash',
    vertical: 'home_service',
    description: 'Wash and detailing at your doorstep.',
    providerRole: 'Detailing technician',
    fulfillment: 'onsite',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('vehicle', 'Which vehicle?', 'text', true, { example: 'Swift Dzire' }),
      where,
    ],
    keywords: ['car wash', 'bike wash', 'car detailing', 'car cleaning'],
    examples: ['a full car wash'],
    priceHint: { min: 300, max: 3000, unit: 'per_item' },
    transactable: true,
  },

  // ------------------------------------------------------------ personal
  {
    slug: 'beauty_at_home',
    name: 'Salon & beauty at home',
    vertical: 'personal_service',
    description: 'Haircut, facial, manicure, grooming at home.',
    providerRole: 'Beautician / barber',
    fulfillment: 'onsite',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('service', 'Which service?', 'text', true, { example: 'haircut and beard trim' }),
      when,
      where,
    ],
    keywords: ['salon at home', 'haircut', 'beautician', 'facial', 'manicure', 'pedicure', 'barber', 'grooming'],
    examples: ['a haircut at home'],
    priceHint: { min: 300, max: 3000, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'fitness_trainer',
    name: 'Fitness & yoga trainer',
    vertical: 'personal_service',
    description: 'Personal trainer or yoga instructor at home or online.',
    providerRole: 'Trainer / instructor',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('goal', 'What is your goal?', 'text', true, { example: 'weight loss, 3 sessions a week' }),
      where,
    ],
    keywords: ['personal trainer', 'gym trainer', 'fitness coach', 'yoga instructor', 'yoga'],
    examples: ['a yoga instructor 3x a week'],
    priceHint: { min: 400, max: 1500, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'tutoring',
    name: 'Tutoring',
    vertical: 'professional',
    description: 'Home or online tutor for school, competitive exams, languages.',
    providerRole: 'Tutor',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'none',
    requiredAttributes: [
      attr('subject', 'Which subject / exam?', 'text', true, { example: 'Class 10 maths' }),
      where,
    ],
    keywords: ['tutor', 'tuition', 'maths tutor', 'home tutor', 'teacher', 'coaching'],
    examples: ['a maths tutor for class 10'],
    priceHint: { min: 300, max: 1200, unit: 'per_hour' },
    transactable: true,
  },
  {
    slug: 'pet_care',
    name: 'Pet care',
    vertical: 'personal_service',
    description: 'Dog walking, grooming, pet sitting.',
    providerRole: 'Pet handler / groomer',
    fulfillment: 'onsite',
    pricing: 'per_unit',
    compliance: 'none',
    requiredAttributes: [
      attr('service', 'What does your pet need?', 'text', true, { example: 'grooming for a golden retriever' }),
      where,
    ],
    keywords: ['dog walker', 'pet grooming', 'pet sitting', 'dog grooming', 'pet care'],
    examples: ['dog grooming at home'],
    priceHint: { min: 300, max: 2500, unit: 'per_item' },
    transactable: true,
  },
  {
    slug: 'photography',
    name: 'Photography',
    vertical: 'professional',
    description: 'Events, portraits, product shoots, videography.',
    providerRole: 'Photographer',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'none',
    requiredAttributes: [
      attr('shoot', 'What is the shoot?', 'text', true, { example: 'birthday party, 3 hours' }),
      when,
      where,
    ],
    keywords: ['photographer', 'photography', 'photoshoot', 'videographer', 'wedding photographer'],
    examples: ['a birthday party photographer'],
    priceHint: { min: 2000, max: 60000, unit: 'per_job' },
    transactable: true,
  },

  // --------------------------------------------------- gated / regulated
  {
    slug: 'alcohol_delivery',
    name: 'Alcohol delivery',
    vertical: 'goods',
    description: 'Beer, wine and spirits — only through an excise-licensed vendor.',
    providerRole: 'Licensed wine shop / excise-licensed retailer',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'age_gated',
    minAge: 21,
    licenceType: 'Karnataka excise licence (CL-4/CL-5 or equivalent)',
    requiredAttributes: [
      attr('items', 'What would you like?', 'text', true, { example: 'two bottles of beer' }),
      where,
    ],
    keywords: ['beer', 'beers', 'wine', 'wines', 'whisky', 'whiskey', 'vodka', 'rum', 'liquor', 'alcohol', 'booze'],
    examples: ['a bottle of wine'],
    priceHint: { min: 150, max: 6000, unit: 'per_item' },
    legalNote:
      'Karnataka legal drinking age is 21. Delivery must come from an excise-licensed retailer, within permitted hours. Not enabled in this pilot because no licensed partner is integrated.',
    transactable: false,
  },
  {
    slug: 'tobacco_delivery',
    name: 'Tobacco / vape',
    vertical: 'goods',
    description: 'Cigarettes and tobacco products — licensed retailers only, 21+.',
    providerRole: 'Licensed tobacco retailer',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'age_gated',
    minAge: 21,
    licenceType: 'Tobacco retail licence',
    requiredAttributes: [
      attr('items', 'What would you like?', 'text', true),
      where,
    ],
    keywords: ['cigarette', 'cigarettes', 'cigar', 'vape', 'e-cigarette', 'tobacco', 'gutka', 'smoking'],
    examples: ['a pack of cigarettes'],
    priceHint: { min: 50, max: 1000, unit: 'per_item' },
    legalNote: 'Sale to under-21s is prohibited; vapes are banned in India.',
    transactable: false,
  },
  {
    slug: 'pharmacy',
    name: 'Pharmacy / medicines',
    vertical: 'goods',
    description: 'Prescription and OTC medicines via a licensed pharmacy.',
    providerRole: 'Licensed pharmacist',
    fulfillment: 'delivery',
    pricing: 'per_unit',
    compliance: 'licensed_goods',
    licenceType: 'Drug licence (Form 20/21) + prescription verification',
    requiredAttributes: [
      attr('items', 'Which medicines?', 'text', true),
      attr('prescription_uploaded', 'Is a valid prescription uploaded?', 'boolean', true),
      where,
    ],
    keywords: ['medicine', 'medicines', 'tablet', 'prescription', 'pharmacy', 'chemist', 'insulin'],
    examples: ['my monthly prescription'],
    priceHint: { min: 50, max: 5000, unit: 'per_item' },
    legalNote:
      'Schedule H drugs require a valid prescription and a licensed pharmacy. Not enabled in this pilot.',
    transactable: false,
  },
  {
    slug: 'security_guard',
    name: 'Security guard / bouncer',
    vertical: 'personal_service',
    description: 'Event security, bouncers, residential guards.',
    providerRole: 'Licensed security agency',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'licensed_service',
    licenceType: 'PSARA licence',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true),
      attr('purpose', 'What is the purpose?', 'text', true),
      where,
    ],
    keywords: ['bodyguard', 'bouncer', 'security guard', 'security agency'],
    examples: ['event security for 6 hours'],
    priceHint: { min: 800, max: 5000, unit: 'per_hour' },
    legalNote: 'Only PSARA-licensed agencies may supply security personnel.',
    transactable: false,
  },
  {
    slug: 'healthcare',
    name: 'Healthcare at home',
    vertical: 'professional',
    description: 'Doctor visit, nurse, physiotherapy, sample collection.',
    providerRole: 'Licensed clinician',
    fulfillment: 'onsite',
    pricing: 'quote',
    compliance: 'licensed_service',
    licenceType: 'Medical registration + clinic affiliation',
    requiredAttributes: [
      attr('need', 'What care is needed?', 'text', true),
      where,
    ],
    keywords: ['doctor', 'nurse', 'physiotherapy', 'physiotherapist', 'home visit doctor', 'sample collection'],
    examples: ['a physiotherapist at home'],
    priceHint: { min: 800, max: 5000, unit: 'per_job' },
    legalNote: 'Clinical services require medical registration and clinical governance. Not enabled in this pilot.',
    transactable: false,
  },
  {
    slug: 'childcare',
    name: 'Childcare / babysitting',
    vertical: 'personal_service',
    description: 'Babysitting and nanny services with enhanced background checks.',
    providerRole: 'Verified caregiver',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'licensed_service',
    licenceType: 'Enhanced background check + reference verification',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true),
      attr('child_age', 'Child age', 'number', true),
      where,
    ],
    keywords: ['babysitter', 'babysitting', 'nanny', 'child care'],
    examples: ['a babysitter for 4 hours'],
    priceHint: { min: 250, max: 700, unit: 'per_hour' },
    legalNote: 'Requires enhanced background checks and child-safety policy. Not enabled in this pilot.',
    transactable: false,
  },
  {
    slug: 'elder_care',
    name: 'Elder care',
    vertical: 'personal_service',
    description: 'Attendants and companions for elderly family members.',
    providerRole: 'Caregiver',
    fulfillment: 'onsite',
    pricing: 'hourly',
    compliance: 'licensed_service',
    licenceType: 'Caregiver training + background check',
    requiredAttributes: [
      attr('hours', 'How many hours?', 'number', true),
      attr('needs', 'What support is needed?', 'text', true),
      where,
    ],
    keywords: ['elder care', 'caregiver', 'attendant for parents', 'old age care'],
    examples: ['a caregiver for my father'],
    priceHint: { min: 200, max: 600, unit: 'per_hour' },
    transactable: true,
  },

  // -------------------------------------------------------------- planning
  {
    slug: 'trip_planning',
    name: 'Trip planning',
    vertical: 'planning',
    description: 'Itinerary planning only — not a booking.',
    providerRole: 'Travel planner',
    fulfillment: 'remote',
    pricing: 'quote',
    compliance: 'none',
    requiredAttributes: [
      attr('dates', 'Travel dates', 'text', true),
      attr('budget', 'Budget (INR)', 'number', true),
      attr('interests', 'Interests', 'text', true),
    ],
    keywords: ['trip', 'travel plan', 'itinerary', 'holiday plan', 'vacation plan'],
    examples: ['a 5-day Kerala itinerary'],
    priceHint: { min: 0, max: 5000, unit: 'per_job' },
    transactable: false,
    legalNote: 'Planning only — this is a suggestion, not a booking. It does not reserve flights, hotels or transport.',
  },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryDefinition | undefined {
  return BY_SLUG.get(slug);
}

export function listCategories(includeNonTransactable = true): CategoryDefinition[] {
  return includeNonTransactable
    ? CATEGORIES
    : CATEGORIES.filter((c) => c.transactable);
}

export interface Resolution {
  category: CategoryDefinition | null;
  confidence: number;
  matchedKeywords: string[];
  alternatives: CategoryDefinition[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hits(text: string, keyword: string): boolean {
  const pattern = escapeRegExp(keyword).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, 'i').test(text);
}

/**
 * Deterministic intent resolver. Works without an LLM, so the platform keeps
 * working when the AI provider is disabled or returns garbage.
 */
export function resolveCategory(text: string): Resolution {
  const normalized = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')} `;

  const scored = CATEGORIES.map((category) => {
    const matched = category.keywords.filter((k) => hits(normalized, k));
    const score = matched.reduce((sum, k) => sum + Math.min(k.length, 24) + (k.includes(' ') ? 8 : 0), 0);
    const longest = matched.reduce((max, k) => Math.max(max, k.length), 0);
    return { category, matched, score, longest };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.longest - a.longest || a.category.slug.localeCompare(b.category.slug));

  if (scored.length === 0) {
    return { category: null, confidence: 0, matchedKeywords: [], alternatives: [] };
  }

  const top = scored[0];
  return {
    category: top.category,
    confidence: Math.min(1, Math.round((top.score / 30) * 100) / 100),
    matchedKeywords: top.matched,
    alternatives: scored.slice(1, 4).map((s) => s.category),
  };
}

export function categoryToJson(category: CategoryDefinition) {
  return {
    slug: category.slug,
    name: category.name,
    vertical: category.vertical,
    description: category.description,
    provider_role: category.providerRole,
    fulfillment: category.fulfillment,
    pricing: category.pricing,
    compliance: category.compliance,
    min_age: category.minAge ?? null,
    licence_type: category.licenceType ?? null,
    required_attributes: category.requiredAttributes,
    optional_attributes: category.optionalAttributes ?? [],
    examples: category.examples,
    price_hint: category.priceHint,
    transactable: category.transactable,
    legal_note: category.legalNote ?? null,
  };
}
