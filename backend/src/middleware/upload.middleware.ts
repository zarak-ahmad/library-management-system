import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
};

export const uploadCoverImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const supportFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
  }
};

export const uploadSupportAttachment = multer({
  storage,
  fileFilter: supportFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const importFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  ];
  const ext = file.originalname.toLowerCase().split('.').pop();
  const allowedExt = ['csv', 'xls', 'xlsx', 'pdf'];

  if (allowed.includes(file.mimetype) || (ext && allowedExt.includes(ext))) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV, Excel (.xlsx), or PDF files are allowed for import'));
  }
};

export const uploadBookImport = multer({
  storage,
  fileFilter: importFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
