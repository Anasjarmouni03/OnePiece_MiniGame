import { requestSession } from './session';
import { equalSecret } from './teamPins';
import { staffPin } from './secrets';

export const isStaff = (req: Request): boolean => requestSession(req, 'staff') !== null;
export const checkPin = (given: unknown): boolean => equalSecret(given, staffPin());
