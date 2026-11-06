import type { ObjectDTO } from '@/shared/api/dto';
export type ConstructionObject = {
  id: string;
  name: string;
  address: string;
  description: string;
  createdAt: Date;
  version: number;
};
export const toObject = (dto: ObjectDTO): ConstructionObject => ({
  id: dto.id,
  name: dto.name,
  address: dto.address,
  description: dto.description,
  createdAt: new Date(dto.created_at),
  version: dto.version,
});
