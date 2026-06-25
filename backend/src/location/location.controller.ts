import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';

@ApiTags('location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('geocode')
  @ApiOperation({ summary: 'Geocode an address to coordinates' })
  @ApiQuery({ name: 'address', required: true })
  async geocode(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Address is required');
    }
    const result = await this.locationService.geocode(address);
    if (!result) {
      throw new BadRequestException('Could not geocode address');
    }
    return result;
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to address' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      throw new BadRequestException('Invalid coordinates');
    }
    const result = await this.locationService.reverseGeocode(latNum, lngNum);
    if (!result) {
      throw new BadRequestException('Could not reverse geocode coordinates');
    }
    return result;
  }

  @Get('distance')
  @ApiOperation({ summary: 'Calculate distance and ETA between origin and destination' })
  @ApiQuery({ name: 'originLat', required: true, type: Number })
  @ApiQuery({ name: 'originLng', required: true, type: Number })
  @ApiQuery({ name: 'destLat', required: true, type: Number })
  @ApiQuery({ name: 'destLng', required: true, type: Number })
  async getDistance(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const result = await this.locationService.getDistanceAndDuration(oLat, oLng, dLat, dLng);
    if (!result) {
      throw new BadRequestException('Could not calculate distance');
    }
    return result;
  }

  @Get('route')
  @ApiOperation({ summary: 'Get polyline route between two points' })
  @ApiQuery({ name: 'originLat', required: true, type: Number })
  @ApiQuery({ name: 'originLng', required: true, type: Number })
  @ApiQuery({ name: 'destLat', required: true, type: Number })
  @ApiQuery({ name: 'destLng', required: true, type: Number })
  async getRoute(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const result = await this.locationService.getRoute(oLat, oLng, dLat, dLng);
    if (!result) {
      throw new BadRequestException('Could not calculate route');
    }
    return result;
  }
}
