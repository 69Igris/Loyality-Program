import React, { useState } from 'react';
import { getLoyaltyInsight } from '../utils/loyaltyLogic';
import { explainFlightChoice } from '../services/api';

function FlightCard({ flight, userState, destination }) {
  const [explanation, setExplanation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate the dynamic message based on points needed vs what flight offers
  const insightText = getLoyaltyInsight(userState.userPoints, flight.pointsReward);

  const handleWhyThisClick = async () => {
    if (explanation) {
      // Toggle off if already showing
      setExplanation(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await explainFlightChoice({
        userPoints: userState.userPoints,
        tier: userState.tier,
        flightPrice: flight.price,
        destination: destination
      });
      setExplanation(result);
    } catch (_err) {
      setError("Unable to load insights at this time.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flight-card">
      <div className="flight-header">
        <h3 className="airline-name">{flight.airline}</h3>
        <span className="flight-price">${flight.price}</span>
      </div>
      
      <div className="insight-box">
        <span className="insight-icon">✨</span>
        <p className="insight-text">{insightText}</p>
      </div>

      {isLoading && (
        <div className="explanation-loading">
          Loading AI insights...
        </div>
      )}

      {error && (
        <div className="explanation-error">
          {error}
        </div>
      )}

      {explanation && !isLoading && !error && (
        <div className="explanation-box">
          <p>{explanation}</p>
        </div>
      )}

      <div className="card-actions">
        <button 
          className="btn-outline btn-why" 
          onClick={handleWhyThisClick}
          disabled={isLoading}
        >
          {isLoading ? 'Thinking...' : explanation ? 'Hide Insight' : 'Why this?'}
        </button>
      </div>
    </div>
  );
}

export default FlightCard;
