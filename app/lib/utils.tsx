import {
  Search,
  MapPin,
  Calendar,
  Clock,
  User,
  List,
  Map as MapIcon,
  X,
  Tent,
  Sun,
  TreePine,
  DollarSign,
  ChevronDown,
  Sparkles,
  Users,
  SlidersHorizontal,
  Heart,
  ClipboardList,
  Printer,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";

// Category styles
const categoryStyles: Record<
  string,
  { icon: string; bg: string; text: string; border: string }
> = {
  "Active Games": {
    icon: "run",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  Art: {
    icon: "palette",
    bg: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-200",
  },
  Cooking: {
    icon: "chef",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Dance: {
    icon: "music",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  Drama: {
    icon: "theater",
    bg: "bg-rose-100",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  "Horseback Riding": {
    icon: "horse",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  Inclusion: {
    icon: "heart",
    bg: "bg-teal-100",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  "Multi-Activity": {
    icon: "star",
    bg: "bg-camp-sun-light",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Nature: {
    icon: "leaf",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  Science: {
    icon: "beaker",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  Sports: {
    icon: "ball",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
  STEM: {
    icon: "robot",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  Teen: {
    icon: "users",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  "Water Activities": {
    icon: "wave",
    bg: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
};

export function getCategoryStyle(category: string) {
  return (
    categoryStyles[category] || {
      icon: "star",
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
    }
  );
}

// Format time in 12-hour format with am/pm
export function formatTime(time: { hour: number; minute: number }): string {
  const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
  const period = time.hour >= 12 ? "pm" : "am";
  const minutes = time.minute.toString().padStart(2, "0");
  return `${hour12}:${minutes}${period}`;
}

// Icon wrapper components for consistent sizing
export const Icons = {
  search: <Search className="w-5 h-5" strokeWidth={2} />,
  location: <MapPin className="w-4 h-4" strokeWidth={2} />,
  calendar: <Calendar className="w-4 h-4" strokeWidth={2} />,
  clock: <Clock className="w-4 h-4" strokeWidth={2} />,
  user: <User className="w-4 h-4" strokeWidth={2} />,
  users: <Users className="w-4 h-4" strokeWidth={2} />,
  list: <List className="w-5 h-5" strokeWidth={2} />,
  map: <MapIcon className="w-5 h-5" strokeWidth={2} />,
  x: <X className="w-4 h-4" strokeWidth={2} />,
  tent: <Tent className="w-8 h-8" strokeWidth={1.5} />,
  sun: (
    <Sun className="w-6 h-6 text-camp-sun" fill="currentColor" strokeWidth={0} />
  ),
  tree: <TreePine className="w-5 h-5 text-camp-forest" />,
  dollar: <DollarSign className="w-4 h-4" strokeWidth={2} />,
  chevronDown: <ChevronDown className="w-4 h-4" strokeWidth={2} />,
  sparkles: (
    <Sparkles className="w-5 h-5" fill="currentColor" strokeWidth={0} />
  ),
  filter: <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />,
  heart: <Heart className="w-5 h-5" strokeWidth={2} />,
  heartFilled: (
    <Heart className="w-5 h-5" fill="currentColor" strokeWidth={0} />
  ),
  planner: <ClipboardList className="w-5 h-5" strokeWidth={2} />,
  printer: <Printer className="w-5 h-5" strokeWidth={2} />,
  check: <Check className="w-4 h-4" strokeWidth={2} />,
  alert: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
  download: <Download className="w-5 h-5" strokeWidth={2} />,
};
