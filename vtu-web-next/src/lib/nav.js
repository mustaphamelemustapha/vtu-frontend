import { BarChart3, CircleDollarSign, Clock3, Gauge, Gift, Package2, UserCircle2 } from 'lucide-react';

export const appNav = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge },
  { label: 'Buy Data', href: '/buy-data', icon: Package2 },
  { label: 'Wallet', href: '/wallet', icon: CircleDollarSign },
  { label: 'History', href: '/history', icon: Clock3 },
  { label: 'Profile', href: '/profile', icon: UserCircle2 },
];

export const quickActions = [
  { label: 'Buy Data', href: '/buy-data', icon: Package2 },
  { label: 'Fund Wallet', href: '/wallet', icon: CircleDollarSign },
  { label: 'View History', href: '/history', icon: BarChart3 },
  { label: 'Referrals', href: '/profile#referrals', icon: Gift },
  { label: 'Profile', href: '/profile', icon: UserCircle2 },
];
