import { customAlphabet } from 'nanoid';

const generateBlockId = customAlphabet('abcdefghijklmnopqrstuvwz0123456789', 6);

export {generateBlockId}