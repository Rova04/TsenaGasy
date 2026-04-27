// back/src/middleware/multer.ts
import multer from "multer";
import path from "path";

// Définir où stocker les fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // dossier local
  },
  filename: (req, file, cb) => {
    // Nom unique pour éviter les collisions
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Filtrer les types de fichiers (images uniquement)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées !"));
  }
};

export const upload = multer({ storage, fileFilter });
