export interface SafetyFactor {
  name: string;
  weight: number;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface SafetyScoreResult {
  score: number;
  label: 'Safe' | 'Good' | 'Caution' | 'Elevated Risk';
  factors: SafetyFactor[];
  confidence: number;
  timestamp: string;
}

export function calculateSafetyScore(
  incidentCount: number,
  timeOfHours: number = new Date().getHours(),
  emergencyServicesNearby: number = 3
): SafetyScoreResult {
  let baseScore = 100;

  // Incident Density Penalty (Max -40 points)
  const incidentPenalty = Math.min(incidentCount * 8, 40);

  // Time-of-Day Penalty (Nighttime 10 PM - 5 AM drops score up to -20 points)
  let timePenalty = 0;
  if (timeOfHours >= 22 || timeOfHours <= 5) {
    timePenalty = 20;
  } else if (timeOfHours >= 18 || timeOfHours === 6) {
    timePenalty = 10;
  }

  // Emergency Services Nearby Boost (Max +15 points)
  const serviceBoost = Math.min(emergencyServicesNearby * 5, 15);

  const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - incidentPenalty - timePenalty + serviceBoost)));

  let label: SafetyScoreResult['label'] = 'Safe';
  if (finalScore < 40) label = 'Elevated Risk';
  else if (finalScore < 70) label = 'Caution';
  else if (finalScore < 85) label = 'Good';

  return {
    score: finalScore,
    label,
    confidence: 0.94,
    timestamp: new Date().toISOString(),
    factors: [
      {
        name: 'Recent Community Reports',
        weight: 0.4,
        score: Math.max(0, 100 - incidentPenalty * 2.5),
        impact: incidentCount > 2 ? 'negative' : 'positive',
        description: `${incidentCount} active reports in a 2km radius over 48h.`,
      },
      {
        name: 'Lighting & Time Index',
        weight: 0.3,
        score: Math.max(0, 100 - timePenalty * 5),
        impact: timePenalty > 10 ? 'negative' : 'neutral',
        description: timePenalty > 10 ? 'Reduced natural light during night hours.' : 'Daylight conditions active.',
      },
      {
        name: 'Emergency Infrastructure',
        weight: 0.3,
        score: Math.min(100, serviceBoost * 6.6),
        impact: serviceBoost > 5 ? 'positive' : 'neutral',
        description: `${emergencyServicesNearby} verified police/medical hubs in your vicinity.`,
      },
    ],
  };
}