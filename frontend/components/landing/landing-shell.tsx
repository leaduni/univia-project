"use client";

import dynamic from "next/dynamic";

import { LandingNav } from "./landing-nav";
import { HeroSection } from "./hero-section";
import { useReveal } from "./use-landing-fx";

// Secciones debajo del primer pliegue: se cargan de forma diferida con
// next/dynamic para dividir el bundle inicial de la portada. `useReveal` sondea
// con un setInterval, así que los [data-reveal] montados después se detectan
// igual. Se mantienen los mismos componentes/clases: la apariencia es idéntica.
const QuoteSection = dynamic(() => import("./hero-section").then((m) => m.QuoteSection));
const PlatformSection = dynamic(() => import("./platform-section").then((m) => m.PlatformSection));
const CoursesSection = dynamic(() => import("./courses-section").then((m) => m.CoursesSection));
const IaSection = dynamic(() => import("./ia-section").then((m) => m.IaSection));
const WhyUniviaSection = dynamic(() => import("./why-univia-section").then((m) => m.WhyUniviaSection));
const TeamSection = dynamic(() => import("./why-univia-section").then((m) => m.TeamSection));
const FinalCtaSection = dynamic(() => import("./final-cta-section").then((m) => m.FinalCtaSection));
const LandingFooter = dynamic(() => import("./final-cta-section").then((m) => m.LandingFooter));

export function LandingShell() {
  useReveal();

  return (
    <div className="univia-landing">
      <LandingNav />
      <main>
        <HeroSection />
        <QuoteSection />
        <PlatformSection />
        <CoursesSection />
        <IaSection />
        <WhyUniviaSection />
        <TeamSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
