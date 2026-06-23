import { Injectable, Logger } from '@nestjs/common';
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';
import { AppConfigService } from '../config/app-config.service';
import Redis from 'ioredis';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly mapsClient: GoogleMapsClient;
  private readonly redis: Redis;

  constructor(private readonly config: AppConfigService) {
    this.mapsClient = new GoogleMapsClient({});
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed. Ensure Redis is running.');
          process.exit(1);
        }
        return Math.min(times * 50, 2000);
      },
    });
  }

  async geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = `geocode:${address.toLowerCase().replace(/\s+/g, '')}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`Geocode Cache HIT for ${address}`);
      return JSON.parse(cached);
    }

    if (!this.config.googleGeocodingApiKey) {
      this.logger.warn('Google Geocoding API Key is missing. Skipping geocode.');
      return null;
    }

    try {
      this.logger.debug(`Geocode Cache MISS for ${address}`);
      const response = await this.mapsClient.geocode({
        params: {
          address,
          key: this.config.googleGeocodingApiKey,
        },
      });

      if (response.data.results.length > 0 && response.data.results[0]) {
        const location = response.data.results[0].geometry.location;
        const result = { lat: location.lat, lng: location.lng };
        
        // Cache for 30 days (address coordinates rarely change)
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30 * 24 * 60 * 60);
        return result;
      }
      return null;
    } catch (e) {
      this.logger.error('Geocoding failed', e);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const latFix = lat.toFixed(4);
    const lngFix = lng.toFixed(4);
    const cacheKey = `reverseGeocode:${latFix},${lngFix}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`Reverse Geocode Cache HIT`);
      return cached;
    }

    if (!this.config.googleGeocodingApiKey) {
      this.logger.warn('Google Geocoding API Key missing for reverse geocode');
      return null;
    }

    try {
      this.logger.debug(`Reverse Geocode Cache MISS`);
      const response = await this.mapsClient.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: this.config.googleGeocodingApiKey,
        },
      });

      if (response.data.results.length > 0) {
        const address = response.data.results[0]?.formatted_address;
        if (address) {
        await this.redis.set(cacheKey, address, 'EX', 30 * 24 * 60 * 60);
          return address;
        }
      }
      return null;
    } catch (e) {
      this.logger.error('Reverse Geocoding failed', e);
      return null;
    }
  }

  async getDistanceAndDuration(
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
    
    // Round to 3 decimal places (~100m grid) to group nearby requests
    const oLat = originLat.toFixed(3);
    const oLng = originLng.toFixed(3);
    const dLat = destLat.toFixed(3);
    const dLng = destLng.toFixed(3);
    
    const cacheKey = `distance:${oLat},${oLng}:${dLat},${dLng}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`Distance Cache HIT`);
      return JSON.parse(cached);
    }

    if (!this.config.googleDistanceMatrixApiKey) {
      this.logger.warn('Google Distance Matrix API Key is missing. Skipping distance matrix.');
      return null;
    }

    try {
      this.logger.debug(`Distance Cache MISS`);
      const response = await this.mapsClient.distancematrix({
        params: {
          origins: [{ lat: originLat, lng: originLng }],
          destinations: [{ lat: destLat, lng: destLng }],
          key: this.config.googleDistanceMatrixApiKey,
        },
      });

      if (response.data.rows[0]?.elements[0]?.status === 'OK') {
        const element = response.data.rows[0].elements[0];
        const result = {
          distanceMeters: element.distance.value,
          durationSeconds: element.duration.value,
        };
        
        // Cache for 24 hours
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 24 * 60 * 60);
        return result;
      }
      return null;
    } catch (e) {
      this.logger.error('Distance matrix failed', e);
      return null;
    }
  }

  async getRoute(
    originLat: number, originLng: number,
    destLat: number, destLng: number
  ): Promise<string | null> {
    const oLat = originLat.toFixed(4);
    const oLng = originLng.toFixed(4);
    const dLat = destLat.toFixed(4);
    const dLng = destLng.toFixed(4);
    const cacheKey = `route:${oLat},${oLng}:${dLat},${dLng}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.debug(`Route Cache HIT`);
      return cached;
    }

    const key = this.config.googleDirectionsApiKey || this.config.googleDistanceMatrixApiKey;
    if (!key) {
      this.logger.warn('Google Directions API Key missing for route');
      return null;
    }

    try {
      this.logger.debug(`Route Cache MISS`);
      const response = await this.mapsClient.directions({
        params: {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: destLat, lng: destLng },
          key: key,
        },
      });

      if (response.data.routes.length > 0) {
        const polyline = response.data.routes[0]?.overview_polyline?.points;
        if (polyline) {
        await this.redis.set(cacheKey, polyline, 'EX', 24 * 60 * 60);
          return polyline;
        }
      }
      return null;
    } catch (e) {
      this.logger.error('Route failed', e);
      return null;
    }
  }
}
