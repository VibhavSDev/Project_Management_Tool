import multer from 'multer';
import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.txt', '.zip'];
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'application/zip'
];

const ensureDir = (relativePath) => {
  const fullPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
};
ensureDir('../uploads');
ensureDir('../uploads/avatars');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isAvatar = file.fieldname === 'avatar';
    const uploadPath = isAvatar
      ? path.resolve(__dirname, '../uploads/avatars')
      : path.resolve(__dirname, '../uploads');
    cb(null, uploadPath); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('⛔ Rejected upload:', {
      filename: file.originalname,
      ext,
      mimetype: file.mimetype
    });
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;




// import multer from 'multer';
// import path from 'path';

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const fileFilter = (req, file, cb) => {
//   const allowed = ['.jpg', '.png', '.pdf', '.docx', '.txt', '.zip'];
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowed.includes(ext)) cb(null, true);
//   else cb(new Error('Unsupported file type'), false);
// };

// export const upload = multer({ storage, fileFilter });
