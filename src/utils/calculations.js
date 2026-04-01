export function calculateTHI(tempC, humidityPct) {
  return tempC - (0.31 - 0.0031 * humidityPct) * (tempC - 14.4);
}

export function getTHIRisk(thi) {
  if (thi < 72) return { level: 0, label: 'Normal', color: 'green', bg: 'bg-green-500' };
  if (thi < 78) return { level: 1, label: 'Mild Stress', color: 'yellow', bg: 'bg-yellow-500' };
  if (thi < 84) return { level: 2, label: 'Moderate', color: 'orange', bg: 'bg-orange-500' };
  return { level: 3, label: 'Severe', color: 'red', bg: 'bg-red-500' };
}

export function calculateFCR(feedKg, eggCount, avgEggWeightG = 60) {
  const eggMassKg = eggCount * (avgEggWeightG / 1000);
  return eggMassKg > 0 ? feedKg / eggMassKg : 99;
}

export function calculateProfit(eggs, feedKg, eggPrice = 0.12, feedCost = 0.45) {
  return (eggs * eggPrice) - (feedKg * feedCost);
}

export function adjustFeedForHeat(baseFeedKg, tempC) {
  if (tempC <= 28) return baseFeedKg;
  const reduction = Math.min(0.4, 0.03 * (tempC - 28));
  return baseFeedKg * (1 - reduction);
}

export function findOptimalFeed(tempC, humidityPct, flockSize, birdAgeWeeks) {
  const results = [];
  for (let feed = 0.08; feed <= 0.15; feed += 0.002) {
    const heatFactor = tempC > 28 ? Math.max(0.6, 1 - 0.03 * (tempC - 28)) : 1.0;
    const ageFactor = Math.exp(-0.5 * Math.pow((birdAgeWeeks - 30) / 15, 2));
    const eggRate = 0.85 * ageFactor * heatFactor * Math.min(1, 1 - Math.exp(-30 * feed));
    const eggs = eggRate * flockSize;
    const totalFeed = feed * flockSize;
    const revenue = eggs * 0.12;
    const cost = totalFeed * 0.45;
    const profit = revenue - cost;
    const fcr = totalFeed / Math.max(0.1, eggs * 0.06);
    results.push({ feed, eggRate, eggs: Math.round(eggs), totalFeed: +totalFeed.toFixed(1), revenue: +revenue.toFixed(2), cost: +cost.toFixed(2), profit: +profit.toFixed(2), fcr: +fcr.toFixed(3) });
  }
  const optimal = results.reduce((best, c) => (c.profit > best.profit ? c : best));
  return { optimal, allResults: results };
}

export function generateFeedingSchedule(temperature, totalFeed) {
  const windows = [
    { time: '06:00 - 07:00', label: 'Morning Feed', tempForecast: temperature - 6, percentage: 0.33 },
    { time: '11:00 - 12:00', label: 'Midday Feed', tempForecast: temperature + 2, percentage: 0.27 },
    { time: '16:30 - 17:30', label: 'Afternoon Feed', tempForecast: temperature - 2, percentage: 0.40 },
  ];
  return windows.map(w => {
    const amount = +(totalFeed * w.percentage).toFixed(1);
    const isOpt = w.tempForecast < 28;
    return {
      ...w,
      feedAmount: amount,
      status: isOpt ? 'OPTIMAL' : w.tempForecast < 32 ? 'MODERATE' : 'REDUCE',
      statusColor: isOpt ? 'green' : w.tempForecast < 32 ? 'yellow' : 'red',
      note: isOpt ? 'Birds will eat well at this temperature' : `Temp ~${w.tempForecast.toFixed(0)}°C — reduce amount, birds eat less in heat`,
    };
  });
}
