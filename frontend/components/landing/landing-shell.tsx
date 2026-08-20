"use client";

import { CoursesSection } from "./courses-section";
import { FinalCtaSection, LandingFooter } from "./final-cta-section";
import { HeroSection, QuoteSection } from "./hero-section";
import { IaSection } from "./ia-section";
import { LandingNav } from "./landing-nav";
import { PlatformSection } from "./platform-section";
import { TeamSection, WhyUniviaSection } from "./why-univia-section";
import { useReveal } from "./use-landing-fx";

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
