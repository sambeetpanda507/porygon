// apps/web — Phase 6's static practice-mode scenario prompts. Plain data
// in-repo, no DB or CMS: each prompt pairs a classic interview question
// with a self-review checklist and an existing simulator scenario preset
// to run the finished design against.
import type { ScenarioPrompt } from "@p0rygon/simulator";

export const SCENARIO_PROMPTS: readonly ScenarioPrompt[] = [
  {
    id: "url-shortener",
    title: "Design a URL Shortener",
    description:
      "Design a service that takes a long URL and returns a short, unique redirect link — think bit.ly.",
    checklist: [
      "Scalability: can it handle a sudden spike in redirect traffic for a viral link?",
      "Consistency: is it OK for a newly created short link to take a moment to become readable everywhere?",
      "Availability: what happens to redirects if the database powering lookups goes down?",
      "Cost: are you storing/serving redirects efficiently, or paying for capacity you don't need?",
    ],
    scenarioId: "steady-baseline",
  },
  {
    id: "rate-limiter",
    title: "Design a Rate Limiter",
    description:
      "Design a service that limits how many requests a client can make in a given time window.",
    checklist: [
      "Scalability: does the limiting logic work correctly across multiple server instances, not just one?",
      "Consistency: how tolerant are you of a client briefly exceeding the limit during a race condition?",
      "Availability: if the rate limiter itself is down, do you fail open (allow traffic) or fail closed (block it)?",
      "Cost: how much state are you storing per client, and does it grow unbounded?",
    ],
    scenarioId: "black-friday-spike",
  },
  {
    id: "chat-app",
    title: "Design a Chat Application",
    description: "Design a real-time one-to-one and group messaging system.",
    checklist: [
      "Scalability: can it support many concurrent open connections, not just many requests per second?",
      "Consistency: do messages need to arrive in the same order for every participant?",
      "Availability: what happens to in-flight messages if a user's connection drops mid-conversation?",
      "Cost: are idle open connections (even ones sending nothing) cheap to hold, or expensive?",
    ],
    scenarioId: "steady-baseline",
  },
  {
    id: "news-feed",
    title: "Design a News Feed",
    description: "Design a social feed that aggregates and ranks posts from people a user follows.",
    checklist: [
      "Scalability: does feed generation stay fast as a user follows thousands of accounts?",
      "Consistency: is it acceptable for a just-posted update to take a few seconds to appear in followers' feeds?",
      "Availability: if the ranking service is slow or down, can you still show something (even unranked)?",
      "Cost: are you precomputing feeds for every user, or computing on read — and what does each cost at scale?",
    ],
    scenarioId: "gradual-ramp",
  },
  {
    id: "ride-dispatch",
    title: "Design a Ride-Sharing Dispatch System",
    description: "Design the system that matches riders with nearby available drivers in real time.",
    checklist: [
      "Scalability: can matching stay fast in a dense city during a demand spike (e.g. a big event ending)?",
      "Consistency: can two riders ever get matched to the same driver, and how do you prevent it?",
      "Availability: what happens to an in-progress ride if the dispatch service itself fails over?",
      "Cost: how often are you updating driver locations, and is that update rate justified by the UX gain?",
    ],
    scenarioId: "black-friday-spike",
  },
];
