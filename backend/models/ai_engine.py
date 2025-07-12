# ================================
# backend/models/ai_engine.py
# ================================
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from difflib import SequenceMatcher
import re
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class AIQuotationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            lowercase=True,
            analyzer='word'
        )
        self.location_vectors = None
        self.location_names = []
        
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for better matching"""
        if not text:
            return ""
        
        # Remove special characters and normalize
        text = re.sub(r'[^\w\s]', ' ', str(text))
        text = re.sub(r'\s+', ' ', text).strip().upper()
        return text
    
    def calculate_fuzzy_similarity(self, str1: str, str2: str) -> float:
        """Calculate fuzzy similarity between two strings"""
        if not str1 or not str2:
            return 0.0
        
        str1 = self.preprocess_text(str1)
        str2 = self.preprocess_text(str2)
        
        # Exact match
        if str1 == str2:
            return 1.0
        
        # Substring match
        if str1 in str2 or str2 in str1:
            return 0.9
        
        # Sequence matcher
        return SequenceMatcher(None, str1, str2).ratio()
    
    def calculate_semantic_similarity(self, query: str, candidates: List[str]) -> List[float]:
        """Calculate semantic similarity using TF-IDF"""
        try:
            if not candidates:
                return []
            
            # Preprocess all texts
            processed_query = self.preprocess_text(query)
            processed_candidates = [self.preprocess_text(candidate) for candidate in candidates]
            
            # Filter out empty candidates
            valid_candidates = [c for c in processed_candidates if c]
            if not valid_candidates:
                return [0.0] * len(candidates)
            
            # Create corpus
            corpus = [processed_query] + valid_candidates
            
            # Vectorize
            tfidf_matrix = self.vectorizer.fit_transform(corpus)
            
            # Calculate similarity
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            # Map back to original candidates
            result_similarities = []
            valid_idx = 0
            for candidate in processed_candidates:
                if candidate:
                    result_similarities.append(float(similarities[valid_idx]))
                    valid_idx += 1
                else:
                    result_similarities.append(0.0)
            
            return result_similarities
            
        except Exception as e:
            logger.error(f"Error in semantic similarity calculation: {str(e)}")
            return [0.0] * len(candidates)
    
    def match_location(self, query: str, locations: List[str], threshold: float = 0.6) -> List[Tuple[str, float]]:
        """Match a query location against a list of locations"""
        if not query or not locations:
            return []
        
        results = []
        
        # Calculate fuzzy similarities
        fuzzy_scores = [self.calculate_fuzzy_similarity(query, loc) for loc in locations]
        
        # Calculate semantic similarities
        semantic_scores = self.calculate_semantic_similarity(query, locations)
        
        # Combine scores
        for i, location in enumerate(locations):
            fuzzy_score = fuzzy_scores[i] if i < len(fuzzy_scores) else 0.0
            semantic_score = semantic_scores[i] if i < len(semantic_scores) else 0.0
            
            # Weighted combination
            combined_score = (fuzzy_score * 0.7) + (semantic_score * 0.3)
            
            if combined_score >= threshold:
                results.append((location, combined_score))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results
    
    def calculate_route_confidence(self, route_data: Dict) -> float:
        """Calculate AI confidence score for a route"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on data completeness
        if route_data.get('vendor_name'):
            confidence += 0.15
        if route_data.get('vehicle_type'):
            confidence += 0.15
        if route_data.get('rate', 0) > 0:
            confidence += 0.2
        
        # Add some randomness for realistic simulation
        confidence += np.random.normal(0, 0.05)
        
        return min(max(confidence, 0.0), 1.0)
    
    def calculate_savings_potential(self, current_rate: float, market_rates: List[float]) -> float:
        """Calculate potential savings percentage"""
        if not market_rates or current_rate <= 0:
            return 0.0
        
        avg_market_rate = np.mean(market_rates)
        if avg_market_rate <= current_rate:
            return 0.0
        
        savings_percentage = ((avg_market_rate - current_rate) / avg_market_rate) * 100
        return min(savings_percentage, 50.0)  # Cap at 50%
    
    def optimize_quotations(self, quotations: List[Dict]) -> List[Dict]:
        """Optimize and enhance quotations with AI scores"""
        if not quotations:
            return []
        
        # Extract rates for market analysis
        rates = [q.get('rate', 0) for q in quotations if q.get('rate', 0) > 0]
        
        enhanced_quotations = []
        for quotation in quotations:
            enhanced = quotation.copy()
            
            # Add AI confidence score
            enhanced['confidence'] = self.calculate_route_confidence(quotation)
            
            # Add savings potential
            current_rate = quotation.get('rate', 0)
            if current_rate > 0:
                enhanced['savings_potential'] = self.calculate_savings_potential(current_rate, rates)
            else:
                enhanced['savings_potential'] = 0.0
            
            # Add reliability score (simulated)
            enhanced['reliability_score'] = min(
                enhanced['confidence'] + np.random.normal(0, 0.1),
                1.0
            )
            
            enhanced_quotations.append(enhanced)
        
        # Sort by a combination of rate and confidence
        enhanced_quotations.sort(
            key=lambda x: (x.get('rate', float('inf')), -x.get('confidence', 0))
        )
        
        return enhanced_quotations
