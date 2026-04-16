import {
  type LucideIcon,
  ArrowLeftRight,
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Dog,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Music,
  Phone,
  PiggyBank,
  Plane,
  Receipt,
  RefreshCw,
  Scissors,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Stethoscope,
  Train,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  Ticket,
  CircleQuestionMark,
} from "lucide-react";

// Maps lowercased category name keywords to a Lucide icon.
// Add or update entries here as needed.
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  // Food & Dining
  food: UtensilsCrossed,
  dining: UtensilsCrossed,
  restaurant: UtensilsCrossed,
  restaurants: UtensilsCrossed,
  "fast food": UtensilsCrossed,
  takeout: UtensilsCrossed,
  coffee: Coffee,
  cafe: Coffee,
  "coffee shops": Coffee,
  groceries: ShoppingCart,
  grocery: ShoppingCart,
  supermarket: ShoppingCart,

  // Shopping
  shopping: ShoppingBag,
  clothing: Shirt,
  clothes: Shirt,
  apparel: Shirt,
  electronics: ShoppingBag,
  amazon: ShoppingBag,

  // Transportation
  transportation: Car,
  auto: Car,
  car: Car,
  parking: Car,
  rideshare: Car,
  taxi: Car,
  gas: Fuel,
  fuel: Fuel,
  "public transit": Bus,
  transit: Bus,
  train: Train,
  bus: Bus,

  // Travel
  travel: Plane,
  flights: Plane,
  flight: Plane,
  hotel: Home,
  hotels: Home,
  airbnb: Home,

  // Housing
  rent: Home,
  mortgage: Home,
  housing: Home,
  home: Home,

  // Utilities
  utilities: Zap,
  electric: Zap,
  electricity: Zap,
  water: Zap,
  internet: Wifi,
  phone: Phone,
  "cell phone": Phone,
  cable: Wifi,

  // Health & Fitness
  health: Heart,
  medical: Stethoscope,
  doctor: Stethoscope,
  pharmacy: Stethoscope,
  fitness: Dumbbell,
  gym: Dumbbell,
  sports: Dumbbell,

  // Entertainment
  entertainment: Film,
  movies: Film,
  "movie theater": Film,
  movie: Film,
  streaming: Film,
  music: Music,
  games: Gamepad2,
  gaming: Gamepad2,
  tickets: Ticket,

  // Education
  education: GraduationCap,
  tuition: GraduationCap,
  books: BookOpen,
  courses: BookOpen,

  // Pets
  pets: Dog,
  pet: Dog,
  vet: Dog,

  // Kids & Family
  kids: Baby,
  children: Baby,
  childcare: Baby,
  baby: Baby,

  // Personal Care
  "personal care": Scissors,
  haircut: Scissors,
  salon: Scissors,
  spa: Scissors,
  beauty: Scissors,

  // Insurance
  insurance: Shield,

  // Finance & Transfers
  transfer: ArrowLeftRight,
  transfers: ArrowLeftRight,
  "credit card payment": CreditCard,
  "credit card": CreditCard,
  payment: CreditCard,
  savings: PiggyBank,
  investment: TrendingUp,
  investments: TrendingUp,
  retirement: PiggyBank,
  paycheck: Wallet,
  income: Wallet,
  salary: Wallet,
  wages: Wallet,
  bank: Landmark,
  cash: Banknote,
  withdrawal: Banknote,
  deposit: Banknote,

  // Subscriptions
  subscriptions: RefreshCw,
  subscription: RefreshCw,
  memberships: RefreshCw,

  // Gifts & Charity
  gifts: Gift,
  gift: Gift,
  donations: Gift,
  charity: Gift,

  // Business
  business: Briefcase,
  work: Briefcase,
  office: Briefcase,

  // Home Maintenance
  "home improvement": Wrench,
  repairs: Wrench,
  maintenance: Wrench,

  // Uncategorized
  uncategorized: CircleQuestionMark,
};

export function getCategoryIcon(categoryName: string | null): LucideIcon {
  if (!categoryName) return Receipt;

  const lower = categoryName.toLowerCase();

  if (CATEGORY_ICON_MAP[lower]) return CATEGORY_ICON_MAP[lower];

  // Partial match — check if the category name contains a known keyword
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }

  return Receipt;
}
