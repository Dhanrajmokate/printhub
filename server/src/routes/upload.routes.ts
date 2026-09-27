import { Router, Request, Response } from 'express';
import { uploadMiddleware, uploadPaymentProofMiddleware } from '../middleware/upload.js';
import { detectPageCount } from '../services/pageCount.service.js';
import path from 'path';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Allow authenticated uploads (or public temporary uploads before login)
router.post('/', uploadMiddleware.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded.' });
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const pageResult = await detectPageCount(file.path);
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

        return {
          originalFileName: file.originalname,
          storedFileName: file.filename,
          fileSize: file.size,
          fileType: ext || pageResult.fileType,
          pageCount: pageResult.pageCount,
          isExactPageCount: pageResult.isExact,
          previewUrl: `/uploads/raw/${file.filename}`
        };
      })
    );

    return res.json({
      success: true,
      message: `${files.length} file(s) uploaded and analyzed successfully`,
      files: results
    });
  } catch (error: any) {
    console.error('Upload processing error:', error);
    return res.status(500).json({ success: false, message: error.message || 'File upload failed' });
  }
});

// 2. UPLOAD PAYMENT SCREENSHOT / PHOTO PROOF
router.post('/payment-proof', authenticate, uploadPaymentProofMiddleware.single('proof'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No payment proof image uploaded.' });
    }

    const proofUrl = `/uploads/payments/${file.filename}`;
    return res.json({
      success: true,
      message: 'Payment proof screenshot uploaded successfully',
      url: proofUrl,
      fileName: file.filename
    });
  } catch (error: any) {
    console.error('Payment proof upload error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment proof upload failed' });
  }
});

export default router;
