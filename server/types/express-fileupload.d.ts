declare module 'express-fileupload';

declare namespace Express {
  export interface Request {
    files?: {
      [fieldname: string]: any;
    };
  }
}