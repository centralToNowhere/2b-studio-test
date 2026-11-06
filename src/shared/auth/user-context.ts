import { createContext } from 'react';
import type { ProfileDTO } from '@/shared/api/dto';

export const UserContext = createContext<ProfileDTO | null>(null);
