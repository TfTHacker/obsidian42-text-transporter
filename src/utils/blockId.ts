import { customAlphabet } from 'nanoid';

export const generateBlockId = customAlphabet('abcdefghijklmnopqrstuvwz0123456789', 6);
 