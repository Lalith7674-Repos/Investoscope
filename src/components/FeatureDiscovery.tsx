"use client";

import Link from "next/link";
import { Search, Target, HelpCircle, TrendingUp, Bookmark, BarChart3 } from "lucide-react";

export default function FeatureDiscovery() {
  const features = [
    {
      icon: Search,
      title: "Discover",
      desc: "Find investments by your budget",
      href: "/dashboard",
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      icon: Target,
      title: "Goal Mode",
      desc: "Plan for specific goals",
      href: "/dashboard/goal",
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      icon: HelpCircle,
      title: "Quiz",
      desc: "Get personalized matches",
      href: "/dashboard/quiz",
      color: "from-emerald-500/20 to-teal-500/20",
    },
    {
      icon: TrendingUp,
      title: "Charts",
      desc: "View historical performance",
      href: "/dashboard/charts",
      color: "from-amber-500/20 to-orange-500/20",
    },
    {
      icon: Bookmark,
      title: "Saved Items",
      desc: "Bookmark favorites",
      href: "/dashboard/saved",
      color: "from-rose-500/20 to-red-500/20",
    },
    {
      icon: BarChart3,
      title: "Affordable Picks",
      desc: "Curated budget options",
      href: "/dashboard",
      color: "from-indigo-500/20 to-blue-500/20",
    },
    {
      icon: TrendingUp,
      title: "Simulate",
      desc: "Build a custom portfolio",
      href: "/dashboard/portfolio",
      color: "from-sky-500/20 to-violet-500/20",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Link
            key={feature.title}
            href={feature.href}
            className="group relative card p-6 space-y-3 hover:scale-[1.02] transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors border border-blue-500/30">
                  <Icon className="h-5 w-5 text-blue-300" />
                </div>
                <h3 className="font-semibold text-slate-100">{feature.title}</h3>
              </div>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                {feature.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

