import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class UploadService {
  constructor(private readonly config: AppConfigService) {
    cloudinary.config({
      cloud_name: this.config.cloudinaryCloudName,
      api_key: this.config.cloudinaryApiKey,
      api_secret: this.config.cloudinaryApiSecret,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!this.config.cloudinaryCloudName || !this.config.cloudinaryApiKey || !this.config.cloudinaryApiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'flavohub',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error || new Error('Upload result is undefined'));
          resolve(result.secure_url);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
