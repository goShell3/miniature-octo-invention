import { randomUUID } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { Repository } from 'typeorm';
import { MediaAssetEntity } from '../database/entities/media-asset.entity';
import { PortfolioEntity } from '../database/entities/portfolio.entity';

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
};

@Injectable()
export class MediaService {
  private readonly s3Client: S3Client | null;

  constructor(
    config: ConfigService,
    @InjectRepository(PortfolioEntity)
    private readonly portfoliosRepository: Repository<PortfolioEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaRepository: Repository<MediaAssetEntity>,
  ) {
    const region = config.get<string>('S3_REGION');
    const bucket = config.get<string>('S3_BUCKET');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    const endpoint = config.get<string>('S3_ENDPOINT');
    this.bucket = bucket ?? '';

    this.s3Client =
      region && accessKeyId && secretAccessKey && bucket
        ? new S3Client({
            region,
            endpoint,
            forcePathStyle: Boolean(endpoint),
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  private readonly bucket: string;
  async createUploadUrl(
    ownerId: string,
    portfolioId: string,
    contentType: string,
    imageType: 'portfolio' | 'header' = 'portfolio',
  ) {
    const portfolio = await this.portfoliosRepository.findOne({
      where: { id: portfolioId, owner: { id: ownerId } },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    if (!this.s3Client) {
      throw new ServiceUnavailableException('Object storage is not configured');
    }

    const folder = imageType === 'header' ? 'header_img' : 'portfolio_img';
    const key = `${folder}/${portfolio.id}/${randomUUID()}.${extensions[contentType]}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
    });
    const asset = await this.mediaRepository.save(
      this.mediaRepository.create({
        portfolio,
        objectKey: key,
        contentType,
        type: contentType === 'application/pdf' ? 'resume' : 'image',
      }),
    );
    const publicUrl = `/media/assets/${asset.id}`;

    return {
      assetId: asset.id,
      uploadUrl,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      publicUrl,
      expiresIn: 300,
    };
  }

  async getPublicImage(assetId: string) {
    const asset = await this.mediaRepository.findOne({
      where: { id: assetId, type: 'image' },
    });
    if (!asset) throw new NotFoundException('Image not found');
    if (!this.s3Client) {
      throw new ServiceUnavailableException('Object storage is not configured');
    }

    const result = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: asset.objectKey }),
    );
    if (!result.Body) throw new NotFoundException('Image not found');

    return {
      body: result.Body as Readable,
      contentType: asset.contentType,
    };
  }
}
